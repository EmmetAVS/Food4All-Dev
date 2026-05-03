import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setTokenCookie } from '../api'
import Message from '../components/Message'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [branch, setBranch] = useState('')
  const [branches, setBranches] = useState({})
  const msgRef = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    api.branches()
      .then(data => setBranches(data.branches))
      .catch(() => msgRef.current?.show('Failed to load branches', 'red'))
  }, [])

  async function signup() {
    if (!username || !email || !password || !confirmPassword) {
      msgRef.current.show('Please fill in all fields', 'red')
      return
    }
    if (password !== confirmPassword) {
      msgRef.current.show('Passwords are not the same', 'red')
      return
    }
    try {
      const data = await api.signup(username, password, email, branch)
      setTokenCookie(data.user.token)
      msgRef.current.show('Signup successful', 'green')
      setTimeout(() => navigate('/'), 500)
    } catch (e) {
      msgRef.current.show(e.message || 'Signup failed', 'red')
    }
  }

  return (
    <>
      <Message ref={msgRef} />
      <div
        className="modal-background centered-children"
        style={{ display: 'flex', width: '100%', height: '100%' }}
      >
        <div className="modal vertical-container" style={{ borderRadius: '8px' }}>
          <div className="modal-header">
            <h2>Signup</h2>
          </div>
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <label htmlFor="confirmPassword">Confirm password:</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          <label htmlFor="branch">Branch (optional):</label>
          <select id="branch" value={branch} onChange={e => setBranch(e.target.value)}>
            <option value="">N/A</option>
            {Object.keys(branches).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
          <div className="modal-footer">
            <button onClick={signup}>Signup</button>
            <Link to="/login">Already have an account? Login</Link>
          </div>
        </div>
      </div>
    </>
  )
}
