import { useState } from 'react'
import { PB, sendDiscord } from '../../utils'

const CORE_PRINCIPLES = [
  'Always maintain control of the frame',
  'Be certain, not pushy',
  'Ask questions that guide thinking',
  'Sell outcomes, not services',
  'Lower resistance before pushing forward',
  'Use curiosity to open, logic to justify, emotion to close',
]
const TYPE_COLORS = {
  Opening:             'var(--g)',
  'Objection Handler': 'var(--y)',
  'Follow-Up':         'var(--b)',
  Closing:             'var(--g)',
  Voicemail:           'var(--text)',
}

function ScriptModal({ script, index, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(script || { title: '', type: 'Opening', content: '' })
  function upd(k, v) { setForm(f => ({ ...f, [k]: v })) }
  return (
    <div className="modal-bg open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">Script Editor</div>
          <div className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="input-label">Title</label>
              <input className="inp" placeholder="e.g. HVAC Opener" value={form.title} onChange={e => upd('title', e.target.value)} />
            </div>
            <div>
              <label className="input-label">Type</label>
              <select className="inp" value={form.type} onChange={e => upd('type', e.target.value)}>
                {['Opening', 'Objection Handler', 'Follow-Up', 'Closing', 'Voicemail'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Content</label>
              <textarea className="inp" style={{ minHeight: 180 }} placeholder="Write your script here..." value={form.content} onChange={e => upd('content', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { if (!form.title || !form.content) return; onSave(form, index) }}>Save</button>
              {index !== null && <button className="btn btn-ghost" onClick={() => onDelete(index)}>Delete</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Scripts({ scripts, notes, onScripts, onNotes, toast, user }) {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editIndex,  setEditIndex]  = useState(null)
  const [noteStatus, setNoteStatus] = useState('Ready')

  function openAdd()    { setEditIndex(null); setModalOpen(true) }
  function openEdit(i)  { setEditIndex(i);    setModalOpen(true) }

  function saveScript(form, index) {
    const updated = index !== null
      ? scripts.map((s, i) => i === index ? form : s)
      : [...scripts, form]
    onScripts(updated)
    setModalOpen(false)
    toast('Script saved.')
  }

  function deleteScript(index) {
    onScripts(scripts.filter((_, i) => i !== index))
    setModalOpen(false)
    toast('Deleted.', 'warn')
  }

  async function saveGeneralNotes() {
    if (!notes.trim()) { toast('Nothing to send.', 'warn'); return }
    setNoteStatus('Sending...')
    const ok = await sendDiscord(`**Green. - Team Notes**\n**Rep:** ${user}\n**Time:** ${new Date().toLocaleString()}\n\n${notes}`)
    setNoteStatus(ok ? 'Sent \u2713' : 'Saved')
    toast(ok ? 'Notes sent to Discord.' : 'Saved locally.', ok ? 'green' : 'warn')
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="gaia-strip">
        <div className="gaia-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg></div>
        <span className="gaia-label">G.A.I.A.</span>
        <span className="gaia-text">Full Straight Line System playbook. All scripts are live in the Call Queue panel.</span>
      </div>

      {/* Master Playbook */}
      <div className="card mb">
        <div className="section-head">
          <div className="section-title">
            <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            Straight Line Playbook
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            {[
              { label: 'Core Principles', items: CORE_PRINCIPLES.map(p => ({ line: p })), typeKey: null },
              { label: 'Openers',         items: PB.openers,     typeKey: 'type' },
              { label: 'Transitions',     items: PB.transitions, typeKey: 'type' },
            ].map(({ label, items, typeKey }) => (
              <div key={label}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--g)', margin: '14px 0 10px', paddingBottom: 7, borderBottom: '1px solid var(--line)' }}>{label}</div>
                {items.map((item, i) => (
                  typeKey ? (
                    <div key={i} className="pb-line" style={{ marginBottom: 6 }}>
                      <div className="pb-line-type">{item[typeKey]}</div>
                      <div className="pb-line-text">&ldquo;{item.line}&rdquo;</div>
                    </div>
                  ) : (
                    <div key={i} className="pb-tip"><div className="pb-tip-dot" />{item.line}</div>
                  )
                ))}
              </div>
            ))}
          </div>
          <div>
            {[
              { label: 'Objections', items: PB.objections, typeKey: 'trigger' },
              { label: 'Closing',    items: PB.closing,    typeKey: 'type' },
              { label: 'Tips',       items: PB.power.map(p => ({ line: p })), typeKey: null },
            ].map(({ label, items, typeKey }) => (
              <div key={label}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--g)', margin: '14px 0 10px', paddingBottom: 7, borderBottom: '1px solid var(--line)' }}>{label}</div>
                {items.map((item, i) => (
                  typeKey ? (
                    <div key={i} className="pb-line" style={{ marginBottom: 6 }}>
                      <div className="pb-line-type">{item[typeKey]}</div>
                      <div className="pb-line-text">&ldquo;{item.line}&rdquo;</div>
                    </div>
                  ) : (
                    <div key={i} className="pb-tip"><div className="pb-tip-dot" />{item.line}</div>
                  )
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom scripts */}
      <div className="section-head">
        <div className="section-title">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /></svg>
          Custom Scripts
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Script
        </button>
      </div>
      <div className="g3 mb">
        {scripts.length === 0 ? (
          <div style={{ gridColumn: '1/-1' }}>
            <div className="card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ color: 'var(--text)', opacity: .5, fontSize: 12 }}>No custom scripts. Add one above.</div>
            </div>
          </div>
        ) : scripts.map((s, i) => (
          <div key={i} className="card" style={{ cursor: 'pointer' }} onClick={() => openEdit(i)}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: TYPE_COLORS[s.type] || 'var(--text)', marginBottom: 7 }}>{s.type}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--cream)', marginBottom: 6 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text)', opacity: .6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.content}</div>
          </div>
        ))}
      </div>

      {/* Team Notes */}
      <div className="card">
        <div className="section-head">
          <div className="section-title">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
            Team Notes
          </div>
          <div className="discord-indicator"><div className="discord-dot" />Auto-sends to Discord</div>
        </div>
        <textarea
          className="inp"
          style={{ minHeight: 140, width: '100%' }}
          placeholder="Team notes, strategy, daily targets..."
          value={notes}
          onChange={e => onNotes(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text)', opacity: .5 }}>{noteStatus}</div>
          <button className="btn btn-primary btn-sm" onClick={saveGeneralNotes}>Save &amp; Send</button>
        </div>
      </div>

      {modalOpen && (
        <ScriptModal
          script={editIndex !== null ? scripts[editIndex] : null}
          index={editIndex}
          onSave={saveScript}
          onDelete={deleteScript}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

