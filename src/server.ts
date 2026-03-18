import startServer from '@tanstack/react-start/server-entry'
import { generateICSFeed } from './lib/server-fn'
import { createGoogleCalendarProvider } from './lib/calendar-providers/google'
import { saveGoogleCalendarConnection } from './lib/firestore'

export default {
  async fetch(request: Request, env: any, ctx: unknown) {
    const url = new URL(request.url)

    // Handle Google OAuth callback
    if (url.pathname === '/auth/google/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      // Build redirect URL with query params preserved
      const dashboardUrl = new URL('/dashboard/settings', url.origin)

      if (error) {
        dashboardUrl.searchParams.set('oauth_error', 'cancelled')
        return Response.redirect(dashboardUrl.toString(), 302)
      }

      if (!code || !state) {
        dashboardUrl.searchParams.set('oauth_error', 'invalid_callback')
        return Response.redirect(dashboardUrl.toString(), 302)
      }

      try {
        const userId = decodeURIComponent(state)
        const redirectUri = 'https://skedular.online/auth/google/callback'

        // Create provider with env vars
        const provider = createGoogleCalendarProvider(env)
        const tokens = await provider.handleCallback(code, userId, redirectUri)

        await saveGoogleCalendarConnection(userId, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
        })

        dashboardUrl.searchParams.set('oauth_success', 'true')
        return Response.redirect(dashboardUrl.toString(), 302)
      } catch (err) {
        console.error('Google OAuth callback error:', err)
        console.error('Error details:', err instanceof Error ? err.message : String(err))
        dashboardUrl.searchParams.set('oauth_error', 'failed')
        return Response.redirect(dashboardUrl.toString(), 302)
      }
    }

    // Handle .ics calendar feed requests
    const icsMatch = url.pathname.match(/^\/cal\/([^/]+)\.ics$/)
    if (icsMatch) {
      const username = icsMatch[1]
      const token = url.searchParams.get('token')

      // Validate token parameter
      if (!token) {
        return new Response('Missing token parameter', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        })
      }

      try {
        // Call server function to generate .ics feed
        const result = await generateICSFeed({ data: { username, token } })

        if (!result.success) {
          const statusCode =
            result.error === 'Invalid token' ? 403 :
            result.error === 'User not found' ? 404 :
            result.error === 'Calendar feed not enabled' ? 403 :
            400
          return new Response(result.error, {
            status: statusCode,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        // Return .ics file with proper headers
        return new Response(result.icsContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="${username}.ics"`,
            'Cache-Control': 'private, max-age=300', // 5 min cache
          },
        })
      } catch (error) {
        console.error('Error generating .ics feed:', error)
        return new Response('Internal server error', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        })
      }
    }

    // Pass all other requests to TanStack Start
    return (startServer as any).fetch(request, env, ctx)
  },
}
