import { Link } from 'react-router-dom'

export default function Navbar({ isAdmin, onSubmit }) {
  return (
    <div className="navbar">
      <div className="profile-icon">
        <a className="navbar-item" href="/account">
          <img src="/static/assets/user_default.png" alt="Profile" />
        </a>
      </div>
      <div className="navbar-pages">
        {onSubmit ? (
          <>
            <button className="navbar-item" onClick={onSubmit}>Submit</button>
            {isAdmin && <Link className="navbar-item" to="/admin">Admin</Link>}
          </>
        ) : (
          <Link className="navbar-item" to="/">View Collections</Link>
        )}
      </div>
      <div className="navbar-right-buttons">
        <a className="navbar-item" href="/settings">
          <img src="/static/assets/settings.png" alt="Settings" />
        </a>
        <a className="navbar-item" href="/help">
          <img src="/static/assets/help.png" alt="Help" />
        </a>
      </div>
    </div>
  )
}
