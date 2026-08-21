import { useState } from 'react'
import { authApi, setToken, ApiError } from '../api'

// Theme options stay the same - zero UI change
const THEME_OPTS = [['', 'tp-g'], ['red', 'tp-r'], ['mono', 'tp-m']]

export default function Auth({ theme, onTheme, onLogin, toast }) {
  const [username, setUsername] = useState('')
  const [pw, setPw]             = useState('')
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  async function attemptLogin() {
    if (!username.trim()) { toast('Enter your username.', 'warn'); return }
    if (!pw)              { toast('Enter your password.', 'warn'); return }

    setLoading(true)
    setErr('')

    try {
      const data = await authApi.login(username.trim().toLowerCase(), pw)
      setToken(data.data.token)
      onLogin(data.data.user)   // pass full user object up to App
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Login failed. Check backend.'
      setErr(msg)
      setPw('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <div className="auth-logo">
          Green<span className="auth-logo-dot" />
        </div>
        <div className="auth-sub">Command Center</div>
        <div className="auth-label">Sign in to your account</div>

        <div className="auth-pw-row">
          <label className="input-label">Username</label>
          <input
            className="auth-inp"
            placeholder="username"
            value={username}
            onChange={e => { setUsername(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && attemptLogin()}
            autoFocus
            autoComplete="username"
            disabled={loading}
          />
        </div>

        <div className="auth-pw-row">
          <label className="input-label">Password</label>
          <input
            type="password"
            className="auth-inp"
            placeholder="Password"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && attemptLogin()}
            autoComplete="current-password"
            disabled={loading}
          />
          <div className="auth-err">{err}</div>
        </div>

        <button className="auth-btn" onClick={attemptLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Enter'}
        </button>

        <div className="theme-picks">
          {THEME_OPTS.map(([t, cls]) => (
            <div
              key={t}
              className={`tp ${cls}${theme === t ? ' on' : ''}`}
              onClick={() => onTheme(t)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

