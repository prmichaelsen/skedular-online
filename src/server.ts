import startServer from '@tanstack/react-start/server-entry'
import { generateICSFeed } from './lib/server-fn'

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url)

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
