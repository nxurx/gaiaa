/**
 * Formatting utilities for displaying data in the UI
 * Ensures human-readable labels and proper fallbacks
 */

/**
 * Format a value with fallback
 */
export function formatValue(value, fallback = '-') {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string' && value.trim() === '') return fallback
  if (typeof value === 'number' && isNaN(value)) return fallback
  return value
}

/**
 * Format a MongoDB ObjectId to a short display string
 */
export function formatId(id, fallback = '-') {
  if (!id) return fallback
  if (typeof id === 'object' && id._id) id = id._id
  if (typeof id === 'string') {
    // Show first 8 chars for brevity
    return id.length > 12 ? `${id.slice(0, 8)}...` : id
  }
  return fallback
}

/**
 * Format a date to a readable string
 */
export function formatDate(date, fallback = '-') {
  if (!date) return fallback
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return fallback
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch {
    return fallback
  }
}

/**
 * Format a date and time to a readable string
 */
export function formatDateTime(date, fallback = '-') {
  if (!date) return fallback
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return fallback
    return d.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return fallback
  }
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone, fallback = '-') {
  if (!phone) return fallback
  const cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

/**
 * Format a URL for display (hide protocol, truncate if needed)
 */
export function formatUrl(url, fallback = '-', maxLength = 30) {
  if (!url) return fallback
  try {
    let display = url
    if (display.startsWith('http://')) display = display.slice(7)
    if (display.startsWith('https://')) display = display.slice(8)
    if (display.includes('/')) display = display.split('/')[0]
    if (display.length > maxLength) display = display.slice(0, maxLength) + '...'
    return display
  } catch {
    return fallback
  }
}

/**
 * Format a status to a human-readable label
 */
export function formatStatus(status, fallback = 'Unknown') {
  if (!status) return fallback
  
  const statusMap = {
    // Lead statuses
    'new': 'New',
    'contacted': 'Contacted',
    'converted': 'Converted',
    'lost': 'Lost',
    // Frontend statuses
    'uncalled': 'Uncalled',
    'interested': 'Interested',
    'not-interested': 'Not Interested',
    'no-answer': 'No Answer',
    'callback': 'Callback',
    'skipped': 'Skipped',
    'voicemail': 'Voicemail',
    'wrong-number': 'Wrong Number',
    // Call statuses
    'answered': 'Answered',
    'missed': 'Missed',
    'no_answer': 'No Answer',
  }
  
  return statusMap[status] || status
}

/**
 * Format a role to a human-readable label
 */
export function formatRole(role, fallback = 'Unknown') {
  if (!role) return fallback
  return role.charAt(0).toUpperCase() + role.slice(1)
}

/**
 * Format a number with commas
 */
export function formatNumber(num, fallback = '0') {
  if (num === null || num === undefined || isNaN(num)) return fallback
  return Number(num).toLocaleString()
}

/**
 * Format a percentage
 */
export function formatPercentage(value, decimals = 1, fallback = '0%') {
  if (value === null || value === undefined || isNaN(value)) return fallback
  return `${Number(value).toFixed(decimals)}%`
}

/**
 * Format a duration in seconds to human-readable
 */
export function formatDuration(seconds, fallback = '0s') {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return fallback
  
  const secs = Math.floor(seconds)
  if (secs < 60) return `${secs}s`
  
  const mins = Math.floor(secs / 60)
  const remainingSecs = secs % 60
  if (mins < 60) return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`
  
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}s` : `${hours}h`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50, fallback = '-') {
  if (!text) return fallback
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Format a user object to a display name
 */
export function formatUserName(user, fallback = 'Unknown') {
  if (!user) return fallback
  if (typeof user === 'string') return user
  return user.username || user.name || fallback
}

/**
 * Format an array to a comma-separated list
 */
export function formatList(arr, fallback = '-', maxItems = 3) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return fallback
  if (arr.length <= maxItems) return arr.join(', ')
  return `${arr.slice(0, maxItems).join(', ')} +${arr.length - maxItems} more`
}

/**
 * Format a rating with stars
 */
export function formatRating(rating, fallback = '-') {
  if (rating === null || rating === undefined || isNaN(rating)) return fallback
  const num = parseFloat(rating)
  if (num === 0) return fallback
  return `${num.toFixed(1)}★`
}

/**
 * Safe text encoding - handles potential encoding issues
 */
export function safeText(text, fallback = '-') {
  if (!text) return fallback
  try {
    // Handle potential encoding issues
    const decoded = decodeURIComponent(encodeURIComponent(text))
    return decoded
  } catch {
    return text || fallback
  }
}

