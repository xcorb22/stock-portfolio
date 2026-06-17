import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { user, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    const { data, error } = await signUp(email, password)
    setBusy(false)
    if (error) return setError(error.message)
    // If email confirmation is on, there is no active session yet.
    if (!data.session) setDone(true)
  }

  if (done) {
    return (
      <div className="auth-card">
        <h1>Check your inbox ✉️</h1>
        <p className="muted">
          We sent a confirmation link to <strong>{email}</strong>. Click it to verify your account,
          then sign in.
        </p>
        <Link className="btn primary" to="/login">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <p className="muted">Start tracking your portfolio.</p>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
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
          {busy ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <div className="auth-links">
        <span>
          Already have an account? <Link to="/login">Sign in</Link>
        </span>
      </div>
    </div>
  )
}
