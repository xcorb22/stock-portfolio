import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Holdings from './pages/Holdings'
import Watchlist from './pages/Watchlist'
import Portfolios from './pages/Portfolios'
import Analysis from './pages/Analysis'
import History from './pages/History'
import Research from './pages/Research'

function ConfigNotice() {
  return (
    <div className="config-notice">
      <h2>⚙️ Almost there</h2>
      <p>
        Supabase isn&apos;t configured yet. Copy <code>.env.example</code> to{' '}
        <code>.env</code>, add your Supabase URL + anon key (and Finnhub key), then restart{' '}
        <code>npm run dev</code>.
      </p>
      <p className="muted">See the README for step-by-step setup.</p>
    </div>
  )
}

export default function App() {
  const { loading, user } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <div className="app-shell">
        <ConfigNotice />
      </div>
    )
  }

  if (loading) {
    return <div className="centered muted">Loading…</div>
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/holdings"
            element={
              <ProtectedRoute>
                <Holdings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <Watchlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolios"
            element={
              <ProtectedRoute>
                <Portfolios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/research"
            element={
              <ProtectedRoute>
                <Research />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {user && <Footer />}
    </div>
  )
}
