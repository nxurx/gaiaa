import { useState } from 'react'

export default function PreviewModal({ url, onClose }) {
  const [loaded, setLoaded] = useState(false)
  const full = url.startsWith('http') ? url : 'https://' + url

  return (
    <div className="preview-modal open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="preview-panel">
        <div className="preview-head">
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="preview-url">{full}</div>
          <a href={full} target="_blank" rel="noreferrer" className="btn btn-blue btn-sm">
            <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            Open
          </a>
        </div>
        <div className="preview-frame-wrap">
          {!loaded && (
            <div className="preview-loading">
              <div className="spin" />
              <div style={{ fontSize: 11, color: 'var(--text)', opacity: .6 }}>Loading...</div>
            </div>
          )}
          <iframe
            src={full}
            style={{ width: '100%', height: '100%', border: 'none', display: loaded ? 'block' : 'none' }}
            onLoad={() => setLoaded(true)}
            title="preview"
          />
        </div>
      </div>
    </div>
  )
}

