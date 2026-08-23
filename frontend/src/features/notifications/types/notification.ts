export type NotificationCategory = 'stock' | 'purchase_order' | 'sync' | 'general'
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success'

export type AppNotification = {
  id: string
  title: string
  message: string
  category: NotificationCategory
  severity: NotificationSeverity
  timestamp: string
  link: string
  read: boolean
  targetRoles: ('owner' | 'manager' | 'staff')[]
  meta?: Record<string, unknown>
}
