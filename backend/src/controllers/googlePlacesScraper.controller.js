const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const TARGET_PER_NICHE = 150;
const PAGE_SIZE = 20;
const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const PLACE_FIELD_MASK = [
  'places.id',
  'places.name',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.location',
  'places.businessStatus',
  'nextPageToken',
].join(',');

const QUERY_VARIANTS = [
  (niche, location) => `${niche} in ${location}`,
  (niche, location) => `${niche} companies in ${location}`,
  (niche, location) => `${niche} contractors in ${location}`,
  (niche, location) => `${niche} services in ${location}`,
  (niche, location) => `best ${niche} near ${location}`,
  (niche, location) => `top rated ${niche} near ${location}`,
  (niche, location) => `local ${niche} near ${location}`,
  (niche, location) => `${niche} business near ${location}`,
];

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

function getApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY || '';
}

function buildLocationLabel({ city, state, country }) {
  return [city, state, country].map(clean).filter(Boolean).join(', ');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mapGooglePlace(place, { niche, city, state, country, listIndex }) {
  const displayName = place.displayName?.text || '';
  const category = place.primaryTypeDisplayName?.text || place.primaryType || niche;
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
  const latitude = place.location?.latitude || '';
  const longitude = place.location?.longitude || '';

  return {
    id: place.id || place.name || `${displayName}-${place.formattedAddress}`,
    placeId: place.id || '',
    name: displayName,
    phone,
    email: '',
    website: place.websiteUri || '',
    address: place.formattedAddress || '',
    rating: place.rating || '',
    reviews: place.userRatingCount || '',
    category,
    niche,
    socialLinks: [],
    link: place.googleMapsUri || (place.id ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${encodeURIComponent(place.id)}` : ''),
    latitude,
    longitude,
    listName: `${niche} - ${city}`,
    listIndex,
    searchCity: city || '',
    searchState: state || '',
    searchCountry: country || '',
    source: 'google_places_api',
    enrichment: {
      googlePlaceId: place.id || '',
      googleResourceName: place.name || '',
      businessStatus: place.businessStatus || '',
      rawCategory: place.primaryType || '',
      types: place.types || [],
    },
  };
}

function dedupeBusinesses(rows) {
  const seen = new Set();
  const unique = [];

  for (const row of rows) {
    const key = (row.placeId || `${row.name}|${row.phone}|${row.website}|${row.address}`).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}

async function googleTextSearch({ apiKey, textQuery, pageToken }) {
  const body = {
    textQuery,
    pageSize: PAGE_SIZE,
    includePureServiceAreaBusinesses: true,
  };

  if (pageToken) body.pageToken = pageToken;

  const response = await fetch(TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACE_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error?.message || `Google Places request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function scrapeQuery({ apiKey, textQuery, niche, city, state, country, existingCount, onProgress }) {
  let pageToken = '';
  let page = 0;
  const rows = [];

  do {
    if (pageToken) await sleep(2000);
    const data = await googleTextSearch({ apiKey, textQuery, pageToken });
    const places = data.places || [];

    places
      .filter(place => place.displayName?.text)
      .filter(place => place.businessStatus !== 'CLOSED_PERMANENTLY')
      .forEach((place) => {
        rows.push(mapGooglePlace(place, {
          niche,
          city,
          state,
          country,
          listIndex: existingCount + rows.length + 1,
        }));
      });

    page += 1;
    pageToken = data.nextPageToken || '';

    onProgress?.({
      type: 'progress',
      niche,
      message: `${niche}: Google Maps returned ${existingCount + rows.length} candidates...`,
      count: existingCount + rows.length,
      total: TARGET_PER_NICHE,
    });
  } while (pageToken && page < 3);

  return rows;
}

async function scrapeNiche({ apiKey, niche, city, state, country, locationLabel, onProgress }) {
  let collected = [];

  for (const variant of QUERY_VARIANTS) {
    if (collected.length >= TARGET_PER_NICHE) break;

    const textQuery = variant(niche, locationLabel);
    onProgress?.({
      type: 'progress',
      niche,
      message: `${niche}: searching Google Maps for "${textQuery}"...`,
      count: collected.length,
      total: TARGET_PER_NICHE,
    });

    const queryRows = await scrapeQuery({
      apiKey,
      textQuery,
      niche,
      city,
      state,
      country,
      existingCount: collected.length,
      onProgress,
    });

    collected = dedupeBusinesses([...collected, ...queryRows]).slice(0, TARGET_PER_NICHE);
  }

  return collected.map((row, index) => ({ ...row, listIndex: index + 1 }));
}

const startScraping = asyncHandler(async (req, res) => {
  const niches = selectedNiches(req.body);
  const { city, state, country = 'USA' } = req.body;
  const apiKey = getApiKey();
  const locationLabel = buildLocationLabel({ city, state, country });

  if (!niches.length) throw new ApiError(400, 'Select at least one niche.');
  if (!clean(city)) throw new ApiError(400, 'City is required.');
  if (!apiKey) {
    throw new ApiError(500, 'Google Maps scraping is not configured. Set GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY on the backend.');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const onProgress = (progress) => res.write(`data: ${JSON.stringify(progress)}\n\n`);

  try {
    const results = [];
    const summaries = [];

    onProgress({
      type: 'start',
      message: `Starting Google Maps scrape for ${niches.length} list${niches.length === 1 ? '' : 's'} in ${locationLabel}...`,
    });

    for (const niche of niches) {
      const nicheResults = await scrapeNiche({ apiKey, niche, city, state, country, locationLabel, onProgress });
      summaries.push({ niche, count: nicheResults.length, target: TARGET_PER_NICHE });
      results.push(...nicheResults);

      onProgress({
        type: 'niche_done',
        niche,
        message: `${niche}: scraped ${nicheResults.length} Google Maps businesses.`,
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

  const headers = ['List', 'Niche', 'Name', 'Phone', 'Email', 'Website', 'Address', 'Rating', 'Reviews', 'Social Links', 'Map Link', 'Google Place ID', 'Latitude', 'Longitude'];
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
      csvCell(biz.placeId || biz.enrichment?.googlePlaceId),
      csvCell(biz.latitude),
      csvCell(biz.longitude),
    ].join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="gaia_google_maps_leads_${Date.now()}.csv"`);
  res.send(csvRows.join('\n'));
});

module.exports = {
  startScraping,
  exportToCSV,
};
