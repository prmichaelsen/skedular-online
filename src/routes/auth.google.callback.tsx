import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { googleCalendarProvider } from '@/lib/calendar-providers/google'
import { saveGoogleCalendarConnection } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'

export const Route = (createFileRoute as any)('/auth/google/callback')({
  component: GoogleCallbackPage,
})

function GoogleCallbackPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate({ to: '/login' })
      return
    }

    const handleCallback = async () => {
      try {
        // Parse OAuth callback parameters
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const state = params.get('state')
        const errorParam = params.get('error')

        // Handle OAuth errors (user denied access)
        if (errorParam) {
          setError('Google Calendar connection was cancelled')
          setTimeout(() => navigate({ to: '/dashboard' }), 2000)
          return
        }

        // Validate parameters
        if (!code || !state) {
          setError('Invalid OAuth callback')
          setTimeout(() => navigate({ to: '/dashboard' }), 2000)
          return
        }

        // Validate state (CSRF protection)
        const stateUserId = decodeURIComponent(state)
        if (stateUserId !== user.uid) {
          setError('Invalid OAuth state - possible CSRF attack')
          setTimeout(() => navigate({ to: '/dashboard' }), 2000)
          return
        }

        // Exchange code for tokens
        const redirectUri = `${window.location.origin}/auth/google/callback`
        const tokens = await googleCalendarProvider.handleCallback(code, user.uid, redirectUri)

        // Save connection to Firestore
        await saveGoogleCalendarConnection(user.uid, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
        })

        // Redirect to dashboard with success
        navigate({ to: '/dashboard' })
      } catch (err) {
        console.error('Google Calendar OAuth error:', err)
        setError('Failed to connect Google Calendar')
        setTimeout(() => navigate({ to: '/dashboard' }), 2000)
      } finally {
        setProcessing(false)
      }
    }

    handleCallback()
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {processing ? (
          <>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary">Connecting Google Calendar...</p>
          </>
        ) : error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✕</span>
            </div>
            <p className="text-error font-medium">{error}</p>
            <p className="text-sm text-text-muted mt-2">Redirecting...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-success font-medium">Google Calendar connected!</p>
            <p className="text-sm text-text-muted mt-2">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  )
}
