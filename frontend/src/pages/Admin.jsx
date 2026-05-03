import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Message from '../components/Message'
import Navbar from '../components/Navbar'

export default function Admin() {
  const navigate = useNavigate()
  const msgRef   = useRef()

  const [branchName,       setBranchName]       = useState('')
  const [branchAcronym,    setBranchAcronym]    = useState('')
  const [upgradeUsername,  setUpgradeUsername]  = useState('')
  const [execCode,         setExecCode]         = useState('')

  const [modalDisplay,          setModalDisplay]          = useState('none')
  const [modalAnimation,        setModalAnimation]        = useState('')
  const [modalContentAnimation, setModalContentAnimation] = useState('')

  useEffect(() => {
    api.me()
      .then(user => { if (!user.is_admin) navigate('/') })
      .catch(() => navigate('/login'))
  }, [])

  function openModal() {
    setModalDisplay('')
    setModalAnimation('fade-in 0.25s ease')
    setModalContentAnimation('slide-up 0.25s ease')
  }

  function closeModal() {
    setModalAnimation('fade-out 0.25s ease forwards')
    setModalContentAnimation('slide-down 0.25s ease forwards')
    setTimeout(() => setModalDisplay('none'), 260)
  }

  async function createBranch() {
    try {
      await api.createBranch(branchName, branchAcronym)
      msgRef.current?.show('Branch created!', 'green')
      setBranchName('')
      setBranchAcronym('')
      closeModal()
    } catch (e) {
      msgRef.current?.show(e.message || 'Failed to create branch', 'red')
    }
  }

  async function upgradeUser() {
    if (!upgradeUsername.trim()) {
      msgRef.current?.show('Enter a username', 'red')
      return
    }
    try {
      await api.upgradeUser(upgradeUsername)
      msgRef.current?.show('User upgraded to admin!', 'green')
      setUpgradeUsername('')
    } catch (e) {
      msgRef.current?.show(e.message || 'Failed to upgrade user', 'red')
    }
  }

  async function execCommand() {
    try {
      const data = await api.exec(execCode)
      msgRef.current?.show(`Result: ${JSON.stringify(data.response)}`, 'green')
    } catch (e) {
      msgRef.current?.show(e.message || 'Execution failed', 'red')
    }
  }

  return (
    <>
      <Message ref={msgRef} />
      <Navbar isAdmin={true} />

      <div className="admin-page">
        <div className="admin-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Admin panel</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>
            Manage branches, users, and system commands.
          </p>

          <hr className="admin-divider" />

          {/* Create branch */}
          <div className="admin-section">
            <span className="admin-section-title">Branches</span>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={openModal}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Create branch
            </button>
          </div>

          <hr className="admin-divider" />

          {/* Upgrade user */}
          <div className="admin-section">
            <span className="admin-section-title">User management</span>
            <div className="admin-row">
              <div className="form-group">
                <label className="form-label" htmlFor="upgradeUsername">Make user admin</label>
                <input
                  id="upgradeUsername"
                  className="form-input"
                  type="text"
                  value={upgradeUsername}
                  onChange={e => setUpgradeUsername(e.target.value)}
                  placeholder="Enter username"
                  onKeyDown={e => e.key === 'Enter' && upgradeUser()}
                />
              </div>
              <button
                className="btn btn-ghost"
                onClick={upgradeUser}
                style={{ flexShrink: 0, marginBottom: 0 }}
              >Confirm</button>
            </div>
          </div>

          <hr className="admin-divider" />

          {/* Execute command */}
          <div className="admin-section">
            <span className="admin-section-title">Advanced</span>
            <div className="admin-row">
              <div className="form-group">
                <label className="form-label" htmlFor="executeField">Execute command</label>
                <input
                  id="executeField"
                  className="form-input"
                  type="text"
                  value={execCode}
                  onChange={e => setExecCode(e.target.value)}
                  placeholder="Enter command"
                  onKeyDown={e => e.key === 'Enter' && execCommand()}
                  style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem' }}
                />
              </div>
              <button
                className="btn btn-ghost"
                onClick={execCommand}
                style={{ flexShrink: 0, marginBottom: 0 }}
              >Run</button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Branch modal */}
      <div
        id="modal"
        className="modal-background centered-children"
        style={{ display: modalDisplay, animation: modalAnimation }}
        onClick={e => { if (e.target.id === 'modal') closeModal() }}
      >
        <div className="modal" style={{ animation: modalContentAnimation }}>
          <div className="modal-header">
            <h2>Create branch</h2>
            <button className="close-button" onClick={closeModal} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="branchName">Branch name</label>
            <input
              id="branchName"
              className="form-input"
              type="text"
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              placeholder="e.g. Downtown Chapter"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="branchAcronym">Acronym</label>
            <input
              id="branchAcronym"
              className="form-input"
              type="text"
              value={branchAcronym}
              onChange={e => setBranchAcronym(e.target.value)}
              placeholder="e.g. DTC"
              maxLength={6}
            />
          </div>

          <div className="modal-footer-buttons">
            <button className="btn btn-primary" onClick={createBranch}>Create branch</button>
            <button className="btn btn-ghost" onClick={closeModal} style={{ marginLeft: 'auto' }}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  )
}
