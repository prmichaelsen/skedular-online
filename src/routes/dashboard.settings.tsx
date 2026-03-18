import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getUserProfile, updateUserSettings, enableCalendarFeed, disableCalendarFeed, regenerateCalendarFeedToken, disconnectGoogleCalendar } from '@/lib/firestore'
import { getGoogleCalendarOAuthUrl } from '@/lib/server-fn'
import type { UserProfile } from '@/lib/types'
import { Copy, Check, ArrowLeft, Link2, X } from 'lucide-react'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

// Helper to get the correct host URL
function getHostUrl(): string {
  return 'https://skedular.online'
}

// Helper functions for unit conversion
function minutesToUnit(minutes: number, unit: 'minutes' | 'hours' | 'days'): number {
  if (unit === 'hours') return minutes / 60
  if (unit === 'days') return minutes / (60 * 24)
  return minutes
}

function unitToMinutes(value: number, unit: 'minutes' | 'hours' | 'days'): number {
  if (unit === 'hours') return value * 60
  if (unit === 'days') return value * 60 * 24
  return value
}

function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settingsForm, setSettingsForm] = useState({
    defaultDuration: 30,
    bufferTime: 0,
    maxPerDay: 0,
    minNotice: 120,
  })
  const [calendarFeedUrl, setCalendarFeedUrl] = useState<string | null>(null)
  const [feedCopied, setFeedCopied] = useState(false)
  const [enablingFeed, setEnablingFeed] = useState(false)
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [minNoticeUnit, setMinNoticeUnit] = useState<'minutes' | 'hours' | 'days'>('hours')

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: '/login' })
  }, [user, authLoading, navigate])

  // Handle OAuth callback query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthSuccess = params.get('oauth_success')
    const oauthError = params.get('oauth_error')

    if (oauthSuccess) {
      setOauthMessage({ type: 'success', text: 'Google Calendar connected successfully!' })
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/settings')
      setTimeout(() => setOauthMessage(null), 5000)
    } else if (oauthError) {
      const errorMessages: Record<string, string> = {
        cancelled: 'Google Calendar connection was cancelled',
        invalid_callback: 'Invalid OAuth callback',
        failed: 'Failed to connect Google Calendar',
      }
      setOauthMessage({ type: 'error', text: errorMessages[oauthError] || 'OAuth error occurred' })
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/settings')
      setTimeout(() => setOauthMessage(null), 5000)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const p = await getUserProfile(user.uid)
      if (!p) {
        navigate({ to: '/signup' })
        return
      }
      setProfile(p)

      // Auto-detect best unit for minNotice
      const minNoticeMinutes = p.settings.minNotice
      let unit: 'minutes' | 'hours' | 'days' = 'minutes'
      if (minNoticeMinutes % (60 * 24) === 0 && minNoticeMinutes >= 60 * 24) {
        unit = 'days'
      } else if (minNoticeMinutes % 60 === 0 && minNoticeMinutes >= 60) {
        unit = 'hours'
      }
      setMinNoticeUnit(unit)

      setSettingsForm({
        defaultDuration: p.settings.defaultDuration,
        bufferTime: p.settings.bufferTime,
        maxPerDay: p.settings.maxPerDay,
        minNotice: minutesToUnit(minNoticeMinutes, unit),
      })

      // Set calendar feed URL if enabled
      if (p.ics_feed_enabled && p.ics_feed_token) {
        setCalendarFeedUrl(`${getHostUrl()}/cal/${p.username}.ics?token=${p.ics_feed_token}`)
      }
    })()
  }, [user, navigate])

  const handleSaveSettings = async () => {
    if (!user) return
    // Convert minNotice back to minutes before saving
    const settingsToSave = {
      ...settingsForm,
      minNotice: Math.round(unitToMinutes(settingsForm.minNotice, minNoticeUnit)),
    }
    await updateUserSettings(user.uid, settingsToSave)
    // Refresh profile
    const p = await getUserProfile(user.uid)
    if (p) setProfile(p)
    setOauthMessage({ type: 'success', text: 'Settings saved successfully!' })
    setTimeout(() => setOauthMessage(null), 3000)
  }

  const handleEnableCalendarFeed = async () => {
    if (!user) return
    setEnablingFeed(true)
    try {
      const token = await enableCalendarFeed(user.uid)
      const feedUrl = `${getHostUrl()}/cal/${profile?.username}.ics?token=${token}`
      setCalendarFeedUrl(feedUrl)
      // Refresh profile
      const p = await getUserProfile(user.uid)
      if (p) setProfile(p)
    } finally {
      setEnablingFeed(false)
    }
  }

  const handleDisableCalendarFeed = async () => {
    if (!user) return
    await disableCalendarFeed(user.uid)
    setCalendarFeedUrl(null)
    // Refresh profile
    const p = await getUserProfile(user.uid)
    if (p) setProfile(p)
  }

  const handleRegenerateFeedToken = async () => {
    if (!user) return
    setEnablingFeed(true)
    try {
      const token = await regenerateCalendarFeedToken(user.uid)
      const feedUrl = `${getHostUrl()}/cal/${profile?.username}.ics?token=${token}`
      setCalendarFeedUrl(feedUrl)
      // Refresh profile
      const p = await getUserProfile(user.uid)
      if (p) setProfile(p)
    } finally {
      setEnablingFeed(false)
    }
  }

  const copyFeedUrl = () => {
    if (!calendarFeedUrl) return
    navigator.clipboard.writeText(calendarFeedUrl)
    setFeedCopied(true)
    setTimeout(() => setFeedCopied(false), 2000)
  }

  const handleConnectGoogleCalendar = async () => {
    if (!user) return
    try {
      const result = await getGoogleCalendarOAuthUrl({ data: { userId: user.uid } })
      window.location.href = result.authUrl
    } catch (error) {
      console.error('Failed to get OAuth URL:', error)
      setOauthMessage({ type: 'error', text: 'Failed to start Google Calendar connection' })
    }
  }

  const handleDisconnectGoogleCalendar = async () => {
    if (!user) return
    await disconnectGoogleCalendar(user.uid)
    // Refresh profile
    const p = await getUserProfile(user.uid)
    if (p) setProfile(p)
  }

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back to dashboard */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {/* OAuth success/error toast */}
        {oauthMessage && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            oauthMessage.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <span className="text-xl">
              {oauthMessage.type === 'success' ? '✓' : '✕'}
            </span>
            <p className={`text-sm font-medium ${
              oauthMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}>
              {oauthMessage.text}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Booking settings */}
          <div className="p-6 border border-border-default rounded-xl">
            <h2 className="text-lg font-semibold mb-4">Booking settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Default duration (min)</label>
                <input
                  type="number"
                  value={settingsForm.defaultDuration}
                  onChange={(e) => setSettingsForm({ ...settingsForm, defaultDuration: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border-default rounded-lg"
                  min={15}
                  step={15}
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Buffer time (min)</label>
                <input
                  type="number"
                  value={settingsForm.bufferTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bufferTime: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border-default rounded-lg"
                  min={0}
                  step={5}
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Max bookings/day (0=unlimited)</label>
                <input
                  type="number"
                  value={settingsForm.maxPerDay}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxPerDay: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border-default rounded-lg"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Min notice</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={settingsForm.minNotice}
                    onChange={(e) => {
                      const newValue = Number(e.target.value)
                      setSettingsForm({ ...settingsForm, minNotice: newValue })
                    }}
                    className="flex-1 px-3 py-2 border border-border-default rounded-lg"
                    min={0}
                    step={minNoticeUnit === 'minutes' ? 15 : minNoticeUnit === 'hours' ? 1 : 0.5}
                  />
                  <select
                    value={minNoticeUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value as 'minutes' | 'hours' | 'days'
                      const currentMinutes = unitToMinutes(settingsForm.minNotice, minNoticeUnit)
                      setMinNoticeUnit(newUnit)
                      setSettingsForm({ ...settingsForm, minNotice: minutesToUnit(currentMinutes, newUnit) })
                    }}
                    className="px-3 py-2 border border-border-default rounded-lg bg-white"
                  >
                    <option value="minutes">min</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Save settings
            </button>
          </div>

          {/* Calendar subscription settings */}
          <div className="p-6 border border-border-default rounded-xl">
            <h2 className="text-lg font-semibold mb-2">Calendar Subscription</h2>
            <p className="text-sm text-text-secondary mb-4">
              Subscribe to your bookings in Google Calendar, Outlook, or Apple Calendar
            </p>

            {!profile?.ics_feed_enabled ? (
              <button
                onClick={handleEnableCalendarFeed}
                disabled={enablingFeed}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {enablingFeed ? 'Enabling...' : 'Enable Calendar Feed'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-bg-elevated rounded-lg">
                  <p className="text-xs text-text-secondary mb-1">Subscription URL</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={calendarFeedUrl || ''}
                      readOnly
                      className="flex-1 px-3 py-1.5 bg-white border border-border-default rounded font-mono"
                    />
                    <button
                      onClick={copyFeedUrl}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-border-default rounded-lg text-xs hover:bg-bg-elevated transition-colors"
                    >
                      {feedCopied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      {feedCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-text-muted space-y-1">
                  <p className="font-medium">How to subscribe:</p>
                  <ul className="list-disc list-inside space-y-0.5 pl-2">
                    <li>Google Calendar: Settings → Add calendar → From URL</li>
                    <li>Outlook: Add calendar → Subscribe from web</li>
                    <li>Apple Calendar: File → New Calendar Subscription</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerateFeedToken}
                    disabled={enablingFeed}
                    className="px-3 py-1.5 bg-white border border-border-default rounded-lg text-xs hover:bg-bg-elevated transition-colors disabled:opacity-50"
                  >
                    {enablingFeed ? 'Regenerating...' : 'Regenerate URL'}
                  </button>
                  <button
                    onClick={handleDisableCalendarFeed}
                    className="px-3 py-1.5 text-xs text-error hover:underline"
                  >
                    Disable Feed
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Google Calendar sync settings */}
          <div className="p-6 border border-border-default rounded-xl">
            <h2 className="text-lg font-semibold mb-2">Google Calendar Sync</h2>
            <p className="text-sm text-text-secondary mb-4">
              Check for conflicts with your Google Calendar events when people book time
            </p>

            {!profile?.google_calendar?.connected ? (
              <button
                onClick={handleConnectGoogleCalendar}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Connect Google Calendar
              </button>
            ) : (
              <div className="space-y-3">
                {profile.google_calendar.expires_at && profile.google_calendar.expires_at < Date.now() ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <span className="text-sm text-yellow-800 font-medium">Token expired - reconnect to restore sync</span>
                    </div>
                    <button
                      onClick={handleConnectGoogleCalendar}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                    >
                      <Link2 className="w-4 h-4" />
                      Reconnect Google Calendar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm text-success font-medium">Connected</span>
                  </div>
                )}

                {profile.google_calendar.last_synced && (
                  <p className="text-xs text-text-muted">
                    Last synced: {new Date(profile.google_calendar.last_synced).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnectGoogleCalendar}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-default rounded-lg text-xs hover:bg-bg-elevated transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-900">
                    <strong>Read-only access:</strong> Skedular can only view your calendar to check for conflicts.
                    We cannot create, modify, or delete your events.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
