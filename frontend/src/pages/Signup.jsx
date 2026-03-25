import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error: authError } = await signUp(email, password, firstName, lastName)
    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-warm p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-primary mb-2">Create Account</h1>
        <p className="text-text-muted text-sm mb-6">
          Register as an instructor to start managing assignments.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-error rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                placeholder="Jane"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              placeholder="you@university.edu"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
