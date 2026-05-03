import { Link } from 'react-router-dom'

export default function Navbar({ isAdmin, onSubmit }) {
  return (
    <nav className="navbar">
      {/* Brand */}
      <a className="navbar-brand" href="/">
        <div className="navbar-brand-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2C5.8 2 4 3.8 4 6c0 1.5.8 2.8 2 3.5V13h4v-3.5C11.2 8.8 12 7.5 12 6c0-2.2-1.8-4-4-4z" fill="currentColor" opacity="0.9"/>
            <rect x="6" y="13" width="4" height="1.5" rx="0.75" fill="currentColor" opacity="0.6"/>
          </svg>
        </div>
        <span className="navbar-brand-name">Food<span>4</span>All</span>
      </a>

      {/* Centre nav */}
      <div className="navbar-pages">
        {onSubmit ? (
          <>
            <button className="navbar-item primary" onClick={onSubmit}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Submit
            </button>
            {isAdmin && (
              <Link className="navbar-item" to="/admin">Admin</Link>
            )}
          </>
        ) : (
          <Link className="navbar-item" to="/">View Collections</Link>
        )}
      </div>

      {/* Right actions */}
      <div className="navbar-right-buttons">
        <a className="navbar-icon-btn" href="/settings" title="Settings">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.6 3.6l1.4 1.4M13 13l1.4 1.4M3.6 14.4l1.4-1.4M13 5l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </a>
        <a className="navbar-icon-btn" href="/help" title="Help">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 7c0-1.1.9-2 2-2s2 .9 2 2-.9 1.5-2 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="13" r="0.75" fill="currentColor"/>
          </svg>
        </a>
        <a className="navbar-icon-btn" href="/account" title="Account">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2.5 15.5c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </a>
      </div>
    </nav>
  )
}
