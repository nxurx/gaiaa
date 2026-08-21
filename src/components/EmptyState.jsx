/**
 * Empty state components for better UX when no data is available
 */

export function EmptyState({ icon, title, subtitle, action, actionText }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
      {icon && (
        <div style={{ 
          width: 64, 
          height: 64, 
          margin: '0 auto 20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text)',
          opacity: 0.4 
        }}>
          {icon}
        </div>
      )}
      <div style={{ 
        fontSize: 16, 
        fontWeight: 600, 
        color: 'var(--cream)', 
        marginBottom: 8 
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ 
          fontSize: 12, 
          color: 'var(--text)', 
          opacity: 0.6, 
          marginBottom: action ? 20 : 0,
          lineHeight: 1.6 
        }}>
          {subtitle}
        </div>
      )}
      {action && (
        <button 
          className="btn btn-primary btn-sm"
          onClick={action}
          style={{ marginTop: 16 }}
        >
          {actionText || 'Add Item'}
        </button>
      )}
    </div>
  )
}

export function EmptyLeads({ onUpload }) {
  return (
    <EmptyState
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>}
      title="No leads yet"
      subtitle="Upload a CSV file or load an assigned list to get started. Only businesses with a phone or website will be imported."
      action={onUpload}
      actionText="Upload CSV"
    />
  )
}

export function EmptyCalls() {
  return (
    <EmptyState
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.96 9.7 19.79 19.79 0 01.9 1.1 2 2 0 012.88.01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91" /></svg>}
      title="No calls logged yet"
      subtitle="Start making calls from the queue to see your activity here."
    />
  )
}

export function EmptyQueue({ onUpload }) {
  return (
    <EmptyState
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M1 1l22 22" /></svg>}
      title="Queue is empty"
      subtitle="Upload CSV files to load targets, or use My Lists to load a list your admin assigned you."
      action={onUpload}
      actionText="Upload CSV"
    />
  )
}

export function EmptyUsers() {
  return (
    <EmptyState
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>}
      title="No users found"
      subtitle="Create users to manage your team and assign leads."
    />
  )
}

export function EmptyScripts({ onAdd }) {
  return (
    <EmptyState
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
      title="No custom scripts"
      subtitle="Add custom scripts to personalize your sales playbook."
      action={onAdd}
      actionText="Add Script"
    />
  )
}

export function EmptySearch({ query }) {
  return (
    <EmptyState
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
      title={`No results for "${query}"`}
      subtitle="Try adjusting your search terms or filters."
    />
  )
}

export function EmptyAnalytics() {
  return (
    <EmptyState
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
      title="No analytics data yet"
      subtitle="Start making calls and managing leads to see your performance metrics."
    />
  )
}

export default {
  EmptyState,
  EmptyLeads,
  EmptyCalls,
  EmptyQueue,
  EmptyUsers,
  EmptyScripts,
  EmptySearch,
  EmptyAnalytics,
}
