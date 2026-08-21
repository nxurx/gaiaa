// â”€â”€ CONSTANTS â”€â”€
// USERS kept for any legacy code that might still import it, but auth is now backend-driven
export const USERS = {};
export const DEFAULT_WEBHOOK = '';
export const PAGE_TITLES = {
  dashboard: 'Dashboard', queue: 'Call Queue', leads: 'Lead Database',
  filter: 'Lead Filter', calls: 'Call Tracker', scripts: 'Scripts & Playbook',
  analytics: 'Analytics', scraper: 'Google Maps Scraper', settings: 'Settings'
};
export const TZS = [
  { n: 'LA',    z: 'America/Los_Angeles' },
  { n: 'DALLAS',z: 'America/Chicago' },
  { n: 'NYC',   z: 'America/New_York' },
  { n: 'LON',   z: 'Europe/London' },
];

// â”€â”€ PLAYBOOK DATA â”€â”€
// Straight Line Persuasion Framework by Jordan Belfort
export const PB = {
  // OPENING - Pattern Interrupt & Permission-Based
  openers: [
    { type: 'Pattern Interrupt', line: "Quick question - how are you currently handling missed calls when you're busy or after hours?", highlight: true },
    { type: 'Problem ID',        line: "I noticed something that might be costing you a few jobs a week - can I ask you something quick?", highlight: true },
    { type: 'Low Resistance',    line: "Hey, this will take 20 seconds - do you guys ever miss calls during peak hours?" },
    { type: 'Assumptive',        line: "When a customer calls and no one answers, what usually happens on your end?" },
    { type: 'Social Proof',      line: "Most businesses I talk to lose 20-30% of inbound calls - are you seeing something similar?" },
    { type: 'Outcome',           line: "We've been helping businesses capture missed calls and turn them into booked jobs - quick question for you." },
    { type: 'Permission',       line: "I know you're busy, so I'll be brief - would you be open to hearing about something that could increase your bookings by 20%?" },
    { type: 'Curiosity',        line: "What if I told you there's a way to capture every single call that comes in, even when you can't answer?" },
  ],
  
  // DISCOVERY - Business Pain Points & Revenue Goals
  qualifying: [
    { type: 'Pain Discovery', line: "How often would you say calls go unanswered in a typical week?" },
    { type: 'Impact',         line: "If even a few of those calls were new customers, what would that mean for your revenue?" },
    { type: 'Gap',            line: "What's your current system for following up with missed calls?" },
    { type: 'Budget',         line: "What's your monthly marketing budget looking like right now?" },
    { type: 'Timeline',       line: "When would you want to start seeing results from a solution like this?" },
    { type: 'Decision Maker', line: "Aside from yourself, who else would need to be involved in this decision?" },
    { type: 'Current Efforts', line: "What are you currently doing to generate new business?" },
    { type: 'Revenue Goals',  line: "What are your revenue goals for the next quarter?" },
  ],
  
  // TRANSITIONS - Moving from Opening to Presentation
  transitions: [
    { type: 'Permission', line: "Got it - that's exactly what I was expecting. Mind if I show you something real quick?" },
    { type: 'Authority',  line: "That's the exact gap we've been solving for businesses like yours." },
    { type: 'Bridge',     line: "Perfect - let me show you how we can solve that exact problem." },
    { type: 'Validation', line: "I'm glad you mentioned that - it tells me you're the kind of business owner who gets it." },
  ],
  
  // OBJECTIONS - Straight Line Persuasion Handlers
  objections: [
    { trigger: 'Not Interested', line: "Totally fair - usually when people say that it's because they haven't seen how it works. Are you 100% sure you're not losing leads right now?" },
    { trigger: 'Have something', line: "That's perfect - you're already ahead. Are you tracking how many calls turn into actual bookings?" },
    { trigger: 'Too busy',       line: "That's exactly why this matters - being busy means missed opportunities. This will take 30 seconds." },
    { trigger: 'Send me info',   line: "Happy to - but quick question first. How are you handling missed leads?" },
    { trigger: 'No budget',      line: "Most people say that until they realize how much missed calls are costing them. How much is one missed call worth to you?" },
    { trigger: 'Call back',      line: "Sure - before I do, are missed calls something you're actively trying to fix?" },
    { trigger: 'Already have',  line: "Great - that means you understand the value. What's your current conversion rate on those calls?" },
    { trigger: 'Need to think', line: "Of course - what specifically would you need to think about? The cost, the results, or something else?" },
    { trigger: 'Talk to partner', line: "Absolutely - when would be a good time for all of us to connect? I want to make sure they see this too." },
    { trigger: 'Not the right time', line: "I understand - when would be a better time? The problem is, every day you wait is another day of lost calls." },
  ],
  
  // CLOSING - Certainty & Commitment
  closing: [
    { type: 'Soft Close',   line: "Would it be crazy to take 10 minutes and see if this actually makes sense for you?" },
    { type: 'Assumptive',   line: "Let's do this - I'll show you how it works and you can decide if it's worth it." },
    { type: 'Scarcity',     line: "We're only working with a few businesses in your area - would you want to look before we fill up?" },
    { type: 'Trial Close',  line: "If we could get you set up this week and you started seeing results next week, would that work?" },
    { type: 'Alternative',  line: "Would you prefer to start with the basic package or the full solution?" },
    { type: 'Urgency',     line: "Every day you wait, you're losing potential customers. Why not start capturing them today?" },
    { type: 'Confirmation', line: "So if I can show you exactly how this will increase your bookings, you'd be ready to move forward?" },
  ],
  
  // COACHING TIPS - Best Practices
  power: [
    "Always sound like you expect a positive response - certainty is contagious",
    "Never argue - redirect objections back to the problem you're solving",
    "Slow down your speech for authority - fast speech sounds desperate",
    "Ask questions more than you talk - let them sell themselves",
    "Bring it back to money or lost opportunity - that's what business owners care about",
    "Create curiosity gaps - don't explain everything upfront",
    "Mirror the prospect's tone slightly - builds rapport subconsciously",
    "Use their name throughout the conversation - personal connection",
    "Maintain eye contact (in person) or voice confidence (on phone)",
    "Never apologize for taking their time - you're bringing value",
    "Be the expert - don't ask for permission, lead the conversation",
    "Control the frame - you're the one helping them, not the other way around",
    "Use tonality to convey emotion - 80% of communication is how you say it",
    "Stay in the straight line - keep bringing them back to the close",
    "Qualify hard but qualify fast - don't waste time on unqualified leads",
  ],
};

