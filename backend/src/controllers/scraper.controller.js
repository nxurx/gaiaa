const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const TARGET_PER_NICHE = 150;
const SEARCH_RADII_METERS = [25000, 50000];
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const NICHE_QUERIES = {
  Plumbing: [{ key: 'craft', value: 'plumber' }, { key: 'shop', value: 'plumbing' }],
  HVAC: [{ key: 'craft', value: 'hvac' }, { key: 'craft', value: 'heating' }, { key: 'shop', value: 'heating' }],
  Roofing: [{ key: 'craft', value: 'roofer' }],
  Electrical: [{ key: 'craft', value: 'electrician' }],
  Landscaping: [{ key: 'craft', value: 'landscaper' }, { key: 'craft', value: 'gardener' }],
  'Pest Control': [{ key: 'shop', value: 'pest_control' }, { key: 'craft', value: 'pest_control' }],
  'Cleaning Service': [{ key: 'craft', value: 'cleaner' }],
  'Auto Repair': [{ key: 'shop', value: 'car_repair' }],
  Dentist: [{ key: 'amenity', value: 'dentist' }, { key: 'healthcare', value: 'dentist' }],
  Chiropractor: [{ key: 'healthcare', value: 'chiropractor' }, { key: 'amenity', value: 'chiropractor' }],
  'Med Spa': [{ key: 'shop', value: 'beauty' }, { key: 'healthcare', value: 'spa' }, { key: 'leisure', value: 'spa' }],
  'Real Estate': [{ key: 'office', value: 'estate_agent' }],
  Restaurant: [{ key: 'amenity', value: 'restaurant' }, { key: 'amenity', value: 'cafe' }],
  Gym: [{ key: 'leisure', value: 'fitness_centre' }, { key: 'sport', value: 'fitness' }],
  Salon: [{ key: 'shop', value: 'hairdresser' }, { key: 'shop', value: 'beauty' }],
  'Law Firm': [{ key: 'office', value: 'lawyer' }],
  'Insurance Agency': [{ key: 'office', value: 'insurance' }],
  'Home Remodeling': [{ key: 'craft', value: 'builder' }, { key: 'shop', value: 'doityourself' }],
};

