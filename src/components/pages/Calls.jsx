import { useState } from 'react'
import { callsApi, leadsApi } from '../../api'

const OUTCOME_COLORS = {
  interested:       'var(--g)',
  'not-interested': 'var(--r)',
  'no-answer':      'var(--y)',
  voicemail:        'var(--y)',
  callback:         'var(--b)',
  skipped:          'var(--text)',
  'wrong-number':   'var(--text)',
}

// Map frontend outcome labels â†’ backend call status
function outcomeToStatus(outcome) {
  return ({ interested: 'answered', 'no-answer': 'no_answer', voicemail: 'missed', callback: 'answered', skipped: 'no_answer', 'wrong-number': 'missed', 'not-interested': 'answered' })[outcome] || 'answered'
}
// Map frontend outcome â†’ backend lead status
function outcomeToLeadStatus(outcome) {
  return ({ interested: 'converted', 'not-interested': 'lost', callback: 'contacted', voicemail: 'contacted' })[outcome] || 'contacted'
}

function isPersistedLeadId(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
}

export default function Calls({ calls, leads, onCalls, onLeads, onActivity, toast, onRefreshCalls, onRefreshLeads }) {
  const [form, setForm] = useState({ name: '', phone: '', outcome: '', niche: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const total      = calls.length
  const interested = calls.filter(c => c.outcome === 'interested').length
  const notInt     = calls.filter(c => c.outcome === 'not-interested').length
  const conv       = total ? Math.round(interested / total * 100) : 0

  function update(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function logCall() {
    if (!form.name || !form.outcome) { toast('Fill name and outcome.', 'warn'); return }
    setSaving(true)
    try {
      // Find matching lead by name to link the call
      const matchedLead = leads.find(l => l.name.toLowerCase() === form.name.toLowerCase())

      const leadId = isPersistedLeadId(matchedLead?.id) ? matchedLead.id : undefined

      const payload = {
        duration: 0,
        status:   outcomeToStatus(form.outcome),
        notes:    [form.notes, form.niche ? `Niche: ${form.niche}` : ''].filter(Boolean).join(' | ') || undefined,
        lead:     leadId,
      }

      const res = await callsApi.create(payload)

      // Optimistically update local calls list
      const newCall = {
        id:      res.data._id,
        name:    form.name,
        phone:   form.phone,
        outcome: form.outcome,
        niche:   form.niche,
        notes:   form.notes,
        time:    new Date().toLocaleTimeString(),
        date:    new Date().toLocaleDateString(),
      }
      onCalls([...calls, newCall])

      // Update lead status on backend
      if (leadId) {
        try {
          await leadsApi.updateStatus(leadId, outcomeToLeadStatus(form.outcome))
          onLeads(leads.map(l => l.id === matchedLead.id ? { ...l, status: form.outcome } : l))
        } catch { /* non-critical */ }
      }

      onActivity(`${form.name} - ${form.outcome.replace(/-/g, ' ')}`,
        form.outcome === 'interested' ? 'g' : form.outcome === 'not-interested' ? 'r' : 'y')

      setForm({ name: '', phone: '', outcome: '', niche: '', notes: '' })
      toast(`Call logged: ${form.outcome.replace(/-/g, ' ')}`)
    } catch (e) {
      toast('Failed to log call: ' + e.message, 'warn')
    } finally {
      setSaving(false)
    }
  }

  function exportCalls() {
    if (!calls.length) { toast('Nothing to export.', 'warn'); return }
    const esc = v => '"' + String(v || '').replace(/"/g, '""') + '"'
    const hdrs = ['Name', 'Phone', 'Outcome', 'Niche', 'Notes', 'Date', 'Time']
    const csv = [hdrs.map(esc).join(','), ...calls.map(c => [c.name, c.phone, c.outcome, c.niche, c.notes, c.date, c.time].map(esc).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `Green_Calls_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast(`${calls.length} calls exported.`)
  }

  return (
    <div style={{ maxWidth: 1060 }}>
      <div className="g4 mb">
        {[
          { cls: 'stat-b', icon: <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2" /></svg>, val: total,      lbl: 'Total Calls' },
          { cls: 'stat-g', icon: <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>,      val: interested, lbl: 'Interested' },
          { cls: 'stat-r', icon: <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>, val: notInt, lbl: 'Not Interested' },
          { cls: 'stat-y', icon: <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /></svg>, val: `${conv}%`, lbl: 'Conversion' },
        ].map(s => (
          <div key={s.lbl} className={`stat ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-val">{s.val}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        {/* Log a call */}
        <div className="card">
          <div className="section-head">
            <div className="section-title">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              Log a Call
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="input-label">Business Name</label>
              <input className="inp" placeholder="Business name" value={form.name} onChange={e => update('name', e.target.value)} disabled={saving} />
            </div>
            <div>
              <label className="input-label">Phone</label>
              <input className="inp" placeholder="(xxx) xxx-xxxx" value={form.phone} onChange={e => update('phone', e.target.value)} disabled={saving} />
            </div>
            <div className="g2" style={{ gap: 10 }}>
              <div>
                <label className="input-label">Outcome</label>
                <select className="inp" value={form.outcome} onChange={e => update('outcome', e.target.value)} disabled={saving}>
                  <option value="">Select</option>
                  {['interested', 'not-interested', 'no-answer', 'voicemail', 'callback', 'wrong-number'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Niche</label>
                <select className="inp" value={form.niche} onChange={e => update('niche', e.target.value)} disabled={saving}>
                  <option value="">Select</option>
                  {['HVAC', 'Dental', 'Plumbing', 'Med Spa', 'Auto Repair', 'Other'].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">Notes</label>
              <textarea className="inp" placeholder="What they said, follow-up..." style={{ minHeight: 70 }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={logCall} disabled={saving}>
                {saving ? 'Saving...' : 'Log Call'}
              </button>
              <button className="btn btn-ghost" onClick={() => setForm({ name: '', phone: '', outcome: '', niche: '', notes: '' })} disabled={saving}>Clear</button>
            </div>
          </div>
        </div>

        {/* Call log */}
        <div className="card">
          <div className="section-head">
            <div className="section-title">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg>
              Call Log
            </div>
            <button className="btn btn-outline btn-sm" onClick={exportCalls}>Export</button>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {calls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, fontSize: 12, color: 'var(--text)', opacity: .5 }}>No calls logged yet.</div>
            ) : [...calls].reverse().map(c => (
              <div key={c.id} className="call-log-item">
                <div className="act-dot" style={{ background: OUTCOME_COLORS[c.outcome] || 'var(--text)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)' }}>{c.name}</div>
                  {c.notes && <div style={{ fontSize: 10, color: 'var(--text)', opacity: .6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className="pill" style={{ background: `${OUTCOME_COLORS[c.outcome] || 'var(--text)'}18`, color: OUTCOME_COLORS[c.outcome] || 'var(--text)', border: `1px solid ${OUTCOME_COLORS[c.outcome] || 'var(--text)'}44` }}>
                    {c.outcome.replace(/-/g, ' ')}
                  </span>
                  <div style={{ fontSize: 9, color: 'var(--text)', opacity: .4, marginTop: 3, fontFamily: 'monospace' }}>{c.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

