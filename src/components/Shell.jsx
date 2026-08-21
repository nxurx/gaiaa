import { useState, useEffect, useRef } from 'react'
import { TZS, fmtTime, isOpen, PAGE_TITLES } from '../utils'
import Sidebar from './Sidebar'
import Dashboard from './pages/Dashboard'
import Queue from './pages/Queue'
import Leads from './pages/Leads'
import Filter from './pages/Filter'
import Calls from './pages/Calls'
import Scripts from './pages/Scripts'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Scraper from './pages/Scraper'
import PreviewModal from './PreviewModal'

export default function Shell({
  user, userObj, theme, onTheme, onLogout, activePage, onNav,
  sidebarOpen, onSidebar,
  leads, calls, scripts, notes,
  onLeads, onCalls, onScripts, onNotes, onAddFiles,
  activity, onActivity, toast,
  onRefreshLeads, onRefreshCalls,
}) {
  const [clocks, setClocks] = useState(() => TZS.map(tz => ({ ...tz, time: fmtTime(tz.z), open: isOpen(tz.z) })))
  const [previewUrl, setPreviewUrl] = useState(null)
  const shellRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => {
      setClocks(TZS.map(tz => ({ ...tz, time: fmtTime(tz.z), open: isOpen(tz.z) })))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (shellRef.current) shellRef.current.classList.add('visible')
  }, [])

  const pages = {
    dashboard: <Dashboard leads={leads} calls={calls} clocks={clocks} activity={activity} onNav={onNav} />,
    queue:     <Queue
                 leads={leads} calls={calls} clocks={clocks}
                 onLeads={onLeads} onCalls={onCalls} onAddFiles={onAddFiles}
                 onActivity={onActivity} onPreview={setPreviewUrl}
                 toast={toast} user={user} userObj={userObj}
               />,
    leads:     <Leads leads={leads} onLeads={onLeads} onAddFiles={onAddFiles} onPreview={setPreviewUrl} toast={toast} userObj={userObj} onRefreshLeads={onRefreshLeads} />,
    filter:    <Filter leads={leads} onLeads={onLeads} onNav={onNav} toast={toast} />,
    calls:     <Calls calls={calls} leads={leads} onCalls={onCalls} onLeads={onLeads} onActivity={onActivity} toast={toast} onRefreshCalls={onRefreshCalls} onRefreshLeads={onRefreshLeads} />,
    scripts:   <Scripts scripts={scripts} notes={notes} onScripts={onScripts} onNotes={onNotes} toast={toast} user={user} />,
    analytics: <Analytics leads={leads} calls={calls} userObj={userObj} toast={toast} />,
    scraper:   <Scraper toast={toast} userObj={userObj} onLeads={onLeads} onRefreshLeads={onRefreshLeads} />,
    settings:  <Settings user={user} userObj={userObj} onLogout={onLogout} theme={theme} onTheme={onTheme} toast={toast} onRefreshLeads={onRefreshLeads} onRefreshCalls={onRefreshCalls} />,
  }

  const uncalledCount = leads.filter(l => l.status === 'uncalled').length

  return (
    <>
      <div className="shell" ref={shellRef}>
        <Sidebar
          user={user}
          userObj={userObj}
          activePage={activePage}
          onNav={p => { onNav(p); onSidebar(false) }}
          onLogout={onLogout}
          theme={theme}
          onTheme={onTheme}
          isOpen={sidebarOpen}
          onClose={() => onSidebar(false)}
          uncalledCount={uncalledCount}
          leadsCount={leads.length}
        />

        {sidebarOpen && (
          <div className="sidebar-overlay open" onClick={() => onSidebar(false)} />
        )}

        <div className="main">
          {/* Topbar */}
          <div className="topbar">
            <button className="menu-btn" onClick={() => onSidebar(!sidebarOpen)}>
              <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className="topbar-title">{PAGE_TITLES[activePage] || activePage}</div>
            <div className="clocks">
              {clocks.map((c, i) => (
                <div key={c.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="clock-item">
                    <div className="clock-city">{c.n}</div>
                    <div className="clock-time">{c.time}</div>
                    <div className={`clock-status ${c.open ? 'status-open' : 'status-closed'}`}>
                      {c.open ? 'Open' : 'Closed'}
                    </div>
                  </div>
                  {i < clocks.length - 1 && <div style={{ width: 1, height: 22, background: 'var(--line2)' }} />}
                </div>
              ))}
            </div>
            <div className="topbar-div" />
            {/* Calendly Booking Button */}
            <a href="https://calendly.com/greenmedialabs/30min" target="_blank" rel="noopener noreferrer" className="calendly-btn">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              Book Meeting
            </a>
            {/* Role badge */}
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: 1,
              background: userObj?.role === 'admin' ? 'rgba(62,207,106,.12)' : 'rgba(59,130,246,.12)',
              color: userObj?.role === 'admin' ? 'var(--g)' : 'var(--b)',
              border: `1px solid ${userObj?.role === 'admin' ? 'rgba(62,207,106,.3)' : 'rgba(59,130,246,.3)'}`,
            }}>
              {userObj?.role || 'agent'}
            </span>
            <button className="logout-btn" onClick={onLogout} title="Logout">
              <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>

          {/* Pages */}
          {Object.entries(pages).map(([key, el]) => (
            <div key={key} className={`page${activePage === key ? ' active' : ''}`}>
              {activePage === key ? el : null}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="mobile-bottom-nav">
        {[
          { page: 'dashboard', label: 'Home',    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
          { page: 'queue',     label: 'Queue',   badge: uncalledCount, icon: <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07" /><circle cx="12" cy="12" r="3" /><path d="M2 12h3M19 12h3" /></svg> },
          { page: 'leads',     label: 'Leads',   icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg> },
          { page: 'calls',     label: 'Calls',   icon: <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.96 9.7 19.79 19.79 0 01.9 1.1 2 2 0 012.88.01h3a2 2 0 012 1.72" /></svg> },
          { page: 'scripts',   label: 'Scripts', icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
        ].map(({ page, label, icon, badge }) => (
          <div key={page} className={`mob-nav-item${activePage === page ? ' active' : ''}`} onClick={() => onNav(page)}>
            <div className="mob-nav-icon-wrap">
              {icon}
              {badge > 0 && <span className="mob-badge">{badge}</span>}
            </div>
            {label}
          </div>
        ))}
      </div>

      {previewUrl && <PreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </>
  )
}