// â”€â”€ CLOCK UTILS â”€â”€
export function fmtTime(tz) {
  return new Intl.DateTimeFormat('en', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(new Date());
}
export function isOpen(tz) {
  const d   = new Date();
  const h   = parseInt(new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', hour12: false }).format(d));
  const day = new Intl.DateTimeFormat('en', { timeZone: tz, weekday: 'short' }).format(d);
  return !['Sat', 'Sun'].includes(day) && h >= 8 && h < 18;
}
export function localTime(tz) {
  return new Intl.DateTimeFormat('en', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date());
}
export function guessTZ(biz) {
  const a = (biz.address || '').toLowerCase();
  return a.match(/\b(ca|california|los angeles|san diego|san francisco|la)\b/)   ? 'America/Los_Angeles'
    :    a.match(/\b(tx|texas|dallas|houston|austin)\b/)                          ? 'America/Chicago'
    :    a.match(/\b(ny|new york|florida|fl|miami|atlanta|ga|nc|va)\b/)           ? 'America/New_York'
    :    null;
}

// â”€â”€ VALIDATION â”€â”€
export function isPhone(p) {
  if (!p || p === '-' || !p.trim()) return false;
  const c = p.replace(/[\s\-\(\)\+\.]/g, '');
  return c.length >= 7 && /\d{7,}/.test(c);
}
export function normalizePhoneForDial(phone) {
  if (!isPhone(phone)) return '';
  const digits      = String(phone).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  const numbersOnly = digits.replace(/\D/g, '');
  if (numbersOnly.length === 11 && numbersOnly.startsWith('1')) return `+${numbersOnly}`;
  if (numbersOnly.length === 10) return `+1${numbersOnly}`;
  return `+${numbersOnly}`;
}
export function getGoogleVoiceCallUrl(phone) {
  const normalized = normalizePhoneForDial(phone);
  return normalized ? `https://voice.google.com/u/0/calls?a=nc,${encodeURIComponent(normalized)}` : '';
}
export function isWebsite(w) {
  if (!w || w === '-' || !w.trim()) return false;
  const l = w.toLowerCase().trim();
  return l.startsWith('http') || l.includes('.com') || l.includes('.net') || l.includes('.org') || l.includes('.co') || l.includes('.io') || (l.length > 4 && l.includes('.'));
}
export function hasContact(lead) { return isPhone(lead.phone) || isWebsite(lead.website); }

// â”€â”€ CSV PARSER â”€â”€
export function parseCSV(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines      = normalized.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const first  = lines[0];
  const tabs   = (first.match(/\t/g) || []).length;
  const commas = (first.match(/,/g)  || []).length;
  const semis  = (first.match(/;/g)  || []).length;
  let d = ',';
  if (tabs > commas && tabs > semis) d = '\t';
  else if (semis > commas) d = ';';
  function spl(l) {
    const r = []; let c = '', q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (ch === '"') { if (q && l[i + 1] === '"') { c += '"'; i++; } else q = !q; }
      else if (ch === d && !q) { r.push(c.trim()); c = ''; }
      else c += ch;
    }
    r.push(c.trim()); return r;
  }
  const headers = spl(lines[0]).map(h => h.replace(/^"|"$/g, '').replace(/^\uFEFF/, '').trim());
  const rows    = lines.slice(1).filter(l => l.trim()).map(l => {
    const v = spl(l); const r = {};
    headers.forEach((h, i) => r[h] = (v[i] || '').replace(/^"|"$/g, '').trim());
    return r;
  });
  return { headers, rows };
}

// â”€â”€ AUTO-DETECT COLUMNS â”€â”€
export function autoDetect(headers) {
  const g = c => headers.find(h => c.some(x => h.toLowerCase().replace(/[\W_]/g, '').includes(x))) || '';
  return {
    name:     g(['name', 'businessname', 'title', 'company', 'placename', 'storename']),
    reviews:  g(['reviewcount', 'reviews', 'numreviews', 'ratingcount', 'totalreviews', 'reviewscount', 'numberofreviews']),
    rating:   g(['rating', 'avgrating', 'starrating', 'score', 'stars', 'averagerating', 'googlerating']),
    phone:    g(['phone', 'tel', 'telephone', 'mobile', 'contact', 'phonenumber', 'number']),
    website:  g(['website', 'url', 'site', 'homepage', 'web', 'domain', 'siteurl']),
    category: g(['category', 'type', 'niche', 'industry', 'genre', 'businesstype', 'tag']),
    address:  g(['address', 'city', 'location', 'addr', 'fulladdress', 'street']),
  };
}

// â”€â”€ STORAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// loadLocalState: reads cached/offline data only - auth is now JWT-based
export function loadLocalState() {
  return {
    leads:   JSON.parse(localStorage.getItem('gs_leads')   || '[]'),
    calls:   JSON.parse(localStorage.getItem('gs_calls')   || '[]'),
    scripts: JSON.parse(localStorage.getItem('gs_scripts') || '[]'),
    notes:   localStorage.getItem('gs_notes')  || '',
    theme:   localStorage.getItem('gs_theme')  || '',
  };
}
// Keep old name as alias so any stale imports don't break
export const loadState = loadLocalState;

export function saveLeads(leads)     { localStorage.setItem('gs_leads',   JSON.stringify(leads)); }
export function saveCalls(calls)     { localStorage.setItem('gs_calls',   JSON.stringify(calls)); }
export function saveScripts(scripts) { localStorage.setItem('gs_scripts', JSON.stringify(scripts)); }
export function saveNotes(notes)     { localStorage.setItem('gs_notes',   notes); }
export function saveTheme(theme)     { localStorage.setItem('gs_theme',   theme); }
export function saveUser(user)       { localStorage.setItem('gs_user',    typeof user === 'string' ? user : user?.username || ''); }
export function clearUser()          { localStorage.removeItem('gs_user'); }

// â”€â”€ LEAD HELPERS â”€â”€
export function addLeadsFromRows(existingLeads, rows, headers) {
  const detected = autoDetect(headers);
  const existing = new Set(existingLeads.map(l => l.name.toLowerCase().trim()));
  const newLeads = [];
  rows.forEach((row, i) => {
    const phone   = row[detected.phone]   || '-';
    const website = row[detected.website] || '-';
    if (!isPhone(phone) && !isWebsite(website)) return;
    const name = row[detected.name] || 'Business ' + (existingLeads.length + i + 1);
    if (existing.has(name.toLowerCase().trim())) return;
    existing.add(name.toLowerCase().trim());
    newLeads.push({
      id:       Date.now() + i + Math.random(),
      name,
      reviews:  row[detected.reviews]  || '0',
      rating:   row[detected.rating]   || '0',
      phone,
      website,
      category: row[detected.category] || 'General',
      address:  row[detected.address]  || '-',
      email:    row['email'] || row['Email'] || '',
      status:   'uncalled',
      notes:    '',
      calledAt: null,
      raw:      row,
    });
  });
  return newLeads;
}

export function genFacts(biz) {
  const rev = parseInt(biz.reviews) || 0, rat = parseFloat(biz.rating) || 0, facts = [];
  if (!isWebsite(biz.website))           facts.push('No website - completely invisible on Google. Easiest pitch.');
  else if (rev < 20)                     facts.push(`Only ${rev} reviews - invisible in local search. New customers can't find them.`);
  else if (rev < 80)                     facts.push(`${rev} reviews puts them mid-pack. Competitors with 150+ are outranking them daily.`);
  else                                   facts.push(`${rev} reviews - established but still beatable with automation.`);
  if (rat > 0 && rat < 3.8)             facts.push(`${rat}â˜... is below trust threshold. Customers are picking competitors.`);
  else if (rat >= 3.8 && rat <= 4.4)    facts.push(`${rat}â˜... - good not great. 4.6+ is where customers stop questioning.`);
  else if (rat > 4.4)                   facts.push(`Strong ${rat}â˜.... Pitch review volume and automation retention.`);
  if (!isPhone(biz.phone))              facts.push('No phone found - relying on walk-ins only. Huge lead capture gap.');
  const n = (biz.category || '').toLowerCase();
  if (n.includes('hvac') || n.includes('plumb'))        facts.push('Trade business - missed after-hours calls = lost jobs. Pitch AI voice agent.');
  else if (n.includes('dental') || n.includes('med'))   facts.push('Healthcare - each patient $2k-$10k+ LTV. Missed calls = massive revenue leak.');
  else if (n.includes('auto'))                          facts.push('Auto repair - SMS reminders and rebooking automation highest ROI pitch.');
  else                                                   facts.push('Service business - inbound calls are lifeblood. Any missed call = a lost job.');
  return facts;
}

export async function sendDiscord(content) {
  const hook = localStorage.getItem('gs_webhook') || DEFAULT_WEBHOOK;
  if (!hook || !hook.includes('discord.com/api/webhooks')) return false;
  try {
    const r = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, username: 'Green. G.A.I.A.' }),
    });
    return r.ok;
  } catch { return false; }
}

