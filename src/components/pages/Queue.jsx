import { useState, useRef, useEffect } from 'react'
import {
  isPhone, isWebsite, guessTZ, localTime, isOpen, genFacts,
  copyToClipboard, getPlaybookOpeners, PB,
  addLeadsFromRows, getGoogleVoiceCallUrl,
} from '../../utils'
import { usersApi, callsApi, leadsApi, settingsApi } from '../../api'
import { useSettings } from '../../contexts/SettingsContext'
import CalendlyEmbed from '../CalendlyEmbed'
import AppointmentConfirm from '../AppointmentConfirm'

// â”€â”€ Map frontend outcome â†’ backend call status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function outcomeToCallStatus(outcome) {
  return ({
    interested:       'answered',
    'not-interested': 'answered',
    'no-answer':      'no_answer',
    voicemail:        'missed',
    callback:         'answered',
    skipped:          'no_answer',
    'wrong-number':   'missed',
  })[outcome] || 'answered'
}

// â”€â”€ Map frontend outcome â†’ backend lead status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function outcomeToLeadStatus(outcome) {
  return ({
    interested:       'converted',
    'not-interested': 'lost',
    callback:         'contacted',
    voicemail:        'contacted',
    'no-answer':      'contacted',
  })[outcome] || 'contacted'
}

function isPersistedLeadId(id) {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
}

