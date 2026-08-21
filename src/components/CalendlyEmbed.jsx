import { useState, useEffect } from 'react'

export default function CalendlyEmbed({ url, lead, onBookingComplete, onClose }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Load Calendly script
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    script.onload = () => setLoaded(true)
    script.onerror = () => setError(true)
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    // Listen for Calendly events
    if (typeof window !== 'undefined' && window.Calendly) {
      window.Calendly.initInlineWidget({
        url: url,
        parentElement: document.getElementById('calendly-container'),
        prefill: {},
        utm: {},
      })

      // Listen for booking completion
      window.addEventListener('message', handleCalendlyMessage)
    }

    return () => {
      window.removeEventListener('message', handleCalendlyMessage)
    }
  }, [url, loaded])

  function handleCalendlyMessage(event) {
    if (event.data.event === 'calendly.event_scheduled') {
      onBookingComplete(event.data.payload)
    }
  }

  if (error) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        color: 'var(--r)' 
      }}>
        Failed to load Calendly. Please try again later.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Lead info header */}
      {lead && (
        <div style={{ 
          padding: '16px 20px', 
          background: 'var(--bg2)', 
          borderBottom: '1px solid var(--line)',
          flexShrink: 0 
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text)', opacity: 0.6, marginBottom: 4 }}>
            Booking for
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--cream)' }}>
            {lead.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>
            {lead.phone} • {lead.category || 'General'}
          </div>
        </div>
      )}

      {/* Calendly iframe container */}
      <div 
        id="calendly-container"
        style={{ 
          flex: 1, 
          minHeight: 600,
          background: 'var(--bg)' 
        }}
      />
    </div>
  )
}
