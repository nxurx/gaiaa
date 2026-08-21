import { useState, useEffect } from 'react'

export default function AppointmentConfirm({ lead, onConfirm, onCancel, onSkip }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Show modal after a short delay to allow page navigation
    const timer = setTimeout(() => setShow(true), 500)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="modal-bg open" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div className="modal-title">Appointment Confirmation</div>
          <div className="modal-close" onClick={onCancel}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ 
              width: 64, 
              height: 64, 
              borderRadius: '50%', 
              background: 'var(--glow)', 
              border: '2px solid var(--gborder)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: 32, height: 32, stroke: 'var(--g)', strokeWidth: 2, fill: 'none' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--cream)', marginBottom: 8 }}>
              Did you successfully book the appointment?
            </div>
            
            {lead && (
              <div style={{ fontSize: 12, color: 'var(--text)', opacity: 0.7, marginBottom: 24 }}>
                for <strong style={{ color: 'var(--cream)' }}>{lead.name}</strong>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button 
                className="btn btn-primary"
                style={{ padding: '14px 24px', fontSize: 13 }}
                onClick={onConfirm}
              >
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                Yes, Appointment Booked
              </button>
              
              <button 
                className="btn btn-red"
                style={{ padding: '14px 24px', fontSize: 13 }}
                onClick={() => onConfirm(false)}
              >
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                No, Not Booked
              </button>
              
              <button 
                className="btn btn-ghost"
                style={{ padding: '12px 24px', fontSize: 12 }}
                onClick={onSkip}
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