function buildLeadProfile(lead) {
  return {
    name: lead?.name || 'Unnamed lead',
    phone: lead?.phone || '',
    email: lead?.email || '',
    company: lead?.company || lead?.name || '',
    website: lead?.website || '',
    industry: lead?.category || '',
    serviceRequested: lead?.category || 'General',
    address: lead?.address || '',
    rating: lead?.rating || '',
    reviews: lead?.reviews || '',
    source: lead?.source || 'call_queue',
    notes: lead?.notes || '',
    appointmentAt: lead?.appointmentAt || null,
    assignedTo: lead?.assignedTo || '',
    status: lead?.status || 'uncalled',
    tags: lead?.tags || [],
    customFields: lead?.customFields || {},
    enrichment: lead?.enrichment || {},
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BizCard({ biz, onOutcome, onPreview, toast, user, settings, onAppointmentPrompt }) {
  const [notes,      setNotes]      = useState(biz?.notes || '')
  const [noteStatus, setNoteStatus] = useState('Ready')
  const [copied,     setCopied]     = useState(false)
  const [showCalendly, setShowCalendly] = useState(false)

  const tz          = biz ? guessTZ(biz) : null
  const lt          = tz  ? localTime(tz) : null
  const bizOpen     = tz  ? isOpen(tz)    : null
  const googleVoiceUrl = isPhone(biz?.phone) ? getGoogleVoiceCallUrl(biz.phone) : ''
  
  const calendlyEnabled = settings?.calendly?.enabled && settings?.calendly?.url
  const calendlyUrl = settings?.calendly?.url || 'https://calendly.com/greenmedialabs/30min'

  async function saveNotes() {
    if (!notes.trim()) { toast('No notes to save.', 'warn'); return }
    setNoteStatus('Sending...')
    const ok  = await settingsApi.notify({
      action: 'Call Notes Saved',
      lead: buildLeadProfile(biz),
      notes,
    }).then(() => true).catch(() => false)
    setNoteStatus(ok ? 'Sent' : 'Saved locally')
    toast(ok ? 'Notes sent to Discord.' : 'Saved locally.', ok ? 'green' : 'warn')
    return notes
  }

  function handleOutcome(outcome) {
    onOutcome(outcome, notes)
    setNotes('')
    setNoteStatus('Ready')
  }

  if (!biz) return null
  const rat      = parseFloat(biz.rating) || 0
  const rev      = parseInt(biz.reviews)  || 0
  const compLevel = rev < 30 ? 'low' : rev < 100 ? 'mid' : 'high'

  return (
    <div className="biz-card">
      <div className="biz-header">
        <div className="biz-niche">{biz.category || 'General'}</div>
        <div className="biz-name">{biz.name}</div>
        <div className="biz-location">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <span>{biz.address !== '-' ? biz.address : biz.category || '-'}</span>
          {lt && (
            <span className="local-time-badge" style={{
              color:       bizOpen ? 'var(--g)'       : 'var(--r)',
              borderColor: bizOpen ? 'var(--gborder)'  : 'rgba(224,80,96,.22)',
              background:  bizOpen ? 'var(--glow)'     : 'rgba(224,80,96,.1)',
            }}>{lt} local</span>
          )}
        </div>
      </div>

      <div className="biz-body">
        <div className="biz-grid">
          {/* Phone */}
          <div className="biz-datum">
            <div className="biz-datum-label">Phone</div>
            <div className={`biz-datum-val${isPhone(biz.phone) ? ' phone' : ''}`}>
              {isPhone(biz.phone) ? biz.phone : '-'}
            </div>
            {isPhone(biz.phone) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                <a
                  href={googleVoiceUrl || `tel:${biz.phone.replace(/[\s\-\(\)]/g, '')}`}
                  target={googleVoiceUrl ? '_blank' : undefined}
                  rel={googleVoiceUrl ? 'noreferrer' : undefined}
                  className="call-btn"
                >
                  <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.96 9.7 19.79 19.79 0 01.9 1.1 2 2 0 012.88.01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" /></svg>
                  Call with Google Voice
                </a>
                <button
                  className={`copy-phone-btn${copied ? ' copied' : ''}`}
                  onClick={() => copyToClipboard(biz.phone, () => {
                    setCopied(true)
                    toast('Phone number copied!')
                    setTimeout(() => setCopied(false), 2000)
                  })}
                >
                  <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Website */}
          <div className="biz-datum">
            <div className="biz-datum-label">Website</div>
            <div className="biz-datum-val">
              {isWebsite(biz.website) ? (
                <>
                  <a
                    href={biz.website.startsWith('http') ? biz.website : 'https://' + biz.website}
                    target="_blank" rel="noreferrer"
                  >
                    {biz.website.replace(/^https?:\/\//, '').split('/')[0].slice(0, 24)}
                  </a>
                  <br />
                  <button className="preview-btn" onClick={() => onPreview(biz.website)}>
                    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="3" /></svg>
                    Preview
                  </button>
                </>
              ) : <span style={{ color: 'var(--r)' }}>No website</span>}
            </div>
          </div>

          {/* Rating - fixed: uses Unicode â˜... directly */}
          <div className="biz-datum">
            <div className="biz-datum-label">Rating</div>
            <div className={`biz-datum-val ${rat >= 4 ? 'rat-hi' : rat >= 3 ? 'rat-mid' : 'rat-lo'}`}>
              {rat ? `${biz.rating}\u2605` : '-'}
            </div>
          </div>

          {/* Reviews */}
          <div className="biz-datum">
            <div className="biz-datum-label">Reviews</div>
            <div className="biz-datum-val" style={{ color: 'var(--b)' }}>{biz.reviews || '-'}</div>
          </div>
        </div>

        <div className={`comp-row comp-${compLevel}`}>
          <div className="comp-label">Competition</div>
          <div className="comp-track"><div className="comp-fill" /></div>
          <div className="comp-tag">{compLevel === 'low' ? 'Low' : compLevel === 'mid' ? 'Moderate' : 'High'}</div>
        </div>

        <div>
          {genFacts(biz).map((f, i) => (
            <div key={i} className="biz-fact">
              <span className="fact-arrow">›</span>{f}
            </div>
          ))}
        </div>

        <div className="notes-box">
          <div className="notes-head">
            <div className="notes-title">Quick Notes</div>
            <div className="discord-indicator"><div className="discord-dot" />Sends to Discord</div>
          </div>
          <textarea
            className="inp"
            style={{ background: 'transparent', border: 'none', minHeight: 90, width: '100%', padding: '12px 16px', outline: 'none', lineHeight: 1.6, resize: 'vertical' }}
            placeholder="Outcome, what they said, follow-up..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <div className="notes-footer">
            <div className="notes-status">{noteStatus}</div>
            <button className="btn btn-outline btn-sm" onClick={saveNotes}>
              <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /></svg>
              Save &amp; Send
            </button>
          </div>
        </div>
      </div>

      <div className="biz-actions">
        <button className="btn btn-primary" style={{ minWidth: 130 }} onClick={() => handleOutcome('interested')}>
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>Interested
        </button>
        <button className="btn btn-red btn-sm" onClick={() => handleOutcome('not-interested')}>
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>No
        </button>
        <button className="btn btn-yellow btn-sm" onClick={() => handleOutcome('no-answer')}>
          <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23" /></svg>No Answer
        </button>
        <button className="btn btn-blue btn-sm" onClick={() => handleOutcome('callback')}>
          <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" /></svg>Callback
        </button>
        {calendlyEnabled && (
          <button 
            className="btn btn-outline btn-sm" 
            style={{ borderColor: 'var(--p)', color: 'var(--p)' }}
            onClick={() => setShowCalendly(true)}
          >
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            Book Appointment
          </button>
        )}
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => handleOutcome('skipped')}>
          <svg viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>Skip
        </button>
      </div>

      {showCalendly && (
        <div className="calendly-panel">
          <div className="calendly-panel-head">
            <div>
              <div className="biz-datum-label">Appointment Booking</div>
              <div className="calendly-panel-title">{biz.name}</div>
            </div>
            <button className="modal-close" onClick={() => {
              setShowCalendly(false)
              onAppointmentPrompt?.(biz)
            }}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <CalendlyEmbed 
            url={calendlyUrl} 
            lead={biz} 
            onBookingComplete={() => {
              setShowCalendly(false)
              onAppointmentPrompt?.(biz)
              toast('Appointment booking completed.')
            }}
          />
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Playbook({ biz }) {
  const [tab,    setTab]    = useState('openers')
  const [picked, setPicked] = useState({})

  function togglePick(key) {
    setPicked(p => ({ ...p, [key]: !p[key] }))
  }

  const openers = getPlaybookOpeners(biz)
  const pers    = openers.filter(o => o.highlight)
  const std     = openers.filter(o => !o.highlight)

  return (
    <div className="playbook">
      <div className="pb-head">
        <div className="pb-label">Live Playbook</div>
        <div className="pb-biz-name">{biz?.name || '-'}</div>
      </div>
      <div className="pb-tabs">
        {['openers', 'objections', 'closing', 'tips'].map(t => (
          <div key={t} className={`pb-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>
      <div className="pb-body">
        {tab === 'openers' && (
          <>
            {pers.length > 0 && (
              <div className="pb-section">
                <div className="pb-sec-label" style={{ color: 'var(--g)' }}>Personalized</div>
                {pers.map((o, i) => (
                  <div key={i} className="pb-line picked">
                    <div className="pb-line-type">{o.type}</div>
                    <div className="pb-line-text" style={{ color: 'var(--cream)' }}>&ldquo;{o.line}&rdquo;</div>
                  </div>
                ))}
              </div>
            )}
            <div className="pb-section">
              <div className="pb-sec-label">Openers</div>
              {std.map((o, i) => (
                <div key={i} className={`pb-line${picked['op' + i] ? ' picked' : ''}`} onClick={() => togglePick('op' + i)}>
                  <div className="pb-line-type">{o.type}</div>
                  <div className="pb-line-text">&ldquo;{o.line}&rdquo;</div>
                </div>
              ))}
            </div>
            <div className="pb-section">
              <div className="pb-sec-label">Qualifying</div>
              {PB.qualifying.map((o, i) => (
                <div key={i} className={`pb-line${picked['q' + i] ? ' picked' : ''}`} onClick={() => togglePick('q' + i)}>
                  <div className="pb-line-type">{o.type}</div>
                  <div className="pb-line-text">&ldquo;{o.line}&rdquo;</div>
                </div>
              ))}
            </div>
            <div className="pb-section">
              <div className="pb-sec-label">Transitions</div>
              {PB.transitions.map((o, i) => (
                <div key={i} className={`pb-line${picked['t' + i] ? ' picked' : ''}`} onClick={() => togglePick('t' + i)}>
                  <div className="pb-line-type">{o.type}</div>
                  <div className="pb-line-text">&ldquo;{o.line}&rdquo;</div>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'objections' && (
          <div className="pb-section">
            <div className="pb-sec-label">Handlers</div>
            {PB.objections.map((o, i) => (
              <div key={i} className={`pb-line${picked['obj' + i] ? ' picked' : ''}`} onClick={() => togglePick('obj' + i)}>
                <div className="pb-line-type">{o.trigger}</div>
                <div className="pb-line-text">&ldquo;{o.line}&rdquo;</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'closing' && (
          <div className="pb-section">
            <div className="pb-sec-label">Closes</div>
            {PB.closing.map((o, i) => (
              <div key={i} className={`pb-line${picked['cl' + i] ? ' picked' : ''}`} onClick={() => togglePick('cl' + i)}>
                <div className="pb-line-type">{o.type}</div>
                <div className="pb-line-text">&ldquo;{o.line}&rdquo;</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'tips' && (
          <div className="pb-section">
            <div className="pb-sec-label">{biz ? `Tips for ${biz.name}` : 'Advanced Tips'}</div>
            {PB.power.map((t, i) => (
              <div key={i} className="pb-tip">
                <div className="pb-tip-dot" />{t}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// â”€â”€ My Lists panel - fetches server-assigned CSV lists for the current agent â”€â”€
function MyLists({ userObj, leads, onLeads, toast }) {
  const [lists,     setLists]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [loadingId, setLoadingId] = useState(null)
  const [open,      setOpen]      = useState(false)

  useEffect(() => {
    if (!userObj?._id) return
    usersApi.getCsvLists(userObj._id)
      .then(d => { setLists(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userObj?._id])

  async function loadList(list) {
    setLoadingId(list._id)
    try {
      const res  = await usersApi.getCsvListById(userObj._id, list._id)
      const rows = res.data?.rows || []
      if (!rows.length) { toast('This list has no rows.', 'warn'); return }

      const headers  = Object.keys(rows[0] || {})
      const newLeads = addLeadsFromRows(leads, rows, headers)
      if (!newLeads.length) {
        toast('No new businesses found (all duplicates or no contact info).', 'warn')
        return
      }
      onLeads([...leads, ...newLeads])
      toast(`✓ ${newLeads.length} businesses from "${list.name}" loaded into queue.`)
      setOpen(false)
    } catch (e) {
      toast('Failed to load list: ' + e.message, 'warn')
    } finally {
      setLoadingId(null)
    }
  }

  if (!userObj || userObj.role !== 'agent') return null

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => setOpen(v => !v)}
        style={{ position: 'relative' }}
      >
        <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
        My Lists
        {lists.length > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--g)', color: '#000',
            fontSize: 8, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{lists.length}</span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6,
            width: 300, background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
            zIndex: 100, overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line2)', fontSize: 11, fontWeight: 600, color: 'var(--cream)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, marginRight: 5, verticalAlign: 'middle' }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg>
                Assigned Lists
              </span>
              <span style={{ fontSize: 9, opacity: .4 }}>{lists.length} list{lists.length !== 1 ? 's' : ''}</span>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, opacity: .4 }}>Loading...</div>
              ) : lists.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, opacity: .4 }}>
                  No lists assigned yet.<br />
                  <span style={{ fontSize: 10 }}>Your admin will assign CSV lists to you.</span>
                </div>
              ) : lists.map(list => (
                <div key={list._id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderBottom: '1px solid var(--line2)', transition: 'background .15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text)', opacity: .4 }}>
                      {list.rowCount} businesses - {new Date(list.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 10, padding: '3px 10px', flexShrink: 0 }}
                    onClick={() => loadList(list)}
                    disabled={loadingId === list._id}
                  >
                    {loadingId === list._id ? '...' : 'Load'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Queue({ leads, calls, clocks, onLeads, onCalls, onAddFiles, onActivity, onPreview, toast, user, userObj }) {
  const { settings } = useSettings()
  const fileRef = useRef()
  const [showAppointmentConfirm, setShowAppointmentConfirm] = useState(false)
  const [lastLeadForAppointment, setLastLeadForAppointment] = useState(null)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  const uncalled     = leads.filter(l => l.status === 'uncalled')
  const calledLeads  = leads.filter(l => ['interested', 'not-interested', 'no-answer', 'voicemail', 'callback', 'wrong-number'].includes(l.status))
  const skippedLeads = leads.filter(l => l.status === 'skipped')
  const currentBiz   = uncalled[0] || null

  const pct = leads.length > 0 ? Math.round(calledLeads.length / leads.length * 100) : 0

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (!currentBiz) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      switch(e.key.toLowerCase()) {
        case 'n': // Next lead (skip current)
          e.preventDefault()
          handleOutcome('skipped')
          break
        case 'i': // Interested
          e.preventDefault()
          handleOutcome('interested')
          break
        case 'x': // Not interested
          e.preventDefault()
          handleOutcome('not-interested')
          break
        case 'a': // No answer
          e.preventDefault()
          handleOutcome('no-answer')
          break
        case 'c': // Callback
          e.preventDefault()
          handleOutcome('callback')
          break
        case '?': // Show keyboard shortcuts
          e.preventDefault()
          setShowKeyboardShortcuts(true)
          break
        case 'escape':
          setShowKeyboardShortcuts(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentBiz]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFiles(e) {
    onAddFiles(e.target.files)
    e.target.value = ''
  }

  function shuffle() {
    const shuffled = [...leads]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    onLeads(shuffled)
    toast('Queue shuffled.')
  }

  function clearAll() {
    if (!confirm('Clear the entire queue?')) return
    onLeads([])
    toast('Queue cleared.', 'warn')
  }

  async function handleOutcome(outcome, notes) {
    if (!currentBiz) return
    const persistedLeadId = isPersistedLeadId(currentBiz.id) ? currentBiz.id : null

    // 1. Optimistically update lead status in local state
    const updatedLeads = leads.map(l => {
      if (l.id !== currentBiz.id) return l
      return { ...l, status: outcome, calledAt: new Date().toISOString(), notes: notes || l.notes }
    })
    onLeads(updatedLeads)

    if (outcome === 'skipped') {
      toast('Skipped.')
      return
    }

    // 2. Build optimistic call entry
    const optimisticCall = {
      id:       `local_${Date.now()}`,
      name:     currentBiz.name,
      phone:    currentBiz.phone,
      outcome,
      niche:    currentBiz.category || '',
      notes:    notes || '',
      time:     new Date().toLocaleTimeString(),
      date:     new Date().toLocaleDateString(),
      leadId:   currentBiz.id,
      duration: 0,
    }
    onCalls([...calls, optimisticCall])
    onActivity(
      `${currentBiz.name} - ${outcome.replace(/-/g, ' ')}`,
      outcome === 'interested' ? 'g' : outcome === 'not-interested' ? 'r' : 'y',
    )
    toast(`Logged: ${outcome.replace(/-/g, ' ')}.`)

    // 3. Persist call to backend (fire-and-forget, don't block UI)
    try {
      const callPayload = {
        duration: 0,
        status:   outcomeToCallStatus(outcome),
        notes:    notes || undefined,
        lead:     persistedLeadId || undefined,
      }
      const res = await callsApi.create(callPayload)
      // Replace local_ id with real backend id
      if (res?.data?._id) {
        onCalls(prev => prev.map(c => c.id === optimisticCall.id ? { ...c, id: res.data._id } : c))
      }
    } catch (err) {
      console.warn('Failed to persist call to backend:', err.message)
    }

    // 4. Update lead status on backend if it has a real backend ID
    if (persistedLeadId) {
      try {
        await leadsApi.updateStatus(persistedLeadId, outcomeToLeadStatus(outcome))
      } catch (err) {
        console.warn('Failed to update lead status on backend:', err.message)
      }
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="gaia-strip">
        <div className="gaia-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg></div>
        <span className="gaia-label">G.A.I.A.</span>
        <span className="gaia-text">
          {leads.length === 0
            ? 'No leads loaded yet, boss. Upload a CSV or load an assigned list to get started.'
            : uncalled.length === 0
              ? `Crushed it! All ${leads.length} leads done.`
              : `${uncalled.length} targets remaining. ${calledLeads.length} calls made. Keep pushing, boss.`}
        </span>
      </div>

      {/* Stats bar */}
      <div className="queue-stats mb">
        {[
          { label: 'Called',    val: calledLeads.length,  sub: 'logged outcomes' },
          { label: 'Skipped',   val: skippedLeads.length, sub: 'not counted' },
          { label: 'Remaining', val: uncalled.length,     sub: 'in queue' },
        ].map(s => (
          <div key={s.label} className="q-stat">
            <div className="q-stat-label">{s.label}</div>
            <div className="q-stat-val">{s.val}</div>
            <div className="q-stat-sub">{s.sub}</div>
          </div>
        ))}
        <div className="q-stat" style={{ minWidth: 200 }}>
          <div className="q-stat-label">Progress</div>
          <div className="q-stat-val">{leads.length > 0 ? `${pct}%` : '-'}</div>
          <div className="pbar mt" style={{ marginTop: 8 }}>
            <div className="pbar-fill" style={{ background: 'var(--g)', width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-row wrap mb">
        <label className="btn btn-outline btn-sm" htmlFor="queueFileInput" style={{ cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          Add CSV
        </label>
        <input type="file" id="queueFileInput" accept=".csv,text/csv,text/plain" multiple style={{ display: 'none' }} onChange={handleFiles} />

        <MyLists userObj={userObj} leads={leads} onLeads={onLeads} toast={toast} />

        <button className="btn btn-outline btn-sm" onClick={shuffle}>
          <svg viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
          Shuffle
        </button>
        <button className="btn btn-red btn-sm" onClick={clearAll}>
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
          Clear All
        </button>
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><svg viewBox="0 0 24 24"><path d="M1 1l22 22" /></svg></div>
            <div className="empty-title">Queue is empty, boss.</div>
            <div className="empty-sub">
              Upload CSV files to load targets
              {userObj?.role === 'agent' ? ', or use My Lists to load a list your admin assigned you' : ''}.<br />
              Only businesses with a phone or website appear.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
              <label className="btn btn-primary btn-lg" htmlFor="queueFileInput" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                Upload CSV
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Queue done */}
      {leads.length > 0 && uncalled.length === 0 && (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
            <div className="empty-title">Queue complete, boss!</div>
            <div className="empty-sub">All {leads.length} leads cycled. Upload more or clear to reset.</div>
          </div>
        </div>
      )}

      {/* Active card */}
      {currentBiz && (
        <div className="queue-layout">
          <BizCard 
            biz={currentBiz} 
            onOutcome={handleOutcome} 
            onPreview={onPreview} 
            toast={toast} 
            user={user} 
            settings={settings}
            onAppointmentPrompt={(lead) => {
              setLastLeadForAppointment(lead)
              setShowAppointmentConfirm(true)
            }}
          />
          <Playbook biz={currentBiz} />
        </div>
      )}

      {/* Appointment Confirmation Modal */}
      {showAppointmentConfirm && lastLeadForAppointment && (
        <AppointmentConfirm
          lead={lastLeadForAppointment}
          onConfirm={async (booked) => {
            setShowAppointmentConfirm(false)
            if (booked) {
              const sent = await settingsApi.notify({
                action: 'Appointment Booked',
                lead: buildLeadProfile(lastLeadForAppointment),
                appointmentAt: new Date().toISOString(),
                notes: 'Agent confirmed the appointment was successfully booked from the call queue.',
              }).then(() => true).catch(() => false)
              toast(sent ? 'Appointment confirmed. Discord notification sent.' : 'Appointment confirmed locally.', sent ? 'green' : 'warn')
            }
          }}
          onCancel={() => setShowAppointmentConfirm(false)}
          onSkip={() => setShowAppointmentConfirm(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="modal-bg open" onClick={e => e.target === e.currentTarget && setShowKeyboardShortcuts(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div className="modal-title">Keyboard Shortcuts</div>
              <div className="modal-close" onClick={() => setShowKeyboardShortcuts(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { key: 'I', action: 'Mark as Interested', color: 'var(--g)' },
                  { key: 'X', action: 'Mark as Not Interested', color: 'var(--r)' },
                  { key: 'A', action: 'Mark as No Answer', color: 'var(--y)' },
                  { key: 'C', action: 'Schedule Callback', color: 'var(--b)' },
                  { key: 'N', action: 'Skip to Next Lead', color: 'var(--text)' },
                  { key: '?', action: 'Show this help', color: 'var(--text)' },
                  { key: 'Esc', action: 'Close modal', color: 'var(--text)' },
                ].map(({ key, action, color }) => (
                  <div key={key} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '10px 12px',
                    background: 'var(--bg2)',
                    borderRadius: 8,
                    border: '1px solid var(--line)'
                  }}>
                    <kbd style={{ 
                      padding: '4px 10px', 
                      background: 'var(--bg3)', 
                      border: '1px solid var(--line2)', 
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      fontWeight: 600,
                      color: color,
                      minWidth: 40,
                      textAlign: 'center'
                    }}>
                      {key}
                    </kbd>
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

