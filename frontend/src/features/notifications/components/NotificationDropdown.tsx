import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Package,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRoleNotifications } from '@/features/notifications/hooks/useRoleNotifications'
import type { AppNotification, NotificationCategory, NotificationSeverity } from '@/features/notifications/types/notification'
import { DropdownMenu } from '@/shared/components/DropdownMenu'
import { cn } from '@/shared/lib/cn'

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(date)
  } catch {
    return 'Active'
  }
}

function getCategoryIcon(category: NotificationCategory, severity: NotificationSeverity) {
  if (severity === 'success') {
    return <CheckCircle2 aria-hidden="true" className="text-emerald-600" size={16} />
  }
  if (severity === 'critical') {
    return <AlertTriangle aria-hidden="true" className="text-red-600" size={16} />
  }
  switch (category) {
    case 'stock':
      return <Package aria-hidden="true" className="text-amber-600" size={16} />
    case 'purchase_order':
      return <ShoppingCart aria-hidden="true" className="text-blue-600" size={16} />
    case 'sync':
      return <RefreshCw aria-hidden="true" className="text-emerald-600" size={16} />
    default:
      return <AlertCircle aria-hidden="true" className="text-slate-600" size={16} />
  }
}

export function NotificationDropdown() {
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllAsRead, roleLabel } = useRoleNotifications()
  const [filter, setFilter] = useState<'all' | 'unread' | 'stock' | 'po'>('all')

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    if (filter === 'stock') return n.category === 'stock'
    if (filter === 'po') return n.category === 'purchase_order'
    return true
  })

  const handleNotificationClick = (item: AppNotification, close: () => void) => {
    markAsRead(item.id)
    close()
    navigate(item.link)
  }

  return (
    <DropdownMenu
      align="end"
      panelClassName="w-[min(24rem,92vw)] p-0 bg-white border border-border shadow-2xl rounded-2xl overflow-hidden mt-1"
      triggerClassName="relative flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-colors"
      trigger={() => (
        <div className="relative">
          <Bell aria-hidden="true" size={18} />
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread notifications`}
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-sidebar"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      )}
    >
      {({ close }) => (
        <div className="flex flex-col text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">Notifications</h3>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                {roleLabel}
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                type="button"
                onClick={() => markAllAsRead(notifications.map((n) => n.id))}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-2 bg-white text-xs">
            <button
              className={cn(
                'rounded-lg px-2.5 py-1 font-medium transition',
                filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
              type="button"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              className={cn(
                'rounded-lg px-2.5 py-1 font-medium transition',
                filter === 'unread' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
              type="button"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              className={cn(
                'rounded-lg px-2.5 py-1 font-medium transition',
                filter === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
              type="button"
              onClick={() => setFilter('stock')}
            >
              Stock
            </button>
            <button
              className={cn(
                'rounded-lg px-2.5 py-1 font-medium transition',
                filter === 'po' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
              type="button"
              onClick={() => setFilter('po')}
            >
              Orders
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCheck size={24} />
                </div>
                <p className="text-sm font-semibold text-ink">All caught up!</p>
                <p className="mt-0.5 text-xs text-muted">
                  No active {filter !== 'all' ? filter : ''} notifications for your role.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'group relative flex items-start gap-3 p-3.5 transition hover:bg-slate-50 cursor-pointer text-left',
                    !item.read && 'bg-blue-50/40',
                  )}
                  onClick={() => handleNotificationClick(item, close)}
                >
                  {/* Icon Avatar */}
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                      item.severity === 'critical' && 'bg-red-100',
                      item.severity === 'warning' && 'bg-amber-100',
                      item.severity === 'info' && 'bg-blue-100',
                      item.severity === 'success' && 'bg-emerald-100',
                    )}
                  >
                    {getCategoryIcon(item.category, item.severity)}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={cn(
                          'text-xs font-bold leading-tight text-ink line-clamp-1',
                          !item.read && 'text-blue-950 font-extrabold',
                        )}
                      >
                        {item.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-600 leading-snug line-clamp-2">
                      {item.message}
                    </p>
                  </div>

                  {/* Read Indicator / Arrow */}
                  <div className="flex items-center self-center shrink-0 pl-1">
                    {!item.read ? (
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                    ) : (
                      <ChevronRight className="text-slate-300 group-hover:text-slate-600 transition" size={14} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Quick Links */}
          <div className="border-t border-border bg-slate-50 p-2 flex items-center justify-between text-xs">
            <button
              className="px-2 py-1 font-semibold text-blue-600 hover:text-blue-800 transition"
              type="button"
              onClick={() => {
                close()
                navigate('/inventory')
              }}
            >
              Inventory stock →
            </button>
            <button
              className="px-2 py-1 font-semibold text-blue-600 hover:text-blue-800 transition"
              type="button"
              onClick={() => {
                close()
                navigate('/restocking')
              }}
            >
              Restocking alerts →
            </button>
          </div>
        </div>
      )}
    </DropdownMenu>
  )
}
