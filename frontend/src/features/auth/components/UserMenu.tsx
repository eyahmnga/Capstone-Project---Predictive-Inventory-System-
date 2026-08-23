import { useState } from 'react'
import { LogOut, Moon, Sun, User } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { UserProfileDialog } from '@/features/auth/components/UserProfileDialog'
import { formatRole } from '@/features/auth/lib/formatRole'
import { Avatar } from '@/shared/components/Avatar'
import { DropdownMenu, DropdownMenuItem } from '@/shared/components/DropdownMenu'
import { useUiStore } from '@/shared/state/uiStore'

export function UserMenu() {
  const { session, logout } = useAuth()
  const theme = useUiStore((state) => state.theme)
  const toggleTheme = useUiStore((state) => state.toggleTheme)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  if (!session) return null

  const { displayName, email, avatarUrl, roles } = session.user
  const position = formatRole(roles[0])

  const handleLogout = async () => {
    await logout()
    window.location.assign('/login')
  }

  return (
    <>
      <DropdownMenu
        align="end"
        triggerClassName="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-white/10 text-white transition-colors"
        trigger={() => (
          <>
            <Avatar name={displayName} size="sm" src={avatarUrl} />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight text-white">{displayName}</span>
              <span className="block text-xs leading-tight text-slate-300">{position}</span>
            </span>
          </>
        )}
      >
        {({ close }) => (
          <>
            <div className="flex items-center gap-3 border-b border-border px-2 pb-3">
              <Avatar name={displayName} size="md" src={avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                <p className="truncate text-xs text-muted">{email}</p>
                <p className="truncate text-xs text-muted">{position}</p>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <DropdownMenuItem
                icon={<User aria-hidden="true" size={18} />}
                onClick={() => {
                  close()
                  setIsProfileOpen(true)
                }}
              >
                Edit profile & photo
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={theme === 'light' ? <Moon aria-hidden="true" size={18} /> : <Sun aria-hidden="true" size={18} />}
                onClick={() => {
                  toggleTheme()
                  close()
                }}
              >
                {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<LogOut aria-hidden="true" size={18} />}
                onClick={() => {
                  close()
                  void handleLogout()
                }}
              >
                Sign out
              </DropdownMenuItem>
            </div>
          </>
        )}
      </DropdownMenu>

      <UserProfileDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  )
}
