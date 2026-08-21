import { useState, useEffect, useCallback } from 'react'
import {
  getToken, clearToken, authApi, ApiError,
  leadsApi, callsApi,
} from './api'
import {
  loadLocalState, saveLeads, saveCalls, saveScripts, saveNotes,
  saveTheme, clearUser, addLeadsFromRows, handleFileRead,
  DEFAULT_SCRIPTS,
} from './utils'
import Auth  from './components/Auth'
import Shell from './components/Shell'
import Toast from './components/Toast'
import { SettingsProvider } from './contexts/SettingsContext'

export default function App() {
  // â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [user,     setUser]     = useState(null)      // full user object from backend
  const [authReady,setAuthReady]= useState(false)     // finished checking stored JWT

  // â”€â”€ App state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const local = loadLocalState()
  const [leads,   setLeads]   = useState([])
  const [calls,   setCalls]   = useState([])
  const [scripts, setScripts] = useState(local.scripts)
  const [notes,   setNotes]   = useState(local.notes)
  const [theme,   setTheme]   = useState(local.theme || '')

  const [activePage,  setActivePage]  = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activity,    setActivity]    = useState([])
  const [toastMsg,    setToastMsg]    = useState({ msg: '', type: 'green', key: 0 })

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toast = useCallback((msg, type = 'green') => {
    setToastMsg(prev => ({ msg, type, key: prev.key + 1 }))
  }, [])

  const addActivity = useCallback((text, type = 'g') => {
    setActivity(prev => [
      { text, type, time: new Date().toLocaleTimeString(), id: Date.now() },
      ...prev,
    ].slice(0, 8))
  }, [])

  // â”€â”€ Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    saveTheme(theme)
  }, [theme])

  // â”€â”€ Bootstrap: verify stored JWT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const token = getToken()
    if (!token) { setAuthReady(true); return }

    authApi.getMe()
      .then(data => {
        setUser(data.data)
        setAuthReady(true)
      })
      .catch(() => {
        // Token expired / invalid - clear and show login
        clearToken()
        setAuthReady(true)
      })
  }, [])

  // â”€â”€ Fetch leads + calls after login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!user) return
    fetchLeads()
    fetchCalls()
    if (!scripts.length) {
      setScripts(DEFAULT_SCRIPTS)
      saveScripts(DEFAULT_SCRIPTS)
    }
  }, [user])  // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchLeads(params = {}) {
    try {
      const data = await leadsApi.list({ limit: 500, ...params })
      // Normalise backend lead shape â†’ frontend shape
      const normalised = data.data.map(normaliseLead)
      setLeads(normalised)
    } catch (e) {
      toast('Failed to load leads: ' + e.message, 'warn')
    }
  }

  async function fetchCalls(params = {}) {
    try {
      const data = await callsApi.list({ limit: 500, ...params })
      const normalised = data.data.map(normaliseCall)
      setCalls(normalised)
    } catch (e) {
      toast('Failed to load calls: ' + e.message, 'warn')
    }
  }

  // â”€â”€ Auth handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLogin = useCallback((userObj) => {
    setUser(userObj)
  }, [])

  const handleLogout = useCallback(() => {
    clearToken()
    clearUser()
    setUser(null)
    setLeads([])
    setCalls([])
    setActivePage('dashboard')
  }, [])

  // â”€â”€ Lead handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLeadsUpdate = useCallback((updated) => {
    setLeads(prev => {
      const next = typeof updated === 'function' ? updated(prev) : updated
      saveLeads(next)
      return next
    })
  }, [])

  const handleCallsUpdate = useCallback((updated) => {
    setCalls(prev => {
      const next = typeof updated === 'function' ? updated(prev) : updated
      saveCalls(next)
      return next
    })
  }, [])

  const handleScriptsUpdate = useCallback((s) => {
    setScripts(prev => {
      const next = typeof s === 'function' ? s(prev) : s
      saveScripts(next)
      return next
    })
  }, [])

  const handleNotesUpdate = useCallback((n) => {
    setNotes(prev => {
      const next = typeof n === 'function' ? n(prev) : n
      saveNotes(next)
      return next
    })
  }, [])

  // â”€â”€ File import â†’ create leads via API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAddFiles = useCallback((files) => {
    if (!files || !files.length) return
    const fileArr = Array.from(files)
    let done = 0, totalAdded = 0

    fileArr.forEach(file => {
      handleFileRead(file, async ({ headers, rows }) => {
        const newLeads = addLeadsFromRows(leads, rows, headers)
        totalAdded += newLeads.length

        // POST each new lead to backend
        const created = []
        for (const l of newLeads) {
          try {
            const res = await leadsApi.submit({
              name:             l.name,
              email:            l.email || `noreply+${Date.now()}@import.local`,
              phone:            l.phone && l.phone !== '-' && l.phone !== '-' ? l.phone : '0000000000',
              serviceRequested: l.category || 'General',
              message:          l.address || '',
              website:          l.website && l.website !== '-' && l.website !== '-' ? l.website : '',
              industry:         l.category || 'General',
              address:          l.address && l.address !== '-' && l.address !== '-' ? l.address : '',
              rating:           String(l.rating || ''),
              reviews:          String(l.reviews || ''),
              source:           'form',
            })
            if (res.data) created.push(normaliseLead(res.data))
          } catch {
            // If backend rejects, keep local version as fallback
            created.push(l)
          }
        }

        setLeads(prev => {
          const updated = [...prev, ...created]
          saveLeads(updated)
          return updated
        })

        if (++done === fileArr.length) {
          toast(totalAdded > 0
            ? `${totalAdded} leads added.`
            : 'No new leads found (check columns).')
        }
      }, (err) => {
        toast(err, 'warn')
        if (++done === fileArr.length && totalAdded > 0) toast(`${totalAdded} leads added.`)
      })
    })
  }, [leads, toast])

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!authReady) return null   // silent boot - no flash

  return (
    <SettingsProvider>
      <>
        {!user && (
          <Auth
            theme={theme}
            onTheme={setTheme}
            onLogin={handleLogin}
            toast={toast}
          />
        )}
        {user && (
          <Shell
            user={user.username || user}
            userObj={user}
            theme={theme}
            onTheme={setTheme}
            onLogout={handleLogout}
            activePage={activePage}
            onNav={setActivePage}
            sidebarOpen={sidebarOpen}
            onSidebar={setSidebarOpen}
            leads={leads}
            calls={calls}
            scripts={scripts}
            notes={notes}
            onLeads={handleLeadsUpdate}
            onCalls={handleCallsUpdate}
            onScripts={handleScriptsUpdate}
            onNotes={handleNotesUpdate}
            onAddFiles={handleAddFiles}
            activity={activity}
            onActivity={addActivity}
            toast={toast}
            onRefreshLeads={fetchLeads}
            onRefreshCalls={fetchCalls}
          />
        )}
        <Toast msg={toastMsg.msg} type={toastMsg.type} msgKey={toastMsg.key} />
      </>
    </SettingsProvider>
  )
}

