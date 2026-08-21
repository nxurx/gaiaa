/**
 * Loading skeleton components for better UX during data loading
 */

export function SkeletonCard() {
  return (
    <div className="card" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ height: 20, width: '60%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 14, width: '40%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 14, width: '80%', background: 'var(--bg2)', borderRadius: 4 }} />
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="stat" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)', marginBottom: 10 }} />
      <div style={{ height: 28, width: '40%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 4 }} />
      <div style={{ height: 10, width: '60%', background: 'var(--bg2)', borderRadius: 4 }} />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="card" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 14, width: `${20 + i * 5}%`, background: 'var(--bg2)', borderRadius: 4 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          {[1, 2, 3, 4].map(j => (
            <div key={j} style={{ height: 12, width: `${20 + j * 5}%`, background: 'var(--bg2)', borderRadius: 4 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonBizCard() {
  return (
    <div className="biz-card" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 14, width: '40%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 20, width: '70%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 14, width: '50%', background: 'var(--bg2)', borderRadius: 4 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i}>
            <div style={{ height: 10, width: '30%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 4 }} />
            <div style={{ height: 14, width: '70%', background: 'var(--bg2)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div style={{ height: 60, background: 'var(--bg2)', borderRadius: 8, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 36, width: 100, background: 'var(--bg2)', borderRadius: 8 }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ items = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} style={{ 
          padding: '12px 16px', 
          background: 'var(--bg1)', 
          border: '1px solid var(--line)', 
          borderRadius: 8,
          animation: 'pulse 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg2)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, width: '40%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 4 }} />
              <div style={{ height: 10, width: '60%', background: 'var(--bg2)', borderRadius: 4 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default {
  SkeletonCard,
  SkeletonStat,
  SkeletonTable,
  SkeletonBizCard,
  SkeletonList,
}
