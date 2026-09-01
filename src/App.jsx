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
  // This is the ONE working path leads.controller#bulkImportLeads writes real DB
  // records through - CSV rows sent here become genuine Lead documents that show
  // up in the call queue on every page and survive a refresh.
  const handleAddFiles = useCallback((files) => {
    if (!files || !files.length) return
    const fileArr = Array.from(files)
    let done = 0, totalAdded = 0, totalSkipped = 0, totalErrored = 0
    const allErrors = []

    function finish() {
      if (++done !== fileArr.length) return
      if (totalAdded === 0 && (totalSkipped > 0 || totalErrored > 0)) {
        const reason = totalSkipped > 0 && totalErrored === 0
          ? `All ${totalSkipped} row(s) were already in the database (duplicates).`
          : allErrors[0]
            ? `${totalErrored} row(s) failed. First error: ${allErrors[0]}`
            : 'No rows could be imported (check CSV format).'
        toast(reason, 'warn')
      }
    }

    fileArr.forEach(file => {
      handleFileRead(file, async ({ headers, rows }) => {
        if (!rows.length) {
          toast(`${file.name}: CSV has headers but no data rows.`, 'warn')
          finish()
          return
        }

        try {
          // Use bulk import API instead of individual POST requests
          const res = await leadsApi.bulkImport({
            leads: rows,
            source: 'csv_import',
            industry: 'General',
          })

          const imported = res.data?.leads || []
          const skipped  = res.data?.skipped || 0
          const errors   = res.data?.errors || []

          if (imported.length) {
            const newLeads = imported.map(normaliseLead)
            totalAdded += newLeads.length

            setLeads(prev => {
              const updated = [...prev, ...newLeads]
              saveLeads(updated)
              return updated
            })
          }

          totalSkipped += skipped
          totalErrored += errors.length
          errors.forEach(e => allErrors.push(`${e.name}: ${e.error}`))

          // Only ever claim success for rows genuinely written to the database.
          if (imported.length) {
            const bits = [`✓ ${imported.length} lead${imported.length === 1 ? '' : 's'} imported from ${file.name}.`]
            if (skipped) bits.push(`${skipped} duplicate${skipped === 1 ? '' : 's'} skipped.`)
            if (errors.length) bits.push(`${errors.length} row${errors.length === 1 ? '' : 's'} failed.`)
            toast(bits.join(' '), errors.length ? 'warn' : 'green')
          } else if (skipped && !errors.length) {
            toast(`${file.name}: all ${skipped} row(s) already exist in the database - nothing new to import.`, 'warn')
          } else if (errors.length) {
            toast(`${file.name}: ${errors.length} row(s) failed - ${errors[0].name}: ${errors[0].error}`, 'warn')
          } else {
            toast(`${file.name}: no leads were imported.`, 'warn')
          }
        } catch (err) {
          toast(`${file.name}: CSV import failed - ` + err.message, 'warn')
        }

        finish()
      }, (err) => {
        toast('CSV parsing failed: ' + err, 'warn')
        finish()
      })
    })
  }, [toast])

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
// export function normaliseLead(l) {
//   const assigned = l.assignedTo?.username || l.assignedTo || null
//   return {
//     id:         l._id,
//     name:       l.name || 'Unnamed lead',
//     email:      l.email      || '',
//     phone:      l.phone      || '-',
//     company:    l.company    || l.name || '',
//     website:    l.website    || '-',
//     category:   l.industry || l.serviceRequested || 'General',
//     address:    l.address || l.message || '-',
//     rating:     l.rating     || '0',
//     reviews:    l.reviews    || '0',
//     status:     mapLeadStatus(l.status),
//     notes:      l.notes      || '',
//     calledAt:   l.updatedAt  || null,
//     assignedTo: assigned,
//     appointmentAt: l.appointmentAt || null,
//     tags:       l.tags || [],
//     priority:   l.priority || 'normal',
//     campaign:   l.campaign || '',
//     customFields: l.customFields || {},
//     enrichment: l.enrichment || {},
//     source:     l.source     || 'form',
//     raw:        l,
//   }
// }

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

