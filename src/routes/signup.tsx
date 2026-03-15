import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { signUp } from '@/lib/firebase-client'
import { createUserProfile, isUsernameTaken } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && !loading) navigate({ to: '/dashboard' })
  }, [user, loading, navigate])

  // Auto-generate username from name
  useEffect(() => {
    if (name && !username) {
      setUsername(name.toLowerCase().replace(/[^a-z0-9]/g, ''))
    }
  }, [name, username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }
    if (!/^[a-z0-9-]+$/.test(username)) {
      setError('Username can only contain lowercase letters, numbers, and hyphens')
      return
    }

    setLoading(true)
    try {
      const taken = await isUsernameTaken(username)
      if (taken) {
        setError('Username is already taken')
        setLoading(false)
        return
      }

      const cred = await signUp(email, password)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      await createUserProfile(cred.user.uid, { email, name, username, timezone })
      navigate({ to: '/dashboard' })
    } catch (err: any) {
      const code = err?.code || ''
      if (code === 'auth/email-already-in-use') {
        setError('Email already in use')
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-primary">
            Skedular
          </Link>
          <p className="text-text-secondary mt-2">Create your free account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-1">
              Username
            </label>
            <div className="flex items-center">
              <span className="text-text-muted text-sm mr-1">skedular.com/</span>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="yourname"
              />
            </div>
          </div>

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
              minLength={6}
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary-dark">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
