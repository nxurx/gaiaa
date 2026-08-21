import { useState, useEffect } from 'react'

export default function Toast({ msg, type, msgKey }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!msg) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(t)
  }, [msgKey])

  const borderColor = type === 'red' ? 'var(--r)' : type === 'warn' ? 'var(--y)' : 'var(--g)'

  return (
    <div className={`toast${visible ? ' show' : ''}`} style={{ borderLeftColor: borderColor }}>
      {msg}
    </div>
  )
}