// â”€â”€ Shape normalisers (backend â†’ frontend) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function normaliseLead(l) {
  const assigned = l.assignedTo?.username || l.assignedTo || null
  return {
    id:         l._id,
    name:       l.name || 'Unnamed lead',
    email:      l.email      || '',
    phone:      l.phone      || '-',
    company:    l.company    || l.name || '',
    website:    l.website    || '-',
    category:   l.industry || l.serviceRequested || 'General',
    address:    l.address || l.message || '-',
    rating:     l.rating     || '0',
    reviews:    l.reviews    || '0',
    status:     mapLeadStatus(l.status),
    notes:      l.notes      || '',
    calledAt:   l.updatedAt  || null,
    assignedTo: assigned,
    appointmentAt: l.appointmentAt || null,
    tags:       l.tags || [],
    priority:   l.priority || 'normal',
    campaign:   l.campaign || '',
    customFields: l.customFields || {},
    enrichment: l.enrichment || {},
    source:     l.source     || 'form',
    raw:        l,
  }
}

function normaliseCall(c) {
  return {
    id:      c._id,
    name:    c.lead?.name  || c.notes?.split(' ')?.[0] || 'Unknown',
    phone:   c.lead?.phone || '-',
    outcome: mapCallStatus(c.status),
    niche:   c.lead?.serviceRequested || '',
    notes:   c.notes       || '',
    time:    new Date(c.createdAt).toLocaleTimeString(),
    date:    new Date(c.createdAt).toLocaleDateString(),
    duration: c.duration   || 0,
    leadId:  c.lead?._id   || c.lead || null,
    agentId: c.agent?._id  || c.agent || null,
    raw:     c,
  }
}

// Backend status â†’ frontend status
function mapLeadStatus(s) {
  return ({ new: 'uncalled', contacted: 'callback', converted: 'interested', lost: 'not-interested' })[s] || s || 'uncalled'
}
// Backend call status â†’ frontend outcome
function mapCallStatus(s) {
  return ({ answered: 'interested', missed: 'no-answer', no_answer: 'no-answer' })[s] || s || 'no-answer'
}

