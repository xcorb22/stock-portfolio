import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePortfolios } from '../context/PortfolioContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { portfolios, selectedId, setSelectedId } = usePortfolios()
  const navigate = useNavigate()

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="brand">
        <span className="brand-mark">▲</span> Portfolio
      </div>
      <nav className="nav-links">
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/holdings">Holdings</NavLink>
        <NavLink to="/research">Research</NavLink>
        <NavLink to="/analysis">Analysis</NavLink>
        <NavLink to="/history">History</NavLink>
        <NavLink to="/watchlist">Watchlist</NavLink>
        <NavLink to="/portfolios">Portfolios</NavLink>
      </nav>
      <div className="nav-user">
        <select
          className="portfolio-select"
          value={selectedId || 'all'}
          onChange={(e) => setSelectedId(e.target.value === 'all' ? null : e.target.value)}
          title="Filter by portfolio"
        >
          <option value="all">All portfolios</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="muted email">{user.email}</span>
        <button className="btn ghost" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </header>
  )
}
