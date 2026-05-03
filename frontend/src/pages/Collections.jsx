import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Message from '../components/Message'
import Navbar from '../components/Navbar'

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function localDateMs(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

function formatDate(ts) {
  const [y, m, d] = new Date(ts).toISOString().split('T')[0].split('-')
  return `${m}/${d}/${y}`
}

function StatusBadge({ status }) {
  const map = {
    donated:   'status-donated',
    collected: 'status-collected',
    planned:   'status-planned',
  }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return <span className={`status-badge ${map[status] || ''}`}>{label}</span>
}

const INIT_START = '1970-01-01'
const INIT_END   = '9999-12-30'

// ── Chevron icon ──────────────────────────────
function Chevron({ open }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.5 }}
    >
      <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function Collections() {
  const navigate  = useNavigate()
  const msgRef    = useRef()

  const [userData,           setUserData]           = useState(null)
  const [branches,           setBranches]           = useState({})
  const [collections,        setCollections]        = useState({})
  const [activeBranch,       setActiveBranch]       = useState(null)
  const [startDate,          setStartDate]          = useState(INIT_START)
  const [endDate,            setEndDate]            = useState(INIT_END)
  const [charts,             setCharts]             = useState([])
  const [visibleCollections, setVisibleCollections] = useState([])

  // Sidebar accordion state
  const [branchesOpen, setBranchesOpen] = useState(true)
  const [datesOpen,    setDatesOpen]    = useState(false)

  // Modal state
  const [modalDisplay,          setModalDisplay]          = useState('none')
  const [modalAnimation,        setModalAnimation]        = useState('')
  const [modalContentAnimation, setModalContentAnimation] = useState('')
  const [modalMode,             setModalMode]             = useState('create')
  const [formDisabled,          setFormDisabled]          = useState(false)
  const [form, setForm] = useState({
    branch: '', date: todayStr(), source: '', quantity: '',
    status: 'planned', receipt: '', donatedTo: '', existingImage: false,
  })
  const imageInputRef = useRef()

  useEffect(() => { init() }, [])

  async function init() {
    try {
      const me = await api.me()
      setUserData(me)
      const branchData = await api.branches()
      const b = branchData.branches
      setBranches(b)
      const initBranch = me.branch && me.branch in b ? me.branch : null
      setActiveBranch(initBranch)
      await fetchAndRender(initBranch, INIT_START, INIT_END, b)
    } catch {
      navigate('/login')
    }
  }

  async function fetchAndRender(branch, start, end, branchMap) {
    const bMap = branchMap || branches
    try {
      const colData = await api.collections()
      const cols = colData.collections
      setCollections(cols)

      const startMs = localDateMs(start)
      const endMs   = localDateMs(end)

      const filtered = Object.values(cols).filter(c => {
        if (c.time > endMs || c.time < startMs) return false
        if (branch !== null && c.branch !== branch) return false
        return true
      })

      filtered.sort((a, b) => {
        const diff = b.time - a.time
        return diff !== 0 ? diff : b.created - a.created
      })

      setVisibleCollections(filtered)

      let earliest = Number.MAX_SAFE_INTEGER
      let latest   = 0
      for (const c of filtered) {
        if (c.time < earliest) earliest = c.time
        if (c.time > latest)   latest   = c.time
      }

      const chartData = await api.generateCharts({
        collection_ids:     filtered.map(c => c.id),
        earliest_timestamp: earliest === Number.MAX_SAFE_INTEGER ? 0 : earliest,
        latest_timestamp:   latest,
        colors: {
          background: '#0d0f14',
          accent:     '#191c27',
          text:       '#eef0f6',
        },
      })
      setCharts(chartData.charts)
    } catch {
      msgRef.current?.show('Failed to load data', 'red')
    }
  }

  async function handleUpdate() {
    await fetchAndRender(activeBranch, startDate, endDate)
    setBranchesOpen(false)
    setDatesOpen(false)
    msgRef.current?.show('Collections updated', 'green')
  }

  async function handleBranchFilter(branch) {
    const next = branch === 'ALL' ? null : branch
    setActiveBranch(next)
    await fetchAndRender(next, startDate, endDate)
  }

  function openCreateModal() {
    if (!userData) return
    const defaultBranch = userData.branch && userData.branch in branches
      ? userData.branch
      : Object.keys(branches)[0] || ''
    setForm({
      branch: defaultBranch, date: todayStr(), source: '', quantity: '',
      status: 'planned', receipt: '', donatedTo: '', existingImage: false,
    })
    setFormDisabled(false)
    setModalMode('create')
    showModal()
  }

  function openEditModal(collectionID) {
    const c = collections[collectionID]
    if (!c) return
    const disabled  = !(c.branch === userData?.branch || userData?.is_admin)
    const isoDate   = new Date(c.time).toISOString().split('T')[0]
    setForm({
      branch: c.branch, date: isoDate, source: c.source,
      quantity:  c.quantity === -1 ? '' : String(c.quantity),
      status:    c.status,
      receipt:   c.receipt ? String(c.receipt) : '',
      donatedTo: c.donated_to || '',
      existingImage: c.image, collectionID,
    })
    setFormDisabled(disabled)
    setModalMode(collectionID)
    showModal()
  }

  function showModal() {
    setModalDisplay('')
    setModalAnimation('fade-in 0.25s ease')
    setModalContentAnimation('slide-up 0.25s ease')
  }

  function closeModal() {
    setModalAnimation('fade-out 0.25s ease forwards')
    setModalContentAnimation('slide-down 0.25s ease forwards')
    setTimeout(() => setModalDisplay('none'), 260)
  }

  function handleDateChange(dateStr) {
    const isPlanned = dateStr >= todayStr()
    setForm(f => ({ ...f, date: dateStr, ...(isPlanned ? { status: 'planned' } : {}) }))
  }

  function readImageFile() {
    return new Promise(resolve => {
      const file = imageInputRef.current?.files[0]
      if (!file) return resolve(null)
      if (file.size / 1024 / 1024 > 8) {
        msgRef.current?.show('Image too large (max 8 MB)', 'red')
        return resolve(undefined)
      }
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result || null)
      reader.readAsDataURL(file)
    })
  }

  async function submitModal() {
    const { branch, date, source, status, quantity, receipt, donatedTo } = form
    if (!branch || !date || !source || !status) {
      msgRef.current?.show('Please fill in all required fields', 'red')
      return
    }
    const qty       = !quantity || Number(quantity) <= 0 ? -1 : Number(quantity)
    const rec       = !receipt  || Number(receipt)  <  0 ?  0 : Number(receipt)
    const timestamp = new Date(date).getTime()
    const imageData = await readImageFile()
    if (imageData === undefined) return

    try {
      if (modalMode === 'create') {
        await api.createCollection({ branch, timestamp, source, quantity: qty, status, receipt: rec, donated_to: donatedTo, image: imageData })
        msgRef.current?.show('Collection created', 'green')
      } else {
        await api.updateCollection(modalMode, { branch, time: timestamp, source, quantity: qty, status, receipt: rec, donated_to: donatedTo, image: imageData })
        msgRef.current?.show('Collection updated', 'green')
      }
      closeModal()
      await fetchAndRender(activeBranch, startDate, endDate)
    } catch (e) {
      msgRef.current?.show(e.message || 'Failed to save', 'red')
    }
  }

  async function deleteCollection() {
    try {
      await api.deleteCollection(modalMode)
      msgRef.current?.show('Collection deleted', 'green')
      closeModal()
      await fetchAndRender(activeBranch, startDate, endDate)
    } catch (e) {
      msgRef.current?.show(e.message || 'Failed to delete', 'red')
    }
  }

  const isAdmin      = userData?.is_admin || false
  const isPlannedDate = form.date >= todayStr()

  const sortedBranchEntries = Object.entries(branches).sort(([a], [b]) => {
    if (a === userData?.branch) return -1
    if (b === userData?.branch) return 1
    return 0
  })

  return (
    <>
      <Message ref={msgRef} />
      <Navbar isAdmin={isAdmin} onSubmit={openCreateModal} />

      <div className="main-container">
        {/* ── Sidebar ─────────────────────── */}
        <aside className="sidebar-menu">
          <span className="sidebar-label">Filters</span>

          <div className="menu-section">
            <div
              className={`menu-title${branchesOpen ? ' open' : ''}`}
              onClick={() => setBranchesOpen(v => !v)}
            >
              Branches <Chevron open={branchesOpen} />
            </div>
            {branchesOpen && (
              <div className="menu-options" style={{ display: 'flex' }}>
                <button
                  className={activeBranch === null ? 'active' : ''}
                  onClick={() => handleBranchFilter('ALL')}
                >All branches</button>
                {sortedBranchEntries.map(([key, b]) => (
                  <button
                    key={key}
                    className={activeBranch === key ? 'active' : ''}
                    onClick={() => handleBranchFilter(key)}
                  >{b.acronym}</button>
                ))}
              </div>
            )}
          </div>

          <div className="menu-section">
            <div
              className={`menu-title${datesOpen ? ' open' : ''}`}
              onClick={() => setDatesOpen(v => !v)}
            >
              Date range <Chevron open={datesOpen} />
            </div>
            {datesOpen && (
              <div className="menu-options" style={{ display: 'flex' }}>
                <label>Start date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <label>End date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
          </div>

          <button className="sidebar-update-btn" onClick={handleUpdate}>Apply filters</button>
        </aside>

        {/* ── Main content ─────────────────── */}
        <div className="content">
          {/* Charts */}
          <div className="charts">
            {charts.length === 0 ? (
              <>
                {['Collections Over Time', 'By Branch', 'By Status'].map((title, i) => (
                  <div key={i} className="chart">
                    <label>{title}</label>
                    <div style={{
                      width: '100%', height: 180, background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-sm)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-3)', fontSize: '0.8rem', fontFamily: 'monospace'
                    }}>chart loading…</div>
                  </div>
                ))}
              </>
            ) : charts.map((chart, i) => (
              <div key={i} className="chart">
                <label>{chart.chart_title}</label>
                <img src={`data:image/png;base64,${chart.chart_data}`} alt={chart.chart_title} />
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="list">
            <div className="list-toolbar">
              <span className="list-title">Collections</span>
              <span className="list-count">{visibleCollections.length} records</span>
            </div>

            <div className="list-headers">
              {['Submitted By','Branch','Date','Source','Qty (lbs)','Status','Receipts','Donated To'].map(h => (
                <div key={h} className="list-header-item">{h}</div>
              ))}
            </div>

            <div className="list-items">
              {visibleCollections.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <div>No collections found</div>
                </div>
              ) : visibleCollections.map(c => {
                const qty = c.quantity === -1 ? '—' : c.quantity
                return (
                  <div key={c.id} className="list-item" onClick={() => openEditModal(c.id)}>
                    <div>{c.submitted_by}</div>
                    <div>{branches[c.branch]?.acronym || c.branch}</div>
                    <div>{formatDate(c.time)}</div>
                    <div>{c.source}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace' }}>{qty}</div>
                    <div><StatusBadge status={c.status} /></div>
                    <div style={{ fontFamily: 'DM Mono, monospace' }}>{c.receipt || '—'}</div>
                    <div>{c.donated_to || '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile cards view */}
          <div className="mobile-cards">
            {visibleCollections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <div>No collections found</div>
              </div>
            ) : visibleCollections.map(c => {
              const qty = c.quantity === -1 ? '—' : `${c.quantity} lbs`
              return (
                <div key={c.id} className="mobile-collection-card" onClick={() => openEditModal(c.id)}>
                  <div className="mobile-card-top">
                    <span className="mobile-card-source">{c.source}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mobile-card-meta">
                    <span className="mobile-card-meta-item">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      {formatDate(c.time)}
                    </span>
                    <span className="mobile-card-meta-item">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1C4.3 1 3 2.3 3 4c0 1.2.7 2.2 1.7 2.7V10h2.6V6.7C8.3 6.2 9 5.2 9 4c0-1.7-1.3-3-3-3z" fill="currentColor" opacity="0.6"/>
                      </svg>
                      {branches[c.branch]?.acronym || c.branch}
                    </span>
                    <span className="mobile-card-meta-item">{qty}</span>
                    {c.donated_to && <span className="mobile-card-meta-item">→ {c.donated_to}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile filter bar */}
          <div className="mobile-filter-bar">
            <button
              className={`mobile-filter-pill${activeBranch === null ? ' active' : ''}`}
              onClick={() => handleBranchFilter('ALL')}
            >All</button>
            {sortedBranchEntries.map(([key, b]) => (
              <button
                key={key}
                className={`mobile-filter-pill${activeBranch === key ? ' active' : ''}`}
                onClick={() => handleBranchFilter(key)}
              >{b.acronym}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Collection modal ─────────────────── */}
      <div
        id="modal"
        className="modal-background centered-children"
        style={{ display: modalDisplay, animation: modalAnimation }}
        onClick={e => { if (e.target.id === 'modal') closeModal() }}
      >
        <div className="modal" style={{ animation: modalContentAnimation }}>
          <div className="modal-header">
            <h2>
              {modalMode === 'create'
                ? 'Submit collection'
                : formDisabled ? 'View collection' : 'Edit collection'}
            </h2>
            <button className="close-button" onClick={closeModal} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="collectionBranch">Branch</label>
            <select
              id="collectionBranch"
              className="form-select"
              value={form.branch}
              onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
              disabled={!isAdmin || formDisabled}
            >
              {sortedBranchEntries.map(([key, b]) => (
                <option key={key} value={key}>{b.acronym}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="collectionDate">Date collected</label>
            <input
              id="collectionDate"
              className="form-input"
              type="date"
              value={form.date}
              onChange={e => handleDateChange(e.target.value)}
              disabled={formDisabled}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="collectionSource">Source</label>
            <input
              id="collectionSource"
              className="form-input"
              type="text"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              disabled={formDisabled}
              placeholder="e.g. Local grocery store"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="collectionQuantity">
              Quantity (lbs) <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="collectionQuantity"
              className="form-input"
              type="number"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              disabled={formDisabled}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="collectionStatus">Status</label>
            <select
              id="collectionStatus"
              className="form-select"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              disabled={formDisabled || isPlannedDate}
            >
              <option value="donated">Donated</option>
              <option value="collected">Collected</option>
              <option value="planned">Planned</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="collectionReceipt">
              Receipts <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="collectionReceipt"
              className="form-input"
              type="number"
              value={form.receipt}
              onChange={e => setForm(f => ({ ...f, receipt: e.target.value }))}
              disabled={formDisabled}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="collectionDonatedTo">Donated to</label>
            <input
              id="collectionDonatedTo"
              className="form-input"
              type="text"
              value={form.donatedTo}
              onChange={e => setForm(f => ({ ...f, donatedTo: e.target.value }))}
              disabled={formDisabled}
              placeholder="e.g. City Food Bank"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="imageUpload">
              Image{' '}
              {form.existingImage
                ? <a href={`/images/${form.collectionID}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>View existing →</a>
                : modalMode !== 'create'
                  ? <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(none uploaded)</span>
                  : <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>}
            </label>
            <input
              id="imageUpload"
              ref={imageInputRef}
              className="form-input"
              type="file"
              name="image"
              accept="image/*"
              disabled={formDisabled}
            />
          </div>

          <div className="modal-footer-buttons">
            <button className="btn btn-primary" onClick={submitModal} disabled={formDisabled}>
              {modalMode === 'create' ? 'Submit' : 'Save changes'}
            </button>
            {modalMode !== 'create' && (
              <button className="btn btn-danger" onClick={deleteCollection} disabled={formDisabled}>
                Delete
              </button>
            )}
            <button className="btn btn-ghost" onClick={closeModal} style={{ marginLeft: 'auto' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
