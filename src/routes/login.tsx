import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signIn, resetPassword } from '@/lib/firebase-client'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (user) navigate({ to: '/dashboard' })
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate({ to: '/dashboard' })
    } catch (err: any) {
      const code = err?.code || ''
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!email) {
      setError('Enter your email first')
      return
    }
    try {
      await resetPassword(email)
      setResetSent(true)
    } catch {
      setError('Could not send reset email')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-bold text-primary">
              Skedular
            </Link>
            <p className="text-text-secondary mt-2">Log in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}
            {resetSent && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
                Password reset email sent. Check your inbox.
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleReset}
                className="text-primary hover:text-primary-dark"
              >
                Forgot password?
              </button>
              <Link to="/signup" className="text-primary hover:text-primary-dark">
                Create account
              </Link>
            </div>
          </form>
        </div>
      </div>

      <footer className="px-6 py-8 text-center text-text-muted text-sm">
        <div className="flex justify-center gap-6 mb-4">
          <Link to="/privacy" className="hover:text-text-primary transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-text-primary transition-colors">
            Terms
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Skedular. Built by Patrick Michaelsen.</p>
      </footer>
    </div>
  )
}
