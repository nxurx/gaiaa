import { useState, useEffect, useRef } from 'react'
import { parseCSV } from '../../utils'
import { usersApi, settingsApi } from '../../api'
import { useSettings } from '../../contexts/SettingsContext'

export default function Settings({ user, userObj, onLogout, theme, onTheme, toast, onRefreshLeads, onRefreshCalls }) {
  const { settings, loading: settingsLoading, updateSettings, testDiscord, refetch } = useSettings()
  
  const [webhookStatus, setWebhookStatus] = useState('none')
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)

  // User management (admin only)
  const [users,        setUsers]        = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userForm,     setUserForm]     = useState({ username: '', password: '', role: 'agent' })
  const [creatingUser, setCreatingUser] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // CSV upload state
  const [csvTarget,    setCsvTarget]    = useState(null)   // agent object to assign list to
  const [csvListName,  setCsvListName]  = useState('')
  const [csvUploading, setCsvUploading] = useState(false)
  const [agentLists,   setAgentLists]   = useState({})     // { agentId: [...lists] }
  const [expandedAgent, setExpandedAgent] = useState(null)
  const csvInputRef = useRef(null)

  const displayName = typeof user === 'string' ? user : userObj?.username || 'User'
  const role        = userObj?.role || 'agent'
  const isAdmin     = role === 'admin'

  // Discord delivery is configured on the server, so the browser never holds
  // the webhook URL or sends messages directly to Discord.
  useEffect(() => {
    if (settings?.discord?.enabled) {
      setWebhookStatus('configured')
    }
  }, [settings])

  // Load users on mount if admin
  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUsers() {
    setLoadingUsers(true)
    try {
      const data = await usersApi.list({ limit: 100 })
      setUsers(data.data || [])
    } catch (e) {
      toast('Failed to load users: ' + e.message, 'warn')
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleCreateUser() {
    if (!userForm.username.trim()) { toast('Enter a username.', 'warn'); return }
    if (!userForm.password)        { toast('Enter a password (min 8 chars).', 'warn'); return }
    if (userForm.password.length < 8) { toast('Password must be at least 8 characters.', 'warn'); return }
    setCreatingUser(true)
    try {
      await usersApi.create({ username: userForm.username.trim().toLowerCase(), password: userForm.password, role: userForm.role })
      toast(`User "${userForm.username}" created successfully.`)
      setUserForm({ username: '', password: '', role: 'agent' })
      setShowCreateForm(false)
      loadUsers()
    } catch (e) {
      toast('Failed: ' + e.message, 'warn')
    } finally {
      setCreatingUser(false)
    }
  }

  async function handleDeactivateUser(id, username) {
    if (!confirm(`Deactivate "${username}"? They won't be able to log in.`)) return
    try {
      await usersApi.deactivate(id)
      toast(`${username} deactivated.`)
      loadUsers()
    } catch (e) {
      toast('Failed: ' + e.message, 'warn')
    }
  }

  async function handleReactivateUser(id, username) {
    try {
      await usersApi.reactivate(id)
      toast(`${username} reactivated.`)
      loadUsers()
    } catch (e) {
      toast('Failed: ' + e.message, 'warn')
    }
  }

  async function handleDeleteUser(id, username) {
    if (!confirm(`Permanently DELETE "${username}"? This cannot be undone. All their CSV lists will also be removed.`)) return
    try {
      await usersApi.delete(id)
      toast(`${username} permanently deleted.`)
      loadUsers()
    } catch (e) {
      toast('Failed: ' + e.message, 'warn')
    }
  }

  // â”€â”€ CSV List Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function openCsvUpload(agent) {
    setCsvTarget(agent)
    setCsvListName('')
    setTimeout(() => csvInputRef.current?.click(), 50)
  }

  function handleCsvFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''  // reset so same file can be re-picked

    const reader = new FileReader()
    reader.onload = async (ev) => {
      let text = ev.target.result
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      const { rows } = parseCSV(text)
      if (!rows.length) { toast('No data rows found in CSV.', 'warn'); return }

      const listName = csvListName.trim() || `${file.name.replace(/\.csv$/i, '')} - ${new Date().toLocaleDateString()}`
      setCsvUploading(true)
      try {
        await usersApi.uploadCsvList(csvTarget._id, listName, rows)
        toast(`✓ ${rows.length} rows uploaded to ${csvTarget.username}.`)
        setCsvTarget(null)
        // refresh lists for that agent if expanded
        if (expandedAgent === csvTarget._id) loadAgentLists(csvTarget._id)
      } catch (err) {
        toast('Upload failed: ' + err.message, 'warn')
      } finally {
        setCsvUploading(false)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function loadAgentLists(agentId) {
    try {
      const data = await usersApi.getCsvLists()
      // Filter lists for this specific agent
      const agentLists = (data.data || []).filter(list => 
        list.assignedTo?._id === agentId || list.assignedTo === agentId
      )
      setAgentLists(prev => ({ ...prev, [agentId]: agentLists }))
    } catch (e) {
      toast('Failed to load lists: ' + e.message, 'warn')
    }
  }

  function toggleAgentLists(agentId) {
    if (expandedAgent === agentId) {
      setExpandedAgent(null)
    } else {
      setExpandedAgent(agentId)
      loadAgentLists(agentId)
    }
  }

  async function handleDeleteList(agentId, listId, listName) {
    if (!confirm(`Delete list "${listName}"?`)) return
    try {
      await usersApi.deleteCsvList(null, listId)
      toast('List deleted.')
      loadAgentLists(agentId)
    } catch (e) {
      toast('Failed: ' + e.message, 'warn')
    }
  }

  // Webhook
  async function saveWebhook() {
    setSaving(true)
    try {
      const result = await updateSettings({ discord: { enabled: true } })
      if (!result.success) {
        toast('Failed to save Discord integration: ' + result.error, 'warn')
        return
      }

      const delivery = await testDiscord()
      setWebhookStatus(delivery.success ? 'connected' : 'failed')
      toast(delivery.success ? 'Saved and sent a Discord test embed.' : 'Saved, but Discord delivery failed.', delivery.success ? 'green' : 'red')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  async function testWebhook() {
    const result = await testDiscord()
    setWebhookStatus(result.success ? 'connected' : 'failed')
    toast(result.success ? 'Discord connected!' : 'Failed. Check webhook URL.', result.success ? 'green' : 'red')
  }

  async function syncFromServer() {
    setSyncing(true)
    try {
      await Promise.all([onRefreshLeads?.(), onRefreshCalls?.()])
      toast('Synced with server.')
    } catch {
      toast('Sync failed.', 'warn')
    } finally {
      setSyncing(false)
    }
  }

  function clearAll() {
    if (!confirm('Clear ALL local data? This cannot be undone.')) return
    localStorage.clear()
    location.reload()
  }

  function exportAll() {
    const data = {
      leads:      JSON.parse(localStorage.getItem('gs_leads')   || '[]'),
      calls:      JSON.parse(localStorage.getItem('gs_calls')   || '[]'),
      scripts:    JSON.parse(localStorage.getItem('gs_scripts') || '[]'),
      exportedAt: new Date().toISOString()
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = `Green_Export_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    toast('All data exported.')
  }

  const statusDot = webhookStatus === 'connected' || webhookStatus === 'configured' || webhookStatus === 'saved'
    ? { color: 'var(--g)', text: webhookStatus === 'connected' ? 'Connected ✓' : 'Webhook configured' }
    : webhookStatus === 'failed'
      ? { color: 'var(--r)', text: 'Failed' }
      : { color: 'var(--text)', text: 'Not configured' }

  const agents = users.filter(u => u.role === 'agent')

  return (
    <div style={{ maxWidth: 660 }}>
      {/* Hidden CSV file input */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleCsvFileChange}
      />

      <div className="gaia-strip">
        <div className="gaia-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg></div>
        <span className="gaia-label">G.A.I.A.</span>
        <span className="gaia-text">Configure Discord once and all notes fire there automatically.</span>
      </div>

      {/* â”€â”€ User Management (Admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isAdmin && (
        <div className="card mb">
          <div className="section-head">
            <div className="section-title">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
              User Management
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(v => !v)}>
              {showCreateForm ? 'Cancel' : '+ New User'}
            </button>
          </div>

          {/* Create user form */}
          {showCreateForm && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--cream)', marginBottom: 2 }}>Create New User</div>
              <div className="g2" style={{ gap: 10 }}>
                <div>
                  <label className="input-label">Username</label>
                  <input
                    className="inp"
                    placeholder="username"
                    value={userForm.username}
                    onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                    disabled={creatingUser}
                  />
                </div>
                <div>
                  <label className="input-label">Password</label>
                  <input
                    type="password"
                    className="inp"
                    placeholder="min 8 characters"
                    value={userForm.password}
                    onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                    disabled={creatingUser}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Role</label>
                  <select className="inp" value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} disabled={creatingUser}>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleCreateUser} disabled={creatingUser} style={{ flexShrink: 0, marginBottom: 0 }}>
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          )}

          {/* User list */}
          {loadingUsers ? (
            <div style={{ fontSize: 12, color: 'var(--text)', opacity: .5, padding: '8px 0' }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text)', opacity: .5, padding: '8px 0' }}>No users found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {users.map(u => (
                <div key={u._id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    background: 'var(--bg2)', borderRadius: expandedAgent === u._id ? '6px 6px 0 0' : 6,
                    border: '1px solid var(--line2)',
                    borderBottom: expandedAgent === u._id ? '1px solid var(--line2)' : undefined,
                  }}>
                    <div className="chip-av" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: u.isActive ? 'var(--cream)' : 'var(--text)', opacity: u.isActive ? 1 : .5 }}>
                        {u.username}
                        {u._id === userObj?._id && <span style={{ fontSize: 9, marginLeft: 6, color: 'var(--g)', opacity: .7 }}>you</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text)', opacity: .5, textTransform: 'capitalize' }}>{u.role}</div>
                    </div>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                      background: u.isActive ? 'rgba(62,207,106,.12)' : 'rgba(200,50,50,.12)',
                      color: u.isActive ? 'var(--g)' : 'var(--r)',
                      border: `1px solid ${u.isActive ? 'rgba(62,207,106,.3)' : 'rgba(200,50,50,.3)'}`,
                    }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>

                    {/* CSV list toggle (agents only) */}
                    {u.role === 'agent' && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0 }}
                        onClick={() => toggleAgentLists(u._id)}
                        title="View / upload CSV lists"
                      >
                        <svg viewBox="0 0 24 24" style={{ width: 11, height: 11 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        Lists
                      </button>
                    )}

                    {u._id !== userObj?._id && (
                      <>
                        {u.isActive ? (
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, background: 'rgba(200,100,0,.15)', color: 'var(--y)', border: '1px solid rgba(200,100,0,.3)' }}
                            onClick={() => handleDeactivateUser(u._id, u.username)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, background: 'rgba(62,207,106,.12)', color: 'var(--g)', border: '1px solid rgba(62,207,106,.3)' }}
                            onClick={() => handleReactivateUser(u._id, u.username)}
                          >
                            Reactivate
                          </button>
                        )}
                        <button
                          className="btn btn-sm"
                          style={{ fontSize: 10, padding: '3px 8px', flexShrink: 0, background: 'rgba(200,50,50,.15)', color: 'var(--r)', border: '1px solid rgba(200,50,50,.3)' }}
                          onClick={() => handleDeleteUser(u._id, u.username)}
                          title="Permanently delete user"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>

                  {/* CSV lists panel */}
                  {expandedAgent === u._id && u.role === 'agent' && (
                    <div style={{
                      background: 'var(--bg)', border: '1px solid var(--line2)', borderTop: 'none',
                      borderRadius: '0 0 6px 6px', padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text)', opacity: .5, textTransform: 'uppercase', letterSpacing: 1 }}>
                          CSV Lists for {u.username}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            className="inp"
                            style={{ fontSize: 10, padding: '3px 8px', width: 130 }}
                            placeholder="List name (optional)"
                            value={csvListName}
                            onChange={e => setCsvListName(e.target.value)}
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 10, padding: '3px 10px' }}
                            onClick={() => openCsvUpload(u)}
                            disabled={csvUploading}
                          >
                            {csvUploading && csvTarget?._id === u._id ? 'Uploading...' : '+ Upload CSV'}
                          </button>
                        </div>
                      </div>

                      {!agentLists[u._id] ? (
                        <div style={{ fontSize: 11, opacity: .4 }}>Loading...</div>
                      ) : agentLists[u._id].length === 0 ? (
                        <div style={{ fontSize: 11, opacity: .4 }}>No lists assigned yet. Upload a CSV above.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {agentLists[u._id].map(list => (
                            <div key={list._id} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 8px', background: 'var(--bg2)',
                              borderRadius: 5, border: '1px solid var(--line2)',
                            }}>
                              <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, opacity: .5, flexShrink: 0 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, color: 'var(--cream)', fontWeight: 500 }}>{list.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text)', opacity: .4 }}>
                                  {list.rowCount} rows - {new Date(list.createdAt).toLocaleDateString()} - by {list.uploadedBy?.username || 'admin'}
                                </div>
                              </div>
                              <button
                                className="btn btn-sm"
                                style={{ fontSize: 9, padding: '2px 7px', background: 'rgba(200,50,50,.12)', color: 'var(--r)', border: '1px solid rgba(200,50,50,.25)' }}
                                onClick={() => handleDeleteList(u._id, list._id, list.name)}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Discord â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isAdmin && (
        <div className="card mb">
          <div className="section-head">
            <div className="section-title"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>Discord Integration</div>
          </div>
        <div className="setting-row">
          <label className="input-label">Discord delivery</label>
          <input 
            className="inp" 
            value="Server-managed webhook"
            readOnly
            disabled={settingsLoading || saving}
          />
          <div className="webhook-status">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot.color }} />
            <span style={{ fontSize: 11, color: statusDot.color }}>{statusDot.text}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={saveWebhook} disabled={settingsLoading || saving}>
            {saving ? 'Saving...' : 'Save & Send'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={testWebhook} disabled={settingsLoading || saving}>
            Test Connection
          </button>
        </div>
      </div>
      )}

      {/* â”€â”€ Calendly (Admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isAdmin && (
        <div className="card mb">
          <div className="section-head">
            <div className="section-title"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>Calendly Integration</div>
          </div>
          <div className="setting-row">
            <label className="input-label">Calendly URL</label>
            <input 
              className="inp" 
              placeholder="https://calendly.com/your-username/30min" 
              value={settings?.calendly?.url || ''} 
              onChange={e => updateSettings({ calendly: { ...settings?.calendly, url: e.target.value } })}
              disabled={settingsLoading}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input 
              type="checkbox" 
              id="calendly-enabled"
              checked={settings?.calendly?.enabled || false}
              onChange={e => updateSettings({ calendly: { ...settings?.calendly, enabled: e.target.checked } })}
              disabled={settingsLoading}
            />
            <label htmlFor="calendly-enabled" style={{ fontSize: 12, color: 'var(--text)' }}>Enable appointment booking</label>
          </div>
        </div>
      )}

      {/* â”€â”€ Call Queue Settings (Admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isAdmin && (
        <div className="card mb">
          <div className="section-head">
            <div className="section-title"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.96 9.7 19.79 19.79 0 01.9 1.1 2 2 0 012.88.01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" /></svg>Call Queue Settings</div>
          </div>
          <div className="setting-row">
            <label className="input-label">Default Status for New Leads</label>
            <select 
              className="inp"
              value={settings?.callQueue?.defaultStatus || 'new'}
              onChange={e => updateSettings({ callQueue: { ...settings?.callQueue, defaultStatus: e.target.value } })}
              disabled={settingsLoading}
            >
              <option value="new">New (Uncalled)</option>
              <option value="contacted">Contacted</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="checkbox" 
                id="auto-assign"
                checked={settings?.callQueue?.autoAssign || false}
                onChange={e => updateSettings({ callQueue: { ...settings?.callQueue, autoAssign: e.target.checked } })}
                disabled={settingsLoading}
              />
              <label htmlFor="auto-assign" style={{ fontSize: 12, color: 'var(--text)' }}>Auto-assign new leads to agents</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="checkbox" 
                id="round-robin"
                checked={settings?.callQueue?.roundRobinAssignment || false}
                onChange={e => updateSettings({ callQueue: { ...settings?.callQueue, roundRobinAssignment: e.target.checked } })}
                disabled={settingsLoading}
              />
              <label htmlFor="round-robin" style={{ fontSize: 12, color: 'var(--text)' }}>Use round-robin assignment</label>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Notification Settings (Admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isAdmin && (
        <div className="card mb">
          <div className="section-head">
            <div className="section-title"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>Notification Settings</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { key: 'onLeadCreate', label: 'Notify on new lead creation' },
              { key: 'onLeadUpdate', label: 'Notify on lead updates' },
              { key: 'onAppointmentBook', label: 'Notify on appointment booking' },
              { key: 'onCallComplete', label: 'Notify on call completion' },
              { key: 'onLeadConvert', label: 'Notify on lead conversion' },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  type="checkbox" 
                  id={key}
                  checked={settings?.notifications?.[key] || false}
                  onChange={e => updateSettings({ notifications: { ...settings?.notifications, [key]: e.target.checked } })}
                  disabled={settingsLoading}
                />
                <label htmlFor={key} style={{ fontSize: 12, color: 'var(--text)' }}>{label}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="card mb">
        <div className="section-head">
          <div className="section-title"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>Theme</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { t: '',     cls: 'tp-g', label: 'Green'    },
            { t: 'red',  cls: 'tp-r', label: 'Dark Red' },
            { t: 'mono', cls: 'tp-m', label: 'Mono'     },
          ].map(({ t, cls, label }) => (
            <button
              key={t}
              className={`btn btn-outline btn-sm${theme === t ? ' active' : ''}`}
              style={theme === t ? { borderColor: 'var(--g)', color: 'var(--g)' } : {}}
              onClick={() => onTheme(t)}
            >
              <span className={`theme-dot ${cls}`} style={{ width: 12, height: 12, border: 'none', flexShrink: 0 }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* â”€â”€ Account â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="card mb">
        <div className="section-head">
          <div className="section-title"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>Account</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
          Logged in as <strong style={{ color: 'var(--cream)' }}>{displayName}</strong>
          <span className="pill pill-m" style={{ fontSize: 10, textTransform: 'capitalize' }}>{role}</span>
        </div>
        <button className="btn btn-red btn-sm" onClick={onLogout}>
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          Logout
        </button>
      </div>

      {/* â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="card">
        <div className="section-head">
          <div className="section-title"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /></svg>Data</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={syncFromServer} disabled={syncing}>
            <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.86" /></svg>
            {syncing ? 'Syncing...' : 'Sync from Server'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportAll}>Export JSON</button>
          <button className="btn btn-red btn-sm" onClick={clearAll}>Clear Local Data</button>
        </div>
      </div>
    </div>
  )
}
