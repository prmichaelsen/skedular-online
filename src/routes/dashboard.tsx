import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth-context'
import { Settings, LogOut } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-default">
        <Link to="/" className="text-xl font-bold text-primary">Skedular</Link>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/settings"
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
          <button
            onClick={logout}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Child routes render here */}
      <Outlet />
    </div>
  )
}
