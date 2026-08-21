const Settings = require('../models/Settings');

function clean(value, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  if (typeof value === 'object') return Object.keys(value).length ? JSON.stringify(value, null, 2).slice(0, 900) : fallback;
  return String(value).slice(0, 900);
}

function cleanEmail(value) {
  const email = clean(value);
  return email.includes('@import.local') ? 'Not provided' : email;
}

function leadEmbed(action, lead, actor, extra = {}) {
  const status = clean(lead.status || extra.status);
  const fields = [
    { name: 'Lead name', value: clean(lead.name), inline: true },
    { name: 'Phone', value: clean(lead.phone), inline: true },
    { name: 'Email', value: cleanEmail(lead.email), inline: true },
    { name: 'Company', value: clean(lead.company || lead.name), inline: true },
    { name: 'Website', value: clean(lead.website), inline: true },
    { name: 'Industry', value: clean(lead.industry || lead.serviceRequested), inline: true },
    { name: 'Competition data', value: clean(extra.competition || `${clean(lead.rating, '0')} rating / ${clean(lead.reviews, '0')} reviews`), inline: false },
    { name: 'Source', value: clean(lead.source), inline: true },
    { name: 'Appointment', value: clean(extra.appointmentAt || lead.appointmentAt), inline: true },
    { name: 'Agent assigned', value: clean(actor?.username || lead.assignedTo?.username || lead.assignedTo), inline: true },
    { name: 'Lead status', value: status, inline: true },
    { name: 'Tags', value: clean(lead.tags), inline: true },
    { name: 'Notes', value: clean(extra.notes || lead.notes || lead.message), inline: false },
    { name: 'Custom fields', value: clean(lead.customFields), inline: false },
    { name: 'Enrichment data', value: clean(lead.enrichment || extra.enrichment), inline: false },
  ];

  return {
    title: `G.A.I.A. ${action}`,
    color: action.toLowerCase().includes('appointment') ? 0x4db8ff : 0x3ecf6a,
    timestamp: new Date().toISOString(),
    fields,
  };
}

async function sendDiscordNotification(action, lead, actor, extra = {}) {
  // Hardcoded Discord webhook URL
  const webhookUrl = 'https://discord.com/api/webhooks/1485239612203859998/LPGKqGbjz3M0xJeoFPjbLDy8CxkPn5q9Nbc6e4kgaLyf_eZbm1blQE2O10IH-8rSx8Sc';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Green G.A.I.A.',
        embeds: [leadEmbed(action, lead, actor, extra)],
      }),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
      return { sent: false, reason: `Discord returned ${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error('Discord webhook error:', error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = { sendDiscordNotification, leadEmbed };
