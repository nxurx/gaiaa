// ── API SERVICE LAYER ──────────────────────────────────────────────────────────
// All communication with the Gaia backend goes through this file.
// Local dev: Vite proxy at /api → localhost:5000
// Production: set VITE_API_URL to your deployed Gaia backend (e.g. https://gaia.yourdomain.com)
// When hosted at greensolutions.cc/gaia, set VITE_API_URL=https://your-gaia-backend.vercel.app

const RAW_API_BASE = (import.meta.env.VITE_API_URL || '').trim()
const API_BASE     = RAW_API_BASE.replace(/\/+$/, '')
const BASE         = API_BASE ? `${API_BASE}/api` : '/api'

// ── Token Management ───────────────────────────────────────────────────────────
export function getToken()  { return localStorage.getItem('gs_jwt') }
export function setToken(t) { localStorage.setItem('gs_jwt', t) }
export function clearToken(){ localStorage.removeItem('gs_jwt') }

function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────────
async function req(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  }
  if (body) opts.body = JSON.stringify(body)

  const res  = await fetch(`${BASE}${path}`, opts)
  const data = await safeJson(res)

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`
    throw new ApiError(msg, res.status, data?.errors || [])
  }
  return data
}

async function publicReq(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  const res  = await fetch(`${BASE}${path}`, opts)
  const data = await safeJson(res)

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`
    throw new ApiError(msg, res.status, data?.errors || [])
  }
  return data
}

async function safeJson(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message)
    this.status  = status
    this.errors  = errors
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) => req('POST', '/auth/login', { username, password }),
  getMe: ()                   => req('GET',  '/auth/me'),
}

// ── Users (admin only) ────────────────────────────────────────────────────────
export const usersApi = {
  list:       (params = {}) => req('GET',    '/users?' + new URLSearchParams(params)),
  create:     (body)        => req('POST',   '/users', body),
  deactivate: (id)          => req('PATCH',  `/users/${id}/deactivate`),
  reactivate: (id)          => req('PATCH',  `/users/${id}/reactivate`),
  delete:     (id)          => req('DELETE', `/users/${id}`),

  uploadCsvList:  (agentId, name, rows) => req('POST',   `/users/${agentId}/csv-lists`, { name, rows }),
  getCsvLists:    (agentId)             => req('GET',    `/users/${agentId}/csv-lists`),
  getCsvListById: (agentId, listId)     => req('GET',    `/users/${agentId}/csv-lists/${listId}`),
  deleteCsvList:  (agentId, listId)     => req('DELETE', `/users/${agentId}/csv-lists/${listId}`),
}

// ── Leads ──────────────────────────────────────────────────────────────────────
export const leadsApi = {
  submit:       (body)        => publicReq('POST', '/leads', body),
  bulkImport:   (body)        => req('POST', '/leads/bulk-import', body),
  list:         (params = {}) => req('GET',   '/leads?' + new URLSearchParams(params)),
  get:          (id)          => req('GET',   `/leads/${id}`),
  assign:       (id, agentId) => req('PATCH', `/leads/${id}/assign`, { assignedTo: agentId }),
  updateStatus: (id, status)  => req('PATCH', `/leads/${id}/status`, { status }),
}

// ── Calls ──────────────────────────────────────────────────────────────────────
export const callsApi = {
  list:   (params = {}) => req('GET',  '/calls?' + new URLSearchParams(params)),
  create: (body)        => req('POST', '/calls', body),
}

// ── Analytics (admin only) ────────────────────────────────────────────────────
export const analyticsApi = {
  overview:  (params = {})    => req('GET', '/analytics/overview?' + new URLSearchParams(params)),
  userStats: (id, params = {})=> req('GET', `/analytics/user/${id}?` + new URLSearchParams(params)),
}

// ── Settings ───────────────────────────────────────────────────────────────────
export const settingsApi = {
  get:           ()            => req('GET',  '/settings'),
  getMy:         ()            => req('GET',  '/settings/me'),
  update:        (body)        => req('PATCH', '/settings', body),
  setUserOverride: (body)      => req('PATCH', '/settings/overrides', body),
  clearUserOverride: (body)   => req('DELETE', '/settings/overrides', body),
  testDiscord:   (webhookUrl)  => req('POST', '/settings/test-discord', { webhookUrl }),
  notify:        (body)        => req('POST', '/settings/notify', body),
}

// ── Scraper (Admin only) ───────────────────────────────────────────────────────
export const scraperApi = {
  start: (body) => {
    // Server-Sent Events for progress
    return fetch(`${BASE}/scraper/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    })
  },
  exportCSV: (body) => {
    return fetch(`${BASE}/scraper/export-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    })
  },
}
