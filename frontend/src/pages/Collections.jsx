import { useState, useEffect, useRef, useCallback } from 'react'
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

const INIT_START = '1970-01-01'
const INIT_END = '9999-12-30'

export default function Collections() {
  const navigate = useNavigate()
  const msgRef = useRef()

  const [userData, setUserData] = useState(null)
  const [branches, setBranches] = useState({})
  const [collections, setCollections] = useState({})
  const [activeBranch, setActiveBranch] = useState(null)
  const [startDate, setStartDate] = useState(INIT_START)
  const [endDate, setEndDate] = useState(INIT_END)
  const [charts, setCharts] = useState([])
  const [visibleCollections, setVisibleCollections] = useState([])

  // Sidebar toggles
  const [branchesOpen, setBranchesOpen] = useState(false)
  const [datesOpen, setDatesOpen] = useState(false)

  // Modal
  const [modalDisplay, setModalDisplay] = useState('none')
  const [modalAnimation, setModalAnimation] = useState('')
  const [modalContentAnimation, setModalContentAnimation] = useState('')
  const [modalMode, setModalMode] = useState('create') // 'create' | collectionID string
  const [formDisabled, setFormDisabled] = useState(false)
  const [form, setForm] = useState({
    branch: '',
    date: todayStr(),
    source: '',
    quantity: '',
    status: 'planned',
    receipt: '',
    donatedTo: '',
    existingImage: false,
  })
  const imageInputRef = useRef()

  useEffect(() => {
    init()
  }, [])

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
      const endMs = localDateMs(end)

      const filtered = Object.values(cols).filter(c => {
        const ts = c.time
        if (ts > endMs || ts < startMs) return false
        if (branch !== null && c.branch !== branch) return false
        return true
      })

      filtered.sort((a, b) => {
        const diff = b.time - a.time
        return diff !== 0 ? diff : b.created - a.created
      })

      setVisibleCollections(filtered)

      let earliest = Number.MAX_SAFE_INTEGER
      let latest = 0
      for (const c of filtered) {
        if (c.time < earliest) earliest = c.time
        if (c.time > latest) latest = c.time
      }

      const style = getComputedStyle(document.body)
      const chartData = await api.generateCharts({
        collection_ids: filtered.map(c => c.id),
        earliest_timestamp: earliest === Number.MAX_SAFE_INTEGER ? 0 : earliest,
        latest_timestamp: latest,
        colors: {
          background: style.getPropertyValue('--background').trim(),
          accent: style.getPropertyValue('--accent').trim(),
          text: style.getPropertyValue('--text').trim(),
        },
      })
      setCharts(chartData.charts)
    } catch (e) {
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
      branch: defaultBranch,
      date: todayStr(),
      source: '',
      quantity: '',
      status: 'planned',
      receipt: '',
      donatedTo: '',
      existingImage: false,
    })
    setFormDisabled(false)
    setModalMode('create')
    showModal()
  }

  function openEditModal(collectionID) {
    const c = collections[collectionID]
    if (!c) return
    const disabled = !(c.branch === userData?.branch || userData?.is_admin)
    const isoDate = new Date(c.time).toISOString().split('T')[0]
    setForm({
      branch: c.branch,
      date: isoDate,
      source: c.source,
      quantity: c.quantity === -1 ? '' : String(c.quantity),
      status: c.status,
      receipt: c.receipt ? String(c.receipt) : '',
      donatedTo: c.donated_to || '',
      existingImage: c.image,
      collectionID,
    })
    setFormDisabled(disabled)
    setModalMode(collectionID)
    showModal()
  }

  function showModal() {
    setModalDisplay('')
    setModalAnimation('fade-in 0.3s')
    setModalContentAnimation('move-up 0.3s')
  }

  function closeModal() {
    setModalAnimation('fade-out 0.3s')
    setModalContentAnimation('move-down 0.3s')
    setTimeout(() => setModalDisplay('none'), 301)
  }

  function handleDateChange(dateStr) {
    const isPlanned = dateStr >= todayStr()
    setForm(f => ({
      ...f,
      date: dateStr,
      ...(isPlanned ? { status: 'planned' } : {}),
    }))
  }

  function readImageFile() {
    return new Promise((resolve) => {
      const file = imageInputRef.current?.files[0]
      if (!file) return resolve(null)
      if (file.size / 1024 / 1024 > 8) {
        msgRef.current?.show('Image file is too large (max 8MB)', 'red')
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
      msgRef.current?.show('Please fill in all fields', 'red')
      return
    }

    const qty = !quantity || Number(quantity) <= 0 ? -1 : Number(quantity)
    const rec = !receipt || Number(receipt) < 0 ? 0 : Number(receipt)
    const timestamp = new Date(date).getTime()
    const imageData = await readImageFile()
    if (imageData === undefined) return

    try {
      if (modalMode === 'create') {
        await api.createCollection({
          branch, timestamp, source,
          quantity: qty, status,
          receipt: rec, donated_to: donatedTo,
          image: imageData,
        })
        msgRef.current?.show('Collection created successfully', 'green')
      } else {
        await api.updateCollection(modalMode, {
          branch, time: timestamp, source,
          quantity: qty, status,
          receipt: rec, donated_to: donatedTo,
          image: imageData,
        })
        msgRef.current?.show('Collection updated successfully', 'green')
      }
      closeModal()
      await fetchAndRender(activeBranch, startDate, endDate)
    } catch (e) {
      msgRef.current?.show(e.message || 'Failed to save collection', 'red')
    }
  }

  async function deleteCollection() {
    try {
      await api.deleteCollection(modalMode)
      msgRef.current?.show('Collection deleted successfully', 'green')
      closeModal()
      await fetchAndRender(activeBranch, startDate, endDate)
    } catch (e) {
      msgRef.current?.show(e.message || 'Failed to delete collection', 'red')
    }
  }

  const isAdmin = userData?.is_admin || false
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
        <div className="sidebar-menu">
          <div className="menu-section">
            <div
              className="menu-title"
              onClick={() => setBranchesOpen(v => !v)}
              style={{ cursor: 'pointer' }}
            >
              Branches
            </div>
            {branchesOpen && (
              <div className="menu-options" style={{ display: 'flex' }}>
                <button onClick={() => handleBranchFilter('ALL')}>All</button>
                {Object.entries(branches).map(([key, b]) => (
                  <button key={key} onClick={() => handleBranchFilter(key)}>
                    {b.acronym}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="menu-section">
            <div
              className="menu-title"
              onClick={() => setDatesOpen(v => !v)}
              style={{ cursor: 'pointer' }}
            >
              Start/End Date
            </div>
            {datesOpen && (
              <div className="menu-options" style={{ display: 'flex' }}>
                <label>Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <label>End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="menu-section">
            <button onClick={handleUpdate}>Update</button>
          </div>
        </div>

        <div className="content">
          <div className="charts">
            {charts.length === 0 ? (
              <>
                <div className="chart"><label>Chart 1</label><img src="/static/assets/user_default.png" alt="" /></div>
                <div className="chart"><label>Chart 2</label><img src="/static/assets/user_default.png" alt="" /></div>
                <div className="chart"><label>Chart 3</label><img src="/static/assets/user_default.png" alt="" /></div>
              </>
            ) : charts.map((chart, i) => (
              <div key={i} className="chart">
                <label>{chart.chart_title}</label>
                <img src={`data:image/png;base64,${chart.chart_data}`} alt={chart.chart_title} />
              </div>
            ))}
          </div>

          <div className="list">
            <div className="list-headers">
              <div className="list-header-item">Submitted By</div>
              <div className="list-header-item">Branch</div>
              <div className="list-header-item">Date</div>
              <div className="list-header-item">Source</div>
              <div className="list-header-item">Quantity (lbs)</div>
              <div className="list-header-item">Status</div>
              <div className="list-header-item">Receipts</div>
              <div className="list-header-item">Donated To</div>
            </div>
            <div className="list-items">
              {visibleCollections.map(c => {
                const [y, m, d] = new Date(c.time).toISOString().split('T')[0].split('-')
                const dateStr = `${m}/${d}/${y}`
                const qty = c.quantity === -1 ? 'N/A' : c.quantity
                const statusText = c.status.charAt(0).toUpperCase() + c.status.slice(1)
                return (
                  <div key={c.id} className="list-item" onClick={() => openEditModal(c.id)}>
                    <div>{c.submitted_by}</div>
                    <div>{branches[c.branch]?.acronym || c.branch}</div>
                    <div>{dateStr}</div>
                    <div>{c.source}</div>
                    <div>{qty}</div>
                    <div>{statusText}</div>
                    <div>{c.receipt || ''}</div>
                    <div>{c.donated_to || ''}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Collection modal */}
        <div
          id="modal"
          className="modal-background centered-children"
          style={{
            display: modalDisplay,
            width: '100%',
            height: '100%',
            animation: modalAnimation,
            background: 'rgba(0, 0, 0, 0.8)',
          }}
          onClick={e => { if (e.target.id === 'modal') closeModal() }}
        >
          <div
            className="modal vertical-container"
            style={{ animation: modalContentAnimation }}
          >
            <div className="modal-header">
              <h2>
                {modalMode === 'create'
                  ? 'Submit Collection'
                  : formDisabled ? 'View Collection' : 'Edit Collection'}
              </h2>
              <button className="close-button" onClick={closeModal}>X</button>
            </div>

            <label htmlFor="collectionSubmitBranch">Branch:</label>
            <select
              id="collectionSubmitBranch"
              value={form.branch}
              onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
              disabled={!isAdmin || formDisabled}
            >
              {sortedBranchEntries.map(([key, b]) => (
                <option key={key} value={key}>{b.acronym}</option>
              ))}
            </select>

            <label htmlFor="collectionSubmitDate">Date Collected:</label>
            <input
              id="collectionSubmitDate"
              type="date"
              value={form.date}
              onChange={e => handleDateChange(e.target.value)}
              disabled={formDisabled}
            />

            <label htmlFor="collectionSubmitSource">Source:</label>
            <input
              id="collectionSubmitSource"
              type="text"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              disabled={formDisabled}
            />

            <label htmlFor="collectionSubmitQuantity">Quantity (lbs) (optional):</label>
            <input
              id="collectionSubmitQuantity"
              type="number"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              disabled={formDisabled}
            />

            <label htmlFor="collectionSubmitStatus">Status:</label>
            <select
              id="collectionSubmitStatus"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              disabled={formDisabled || isPlannedDate}
            >
              <option value="donated">Donated</option>
              <option value="collected">Collected</option>
              <option value="planned">Planned</option>
            </select>

            <label htmlFor="collectionReceiptQuantity">Receipts (optional):</label>
            <input
              id="collectionReceiptQuantity"
              type="number"
              value={form.receipt}
              onChange={e => setForm(f => ({ ...f, receipt: e.target.value }))}
              disabled={formDisabled}
            />

            <label htmlFor="collectionDonationLocation">Donated To:</label>
            <input
              id="collectionDonationLocation"
              type="text"
              value={form.donatedTo}
              onChange={e => setForm(f => ({ ...f, donatedTo: e.target.value }))}
              disabled={formDisabled}
            />

            <form className="image-upload-form">
              <label htmlFor="imageUpload">
                Upload an image:{' '}
                {form.existingImage
                  ? <a href={`/images/${form.collectionID}`} target="_blank" rel="noopener noreferrer">View</a>
                  : modalMode !== 'create' ? '(None uploaded)' : null}
              </label>
              <input
                id="imageUpload"
                ref={imageInputRef}
                type="file"
                name="image"
                accept="image/*"
                disabled={formDisabled}
              />
            </form>

            <div className="modal-footer-buttons">
              <button onClick={submitModal} disabled={formDisabled}>Submit</button>
              {modalMode !== 'create' && (
                <button onClick={deleteCollection} disabled={formDisabled}>Delete</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
