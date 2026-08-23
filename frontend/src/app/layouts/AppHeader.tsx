import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import logoIcon from '@/features/auth/assets/logo.png'
import { useAuth } from '@/features/auth/AuthProvider'
import { UserMenu } from '@/features/auth/components/UserMenu'
import { NotificationDropdown } from '@/features/notifications/components/NotificationDropdown'
import { SyncStatusIndicator } from '@/features/sync/components/SyncStatusIndicator'
import { Button } from '@/shared/components/Button'
import { GlobalSearchBar } from '@/shared/components/GlobalSearchBar'
import { useUiStore } from '@/shared/state/uiStore'

export function AppHeader() {
  const toggleMobileNav = useUiStore((state) => state.toggleMobileNav)
  const { session } = useAuth()

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-sidebar text-white px-3 sm:px-4 lg:pl-3 lg:pr-6 shadow-md">
      {/* Left: Brand info with company logo aligned with sidebar */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Button
          aria-label="Toggle navigation"
          className="text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
          size="icon"
          variant="ghost"
          onClick={toggleMobileNav}
        >
          <Menu aria-hidden="true" size={18} />
        </Button>

        <Link
          className="flex items-center gap-2.5 min-w-0 rounded-lg p-0.5 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-400"
          to="/dashboard"
        >
          <img
            alt="Steven Hydrotech Exponent Logo"
            className="h-10 w-10 shrink-0 rounded-xl bg-white/10 p-0.5 object-contain drop-shadow-md ring-1 ring-white/15"
            src={logoIcon}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">Predictive Inventory System</p>
            <p className="truncate text-xs font-semibold leading-tight text-blue-200">Steven Hydrotech Exponent</p>
          </div>
        </Link>
      </div>

      {/* Center / Left-Center: Functional Global Live Search Bar */}
      <div className="hidden flex-1 max-w-md mx-6 md:block">
        <GlobalSearchBar />
      </div>

      {/* Right: Sync Status, Functional Notification Bell Dropdown, User Profile Menu */}
      <div className="ml-auto flex items-center gap-2.5">
        <SyncStatusIndicator userId={session?.user.id} />

        {/* Functional Notification Bell with Role-Based Alerts */}
        <NotificationDropdown />

        <UserMenu />
      </div>
    </header>
  )
}
