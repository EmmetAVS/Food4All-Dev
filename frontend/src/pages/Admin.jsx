import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Message from '../components/Message'
import Navbar from '../components/Navbar'

export default function Admin() {
  const navigate = useNavigate()
  const msgRef = useRef()

  const [branchName, setBranchName] = useState('')
  const [branchAcronym, setBranchAcronym] = useState('')
  const [upgradeUsername, setUpgradeUsername] = useState('')
  const [execCode, setExecCode] = useState('')

  const [modalDisplay, setModalDisplay] = useState('none')
  const [modalAnimation, setModalAnimation] = useState('')
  const [modalContentAnimation, setModalContentAnimation] = useState('')

  useEffect(() => {
    api.me()
      .then(user => { if (!user.is_admin) navigate('/') })
      .catch(() => navigate('/login'))
  }, [])

  function openModal() {
    setModalDisplay('')
    setModalAnimation('fade-in 0.3s')
    setModalContentAnimation('move-up 0.3s')
  }

  function closeModal() {
    setModalAnimation('fade-out 0.3s')
    setModalContentAnimation('move-down 0.3s')
    setTimeout(() => setModalDisplay('none'), 301)
  }

  async function createBranch() {
    try {
      await api.createBranch(branchName, branchAcronym)
      msgRef.current?.show('Branch created successfully!', 'green')
      setBranchName('')
      setBranchAcronym('')
      closeModal()
    } catch (e) {
      msgRef.current?.show(e.message || 'Failed to create branch', 'red')
    }
  }

  async function upgradeUser() {
    try {
      await api.upgradeUser(upgradeUsername)
      msgRef.current?.show('User upgraded to admin successfully!', 'green')
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
      <div className="main-container">
        <div
          id="content"
          className="centered-children"
          style={{ width: '100%', height: '100%' }}
        >
          <div className="modal vertical-container" style={{ borderRadius: '8px', gap: '0.5rem' }}>
            <div className="modal-header">
              <h2>Admin</h2>
            </div>
            <button onClick={openModal}>Create Branch</button>
            <label htmlFor="upgradeUsername">Make user admin:</label>
            <input
              id="upgradeUsername"
              type="text"
              value={upgradeUsername}
              onChange={e => setUpgradeUsername(e.target.value)}
              placeholder="Enter username here"
            />
            <button onClick={upgradeUser}>Confirm</button>
            <label htmlFor="executeField">Execute Command (Advanced):</label>
            <input
              id="executeField"
              type="text"
              value={execCode}
              onChange={e => setExecCode(e.target.value)}
              placeholder="Enter command here"
            />
            <button onClick={execCommand}>Execute</button>
          </div>
        </div>

        {/* Create Branch modal */}
        <div
          id="modal"
          className="modal-background centered-children"
          style={{
            display: modalDisplay,
            width: '100%',
            height: '100%',
            animation: modalAnimation,
          }}
          onClick={e => { if (e.target.id === 'modal') closeModal() }}
        >
          <div
            className="modal vertical-container"
            style={{ borderRadius: '8px', animation: modalContentAnimation }}
          >
            <div className="modal-header">
              <h2>Create Branch</h2>
              <button className="close-button" onClick={closeModal}>X</button>
            </div>
            <label htmlFor="branchName">Branch Name:</label>
            <input
              id="branchName"
              type="text"
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
            />
            <label htmlFor="branchAcronym">Branch Acronym:</label>
            <input
              id="branchAcronym"
              type="text"
              value={branchAcronym}
              onChange={e => setBranchAcronym(e.target.value)}
            />
            <button onClick={createBranch}>Submit</button>
          </div>
        </div>
      </div>
    </>
  )
}
