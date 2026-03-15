# Skedular

Your own scheduling tool. Paint your availability, share your link, let others book time with you.

**Live at [skedular.online](https://skedular.online)**

> Built in 3 hours with [Agent Context Protocol](https://github.com/prmichaelsen/agent-context-protocol)

## Features

- Paint availability on a visual weekly calendar (click and drag)
- Custom booking URL at `skedular.online/{username}`
- Guest booking — no account needed for bookers
- Email confirmations with .ics calendar invites (via Mandrill)
- Cancel/reschedule via email link
- Server-side double-booking prevention
- Configurable: event duration, buffer time, max bookings/day, minimum notice
- Timezone auto-detection
- SSR-preloaded booking page (no loading spinner)
- Mobile-friendly with responsive day-at-a-time view

## Tech Stack

- [TanStack Start](https://tanstack.com/start) (React 19) + [TanStack Router](https://tanstack.com/router)
- [Cloudflare Workers](https://workers.cloudflare.com/) (edge deployment)
- [Firebase Auth](https://firebase.google.com/docs/auth) (email/password)
- [Firebase Firestore](https://firebase.google.com/docs/firestore) (database)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Mandrill](https://mandrillapp.com/) (transactional email)

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Fill in Firebase and Mandrill credentials

# Start dev server
npm run dev
# → http://localhost:3322

# Deploy to Cloudflare
npm run deploy

# Upload secrets to Cloudflare
npm run cf-secrets:upload
```

## License

MIT

## Author

Patrick Michaelsen
