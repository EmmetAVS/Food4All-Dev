import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setTokenCookie } from '../api'
import Message from '../components/Message'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const msgRef = useRef()
  const navigate = useNavigate()

  async function login() {
    if (!username || !password) {
      msgRef.current.show('Please fill in all fields', 'red')
      return
    }
    try {
      const data = await api.login(username, password)
      setTokenCookie(data.user.token)
      msgRef.current.show('Login successful', 'green')
      setTimeout(() => navigate('/'), 500)
    } catch (e) {
      msgRef.current.show(e.message || 'Login failed', 'red')
    }
  }

  function onKey(e) {
    if (e.key === 'Enter') login()
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
            <h2>Login</h2>
          </div>
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={onKey}
          />
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={onKey}
          />
          <div className="modal-footer">
            <button onClick={login}>Login</button>
            <Link to="/signup">Don't have an account? Signup</Link>
          </div>
        </div>
      </div>
    </>
  )
}
