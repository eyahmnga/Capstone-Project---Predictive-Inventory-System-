import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useInventoryAdjustments } from '@/features/inventory/hooks/useInventory'
import type { AppNotification } from '@/features/notifications/types/notification'
import { usePurchaseOrders } from '@/features/purchase-orders/hooks/usePurchaseOrders'
import { useRestockingAlerts } from '@/features/restocking/hooks/useRestocking'
import { useSyncQueue } from '@/shared/offline/useSyncQueue'

const STORAGE_PREFIX = 'psi_read_notifications_'

export function useRoleNotifications() {
  const { session } = useAuth()
  const userId = session?.user.id
  const roles = session?.user.roles ?? ['staff']
  const isOwner = roles.includes('owner')
  const isManager = roles.includes('manager')
  const isStaff = roles.includes('staff') && !isOwner && !isManager

  const defaultBranchId = useMemo(() => {
    return (session?.user.branches.find((b) => b.isDefault) ?? session?.user.branches[0])?.id ?? null
  }, [session])

  // 1. Fetch live restocking alerts
  const alertsQuery = useRestockingAlerts({
    branchId: defaultBranchId,
    status: 'active',
    severity: 'all',
    page: 1,
    perPage: 50,
  })

  // 2. Fetch live purchase orders
  const poQuery = usePurchaseOrders({
    branchId: defaultBranchId,
    status: 'all',
    supplierId: 'all',
    search: '',
    page: 1,
    perPage: 50,
  })

  // 3. Fetch live inventory adjustments
  const adjustmentsQuery = useInventoryAdjustments({
    branchId: defaultBranchId,
    status: 'all',
    page: 1,
    perPage: 25,
  })

  // 4. Fetch sync queue
  const { pendingCount, attentionCount } = useSyncQueue(userId)

  // Local storage for read notifications
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (!userId) return new Set()
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    if (!userId) return
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
      setReadIds(stored ? new Set(JSON.parse(stored)) : new Set())
    } catch {
      setReadIds(new Set())
    }
  }, [userId])

  const saveReadIds = useCallback(
    (newSet: Set<string>) => {
      setReadIds(newSet)
      if (userId) {
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(Array.from(newSet)))
        } catch {
          // ignore storage quota errors
        }
      }
    },
    [userId],
  )

  const markAsRead = useCallback(
    (id: string) => {
      const updated = new Set(readIds)
      updated.add(id)
      saveReadIds(updated)
    },
    [readIds, saveReadIds],
  )

  const markAllAsRead = useCallback(
    (ids: string[]) => {
      const updated = new Set(readIds)
      ids.forEach((id) => updated.add(id))
      saveReadIds(updated)
    },
    [readIds, saveReadIds],
  )

  const clearAll = useCallback(() => {
    saveReadIds(new Set())
  }, [saveReadIds])

  // Build role-specific notifications list
  const notifications = useMemo<AppNotification[]>(() => {
    if (!session) return []

    const list: AppNotification[] = []
    const restockingAlerts = alertsQuery.data?.data ?? []
    const purchaseOrders = poQuery.data?.data ?? []
    const adjustments = adjustmentsQuery.data?.data ?? []

    // --- A. STOCK APPROVAL NOTIFICATIONS ---
    adjustments.forEach((adj) => {
      // 1. Stock Adjustment Approved & Posted (routes directly to adjustment detail drawer)
      if (adj.status === 'posted') {
        const id = `adj_approved_${adj.id}_${adj.version}`
        list.push({
          id,
          title: `Stock Adjustment Approved: ${adj.adjustmentNumber}`,
          message: `Adjustment for "${adj.reasonCode.replace('_', ' ')}" has been approved and posted to inventory balances.`,
          category: 'stock',
          severity: 'success',
          timestamp: adj.approvedAt || adj.postedAt || adj.effectiveAt || new Date().toISOString(),
          link: `/inventory?tab=adjustments&adjustmentId=${adj.id}`,
          read: readIds.has(id),
          targetRoles: ['owner', 'manager', 'staff'],
        })
      }

      // 2. Stock Adjustment Pending Approval (For Owner/Manager)
      if (adj.status === 'pending_approval' && (isOwner || isManager)) {
        const id = `adj_pending_${adj.id}`
        list.push({
          id,
          title: `Stock Adjustment Pending Approval: ${adj.adjustmentNumber}`,
          message: `A stock count adjustment for "${adj.reasonCode.replace('_', ' ')}" requires manager/owner approval.`,
          category: 'stock',
          severity: 'warning',
          timestamp: adj.effectiveAt || new Date().toISOString(),
          link: `/inventory?tab=adjustments&adjustmentId=${adj.id}`,
          read: readIds.has(id),
          targetRoles: ['owner', 'manager'],
        })
      }
    })

    // --- B. PURCHASE ORDER / REPLENISHMENT APPROVAL NOTIFICATIONS ---
    purchaseOrders.forEach((po) => {
      // 1. PO Approved Notification
      if (po.status === 'approved') {
        const id = `po_approved_${po.id}_${po.version}`
        list.push({
          id,
          title: `Stock PO Approved: ${po.poNumber}`,
          message: `Replenishment order for ${po.supplier?.legalName ?? 'Supplier'} (₱${Number(po.totalAmount).toLocaleString()}) was approved and is ready to be ordered.`,
          category: 'purchase_order',
          severity: 'success',
          timestamp: po.approvedAt || po.submittedAt || new Date().toISOString(),
          link: '/purchase-orders',
          read: readIds.has(id),
          targetRoles: ['owner', 'manager', 'staff'],
        })
      }

      // 2. PO Pending Approval (For Owner / Manager)
      if (po.status === 'submitted' && (isOwner || isManager)) {
        const id = `po_pending_${po.id}`
        list.push({
          id,
          title: `PO ${po.poNumber} Pending Approval`,
          message: `Order for ${po.supplier?.legalName ?? 'Supplier'} (₱${Number(po.totalAmount).toLocaleString()}) awaits executive authorization.`,
          category: 'purchase_order',
          severity: 'warning',
          timestamp: po.submittedAt || new Date().toISOString(),
          link: '/purchase-orders',
          read: readIds.has(id),
          targetRoles: ['owner', 'manager'],
        })
      }

      // 3. PO Ordered / In Transit (For Staff to receive)
      if (po.status === 'ordered') {
        const id = `po_ordered_${po.id}`
        list.push({
          id,
          title: `Delivery En Route: PO ${po.poNumber}`,
          message: `Order placed with ${po.supplier?.legalName ?? 'Supplier'}. Ready for warehouse goods receipt upon arrival.`,
          category: 'purchase_order',
          severity: 'info',
          timestamp: po.orderedAt || new Date().toISOString(),
          link: isStaff ? '/receipts' : '/purchase-orders',
          read: readIds.has(id),
          targetRoles: ['manager', 'staff'],
        })
      }
    })

    // --- C. RESTOCKING & INVENTORY ALERTS ---
    restockingAlerts.forEach((alert) => {
      const isOos = Number(alert.availableQuantitySnapshot) <= 0
      const isCritical = alert.severity === 'critical' || isOos

      // Critical OOS / Low Stock Alerts
      if (isOwner && isCritical) {
        const id = `owner_stock_${alert.id}`
        list.push({
          id,
          title: isOos ? `Critical Out of Stock: ${alert.productName ?? 'Product'}` : `Low Stock Alert: ${alert.productName ?? 'Product'}`,
          message: `Available stock is ${alert.availableQuantitySnapshot} units (ROP: ${alert.reorderPointSnapshot}). Reorder required.`,
          category: 'stock',
          severity: 'critical',
          timestamp: alert.firstTriggeredAt || new Date().toISOString(),
          link: '/restocking',
          read: readIds.has(id),
          targetRoles: ['owner'],
        })
      }

      if (isManager) {
        const id = `manager_restock_${alert.id}`
        list.push({
          id,
          title: isCritical ? `Critical Stock: ${alert.productName ?? 'Product'}` : `Restock Needed: ${alert.productName ?? 'Product'}`,
          message: `Stock (${alert.availableQuantitySnapshot}) at/below ROP (${alert.reorderPointSnapshot}). Recommended EOQ order: ${alert.recommendedOrderQuantity ?? 'N/A'}.`,
          category: 'stock',
          severity: isCritical ? 'critical' : 'warning',
          timestamp: alert.firstTriggeredAt || new Date().toISOString(),
          link: '/restocking',
          read: readIds.has(id),
          targetRoles: ['manager'],
        })
      }

      if (isStaff && isOos) {
        const id = `staff_oos_${alert.id}`
        list.push({
          id,
          title: `POS Alert: ${alert.productName ?? 'Product'} Out of Stock`,
          message: `Zero stock on shelf. Inform customers or check incoming shipments before confirming sales.`,
          category: 'stock',
          severity: 'critical',
          timestamp: alert.firstTriggeredAt || new Date().toISOString(),
          link: '/products?stockStatus=out_of_stock',
          read: readIds.has(id),
          targetRoles: ['staff'],
        })
      }
    })

    // --- D. SYNC QUEUE NOTICES ---
    if (attentionCount > 0 && (isOwner || isManager)) {
      const id = `sync_attention_${attentionCount}`
      list.push({
        id,
        title: 'Sync Queue Needs Attention',
        message: `${attentionCount} offline transaction(s) encountered conflict or require manual retry.`,
        category: 'sync',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        link: '/sync',
        read: readIds.has(id),
        targetRoles: ['owner', 'manager'],
      })
    }

    if (pendingCount > 0 && isStaff) {
      const id = `staff_pending_sync_${pendingCount}`
      list.push({
        id,
        title: 'Offline Transactions Queued',
        message: `${pendingCount} local sale/inventory record(s) queued for synchronization.`,
        category: 'sync',
        severity: 'info',
        timestamp: new Date().toISOString(),
        link: '/sync',
        read: readIds.has(id),
        targetRoles: ['staff'],
      })
    }

    // Sort: Unread first, then by timestamp descending
    return list.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }, [
    session,
    isOwner,
    isManager,
    isStaff,
    alertsQuery.data,
    poQuery.data,
    adjustmentsQuery.data,
    attentionCount,
    pendingCount,
    readIds,
  ])

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  return {
    notifications,
    unreadCount,
    isLoading: alertsQuery.isLoading || poQuery.isLoading || adjustmentsQuery.isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
    roleLabel: isOwner ? 'Owner' : isManager ? 'Manager' : 'Staff',
  }
}
