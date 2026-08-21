import { useEffect, useMemo, useState } from 'react'
import { leadsApi, scraperApi, usersApi } from '../../api'
import { formatPhone, formatUrl } from '../../utils/formatting'

const NICHES = [
  'Plumbing',
  'HVAC',
  'Roofing',
  'Electrical',
  'Landscaping',
  'Pest Control',
  'Cleaning Service',
  'Auto Repair',
  'Dentist',
  'Chiropractor',
  'Med Spa',
  'Real Estate',
  'Restaurant',
  'Gym',
  'Salon',
  'Law Firm',
  'Insurance Agency',
  'Home Remodeling',
]

export default function Scraper({ toast, userObj, onRefreshLeads }) {
  const isAdmin = userObj?.role === 'admin'
  const [selectedNiches, setSelectedNiches] = useState(['Plumbing'])
  const [form, setForm] = useState({ city: 'Charlotte', state: 'NC', country: 'USA' })
  const [agents, setAgents] = useState([])
  const [assignTo, setAssignTo] = useState('')
  const [campaign, setCampaign] = useState('')
  const [scraping, setScraping] = useState(false)
  const [progress, setProgress] = useState('')
  const [summaries, setSummaries] = useState([])
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!isAdmin) return
    usersApi.list({ limit: 100 })
      .then(res => setAgents((res.data || []).filter(user => user.role === 'agent' && user.isActive !== false)))
      .catch(() => setAgents([]))
  }, [isAdmin])

  const selectedRows = useMemo(
    () => results.filter((_, index) => selected.has(index)),
    [results, selected],
  )

  const groupedCounts = useMemo(() => {
    return results.reduce((acc, row) => {
      const key = row.niche || row.category || 'Unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [results])

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleNiche(niche) {
    setSelectedNiches(prev => {
      if (prev.includes(niche)) {
        const next = prev.filter(item => item !== niche)
        return next.length ? next : prev
      }
      return [...prev, niche]
    })
  }

  function selectCoreTrades() {
    setSelectedNiches(['Plumbing', 'HVAC', 'Roofing', 'Electrical'])
  }

  function clearNiches() {
    setSelectedNiches(['Plumbing'])
  }

  async function handleScrape() {
    setScraping(true)
    setProgress('Starting scrape...')
    setResults([])
    setSummaries([])
    setSelected(new Set())
    setSummary(null)

    try {
      const response = await scraperApi.start({
        industries: selectedNiches,
        city: form.city,
        state: form.state,
        country: form.country,
        maxResults: 150,
      })

      if (!response.ok || !response.body) throw new Error(`Scrape failed (${response.status})`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (buffer.trim()) handleScraperEvent(buffer)
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        events.forEach(handleScraperEvent)
      }
    } catch (error) {
      toast('Scraper failed: ' + error.message, 'warn')
      setProgress('')
    } finally {
      setScraping(false)
    }
  }

  function handleScraperEvent(eventText) {
    const line = eventText.split('\n').find(item => item.startsWith('data: '))
    if (!line) return

    const data = JSON.parse(line.slice(6))
    if (data.message) setProgress(data.message)
    if (data.type === 'error') throw new Error(data.message || 'Scrape failed')
    if (data.type === 'niche_done') {
      setSummaries(prev => [...prev.filter(item => item.niche !== data.niche), { niche: data.niche, count: data.count, target: data.total }])
    }
    if (data.type === 'done') {
      const rows = data.results || []
      setResults(rows)
      setSummaries(data.summaries || [])
      setSelected(new Set(rows.map((_, index) => index)))
      setProgress(rows.length ? `Scraped ${rows.length} real business records across ${selectedNiches.length} list${selectedNiches.length === 1 ? '' : 's'}.` : 'No businesses found.')
    }
  }

  function toggle(index) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => prev.size === results.length ? new Set() : new Set(results.map((_, index) => index)))
  }

  async function exportCSV() {
    const rows = selectedRows.length ? selectedRows : results
    if (!rows.length) {
      toast('Run a scrape first.', 'warn')
      return
    }

    const response = await scraperApi.exportCSV({ results: rows })
    if (!response.ok) {
      toast('CSV export failed.', 'warn')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedNiches.join('_')}_${form.city}_leads.csv`.replace(/\s+/g, '_')
    link.click()
    URL.revokeObjectURL(url)
    toast('CSV exported.')
  }

  async function sendToQueue() {
    if (!selectedRows.length) {
      toast('Select at least one business.', 'warn')
      return
    }

    try {
      const payload = {
        leads: selectedRows.map(biz => ({
          name: biz.name,
          email: biz.email || '',
          phone: biz.phone || '',
          website: biz.website || '',
          address: biz.address || '',
          rating: String(biz.rating || ''),
          reviews: String(biz.reviews || ''),
          industry: biz.niche || biz.category,
          serviceRequested: biz.niche || biz.category,
          message: `Scraped from ${biz.listName || `${form.city}, ${form.state}`}`,
          source: 'google_maps_scraper',
          customFields: { listName: biz.listName || '', listIndex: biz.listIndex || '' },
          enrichment: { ...(biz.enrichment || {}), mapsLink: biz.link || '', category: biz.category || biz.niche },
        })),
        source: 'google_maps_scraper',
        industry: selectedNiches.join(', '),
        campaign: campaign || `${selectedNiches.join(', ')} - ${form.city}`,
        tags: ['scraper', ...selectedNiches.map(niche => niche.toLowerCase().replace(/\s+/g, '-'))],
        priority: 'normal',
        assignTo: assignTo || undefined,
      }

      const res = await leadsApi.bulkImport(payload)
      setSummary(res.data)
      toast(`${res.data.imported} sent to queue. ${res.data.skipped} duplicates skipped.`)
      onRefreshLeads?.()
    } catch (error) {
      toast('Queue import failed: ' + error.message, 'warn')
    }
  }

  if (!isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 16, color: 'var(--text)' }}>Admin access required</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1180 }}>
      <div className="gaia-strip">
        <div className="gaia-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </div>
        <span className="gaia-label">Scraper</span>
        <span className="gaia-text">Select multiple niches. Each selected niche becomes a list targeting 150 real business records.</span>
      </div>

      <div className="card mb">
        <div className="section-head">
          <div className="section-title">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            Search
          </div>
          <div className="scraper-count">{selectedNiches.length} niche{selectedNiches.length === 1 ? '' : 's'} selected</div>
        </div>

        <div className="niche-picker">
          {NICHES.map(niche => (
            <button
              type="button"
              key={niche}
              className={`niche-choice${selectedNiches.includes(niche) ? ' selected' : ''}`}
              onClick={() => toggleNiche(niche)}
            >
              <span className="niche-check">{selectedNiches.includes(niche) ? '✓' : ''}</span>
              {niche}
            </button>
          ))}
        </div>

        <div className="scraper-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={selectCoreTrades}>Core Trades</button>
          <button className="btn btn-outline btn-sm" onClick={() => setSelectedNiches(NICHES)}>Select All</button>
          <button className="btn btn-outline btn-sm" onClick={clearNiches}>Reset</button>
        </div>

        <div className="scraper-simple-grid mt">
          <div>
            <label className="input-label">City</label>
            <input className="inp" value={form.city} onChange={event => updateForm('city', event.target.value)} placeholder="Charlotte" />
          </div>
          <div>
            <label className="input-label">State</label>
            <input className="inp" value={form.state} onChange={event => updateForm('state', event.target.value)} placeholder="NC" />
          </div>
          <div>
            <label className="input-label">Country</label>
            <input className="inp" value={form.country} onChange={event => updateForm('country', event.target.value)} placeholder="USA" />
          </div>
          <div>
            <label className="input-label">Assign to Agent</label>
            <select className="inp" value={assignTo} onChange={event => setAssignTo(event.target.value)}>
              <option value="">Unassigned</option>
              {agents.map(agent => <option key={agent._id} value={agent._id}>{agent.username}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Campaign</label>
            <input className="inp" value={campaign} onChange={event => setCampaign(event.target.value)} placeholder={`${selectedNiches[0]} - ${form.city}`} />
          </div>
        </div>

        <div className="scraper-actions">
          <button className="btn btn-primary" onClick={handleScrape} disabled={scraping || !selectedNiches.length}>
            {scraping ? 'Scraping...' : `Scrape 150 Per List`}
          </button>
          <button className="btn btn-outline" onClick={exportCSV} disabled={!results.length}>Export CSV</button>
          <button className="btn btn-blue" onClick={sendToQueue} disabled={!selectedRows.length}>Assign / Send to Queue ({selectedRows.length})</button>
        </div>
        {progress && <div className="scraper-progress">{progress}</div>}
      </div>

      {(summaries.length > 0 || results.length > 0) && (
        <div className="card mb">
          <div className="section-head">
            <div className="section-title">
              <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              Lists
            </div>
          </div>
          <div className="scraper-list-summary">
            {(summaries.length ? summaries : Object.entries(groupedCounts).map(([niche, count]) => ({ niche, count, target: 150 }))).map(item => (
              <div className="scraper-list-pill" key={item.niche}>
                <strong>{item.niche}</strong>
                <span>{item.count} / {item.target || 150}{item.status === 'partial' ? ' partial' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="section-head">
            <div className="section-title">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg>
              Results ({results.length})
            </div>
            <button className="btn btn-outline btn-sm" onClick={toggleAll}>
              {selected.size === results.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="leads-table-wrap mb">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>List</th>
                  <th>Business</th>
                  <th>Phone</th>
                  <th>Website</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {results.map((biz, index) => (
                  <tr key={`${biz.id || biz.name}-${index}`}>
                    <td><input type="checkbox" checked={selected.has(index)} onChange={() => toggle(index)} /></td>
                    <td>{biz.niche || biz.category}</td>
                    <td className="cell-name">{biz.name}</td>
                    <td>{formatPhone(biz.phone)}</td>
                    <td>{formatUrl(biz.website)}</td>
                    <td>{biz.address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {summary && (
        <div className="import-summary">
          <span>Imported: {summary.imported}</span>
          <span>Skipped: {summary.skipped}</span>
          <span>Duplicates: {summary.duplicates?.length || 0}</span>
          <span>Errors: {summary.errors?.length || 0}</span>
        </div>
      )}
    </div>
  )
}
