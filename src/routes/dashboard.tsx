import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { CalendarPainter, type CalendarPainterValue } from '@/components/CalendarPainter'
import { getUserProfile, getAvailability, saveAvailability, getBookingsForUser, updateUserSettings, enableCalendarFeed, disableCalendarFeed, regenerateCalendarFeedToken, disconnectGoogleCalendar } from '@/lib/firestore'
import { googleCalendarProvider } from '@/lib/calendar-providers/google'
import type { UserProfile, Booking } from '@/lib/types'
import { Copy, Check, Settings, LogOut, ExternalLink, Calendar, Clock, Link2, X, AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [availability, setAvailability] = useState<CalendarPainterValue>({ mode: 'custom', windows: [] })
  const [bookings, setBookings] = useState<Booking[]>([])
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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
      window.history.replaceState({}, '', '/dashboard')
      setTimeout(() => setOauthMessage(null), 5000)
    } else if (oauthError) {
      const errorMessages: Record<string, string> = {
        cancelled: 'Google Calendar connection was cancelled',
        invalid_callback: 'Invalid OAuth callback',
        failed: 'Failed to connect Google Calendar',
      }
      setOauthMessage({ type: 'error', text: errorMessages[oauthError] || 'OAuth error occurred' })
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
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
      setSettingsForm({
        defaultDuration: p.settings.defaultDuration,
        bufferTime: p.settings.bufferTime,
        maxPerDay: p.settings.maxPerDay,
        minNotice: p.settings.minNotice,
      })

      const avail = await getAvailability(user.uid)
      if (avail) {
        if (avail.mode === 'soonest') {
          setAvailability({ mode: 'soonest' })
        } else {
          setAvailability({ mode: 'custom', windows: avail.windows })
        }
      }

      const today = new Date().toISOString().split('T')[0]
      const b = await getBookingsForUser(user.uid)
      setBookings(b.filter((bk) => bk.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)))

      // Set calendar feed URL if enabled
      if (p.ics_feed_enabled && p.ics_feed_token) {
        setCalendarFeedUrl(`${window.location.origin}/cal/${p.username}.ics?token=${p.ics_feed_token}`)
      }
    })()
  }, [user, navigate])

  const handleAvailabilityChange = useCallback(
    async (value: CalendarPainterValue) => {
      setAvailability(value)
      if (!user) return
      setSaving(true)
      try {
        if (value.mode === 'soonest') {
          await saveAvailability(user.uid, { mode: 'soonest', windows: [], dateOverrides: [] })
        } else {
          await saveAvailability(user.uid, { mode: 'custom', windows: value.windows, dateOverrides: [] })
        }
      } finally {
        setSaving(false)
      }
    },
    [user]
  )

  const handleSaveSettings = async () => {
    if (!user) return
    await updateUserSettings(user.uid, settingsForm)
    setShowSettings(false)
    // Refresh profile
    const p = await getUserProfile(user.uid)
    if (p) setProfile(p)
  }

  const copyLink = () => {
    if (!profile) return
    const url = `${window.location.origin}/${profile.username}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEnableCalendarFeed = async () => {
    if (!user) return
    setEnablingFeed(true)
    try {
      const token = await enableCalendarFeed(user.uid)
      const feedUrl = `${window.location.origin}/cal/${profile?.username}.ics?token=${token}`
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
      const feedUrl = `${window.location.origin}/cal/${profile?.username}.ics?token=${token}`
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

  const handleConnectGoogleCalendar = () => {
    if (!user) return
    const redirectUri = `${window.location.origin}/auth/google/callback`
    const authUrl = googleCalendarProvider.getAuthUrl(user.uid, redirectUri)
    window.location.href = authUrl
  }

  const handleDisconnectGoogleCalendar = async () => {
    if (!user) return
    await disconnectGoogleCalendar(user.uid)
    // Refresh profile
    const p = await getUserProfile(user.uid)
    if (p) setProfile(p)
  }

  // Check if Google Calendar connection has expired or needs attention
  const googleCalendarNeedsAttention = profile?.google_calendar?.connected &&
    profile.google_calendar.expires_at < Date.now()

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-default">
        <Link to="/" className="text-xl font-bold text-primary">Skedular</Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
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

        {/* Google Calendar disconnected banner */}
        {googleCalendarNeedsAttention && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                Google Calendar disconnected
              </p>
              <p className="text-xs text-yellow-800 mt-1">
                Your calendar sync has expired. New bookings may conflict with your calendar events.
              </p>
            </div>
            <button
              onClick={handleConnectGoogleCalendar}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-xs font-medium hover:bg-yellow-700 transition-colors"
            >
              Reconnect
            </button>
          </div>
        )}

        {/* Booking link */}
        <div className="mb-8 p-4 bg-bg-elevated rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">Your booking link</p>
            <p className="font-medium text-text-primary">
              {window.location.origin}/{profile.username}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-default rounded-lg text-sm hover:bg-bg-elevated transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={`/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-default rounded-lg text-sm hover:bg-bg-elevated transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Preview
            </a>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mb-8 space-y-6">
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
                <label className="block text-sm text-text-secondary mb-1">Min notice (min)</label>
                <input
                  type="number"
                  value={settingsForm.minNotice}
                  onChange={(e) => setSettingsForm({ ...settingsForm, minNotice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border-default rounded-lg"
                  min={0}
                  step={15}
                />
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
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-border-default rounded font-mono"
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
                  <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm text-success font-medium">Connected</span>
                  </div>

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
        )}

        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          {/* Availability painter */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your availability</h2>
              {saving && <span className="text-xs text-text-muted">Saving...</span>}
            </div>
            <CalendarPainter value={availability} onChange={handleAvailabilityChange} />
          </div>

          {/* Upcoming bookings */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Upcoming bookings</h2>
            {bookings.length === 0 ? (
              <div className="p-6 text-center text-text-muted border border-border-subtle rounded-xl">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming bookings</p>
                <p className="text-xs mt-1">Share your link to start getting booked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 10).map((b) => (
                  <div key={b.id} className="p-3 border border-border-default rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-sm font-medium">{b.date} {b.startTime}–{b.endTime}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{b.bookerName}</p>
                    <p className="text-xs text-text-muted">{b.bookerEmail}</p>
                    {b.notes && <p className="text-xs text-text-muted mt-1 italic">{b.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
