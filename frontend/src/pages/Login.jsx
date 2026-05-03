import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setTokenCookie } from '../api'
import Message from '../components/Message'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const msgRef = useRef()
  const navigate = useNavigate()

  async function login() {
    if (!username || !password) {
      msgRef.current.show('Please fill in all fields', 'red')
      return
    }
    setLoading(true)
    try {
      const data = await api.login(username, password)
      setTokenCookie(data.user.token)
      msgRef.current.show('Login successful', 'green')
      setTimeout(() => navigate('/'), 500)
    } catch (e) {
      msgRef.current.show(e.message || 'Login failed', 'red')
    } finally {
      setLoading(false)
    }
  }

  function onKey(e) {
    if (e.key === 'Enter') login()
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

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={onKey}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
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
              onKeyDown={onKey}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button
            className="auth-submit"
            onClick={login}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-link">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </>
  )
}
