import { TZS, isOpen, fmtTime } from '../../utils'

export default function Dashboard({ leads, calls, clocks, activity, onNav }) {
  const total = leads.length
  const calledCount = calls.length
  const interested = calls.filter(c => c.outcome === 'interested').length
  const conv = calledCount ? Math.round(interested / calledCount * 100) : 0

  // Niche breakdown
  const niches = {}
  leads.forEach(l => { const k = l.category || 'General'; niches[k] = (niches[k] || 0) + 1 })
  const nicheEntries = Object.entries(niches).sort((a, b) => b[1] - a[1])
  const nicheMax = nicheEntries[0]?.[1] || 1

  const outcomeColors = { interested: 'var(--g)', 'not-interested': 'var(--r)', 'no-answer': 'var(--y)', callback: 'var(--b)', skipped: 'var(--text)' }

  return (
    <div style={{ maxWidth: 1060 }}>
      {/* GAIA strip */}
      <div className="gaia-strip">
        <div className="gaia-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </div>
        <span className="gaia-label">G.A.I.A.</span>
        <span className="gaia-text">
          {total === 0
            ? 'Morning, boss. System loaded. Head to Call Queue and start dialing.'
            : `${leads.filter(l => l.status === 'uncalled').length} targets remaining. ${calledCount} calls made. ${conv}% conversion.`}
        </span>
        <span className="caret" />
      </div>

      {/* Timezone cards */}
      <div className="tz-row">
        {clocks.map(c => (
          <div key={c.n} className={`tz-card${c.open ? ' tz-open' : ''}`}>
            <div className="tz-name">{c.n}</div>
            <div className="tz-time">{c.time}</div>
            <div className={`tz-status ${c.open ? 'status-open' : 'status-closed'}`}>
              {c.open ? 'Business Hours' : 'Closed'}
            </div>
          </div>
        ))}
      </div>

      {/* Stat cards */}
      <div className="g4 mb">
        <div className="stat stat-g">
          <div className="stat-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg></div>
          <div className="stat-val">{total}</div>
          <div className="stat-lbl">Total Leads</div>
        </div>
        <div className="stat stat-b">
          <div className="stat-icon"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2" /></svg></div>
          <div className="stat-val">{calledCount}</div>
          <div className="stat-lbl">Calls Made</div>
        </div>
        <div className="stat stat-y">
          <div className="stat-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></div>
          <div className="stat-val">{interested}</div>
          <div className="stat-lbl">Interested</div>
        </div>
        <div className="stat stat-r">
          <div className="stat-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></div>
          <div className="stat-val">{conv}%</div>
          <div className="stat-lbl">Conversion</div>
        </div>
      </div>

      {/* Activity + Niche */}
      <div className="g2">
        <div className="card">
          <div className="section-head">
            <div className="section-title">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Recent Activity
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', opacity: .5 }}>No activity yet.</div>
            </div>
          ) : (
            activity.map(a => (
              <div key={a.id} className="act-item">
                <div className={`act-dot act-${a.type}`} />
                <div style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{a.text}</div>
                <div style={{ fontSize: 10, color: 'var(--text)', opacity: .4, fontFamily: 'monospace' }}>{a.time}</div>
              </div>
            ))
          )}
        </div>
        <div className="card">
          <div className="section-head">
            <div className="section-title">
              <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              Niche Breakdown
            </div>
          </div>
          {nicheEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'var(--text)', opacity: .5 }}>Upload leads to see breakdown.</div>
          ) : nicheEntries.map(([name, count]) => (
            <div key={name} className="niche-row">
              <div className="niche-name">{name}</div>
              <div className="niche-bar-wrap"><div className="niche-bar-fill" style={{ width: `${count / nicheMax * 100}%` }} /></div>
              <div className="niche-count">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
