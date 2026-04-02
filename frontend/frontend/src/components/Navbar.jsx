import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import logo from '../assets/el-kapitan-logo-simple.svg'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    setMobileOpen(false)
  }

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to={user ? '/dashboard' : '/'} className="hover:opacity-90">
            <img src={logo} alt="El Kapitan" className="h-14 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/submit" className="hover:text-accent transition-colors">
              Submit Work
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-accent transition-colors">
                  Instructor Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-white/15 hover:bg-white/25 px-4 py-1.5 rounded-md text-sm transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-white text-primary hover:bg-accent px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                Instructor Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-md hover:bg-white/15 cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              to="/submit"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-md hover:bg-white/15"
            >
              Submit Work
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md hover:bg-white/15">
                  Instructor Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 rounded-md hover:bg-white/15 cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md hover:bg-white/15"
              >
                Instructor Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
