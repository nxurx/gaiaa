import { useState, useEffect, useCallback } from 'react'
import { analyticsApi, usersApi } from '../../api'

const OUTCOME_COLORS = {
  interested:       'var(--g)',
  'not-interested': 'var(--r)',
  'no-answer':      'var(--y)',
  voicemail:        'var(--y)',
  callback:         'var(--b)',
  skipped:          'var(--text)',
  'wrong-number':   'var(--text)',
  new:              'var(--text)',
  contacted:        'var(--b)',
  converted:        'var(--g)',
  lost:             'var(--r)',
  answered:         'var(--g)',
  missed:           'var(--r)',
  no_answer:        'var(--y)',
}

export default function Analytics({ leads, calls, userObj, toast }) {
  const [overview,       setOverview]       = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)

  const [agents,         setAgents]         = useState([])
  const [selectedAgent,  setSelectedAgent]  = useState(null)
  const [agentStats,     setAgentStats]     = useState(null)
  const [agentLists,     setAgentLists]     = useState([])
  const [agentLoading,   setAgentLoading]   = useState(false)

  const isAdmin = userObj?.role === 'admin'

  // â”€â”€ Fetch admin overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!isAdmin) return

    setLoading(true)
    setError(null)

    analyticsApi.overview()
      .then(d => {
        setOverview(d.data ?? null)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [isAdmin])

  // â”€â”€ Fetch agents list (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!isAdmin) return
    usersApi.list({ limit: 100 })
      .then(d => setAgents((d.data || []).filter(u => u.role === 'agent')))
      .catch(() => {})
  }, [isAdmin])

  // â”€â”€ Load individual agent stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadAgentStats = useCallback(async (agent) => {
    setSelectedAgent(agent)
    setAgentStats(null)
    setAgentLists([])
    setAgentLoading(true)
    try {
      const [statsRes, listsRes] = await Promise.allSettled([
        analyticsApi.userStats(agent._id),
        usersApi.getCsvLists(agent._id),
      ])
      if (statsRes.status === 'fulfilled') setAgentStats(statsRes.value.data)
      else toast?.('Failed to load agent stats: ' + statsRes.reason.message, 'warn')
      if (listsRes.status === 'fulfilled') setAgentLists(listsRes.value.data || [])
    } finally {
      setAgentLoading(false)
    }
  }, [toast])

  // â”€â”€ Local (non-admin) computed metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const localTotal      = leads.length
  const localCalled     = calls.length
  const localInterested = calls.filter(c => c.outcome === 'interested').length
  const localConv       = localCalled ? Math.round(localInterested / localCalled * 100) : 0

  const localDays  = {}
  calls.forEach(c => { localDays[c.date] = (localDays[c.date] || 0) + 1 })
  const dayCount   = Object.keys(localDays).length || 1
  const avgPerDay  = Math.round(localCalled / dayCount)

  const outcomes       = {}
  calls.forEach(c => { outcomes[c.outcome] = (outcomes[c.outcome] || 0) + 1 })
  const outcomeEntries = Object.entries(outcomes).sort((a, b) => b[1] - a[1])
  const outcomeMax     = outcomeEntries[0]?.[1] || 1

  const niches       = {}
  leads.forEach(l => { const k = l.category || 'Unknown'; niches[k] = (niches[k] || 0) + 1 })
  const nicheEntries = Object.entries(niches).sort((a, b) => b[1] - a[1])
  const nicheMax     = nicheEntries[0]?.[1] || 1

  // 7-day local timeline
  const tlDays = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    tlDays[d.toLocaleDateString()] = 0
  }
  calls.forEach(c => { if (tlDays[c.date] !== undefined) tlDays[c.date]++ })
  const tlEntries = Object.entries(tlDays)
  const tlMax     = Math.max(...tlEntries.map(([, v]) => v), 1)

  // â”€â”€ API / Overview data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const apiTotals           = overview?.totals             || {}
  const apiTotal            = apiTotals.leads              ?? localTotal
  const apiCalls            = apiTotals.calls              ?? localCalled
  const apiUsers            = apiTotals.activeUsers        ?? '-'
  const apiDailyLeads       = overview?.dailyLeads         || []
  const apiDailyCalls       = overview?.dailyCalls         || []
  const apiDailyConversions = overview?.dailyConversions   || []
  const apiDailyMax         = Math.max(
    ...apiDailyLeads.map(d => d.count),
    ...apiDailyCalls.map(d => d.count),
    ...apiDailyConversions.map(d => d.count),
    1,
  )
  const serviceEntries = Object.entries(overview?.leadsByService || {}).sort((a, b) => b[1] - a[1])
  const serviceMax     = serviceEntries[0]?.[1] || 1
  const sourceEntries  = Object.entries(overview?.leadsBySource  || {}).sort((a, b) => b[1] - a[1])
  const sourceMax      = sourceEntries[0]?.[1]  || 1
  const hourlyCalls    = overview?.hourlyCalls || []
  const hourlyMax      = Math.max(...hourlyCalls.map(x => x.count), 1)
  const busiestHour    = hourlyCalls.reduce(
    (best, h) => h.count > (best?.count || 0) ? h : best,
    hourlyCalls[0] || { hour: 0, count: 0 },
  )
  const leaderboard = overview?.agentLeaderboard || []
  const trend       = overview?.recentTrend      || null

  const totalsToUse = isAdmin ? apiTotals : {
    leads:            localTotal,
    calls:            localCalled,
    conversionRate:   localConv,
    avgCallDuration:  0,
    answerRate:       0,
    contactRate:      0,
    newLeads:         leads.filter(l => l.status === 'uncalled').length,
    workedLeads:      calls.length,
    unworkedLeads:    Math.max(localTotal - calls.length, 0),
  }

  // â”€â”€ Agent section computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const agentTotals     = agentStats?.totals  || {}
  const agentDetails    = agentStats?.details || {}
  const agentDailySeries = mergeDailySeries(
    agentStats?.dailyLeads       || [],
    agentStats?.dailyCalls       || [],
    agentStats?.dailyConversions || [],
  )
  const agentDailyMax = Math.max(
    ...agentDailySeries.map(x => x.leads),
    ...agentDailySeries.map(x => x.calls),
    ...agentDailySeries.map(x => x.converted),
    1,
  )

  return (
    <div style={{ maxWidth: 1180 }}>
      {loading && isAdmin && (
        <div style={{ fontSize: 12, color: 'var(--text)', opacity: 0.5, marginBottom: 12 }}>
          Loading analytics...
        </div>
      )}

      {/* â”€â”€ Top stat row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="g4 mb">
        {[
          { cls: 'stat-g', val: loading && isAdmin ? '...' : (totalsToUse.leads ?? apiTotal),      lbl: 'Total Leads',      sub: `${totalsToUse.newLeads ?? 0} new` },
          { cls: 'stat-b', val: loading && isAdmin ? '...' : (totalsToUse.calls ?? apiCalls),      lbl: 'Calls Made',       sub: `${totalsToUse.answerRate ?? 0}% answered` },
          { cls: 'stat-y', val: `${totalsToUse.conversionRate ?? localConv}%`,                    lbl: 'Conversion Rate',  sub: `${totalsToUse.contactRate ?? 0}% contacted` },
          { cls: 'stat-r', val: formatDuration(totalsToUse.avgCallDuration ?? 0),                 lbl: 'Avg Call Length',  sub: `${avgPerDay} calls/day local` },
        ].map(s => (
          <div key={s.lbl} className={`stat ${s.cls}`}>
            <div className="stat-val">{s.val}</div>
            <div className="stat-lbl">{s.lbl}</div>
            <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.6, marginTop: 8 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* â”€â”€ Pipeline + Trend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="g2">
        <div className="card">
          <div className="section-head"><div className="section-title">Pipeline Health</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              ['Unworked Leads',     totalsToUse.unworkedLeads  ?? Math.max(localTotal - localCalled, 0), 'var(--text)'],
              ['Worked Leads',       totalsToUse.workedLeads    ?? localCalled,                           'var(--b)'],
              ['Converted',          totalsToUse.convertedLeads ?? localInterested,                       'var(--g)'],
              ['Lost',               totalsToUse.lostLeads      ?? 0,                                     'var(--r)'],
              ['Answered Calls',     totalsToUse.answeredCalls  ?? 0,                                     'var(--g)'],
              ['Missed / No Answer', (totalsToUse.missedCalls   ?? 0) + (totalsToUse.noAnswerCalls ?? 0), 'var(--y)'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.5 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 8 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head"><div className="section-title">Recent Trend</div></div>
          {trend ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Leads', trend.leads], ['Calls', trend.calls], ['Conversions', trend.converted]].map(([label, item]) => (
                <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--cream)', fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.55 }}>{item.current} this window vs {item.previous} previous</div>
                    </div>
                    <div style={{ color: trendColor(item.changePct), fontWeight: 700, fontSize: 18 }}>{formatPct(item.changePct)}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.5 }}>
                Comparing the last {trend.windowDays} day(s) against the prior period.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.5 }}>Trend data is not available yet.</div>
          )}
        </div>
      </div>

      {/* â”€â”€ Outcome Mix + Service Mix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="g2 mt">
        <div className="card">
          <div className="section-head"><div className="section-title">Outcome Mix</div></div>
          {outcomeEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, fontSize: 12, opacity: 0.5 }}>No calls yet.</div>
          ) : outcomeEntries.map(([k, v]) => (
            <div key={k} className="outcome-row">
              <div style={{ fontSize: 11, color: 'var(--text)', width: 120, textTransform: 'capitalize' }}>{k.replace(/-/g, ' ')}</div>
              <div style={{ flex: 1, height: 3, background: 'var(--line2)', borderRadius: 2 }}>
                <div style={{ height: '100%', borderRadius: 2, background: OUTCOME_COLORS[k] || 'var(--text)', width: `${v / outcomeMax * 100}%`, transition: 'width .5s' }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: OUTCOME_COLORS[k] || 'var(--text)', width: 24, textAlign: 'right' }}>{v}</div>
            </div>
          ))}

          {!loading && overview?.callsByStatus && Object.keys(overview.callsByStatus).length > 0 && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.4, margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Server call status</div>
              {Object.entries(overview.callsByStatus).map(([k, v]) => {
                const max = Math.max(...Object.values(overview.callsByStatus), 1)
                return (
                  <div key={`call-${k}`} className="outcome-row">
                    <div style={{ fontSize: 11, color: 'var(--text)', width: 120, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                    <div style={{ flex: 1, height: 3, background: 'var(--line2)', borderRadius: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: OUTCOME_COLORS[k] || 'var(--text)', width: `${v / max * 100}%` }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: OUTCOME_COLORS[k] || 'var(--text)', width: 24, textAlign: 'right' }}>{v}</div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className="card">
          <div className="section-head"><div className="section-title">Service Mix</div></div>
          {serviceEntries.length === 0
            ? nicheEntries.length === 0
              ? <div style={{ textAlign: 'center', padding: 24, fontSize: 12, opacity: 0.5 }}>No leads yet.</div>
              : nicheEntries.map(([k, v]) => (
                <div key={k} className="niche-row">
                  <div className="niche-name">{k}</div>
                  <div className="niche-bar-wrap"><div className="niche-bar-fill" style={{ width: `${v / nicheMax * 100}%` }} /></div>
                  <div className="niche-count">{v}</div>
                </div>
              ))
            : serviceEntries.map(([k, v]) => (
              <div key={k} className="niche-row">
                <div className="niche-name">{k}</div>
                <div className="niche-bar-wrap"><div className="niche-bar-fill" style={{ width: `${v / serviceMax * 100}%` }} /></div>
                <div className="niche-count">{v}</div>
              </div>
            ))}

          {!loading && sourceEntries.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.4, margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>Lead source</div>
              {sourceEntries.map(([k, v]) => (
                <div key={`src-${k}`} className="niche-row">
                  <div className="niche-name" style={{ textTransform: 'capitalize' }}>{k}</div>
                  <div className="niche-bar-wrap"><div className="niche-bar-fill" style={{ width: `${v / sourceMax * 100}%` }} /></div>
                  <div className="niche-count">{v}</div>
                </div>
              ))}
            </>
          )}

          {!loading && apiUsers !== '-' && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg2)', borderRadius: 6, fontSize: 11, color: 'var(--text)' }}>
              <span style={{ color: 'var(--g)', fontWeight: 700 }}>{apiUsers}</span> active agent{apiUsers !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ 30-Day Performance chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="card mt">
        <div className="section-head"><div className="section-title">30-Day Performance</div></div>
        {isAdmin && apiDailyLeads.length > 0 ? (
          <>
            <div className="bar-chart" style={{ gap: 4, height: 120, alignItems: 'end' }}>
              {mergeDailySeries(apiDailyLeads, apiDailyCalls, apiDailyConversions).map(day => (
                <div key={day.date} className="bar-col" style={{ minWidth: 18, gap: 4 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'end', width: '100%', height: 92 }}>
                    <div className="bar-fill" style={{ flex: 1, height: `${Math.max(day.leads    / apiDailyMax * 100, day.leads    ? 4 : 0)}%`, background: 'var(--b)' }} />
                    <div className="bar-fill" style={{ flex: 1, height: `${Math.max(day.calls    / apiDailyMax * 100, day.calls    ? 4 : 0)}%`, background: 'var(--y)' }} />
                    <div className="bar-fill" style={{ flex: 1, height: `${Math.max(day.converted/ apiDailyMax * 100, day.converted? 4 : 0)}%`, background: 'var(--g)' }} />
                  </div>
                  <div className="bar-label" style={{ fontSize: 7 }}>{day.date.slice(5)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 10, color: 'var(--text)' }}>
              <Legend color="var(--b)" label="Leads created" />
              <Legend color="var(--y)" label="Calls logged" />
              <Legend color="var(--g)" label="Conversions" />
            </div>
          </>
        ) : (
          <div className="bar-chart">
            {tlEntries.map(([d, v]) => (
              <div key={d} className="bar-col">
                <div className="bar-fill" style={{ height: `${Math.max(v / tlMax * 100, 4)}%`, background: v ? 'var(--g)' : 'rgba(62,207,106,.1)' }} />
                <div className="bar-label">{new Date(d).toLocaleDateString('en', { weekday: 'short' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* â”€â”€ Call Timing + Leaderboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="g2 mt">
        <div className="card">
          <div className="section-head"><div className="section-title">Call Timing</div></div>
          {hourlyCalls.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
                {hourlyCalls.map(slot => (
                  <div key={slot.hour} style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 8, opacity: 0.55, marginBottom: 8 }}>{slot.hour.toString().padStart(2, '0')}:00</div>
                    <div style={{ height: 36, display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
                      <div style={{ width: 12, borderRadius: 4, background: 'var(--b)', height: `${Math.max(slot.count / hourlyMax * 100, slot.count ? 10 : 2)}%` }} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--cream)', fontWeight: 600 }}>{slot.count}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text)' }}>
                Busiest hour: <span style={{ color: 'var(--b)', fontWeight: 700 }}>{formatHourLabel(busiestHour?.hour ?? 0)}</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.5 }}>No server timing data yet.</div>
          )}
        </div>

        <div className="card">
          <div className="section-head"><div className="section-title">Leaderboard</div></div>
          {leaderboard.length > 0 ? leaderboard.map(agent => (
            <div key={agent._id} style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, auto)', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600 }}>{agent.username}</div>
                <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.5 }}>{agent.isActive ? 'Active' : 'Inactive'}</div>
              </div>
              <MetricChip label="Calls"  value={agent.calls}                         color="var(--b)" />
              <MetricChip label="Answer" value={`${agent.answerRate}%`}               color="var(--y)" />
              <MetricChip label="Conv"   value={`${agent.conversionRate}%`}            color="var(--g)" />
              <MetricChip label="Avg"    value={formatDuration(agent.avgCallDuration)} color="var(--text2)" />
            </div>
          )) : (
            <div style={{ fontSize: 12, opacity: 0.5 }}>Leaderboard data will appear once calls are logged by agents.</div>
          )}
        </div>
      </div>

      {/* â”€â”€ Agent Performance (admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isAdmin && agents.length > 0 && (
        <div className="card mt">
          <div className="section-head"><div className="section-title">Agent Performance</div></div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: selectedAgent ? 16 : 0 }}>
            {agents.map(a => (
              <button
                key={a._id}
                className={`btn btn-sm ${selectedAgent?._id === a._id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => selectedAgent?._id === a._id ? setSelectedAgent(null) : loadAgentStats(a)}
              >
                <div className="chip-av" style={{ width: 18, height: 18, fontSize: 9, flexShrink: 0 }}>{a.username?.[0]?.toUpperCase()}</div>
                {a.username}
                {!a.isActive && <span style={{ opacity: 0.5, fontSize: 9 }}> (inactive)</span>}
              </button>
            ))}
          </div>

          {selectedAgent && (
            <div style={{ borderTop: '1px solid var(--line2)', paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', marginBottom: 12 }}>
                {selectedAgent.username}
                <span style={{ fontSize: 10, color: 'var(--text)', opacity: 0.5, marginLeft: 8 }}>performance</span>
              </div>

              {agentLoading ? (
                <div style={{ fontSize: 12, opacity: 0.5 }}>Loading...</div>
              ) : agentStats ? (
                <>
                  <div className="g4 mb" style={{ gap: 8 }}>
                    {[
                      { cls: 'stat-g', val: agentTotals.leads          ?? 0,   lbl: 'Assigned Leads' },
                      { cls: 'stat-b', val: agentTotals.calls          ?? 0,   lbl: 'Calls Made' },
                      { cls: 'stat-y', val: `${agentTotals.answerRate  ?? 0}%`, lbl: 'Answer Rate' },
                      { cls: 'stat-r', val: `${agentTotals.conversionRate ?? 0}%`, lbl: 'Conversion Rate' },
                    ].map(s => (
                      <div key={s.lbl} className={`stat ${s.cls}`} style={{ padding: '12px 14px' }}>
                        <div className="stat-val" style={{ fontSize: 22 }}>{s.val}</div>
                        <div className="stat-lbl">{s.lbl}</div>
                      </div>
                    ))}
                  </div>

                  <div className="g2" style={{ gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Lead Status Mix</div>
                      {Object.entries(agentStats.leadsByStatus || {}).length > 0
                        ? Object.entries(agentStats.leadsByStatus).map(([k, v]) => {
                          const max = Math.max(...Object.values(agentStats.leadsByStatus), 1)
                          return (
                            <div key={k} className="outcome-row">
                              <div style={{ fontSize: 11, color: 'var(--text)', width: 100, textTransform: 'capitalize' }}>{k}</div>
                              <div style={{ flex: 1, height: 3, background: 'var(--line2)', borderRadius: 2 }}>
                                <div style={{ height: '100%', borderRadius: 2, background: OUTCOME_COLORS[k] || 'var(--b)', width: `${v / max * 100}%` }} />
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: OUTCOME_COLORS[k] || 'var(--b)', width: 24, textAlign: 'right' }}>{v}</div>
                            </div>
                          )
                        })
                        : <div style={{ fontSize: 11, opacity: 0.4 }}>No assigned-lead status data yet.</div>}
                    </div>

                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Lead Source Mix</div>
                      {Object.entries(agentStats.leadsBySource || {}).length > 0
                        ? Object.entries(agentStats.leadsBySource).map(([k, v]) => {
                          const max = Math.max(...Object.values(agentStats.leadsBySource), 1)
                          return (
                            <div key={k} className="outcome-row">
                              <div style={{ fontSize: 11, color: 'var(--text)', width: 100, textTransform: 'capitalize' }}>{k}</div>
                              <div style={{ flex: 1, height: 3, background: 'var(--line2)', borderRadius: 2 }}>
                                <div style={{ height: '100%', borderRadius: 2, background: 'var(--g)', width: `${v / max * 100}%` }} />
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g)', width: 24, textAlign: 'right' }}>{v}</div>
                            </div>
                          )
                        })
                        : <div style={{ fontSize: 11, opacity: 0.4 }}>No source data yet.</div>}
                    </div>
                  </div>

                  {agentDailySeries.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>30-Day Agent Activity</div>
                      <div className="bar-chart" style={{ gap: 4, height: 100 }}>
                        {agentDailySeries.map(day => (
                          <div key={day.date} className="bar-col" style={{ minWidth: 16, gap: 4 }}>
                            <div style={{ display: 'flex', gap: 2, alignItems: 'end', width: '100%', height: 74 }}>
                              <div className="bar-fill" style={{ flex: 1, height: `${Math.max(day.leads    / agentDailyMax * 100, day.leads    ? 4 : 0)}%`, background: 'var(--b)' }} />
                              <div className="bar-fill" style={{ flex: 1, height: `${Math.max(day.calls    / agentDailyMax * 100, day.calls    ? 4 : 0)}%`, background: 'var(--y)' }} />
                              <div className="bar-fill" style={{ flex: 1, height: `${Math.max(day.converted/ agentDailyMax * 100, day.converted? 4 : 0)}%`, background: 'var(--g)' }} />
                            </div>
                            <div className="bar-label" style={{ fontSize: 7 }}>{day.date.slice(5)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="g2 mt" style={{ gap: 12 }}>
                    <DetailListCard
                      title="Interested Businesses"
                      subtitle="Converted leads with full business details"
                      items={agentDetails.interestedBusinesses || []}
                      empty="No interested businesses yet."
                      renderItem={(business) => <BusinessDetailCard key={business._id} business={business} accent="var(--g)" />}
                    />
                    <DetailListCard
                      title="Said No Businesses"
                      subtitle="Businesses marked as lost"
                      items={agentDetails.saidNoBusinesses || []}
                      empty="No businesses marked as no."
                      renderItem={(business) => <BusinessDetailCard key={business._id} business={business} accent="var(--r)" />}
                    />
                  </div>

                  <div className="g2 mt" style={{ gap: 12 }}>
                    <DetailListCard
                      title="No Answer Calls"
                      subtitle="Missed and no-answer call attempts"
                      items={agentDetails.noAnswerCalls || []}
                      empty="No no-answer calls recorded."
                      renderItem={(call) => <CallDetailRow key={call._id} call={call} accent="var(--y)" />}
                    />
                    <DetailListCard
                      title="Calls That Ended In No"
                      subtitle="Calls tied to leads marked lost"
                      items={agentDetails.saidNoCalls || []}
                      empty="No no-result calls recorded."
                      renderItem={(call) => <CallDetailRow key={call._id} call={call} accent="var(--r)" />}
                    />
                  </div>

                  <div className="card-sm mt" style={{ border: '1px solid var(--line2)' }}>
                    <div className="section-head" style={{ marginBottom: 10 }}>
                      <div className="section-title">All Calls For {selectedAgent.username}</div>
                    </div>
                    {(agentDetails.calls || []).length === 0 ? (
                      <div style={{ fontSize: 11, opacity: 0.4 }}>No calls logged yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
                        {(agentDetails.calls || []).map(call => <CallDetailRow key={call._id} call={call} accent={callAccent(call)} />)}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 16, borderTop: '1px solid var(--line2)', paddingTop: 12 }}>
                    <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      Assigned CSV Lists ({agentLists.length})
                    </div>
                    {agentLists.length === 0 ? (
                      <div style={{ fontSize: 11, opacity: 0.4 }}>No CSV lists assigned to this agent.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {agentLists.map(list => (
                          <div key={list._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg2)', borderRadius: 6, border: '1px solid var(--line2)' }}>
                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, opacity: 0.5, flexShrink: 0 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 500 }}>{list.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.4 }}>
                                {list.rowCount} businesses - {new Date(list.createdAt).toLocaleDateString()} - by {list.uploadedBy?.username || 'admin'}
                              </div>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--b)', background: 'rgba(59,130,246,.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(59,130,246,.2)' }}>
                              {list.rowCount}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {error && isAdmin && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--r)', opacity: 0.7 }}>
          Analytics API error: {error}. Make sure the backend is running and you are logged in as admin.
        </div>
      )}
    </div>
  )
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mergeDailySeries(leads = [], calls = [], conversions = []) {
  const map = new Map()
  leads.forEach(item       => map.set(item._id, { date: item._id, leads: item.count, calls: 0, converted: 0 }))
  calls.forEach(item       => map.set(item._id, { ...(map.get(item._id) || { date: item._id, leads: 0, converted: 0 }), calls: item.count }))
  conversions.forEach(item => map.set(item._id, { ...(map.get(item._id) || { date: item._id, leads: 0, calls: 0 }), converted: item.count }))
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function formatDuration(seconds) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs ? `${mins}m ${secs}s` : `${mins}m`
}

function formatPct(value) {
  return `${value > 0 ? '+' : ''}${value}%`
}

function trendColor(value) {
  if (value > 0) return 'var(--g)'
  if (value < 0) return 'var(--r)'
  return 'var(--text2)'
}

function formatHourLabel(hour) {
  const normalized = hour % 24
  const suffix     = normalized >= 12 ? 'PM' : 'AM'
  const twelve     = normalized % 12 || 12
  return `${twelve}:00 ${suffix}`
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function MetricChip({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 62 }}>
      <div style={{ fontSize: 9, color: 'var(--text)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color, fontWeight: 700, marginTop: 3 }}>{value}</div>
    </div>
  )
}

function callAccent(call) {
  if (call.leadStatus === 'converted')                              return 'var(--g)'
  if (call.leadStatus === 'lost')                                   return 'var(--r)'
  if (call.status === 'missed' || call.status === 'no_answer')      return 'var(--y)'
  return 'var(--b)'
}

function detailStatusLabel(status) {
  return ({
    converted: 'Interested', lost: 'Said No', contacted: 'Contacted',
    new: 'New', answered: 'Answered', missed: 'Missed', no_answer: 'No Answer',
  })[status] || status
}

function DetailListCard({ title, subtitle, items, empty, renderItem }) {
  return (
    <div className="card-sm" style={{ border: '1px solid var(--line2)' }}>
      <div className="section-head" style={{ marginBottom: 10 }}>
        <div>
          <div className="section-title">{title}</div>
          <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.5, marginTop: 6 }}>{subtitle}</div>
        </div>
      </div>
      {items.length === 0
        ? <div style={{ fontSize: 11, opacity: 0.4 }}>{empty}</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>{items.map(renderItem)}</div>}
    </div>
  )
}

function BusinessDetailCard({ business, accent }) {
  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid ${accent}33`, borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cream)' }}>{business.name}</div>
          <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginTop: 4 }}>{detailStatusLabel(business.status)}</div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.5 }}>{new Date(business.updatedAt || business.createdAt).toLocaleString()}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 10 }}>
        <Field label="Phone"   value={business.phone            || '-'} />
        <Field label="Email"   value={business.email            || '-'} />
        <Field label="Service" value={business.serviceRequested || '-'} />
        <Field label="Source"  value={business.source           || '-'} />
      </div>
      <Field label="Details" value={business.message || '-'} style={{ marginTop: 8 }} />
    </div>
  )
}

function CallDetailRow({ call, accent }) {
  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid ${accent}33`, borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cream)' }}>{call.leadName}</div>
          <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginTop: 4 }}>
            {detailStatusLabel(call.leadStatus || call.status)} - {detailStatusLabel(call.status)}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.5 }}>{new Date(call.createdAt).toLocaleString()}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 10 }}>
        <Field label="Phone"    value={call.leadPhone         || '-'} />
        <Field label="Email"    value={call.leadEmail         || '-'} />
        <Field label="Service"  value={call.serviceRequested  || '-'} />
        <Field label="Duration" value={formatDuration(call.duration || 0)} />
      </div>
      <Field label="Lead Details" value={call.leadMessage || '-'} style={{ marginTop: 8 }} />
      <Field label="Call Notes"   value={call.notes       || '-'} style={{ marginTop: 8 }} />
    </div>
  )
}

function Field({ label, value, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 9, color: 'var(--text)', opacity: 0.45, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--cream)', marginTop: 4, lineHeight: 1.5 }}>{value}</div>
    </div>
  )
}

