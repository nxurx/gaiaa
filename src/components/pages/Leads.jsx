import { useState, useMemo, useEffect, useCallback } from 'react'
import { isPhone, isWebsite } from '../../utils'
import { leadsApi, usersApi } from '../../api'

const STATUS_COLORS = {
  uncalled:       'var(--text)',
  interested:     'var(--g)',
  'not-interested':'var(--r)',
  'no-answer':    'var(--y)',
  callback:       'var(--b)',
  skipped:        'var(--text)',
  voicemail:      'var(--y)',
  'wrong-number': 'var(--text)',
}

const STATUS_TO_BACKEND = {
  uncalled:         'new',
  interested:       'converted',
  'not-interested': 'lost',
  'no-answer':      'contacted',
  callback:         'contacted',
  voicemail:        'contacted',
}

const EMPTY_FORM = { name: '', email: '', phone: '', serviceRequested: '', message: '', source: 'form' }

export default function Leads({ leads, onLeads, onAddFiles, onPreview, toast, userObj, onRefreshLeads }) {
  const [search,          setSearch]          = useState('')
  const [nicheFilter,     setNicheFilter]     = useState('')
  const [statusFilter,    setStatusFilter]    = useState('')
  const [showAddForm,     setShowAddForm]     = useState(false)
  const [addForm,         setAddForm]         = useState(EMPTY_FORM)
  const [addSaving,       setAddSaving]       = useState(false)
  const [selectedLead,    setSelectedLead]    = useState(null)
  const [agents,          setAgents]          = useState([])
  const [assigningLeadId, setAssigningLeadId] = useState(null)
  const [assignLoading,   setAssignLoading]   = useState(false)
  const [updatingStatusId,setUpdatingStatusId]= useState(null)

  const isAdmin = userObj?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    usersApi.list({ limit: 100 })
      .then(d => setAgents((d.data || []).filter(u => u.role === 'agent' && u.isActive)))
      .catch(() => {})
  }, [isAdmin])

  function handleFiles(e) { onAddFiles(e.target.files); e.target.value = '' }

  function clearLeads() {
    if (!confirm('Clear all leads?')) return
    onLeads([])
    toast('Leads cleared.', 'warn')
  }

  function exportLeads() {
    if (!leads.length) { toast('Nothing to export.', 'warn'); return }
    const esc = v => '"' + String(v || '').replace(/"/g, '""') + '"'
    const hdrs = ['Name', 'Phone', 'Website', 'Rating', 'Reviews', 'Niche', 'Address', 'Status', 'Notes']
    const csv = [hdrs.map(esc).join(','), ...leads.map(l => [l.name, l.phone, l.website, l.rating, l.reviews, l.category, l.address, l.status, l.notes].map(esc).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `Green_Leads_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast(`${leads.length} leads exported.`)
  }

  async function handleAddLead() {
    if (!addForm.name.trim())             { toast('Business name is required.', 'warn'); return }
    if (!addForm.email.trim())            { toast('Email is required.', 'warn'); return }
    if (!addForm.phone.trim())            { toast('Phone is required.', 'warn'); return }
    if (!addForm.serviceRequested.trim()) { toast('Service requested is required.', 'warn'); return }
    setAddSaving(true)
    try {
      const res = await leadsApi.submit({
        name:             addForm.name.trim(),
        email:            addForm.email.trim().toLowerCase(),
        phone:            addForm.phone.trim(),
        serviceRequested: addForm.serviceRequested.trim(),
        message:          addForm.message.trim(),
        source:           addForm.source,
      })
      if (res.data) {
        onLeads([...leads, normaliseLead(res.data)])
        toast(`Lead "${addForm.name}" added.`)
        setAddForm(EMPTY_FORM)
        setShowAddForm(false)
      } else {
        toast(res.message || 'Failed to add lead.', 'warn')
      }
    } catch (e) {
      toast('Failed: ' + e.message, 'warn')
    } finally {
      setAddSaving(false)
    }
  }

  async function handleAssign(leadId, agentId) {
    if (!agentId) return
    setAssignLoading(true)
    try {
      const res     = await leadsApi.assign(leadId, agentId)
      const updated = res.data
      onLeads(leads.map(l => l.id === leadId ? { ...l, assignedTo: updated.assignedTo, status: 'callback' } : l))
      toast(`Lead assigned to ${updated.assignedTo?.username || 'agent'}.`)
      setAssigningLeadId(null)
    } catch (e) {
      toast('Failed to assign: ' + e.message, 'warn')
    } finally {
      setAssignLoading(false)
    }
  }

  async function handleStatusUpdate(leadId, frontendStatus) {
    const backendStatus = STATUS_TO_BACKEND[frontendStatus] || 'contacted'
    setUpdatingStatusId(leadId)
    try {
      await leadsApi.updateStatus(leadId, backendStatus)
      onLeads(leads.map(l => l.id === leadId ? { ...l, status: frontendStatus } : l))
      if (selectedLead?.id === leadId) setSelectedLead(prev => ({ ...prev, status: frontendStatus }))
      toast('Status updated.')
    } catch (e) {
      toast('Failed to update status: ' + e.message, 'warn')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const niches = [...new Set(leads.map(l => l.category || 'General'))]

  const filtered = useMemo(() => leads.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.category || '').toLowerCase().includes(search.toLowerCase()) && !(l.phone || '').includes(search)) return false
    if (nicheFilter  && (l.category || '') !== nicheFilter)  return false
    if (statusFilter && l.status            !== statusFilter) return false
    return true
  }), [leads, search, nicheFilter, statusFilter])

  function starRating(rating) {
    const r = parseFloat(rating)
    if (!r) return '\u2014'
    return `${rating}\u2605`
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="gaia-strip">
        <div className="gaia-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg></div>
        <span className="gaia-label">G.A.I.A.</span>
        <span className="gaia-text">
          Full lead database. Click any row to view details{isAdmin ? ', assign to agents, or update status' : ' or update status'}.
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex-row wrap mb">
        <div className="flex-1" style={{ position: 'relative', minWidth: 180 }}>
          <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, stroke: 'var(--text)', strokeWidth: 2, fill: 'none', opacity: .5 }} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="inp" style={{ paddingLeft: 34 }} placeholder="Search leads\u2026" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="inp" style={{ width: 150, flex: 'none' }} value={nicheFilter} onChange={e => setNicheFilter(e.target.value)}>
          <option value="">All Niches</option>
          {niches.map(n => <option key={n}>{n}</option>)}
        </select>
        <select className="inp" style={{ width: 150, flex: 'none' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="uncalled">Not Called</option>
          <option value="interested">Interested</option>
          <option value="not-interested">Not Interested</option>
          <option value="no-answer">No Answer</option>
          <option value="callback">Callback</option>
          <option value="skipped">Skipped</option>
        </select>
        <button className="btn btn-primary btn-sm" style={{ flex: 'none' }} onClick={() => { setShowAddForm(v => !v); setAddForm(EMPTY_FORM) }}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          {showAddForm ? 'Cancel' : 'Add Lead'}
        </button>
        <label className="btn btn-outline btn-sm" htmlFor="dbFileInput" style={{ cursor: 'pointer', flex: 'none' }}>
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          Add CSV
        </label>
        <input type="file" id="dbFileInput" accept=".csv,text/csv,text/plain" multiple style={{ display: 'none' }} onChange={handleFiles} />
        <button className="btn btn-outline btn-sm" style={{ flex: 'none' }} onClick={exportLeads}>Export</button>
        <button className="btn btn-red btn-sm"     style={{ flex: 'none' }} onClick={clearLeads}>Clear</button>
      </div>

      {/* Add lead form */}
      {showAddForm && (
        <div className="card mb" style={{ borderColor: 'var(--g)', borderWidth: 1, borderStyle: 'solid' }}>
          <div className="section-head">
            <div className="section-title">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              Add Lead Manually
            </div>
          </div>
          <div className="g2" style={{ gap: 10, marginBottom: 10 }}>
            <div>
              <label className="input-label">Business Name *</label>
              <input className="inp" placeholder="Name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} disabled={addSaving} />
            </div>
            <div>
              <label className="input-label">Email *</label>
              <input className="inp" type="email" placeholder="email@example.com" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} disabled={addSaving} />
            </div>
          </div>
          <div className="g2" style={{ gap: 10, marginBottom: 10 }}>
            <div>
              <label className="input-label">Phone *</label>
              <input className="inp" placeholder="(xxx) xxx-xxxx" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} disabled={addSaving} />
            </div>
            <div>
              <label className="input-label">Service Requested *</label>
              <input className="inp" placeholder="e.g. HVAC, SEO, Dental" value={addForm.serviceRequested} onChange={e => setAddForm(f => ({ ...f, serviceRequested: e.target.value }))} disabled={addSaving} />
            </div>
          </div>
          <div className="g2" style={{ gap: 10, marginBottom: 12 }}>
            <div>
              <label className="input-label">Message / Notes</label>
              <textarea className="inp" placeholder="Optional notes\u2026" style={{ minHeight: 60 }} value={addForm.message} onChange={e => setAddForm(f => ({ ...f, message: e.target.value }))} disabled={addSaving} />
            </div>
            <div>
              <label className="input-label">Source</label>
              <select className="inp" value={addForm.source} onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))} disabled={addSaving}>
                <option value="form">Form</option>
                <option value="call">Call</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAddLead} disabled={addSaving}>
            {addSaving ? 'Adding\u2026' : 'Add Lead'}
          </button>
        </div>
      )}

      {/* Lead table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div>
            <div className="empty-title">{leads.length ? 'No matches' : 'No leads loaded'}</div>
            <div className="empty-sub">{leads.length ? 'Try a different filter.' : 'Add a lead or import a CSV to get started.'}</div>
          </div>
        </div>
      ) : (
        <div className="leads-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Phone</th>
                <th>Website</th>
                <th>Rating</th>
                <th>Reviews</th>
                <th>Niche</th>
                <th>Status</th>
                {isAdmin && <th>Assigned To</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const rat = parseFloat(l.rating) || 0
                return (
                  <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(l)}>
                    <td className="cell-name">{l.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: isPhone(l.phone) ? 'var(--g)' : 'var(--text)', opacity: isPhone(l.phone) ? 1 : .4 }}>
                      {isPhone(l.phone) ? l.phone : '\u2014'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {isWebsite(l.website) ? (
                        <button className="preview-btn" onClick={() => onPreview(l.website)}>
                          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="3" /></svg>
                          Preview
                        </button>
                      ) : <span style={{ opacity: .4 }}>\u2014</span>}
                    </td>
                    <td style={{ color: rat >= 4 ? 'var(--g)' : rat >= 3 ? 'var(--y)' : rat > 0 ? 'var(--r)' : 'var(--text)' }}>
                      {starRating(l.rating)}
                    </td>
                    <td style={{ color: 'var(--b)' }}>{l.reviews || '\u2014'}</td>
                    <td><span className="pill pill-m">{l.category || '\u2014'}</span></td>
                    <td>
                      <span className="pill" style={{
                        background:  `${STATUS_COLORS[l.status] || 'var(--text)'}18`,
                        color:        STATUS_COLORS[l.status] || 'var(--text)',
                        borderColor: `${STATUS_COLORS[l.status] || 'var(--text)'}44`,
                        border: '1px solid',
                      }}>
                        {(l.status || '\u2014').replace(/-/g, ' ')}
                      </span>
                    </td>
                    {isAdmin && (
                      <td onClick={e => e.stopPropagation()}>
                        {l.assignedTo
                          ? <span style={{ fontSize: 11, color: 'var(--b)' }}>{l.assignedTo.username || l.assignedTo}</span>
                          : <span style={{ opacity: .35, fontSize: 11 }}>Unassigned</span>}
                      </td>
                    )}
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {isAdmin && agents.length > 0 && (
                          assigningLeadId === l.id ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <select
                                className="inp"
                                style={{ padding: '2px 6px', fontSize: 10, height: 26, minWidth: 100 }}
                                defaultValue=""
                                onChange={e => { if (e.target.value) handleAssign(l.id, e.target.value) }}
                                disabled={assignLoading}
                              >
                                <option value="">Pick agent\u2026</option>
                                {agents.map(a => <option key={a._id} value={a._id}>{a.username}</option>)}
                              </select>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => setAssigningLeadId(null)}>\u2715</button>
                            </div>
                          ) : (
                            <button className="btn btn-outline btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setAssigningLeadId(l.id)}>Assign</button>
                          )
                        )}
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setSelectedLead(l)}>View</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead detail modal */}
      {selectedLead && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setSelectedLead(null)}
        >
          <div
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 24, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)' }}>{selectedLead.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text)', opacity: .5, textTransform: 'capitalize' }}>
                  {selectedLead.source} lead \u00b7 {selectedLead.category || 'General'}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLead(null)}>\u2715 Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Phone',   value: selectedLead.phone   || '\u2014' },
                { label: 'Email',   value: selectedLead.email   || '\u2014' },
                { label: 'Rating',  value: starRating(selectedLead.rating) },
                { label: 'Reviews', value: selectedLead.reviews || '\u2014' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg2)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text)', opacity: .4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--cream)', fontFamily: label === 'Phone' ? 'monospace' : 'inherit' }}>{value}</div>
                </div>
              ))}
            </div>

            {selectedLead.address && selectedLead.address !== '\u2014' && (
              <div style={{ background: 'var(--bg2)', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: 'var(--text)', opacity: .4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Address / Notes</div>
                <div style={{ fontSize: 12, color: 'var(--text)' }}>{selectedLead.address}</div>
              </div>
            )}

            {selectedLead.assignedTo && (
              <div style={{ background: 'var(--bg2)', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: 'var(--text)', opacity: .4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Assigned To</div>
                <div style={{ fontSize: 12, color: 'var(--b)' }}>{selectedLead.assignedTo.username || selectedLead.assignedTo}</div>
              </div>
            )}

            <div style={{ marginBottom: 8 }}>
              <label className="input-label">Update Status</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['uncalled', 'callback', 'interested', 'not-interested', 'no-answer'].map(s => (
                  <button
                    key={s}
                    className="btn btn-sm"
                    style={{
                      fontSize:   10,
                      background: selectedLead.status === s ? `${STATUS_COLORS[s]}22` : 'transparent',
                      color:      STATUS_COLORS[s] || 'var(--text)',
                      border:    `1px solid ${STATUS_COLORS[s] || 'var(--line)'}${selectedLead.status === s ? '' : '44'}`,
                      opacity:    updatingStatusId === selectedLead.id ? .5 : 1,
                    }}
                    disabled={updatingStatusId === selectedLead.id || selectedLead.status === s}
                    onClick={() => handleStatusUpdate(selectedLead.id, s)}
                  >
                    {s.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {isAdmin && agents.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <label className="input-label">Assign to Agent</label>
                <select
                  className="inp"
                  defaultValue=""
                  onChange={e => { if (e.target.value) handleAssign(selectedLead.id, e.target.value) }}
                  disabled={assignLoading}
                >
                  <option value="">Select agent\u2026</option>
                  {agents.map(a => <option key={a._id} value={a._id}>{a.username}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function normaliseLead(l) {
  const statusMap = { new: 'uncalled', contacted: 'callback', converted: 'interested', lost: 'not-interested' }
  return {
    id:         l._id,
    name:       l.name,
    email:      l.email              || '',
    phone:      l.phone              || '\u2014',
    website:    l.website            || '\u2014',
    category:   l.serviceRequested   || 'General',
    address:    l.message            || '\u2014',
    rating:     l.rating             || '0',
    reviews:    l.reviews            || '0',
    status:     statusMap[l.status]  || l.status || 'uncalled',
    notes:      l.notes              || '',
    calledAt:   l.updatedAt          || null,
    assignedTo: l.assignedTo         || null,
    source:     l.source             || 'form',
    raw:        l,
  }
}
