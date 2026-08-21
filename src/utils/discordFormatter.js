import { formatDateTime, formatPhone, formatStatus, formatUrl } from './formatting'

function display(value, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback
  return String(value)
}

function displayEmail(value) {
  const email = display(value)
  return email.includes('@import.local') ? 'Not provided' : email
}

export function createLeadEmbed(lead, agent, eventType, additionalFields = {}) {
  const fields = [
    { name: 'Business name', value: display(lead.name, 'Unknown'), inline: true },
    { name: 'Phone', value: formatPhone(lead.phone), inline: true },
    { name: 'Email', value: displayEmail(lead.email), inline: true },
    { name: 'Website', value: formatUrl(lead.website), inline: true },
    { name: 'Industry', value: display(lead.category || lead.serviceRequested || lead.industry), inline: true },
    { name: 'Address', value: display(lead.address), inline: false },
    { name: 'Rating', value: `${display(lead.rating, '0')} rating / ${display(lead.reviews, '0')} reviews`, inline: true },
    { name: 'Source', value: display(lead.source), inline: true },
    { name: 'Status', value: formatStatus(lead.status), inline: true },
  ]

  if (lead.assignedTo) {
    fields.push({
      name: 'Assigned to',
      value: typeof lead.assignedTo === 'object' ? display(lead.assignedTo.username) : display(lead.assignedTo),
      inline: true,
    })
  }

  if (lead.notes) fields.push({ name: 'Notes', value: String(lead.notes).slice(0, 500), inline: false })
  if (lead.appointmentDate || lead.appointmentAt) {
    fields.push({ name: 'Appointment', value: formatDateTime(lead.appointmentDate || lead.appointmentAt), inline: true })
  }

  Object.entries(additionalFields).forEach(([key, value]) => {
    fields.push({ name: key, value: display(value), inline: true })
  })

  return {
    title: getEventTitle(eventType),
    description: getEventDescription(eventType, lead),
    color: getEventColor(eventType),
    timestamp: new Date().toISOString(),
    fields,
    footer: { text: `G.A.I.A. Platform - ${agent?.username || 'System'}` },
  }
}

function getEventTitle(eventType) {
  return ({
    lead_created: 'New Lead Created',
    lead_updated: 'Lead Updated',
    lead_assigned: 'Lead Assigned',
    appointment_booked: 'Appointment Booked',
    call_completed: 'Call Completed',
    lead_converted: 'Lead Converted',
    lead_lost: 'Lead Lost',
    lead_sent_to_queue: 'Lead Sent to Queue',
    note_saved: 'Call Notes Saved',
  })[eventType] || 'Lead Activity'
}

function getEventDescription(eventType, lead) {
  return ({
    lead_created: 'A new lead has been added to the system.',
    lead_updated: 'Lead information has been updated.',
    lead_assigned: 'Lead has been assigned to an agent.',
    appointment_booked: 'An appointment has been successfully booked.',
    call_completed: 'A call has been logged for this lead.',
    lead_converted: 'Lead has been converted to a customer.',
    lead_lost: 'Lead has been marked as lost.',
    lead_sent_to_queue: 'Lead has been added to the call queue.',
    note_saved: 'Call notes have been saved for this lead.',
  })[eventType] || `Activity recorded for ${display(lead.name, 'this lead')}.`
}

function getEventColor(eventType) {
  return ({
    lead_created: 0x3ecf6a,
    lead_updated: 0x4db8ff,
    lead_assigned: 0xa78bfa,
    appointment_booked: 0x3ecf6a,
    call_completed: 0xd4a843,
    lead_converted: 0x3ecf6a,
    lead_lost: 0xe05060,
    lead_sent_to_queue: 0x4db8ff,
    note_saved: 0xd4a843,
  })[eventType] || 0x8fa892
}

export async function sendDiscordNotification(webhookUrl, lead, agent, eventType, additionalFields = {}) {
  if (!webhookUrl) return false
  const embed = createLeadEmbed(lead, agent, eventType, additionalFields)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function sendSimpleDiscordNotification(webhookUrl, title, description, color = 0x3ecf6a) {
  if (!webhookUrl) return false
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{ title, description, color, timestamp: new Date().toISOString(), footer: { text: 'G.A.I.A. Platform' } }],
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
