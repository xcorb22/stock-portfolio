import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Supabase redirects here from the reset email with a recovery session already
// active, so we can simply call updateUser with the new password.
export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) return setError(error.message)
    setDone(true)
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div className="auth-card">
      <h1>Choose a new password</h1>
      {done ? (
        <p className="muted">Password updated — redirecting…</p>
      ) : (
        <form onSubmit={onSubmit}>
          <label>
            New password
            <input
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              required
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn primary" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
      <div className="auth-links">
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  )
}