export function copyToClipboard(text, onSuccess) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess));
  } else {
    fallbackCopy(text, onSuccess);
  }
}
function fallbackCopy(text, onSuccess) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); onSuccess(); } catch (e) { /* noop */ }
  document.body.removeChild(ta);
}

export function handleFileRead(file, onParsed, onError) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      let text = e.target.result;
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const result = parseCSV(text);
      if (!result.headers.length) { onError('Could not parse CSV - no headers found.'); return; }
      onParsed(result, file.name);
    } catch (err) { onError('Error parsing: ' + file.name); }
  };
  reader.onerror = () => onError('Read error on: ' + file.name);
  reader.readAsText(file, 'UTF-8');
}

export function getPlaybookOpeners(biz) {
  const ops = [...PB.openers];
  if (!biz) return ops;
  const rev = parseInt(biz.reviews) || 0, rat = parseFloat(biz.rating) || 0;
  let custom = null;
  if (rev < 20)
    custom = { type: 'Personalized', line: `Quick question - I looked up ${biz.name} and noticed only ${rev || 'a handful of'} reviews. Do you know what that's costing you monthly?`, highlight: true };
  else if (!isWebsite(biz.website))
    custom = { type: 'Personalized', line: `Hey - ${biz.name} doesn't have a website. Are you losing leads to competitors who are online?`, highlight: true };
  else if (rat > 0 && rat < 3.8)
    custom = { type: 'Personalized', line: `Quick one - ${biz.name} has ${rat} stars. Most customers won't call under 4 stars. Have you looked into fixing that?`, highlight: true };
  if (custom) ops.unshift(custom);
  return ops;
}

export const DEFAULT_SCRIPTS = [
  { title: 'Cold Open - Review Gap',  type: 'Opening',           content: "Hey, is this [Name]? Quick question - I was looking at your Google profile and noticed you only have [X] reviews. Most businesses in your area with 3x that count are taking the top spots. We automate review collection after every job. Can I show you in 10 minutes?" },
  { title: 'Cost Objection',          type: 'Objection Handler', content: "Totally get that - most people say that until they realize how much missed calls are already costing them. What does one new customer typically bring in for you?" },
  { title: 'Voicemail',               type: 'Voicemail',         content: "Hey [Name], this is [Your Name] from Green. We work with [niche] businesses helping them capture more leads with AI voice agents and review automation. Call me back at [number]." },
  { title: 'Soft Close',              type: 'Closing',           content: "Would it be crazy to take 10 minutes and see if this actually makes sense for you?" },
];

