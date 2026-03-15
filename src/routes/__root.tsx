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
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
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
