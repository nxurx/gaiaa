import { useState, useRef, useCallback } from 'react'
import { parseCSV, autoDetect, isPhone, isWebsite, addLeadsFromRows } from '../../utils'

const FIELD_LABELS = { name: 'Business Name', reviews: 'Reviews', rating: 'Rating', phone: 'Phone', website: 'Website', category: 'Niche/Category', address: 'Address' }
const FIELDS = Object.keys(FIELD_LABELS)
const PRESETS = {
  strict: { minR: 20, maxR: 50, minRat: 3.5, maxRat: 4.6 },
  medium: { minR: 20, maxR: 150, minRat: 3.5, maxRat: 4.7 },
  wide:   { minR: 5,  maxR: 200, minRat: 3.0, maxRat: 4.8 },
  zero:   { minR: 0,  maxR: 30,  minRat: 1.0, maxRat: 5.0 },
}

export default function Filter({ leads, onLeads, onNav, toast }) {
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [map, setMap] = useState({ name: '', reviews: '', rating: '', phone: '', website: '', category: '', address: '' })
  const [filters, setFilters] = useState({ minR: 0, maxR: 200, minRat: 1, maxRat: 5, kw: '', exc: '' })
  const [filtered, setFiltered] = useState([])
  const [stats, setStats] = useState({ total: 0, pass: 0, fail: 0 })
  const [dragging, setDragging] = useState(false)
  const [activePreset, setActivePreset] = useState(null)
  const fileRef = useRef()

  function loadFile(file) {
    const reader = new FileReader()
    reader.onload = e => {
      let text = e.target.result
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
      const { headers: h, rows: r } = parseCSV(text)
      if (!h.length) { toast('Could not parse CSV.', 'warn'); return }
      const detected = autoDetect(h)
      setHeaders(h)
      setRows(r)
      setFileName(`${file.name} - ${r.length} records`)
      setMap(detected)
      applyFilter(r, detected, filters)
    }
    reader.readAsText(file, 'UTF-8')
  }

  function applyFilter(rowsToFilter = rows, mapToUse = map, f = filters) {
    const exc = f.exc.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    let pass = 0, fail = 0
    const result = rowsToFilter.map(row => {
      let ok = true, why = []
      if (mapToUse.reviews) {
        const n = parseFloat(row[mapToUse.reviews])
        if (!isNaN(n)) {
          if (n > f.maxR) { ok = false; why.push(`reviews ${n}>${f.maxR}`) }
          if (n < f.minR) { ok = false; why.push(`reviews ${n}<${f.minR}`) }
        }
      }
      if (mapToUse.rating) {
        const n = parseFloat(row[mapToUse.rating])
        if (!isNaN(n)) {
          if (n > f.maxRat) { ok = false; why.push(`rating ${n}>${f.maxRat}`) }
          if (n < f.minRat) { ok = false; why.push(`rating ${n}<${f.minRat}`) }
        }
      }
      if (f.kw && mapToUse.name) {
        if (!(row[mapToUse.name] || '').toLowerCase().includes(f.kw.toLowerCase())) { ok = false; why.push(`no kw`) }
      }
      if (exc.length && mapToUse.name) {
        const nm = (row[mapToUse.name] || '').toLowerCase()
        const hit = exc.find(e => nm.includes(e))
        if (hit) { ok = false; why.push(`excl "${hit}"`) }
      }
      ok ? pass++ : fail++
      return { row, ok, why }
    })
    setFiltered(result)
    setStats({ total: rowsToFilter.length, pass, fail })
  }

  function handleMapChange(field, val) {
    const newMap = { ...map, [field]: val }
    setMap(newMap)
    if (rows.length) applyFilter(rows, newMap, filters)
  }

  function handleFilterChange(key, val) {
    const newF = { ...filters, [key]: val }
    setFilters(newF)
    if (rows.length) applyFilter(rows, map, newF)
  }

  function applyPreset(key) {
    const p = PRESETS[key]
    const newF = { ...filters, ...p }
    setFilters(newF)
    setActivePreset(key)
    if (rows.length) applyFilter(rows, map, newF)
  }

  function autoDetectCols() {
    if (!headers.length) { toast('Upload a file first.', 'warn'); return }
    const detected = autoDetect(headers)
    setMap(detected)
    if (rows.length) applyFilter(rows, detected, filters)
    toast('Columns auto-detected.')
  }

  function sendToQueue() {
    const passing = filtered.filter(r => r.ok).map(r => r.row)
    if (!passing.length) { toast('No rows pass current filters.', 'warn'); return }
    const added = addLeadsFromRows(leads, passing, headers)
    onLeads([...leads, ...added])
    toast(`${added.length} leads sent to queue!`)
    onNav('queue')
  }

  function exportCSV() {
    const passing = filtered.filter(r => r.ok).map(r => r.row)
    if (!passing.length) { toast('Nothing to export.', 'warn'); return }
    const cols = Object.values(map).filter(Boolean)
    const exportCols = cols.length ? cols : headers
    const esc = v => '"' + String(v || '').replace(/"/g, '""') + '"'
    const csv = [exportCols.map(esc).join(','), ...passing.map(row => exportCols.map(h => esc(row[h])).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `Green_Filtered_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast(`${passing.length} leads exported.`)
  }

  function resetFilters() {
    const f = { minR: 0, maxR: 200, minRat: 1, maxRat: 5, kw: '', exc: '' }
    setFilters(f)
    setActivePreset(null)
    if (rows.length) applyFilter(rows, map, f)
  }

  const previewCols = FIELDS.filter(k => map[k]).map(k => ({ key: k, col: map[k] }))
  const shown = filtered.slice(0, 300)

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="gaia-strip">
        <div className="gaia-icon"><svg viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg></div>
        <span className="gaia-label">G.A.I.A.</span>
        <span className="gaia-text">
          {rows.length === 0
            ? 'Upload a raw scraper CSV. Map columns. Set filters. Send clean targets directly to the queue.'
            : `Loaded ${rows.length} records from "${fileName.split(' - ')[0]}". Check column mapping, then click Apply.`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Upload */}
          <div className="card">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div className="section-title"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>Upload</div>
            </div>
            <div
              className={`upload-zone${dragging ? ' dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]) }}
            >
              <div className="upload-zone-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
              <div style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 500, marginBottom: 4 }}>Drop CSV</div>
              <div style={{ fontSize: 11, color: 'var(--text)', opacity: .5, marginBottom: 12 }}>Any scraper export</div>
              <label className="btn btn-outline btn-sm" htmlFor="filterFileInput" style={{ cursor: 'pointer' }}>Browse</label>
              <input type="file" id="filterFileInput" accept=".csv,text/csv,text/plain" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = '' }} />
            </div>
            {fileName && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text)', opacity: .5, textAlign: 'center' }}>{fileName}</div>}
          </div>

          {/* Filters */}
          <div className="card">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div className="section-title"><svg viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>Filters</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Max Reviews', key: 'maxR', min: 0, max: 1000, step: 5 },
                { label: 'Min Reviews', key: 'minR', min: 0, max: 500, step: 5 },
                { label: 'Max Rating', key: 'maxRat', min: 1, max: 5, step: 0.1, dec: true },
                { label: 'Min Rating', key: 'minRat', min: 1, max: 5, step: 0.1, dec: true },
              ].map(({ label, key, min, max, step, dec }) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="input-label" style={{ margin: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--font-serif)' }}>
                      {dec ? Number(filters[key]).toFixed(1) : filters[key]}
                    </span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={filters[key]} onChange={e => handleFilterChange(key, parseFloat(e.target.value))} />
                </div>
              ))}
              <div>
                <label className="input-label">Include Keyword</label>
                <input className="inp" placeholder="dental, hvac..." value={filters.kw} onChange={e => handleFilterChange('kw', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Exclude Keywords</label>
                <input className="inp" placeholder="inc, llc, chain..." value={filters.exc} onChange={e => handleFilterChange('exc', e.target.value)} />
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />
            <div className="input-label">Presets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.keys(PRESETS).map(k => (
                <div
                  key={k}
                  onClick={() => applyPreset(k)}
                  style={{
                    padding: '5px 12px', border: `1px solid ${activePreset === k ? 'var(--g)' : 'var(--line2)'}`,
                    borderRadius: 20, fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: activePreset === k ? 'var(--g)' : 'var(--text)',
                    background: activePreset === k ? 'var(--glow)' : 'transparent', cursor: 'pointer'
                  }}
                >
                  {k === 'zero' ? 'Low Rev' : k.charAt(0).toUpperCase() + k.slice(1)}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { if (!rows.length) { toast('Upload a CSV first.', 'warn'); return } applyFilter(); toast('Filters applied.') }}>Apply</button>
            <button className="btn btn-outline" onClick={resetFilters}>Reset</button>
          </div>
        </div>

        {/* Right panel */}
        <div>
          <div className="g4 mb">
            {[
              { label: 'Total', val: stats.total || '-', color: 'var(--cream)' },
              { label: 'Pass', val: stats.pass || '-', color: 'var(--g)' },
              { label: 'Filtered', val: stats.fail || '-', color: 'var(--r)' },
              { label: 'Rate', val: stats.total ? `${Math.round(stats.pass / stats.total * 100)}%` : '-', color: 'var(--y)' },
            ].map(s => (
              <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text)', opacity: .5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Column mapping */}
          {headers.length > 0 && (
            <div className="card mb">
              <div className="section-head" style={{ marginBottom: 8 }}>
                <div className="section-title"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>Column Mapping</div>
                <button className="btn btn-outline btn-sm" onClick={autoDetectCols}>Auto-Detect</button>
              </div>
              <div className="filter-info">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                Map your CSV columns to the correct fields, then click Apply to filter.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {FIELDS.map(f => (
                  <div key={f}>
                    <div className="input-label">{FIELD_LABELS[f]}</div>
                    <select className="inp" style={{ fontSize: 11 }} value={map[f]} onChange={e => handleMapChange(f, e.target.value)}>
                      <option value="">- ignore</option>
                      {headers.map(h => <option key={h} value={h}>{h.length > 20 ? h.slice(0, 20) + '...' : h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results table */}
          <div className="card">
            <div className="section-head" style={{ marginBottom: 12 }}>
              <div className="section-title"><svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /></svg>Results</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {filtered.some(r => r.ok) && <button className="btn btn-primary btn-sm" onClick={sendToQueue}>Send to Queue</button>}
                {filtered.some(r => r.ok) && <button className="btn btn-outline btn-sm" onClick={exportCSV}>Export CSV</button>}
              </div>
            </div>
            <div className="leads-table-wrap">
              {rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, fontSize: 12, color: 'var(--text)', opacity: .5 }}>Upload a CSV to preview filtered results.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      {previewCols.map(c => <th key={c.key}>{FIELD_LABELS[c.key] || c.col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(({ row, ok, why }, i) => (
                      <tr key={i} style={!ok ? { opacity: .3 } : {}}>
                        <td>
                          {ok
                            ? <span className="pill pill-g">Pass</span>
                            : <span className="pill pill-r" title={why.join(', ')}>Fail</span>}
                        </td>
                        {previewCols.map(c => (
                          <td key={c.key} style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row[c.col] || ''}>
                            {row[c.col] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {filtered.length > 300 && (
                      <tr><td colSpan={previewCols.length + 1} style={{ textAlign: 'center', fontSize: 10, opacity: .4, padding: 8 }}>+ {filtered.length - 300} more rows...</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

