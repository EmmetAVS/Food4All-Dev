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
  const [loading, setLoading] = useState(false)
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
      msgRef.current.show('Passwords do not match', 'red')
      return
    }
    setLoading(true)
    try {
      const data = await api.signup(username, password, email, branch)
      setTokenCookie(data.user.token)
      msgRef.current.show('Account created!', 'green')
      setTimeout(() => navigate('/'), 500)
    } catch (e) {
      msgRef.current.show(e.message || 'Signup failed', 'red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Message ref={msgRef} />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2C6.8 2 5 3.8 5 6c0 1.6.9 3 2.2 3.7V15h3.6V9.7C12.1 9 13 7.6 13 6c0-2.2-1.8-4-4-4z" fill="currentColor"/>
                <rect x="7" y="15" width="4" height="1.5" rx="0.75" fill="currentColor" opacity="0.6"/>
              </svg>
            </div>
            <span className="auth-logo-name">Food<span>4</span>All</span>
          </div>

          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join Food4All to start tracking collections</p>

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              className="form-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="branch">Branch <span style={{color:'var(--text-3)',fontWeight:400}}>(optional)</span></label>
            <select
              id="branch"
              className="form-select"
              value={branch}
              onChange={e => setBranch(e.target.value)}
            >
              <option value="">No branch</option>
              {Object.keys(branches).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>

          <button
            className="auth-submit"
            onClick={signup}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  )
}
