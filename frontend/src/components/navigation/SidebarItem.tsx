import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import type { AppRoutePath } from '@/components/navigation/types'
import { cn } from '@/shared/lib/cn'

interface SidebarItemProps {
  label: string
  to: AppRoutePath
  isExpanded: boolean
  icon?: LucideIcon
  variant?: 'primary' | 'nested'
  ariaLabel?: string
  onNavigate?: () => void
}

export function SidebarItem({
  label,
  to,
  isExpanded,
  icon: Icon,
  variant = 'nested',
  ariaLabel,
  onNavigate,
}: SidebarItemProps) {
  const isPrimary = variant === 'primary'

  return (
    <NavLink
      aria-label={ariaLabel ?? label}
      className={({ isActive }) =>
        cn(
          'relative flex items-center rounded-lg outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-info',
          isPrimary ? 'h-11 gap-3 px-3 text-sm font-semibold' : 'h-11 px-3 pl-4 text-sm font-medium',
          isActive
            ? 'bg-blue-800/50 text-white border-l-4 border-blue-400 font-semibold shadow-sm'
            : 'text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent',
        )
      }
      title={!isExpanded ? label : undefined}
      to={to}
      onClick={onNavigate}
    >
      {({ isActive }) => (
        <>
          {Icon ? (
            <Icon
              aria-hidden="true"
              className={cn('shrink-0 transition-colors duration-150', isActive ? 'text-blue-300' : 'text-white/70')}
              size={18}
            />
          ) : null}
          {isExpanded ? <span className="truncate">{label}</span> : <span className="lg:sr-only">{label}</span>}
        </>
      )}
    </NavLink>
  )
}
