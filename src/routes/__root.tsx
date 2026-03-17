import { HeadContent, Scripts, createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { AuthProvider } from '@/lib/auth-context'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Skedular' },
      { name: 'description', content: 'Simple online scheduling — paint your availability, share a link' },
      { name: 'theme-color', content: '#3b82f6' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'Skedular' },
      // Open Graph / Social Media
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Skedular — Simple Online Scheduling' },
      { property: 'og:description', content: 'Paint your availability, share a link. No sign-up required for bookers.' },
      { property: 'og:image', content: 'https://skedular.online/og-image.png' },
      { property: 'og:url', content: 'https://skedular.online' },
      { property: 'og:site_name', content: 'Skedular' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Skedular — Simple Online Scheduling' },
      { name: 'twitter:description', content: 'Paint your availability, share a link. No sign-up required for bookers.' },
      { name: 'twitter:image', content: 'https://skedular.online/og-image.png' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Page not found</p>
        <Link to="/" className="text-primary hover:text-primary-dark font-medium">
          Back to home
        </Link>
      </div>
    </div>
  )
}

function RootLayout() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-bg-page text-text-primary">
        <Outlet />
      </div>
    </AuthProvider>
  )
}
