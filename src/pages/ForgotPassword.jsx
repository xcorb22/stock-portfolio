import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await resetPassword(email)
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="auth-card">
      <h1>Reset password</h1>
      {sent ? (
        <p className="muted">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
        </p>
      ) : (
        <>
          <p className="muted">Enter your email and we&apos;ll send a reset link.</p>
          <form onSubmit={onSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn primary" disabled={busy} type="submit">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}
      <div className="auth-links">
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  )
}
