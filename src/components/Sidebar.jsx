export default function Sidebar({
  user, activePage, onNav, onLogout, theme, onTheme,
  isOpen, onClose, uncalledCount, leadsCount, userObj
}) {
  const isAdmin = userObj?.role === 'admin'
  
  const navItems = [
    { section: 'Overview' },
    { page: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
    { section: 'Operations' },
    { page: 'queue', label: 'Call Queue', badge: uncalledCount, icon: <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07" /><circle cx="12" cy="12" r="3" /><path d="M2 12h3M19 12h3" /></svg> },
    { page: 'leads', label: 'Lead Database', badge: leadsCount, icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
    { page: 'filter', label: 'Lead Filter', icon: <svg viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg> },
    { page: 'calls', label: 'Call Tracker', icon: <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.96 9.7 19.79 19.79 0 01.9 1.1 2 2 0 012.88.01h3a2 2 0 012 1.72" /></svg> },
    { section: 'Tools' },
    { page: 'scripts', label: 'Scripts & Playbook', icon: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> },
    { page: 'analytics', label: 'Analytics', icon: <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
    ...(isAdmin ? [{ page: 'scraper', label: 'Google Maps Scraper', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg> }] : []),
    { page: 'settings', label: 'Settings', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg> },
  ]

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="s-logo">
        <div className="logo-text">Green<span className="logo-dot" /></div>
        <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text)', opacity: .5, marginTop: 3 }}>Command Center</div>
        <div className="s-user-chip">
          <div className="chip-av">{user?.[0]}</div>
          <div className="chip-name">{user}</div>
        </div>
      </div>

      <nav className="s-nav">
        {navItems.map((item, i) => {
          if (item.section) return <div key={i} className="s-section-label">{item.section}</div>
          return (
            <div
              key={item.page}
              className={`nav-item${activePage === item.page ? ' active' : ''}`}
              onClick={() => onNav(item.page)}
            >
              {item.icon}
              {item.label}
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </div>
          )
        })}
      </nav>

      <div className="s-footer">
        <div className="s-gaia-status"><div className="gaia-pip" />G.A.I.A. Online</div>
        <div className="theme-dots">
          {[['', 'tp-g'], ['red', 'tp-r'], ['mono', 'tp-m']].map(([t, cls]) => (
            <div
              key={t}
              className={`theme-dot ${cls}${theme === t ? ' on' : ''}`}
              onClick={() => onTheme(t)}
            />
          ))}
        </div>
      </div>
    </aside>
  )
}