function csvCell(value) {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

function clean(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function selectedNiches(body) {
  const raw = body.industries || body.niches || body.industry || body.keyword;
  const list = Array.isArray(raw) ? raw : String(raw || '').split(',');
  return [...new Set(list.map(clean).filter(Boolean))];
}

function tagBboxQuery(tag, bbox) {
  const key = tag.key.replace(/"/g, '\\"');
  const value = tag.value.replace(/"/g, '\\"');
  const [south, west, north, east] = bbox;
  return `
    node["${key}"="${value}"](${south},${west},${north},${east});
    way["${key}"="${value}"](${south},${west},${north},${east});
    relation["${key}"="${value}"](${south},${west},${north},${east});
  `;
}

async function geocodeLocation({ city, state, country }) {
  const q = [city, state, country].map(clean).filter(Boolean).join(', ');
  if (!q) throw new Error('City is required.');

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'GaiaLeadScraper/1.0', Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Location lookup failed (${response.status})`);

  const rows = await response.json();
  if (!rows.length) throw new Error(`Could not find location: ${q}`);

  return {
    label: rows[0].display_name || q,
    lat: Number(rows[0].lat),
    lon: Number(rows[0].lon),
    boundingBox: rows[0].boundingbox
      ? [
          Number(rows[0].boundingbox[0]),
          Number(rows[0].boundingbox[2]),
          Number(rows[0].boundingbox[1]),
          Number(rows[0].boundingbox[3]),
        ]
      : null,
  };
}

function bboxAround(lat, lon, radiusMeters) {
  const latDelta = radiusMeters / 111320;
  const lonDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lat - latDelta, lon - lonDelta, lat + latDelta, lon + lonDelta];
}

function splitBbox(bbox, parts) {
  const [south, west, north, east] = bbox;
  const latStep = (north - south) / parts;
  const lonStep = (east - west) / parts;
  const tiles = [];

  for (let row = 0; row < parts; row += 1) {
    for (let col = 0; col < parts; col += 1) {
      tiles.push([
        south + latStep * row,
        west + lonStep * col,
        south + latStep * (row + 1),
        west + lonStep * (col + 1),
      ].map(num => Number(num.toFixed(6))));
    }
  }

  return tiles;
}

function searchTiles(location) {
  const cityBox = location.boundingBox ? splitBbox(location.boundingBox, 3) : [];
  const radiusTiles = SEARCH_RADII_METERS.flatMap((radius, index) => splitBbox(
    bboxAround(location.lat, location.lon, radius),
    index === 0 ? 4 : 5,
  ));

  const seen = new Set();
  return [...cityBox, ...radiusTiles].filter((bbox) => {
    const key = bbox.join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function overpassTileSearch({ tag, bbox, limit }) {
  const query = `
    [out:json][timeout:20];
    (
      ${tagBboxQuery(tag, bbox)}
    );
    out tags center qt ${limit};
  `;

  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 22000);
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'GaiaLeadScraper/1.0',
        },
        body: new URLSearchParams({ data: query }),
      });
      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        lastError = new Error(`Business data source failed (${response.status}): ${text.slice(0, 160)}`);
        continue;
      }

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Business data source failed.');
}

function addressFromTags(tags, fallbackLocation) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const city = tags['addr:city'];
  const state = tags['addr:state'];
  const postcode = tags['addr:postcode'];
  const parts = [street, city, state, postcode].filter(Boolean);
  return parts.length ? parts.join(', ') : fallbackLocation;
}

function elementToBusiness(element, { niche, fallbackLocation }) {
  const tags = element.tags || {};
  const name = tags.name || tags.operator || tags.brand;
  if (!name) return null;

  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;
  const website = tags.website || tags['contact:website'] || tags.url || '';
  const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '';
  const email = tags.email || tags['contact:email'] || '';

  return {
    id: `${element.type}/${element.id}`,
    name,
    phone,
    email,
    website,
    address: addressFromTags(tags, fallbackLocation),
    rating: '',
    reviews: '',
    category: niche,
    niche,
    socialLinks: [tags.facebook, tags.instagram, tags.linkedin, tags.twitter].filter(Boolean),
    link: element.type && element.id ? `https://www.openstreetmap.org/${element.type}/${element.id}` : '',
    latitude: lat || '',
    longitude: lon || '',
    source: 'openstreetmap_overpass',
    enrichment: {
      osmType: element.type,
      osmId: element.id,
      openingHours: tags.opening_hours || '',
      rawCategory: tags.shop || tags.craft || tags.amenity || tags.office || tags.healthcare || tags.leisure || '',
    },
  };
}

function dedupeBusinesses(rows) {
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = `${row.name}|${row.phone}|${row.website}|${row.address}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

async function scrapeNiche({ niche, city, state, country, location, onProgress }) {
  let collected = [];
  const tags = NICHE_QUERIES[niche] || [{ key: 'name', value: niche }];
  const tiles = searchTiles(location);
  let checked = 0;
  let failures = 0;

  for (const tag of tags) {
    for (const bbox of tiles) {
      checked += 1;
      onProgress?.({
        type: 'progress',
        niche,
        message: `Scraping ${niche}: ${collected.length}/${TARGET_PER_NICHE} found...`,
        count: collected.length,
        total: TARGET_PER_NICHE,
      });

      try {
        const elements = await overpassTileSearch({
          tag,
          bbox,
          limit: Math.max(40, TARGET_PER_NICHE - collected.length + 25),
        });
        const rows = elements
          .map(element => elementToBusiness(element, { niche, fallbackLocation: location.label }))
          .filter(Boolean);

        collected = dedupeBusinesses([...collected, ...rows]).slice(0, TARGET_PER_NICHE);
        if (collected.length >= TARGET_PER_NICHE) break;
      } catch (error) {
        failures += 1;
      }
    }
    if (collected.length >= TARGET_PER_NICHE) break;
  }

  return collected.map((row, index) => ({
    ...row,
    listName: `${niche} - ${city || location.label}`,
    listIndex: index + 1,
    searchCity: city || '',
    searchState: state || '',
    searchCountry: country || '',
    scrapeStats: { checked, failures },
  }));
}

const startScraping = asyncHandler(async (req, res) => {
  const niches = selectedNiches(req.body);
  const { city, state, country = 'USA' } = req.body;

  if (!niches.length) throw new ApiError(400, 'Select at least one niche.');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onProgress = (progress) => res.write(`data: ${JSON.stringify(progress)}\n\n`);

  try {
    const location = await geocodeLocation({ city, state, country });
    const results = [];
    const summaries = [];

    for (const niche of niches) {
      const nicheResults = await scrapeNiche({ niche, city, state, country, location, onProgress });
      summaries.push({
        niche,
        count: nicheResults.length,
        target: TARGET_PER_NICHE,
        status: nicheResults.length >= TARGET_PER_NICHE ? 'complete' : 'partial',
      });
      results.push(...nicheResults);
      onProgress({
        type: 'niche_done',
        niche,
        message: `${niche}: scraped ${nicheResults.length} businesses.`,
        count: nicheResults.length,
        total: TARGET_PER_NICHE,
      });
    }

    res.write(`data: ${JSON.stringify({ type: 'done', results, summaries })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

const exportToCSV = asyncHandler(async (req, res) => {
  const { results } = req.body;

  if (!Array.isArray(results) || results.length === 0) {
    throw new ApiError(400, 'Results array is required');
  }

  const headers = ['List', 'Niche', 'Name', 'Phone', 'Email', 'Website', 'Address', 'Rating', 'Reviews', 'Social Links', 'Map Link', 'Latitude', 'Longitude'];
  const csvRows = [headers.join(',')];

  results.forEach((biz) => {
    csvRows.push([
      csvCell(biz.listName),
      csvCell(biz.niche || biz.category),
      csvCell(biz.name),
      csvCell(biz.phone),
      csvCell(biz.email),
      csvCell(biz.website),
      csvCell(biz.address),
      csvCell(biz.rating),
      csvCell(biz.reviews),
      csvCell(Array.isArray(biz.socialLinks) ? biz.socialLinks.join(' ') : biz.socialLinks),
      csvCell(biz.link),
      csvCell(biz.latitude),
      csvCell(biz.longitude),
    ].join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="gaia_scraped_leads_${Date.now()}.csv"`);
  res.send(csvRows.join('\n'));
});

module.exports = {
  startScraping,
  exportToCSV,
};
