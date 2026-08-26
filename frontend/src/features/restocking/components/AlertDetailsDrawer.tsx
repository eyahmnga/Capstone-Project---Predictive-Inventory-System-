import { useState } from 'react'
import { ArrowRight, Info, ShoppingCart, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { AlertStatusBadge } from '@/features/restocking/components/AlertStatusBadge'
import { ReasonPromptDialog } from '@/features/restocking/components/ReasonPromptDialog'
import { SeverityBadge } from '@/features/restocking/components/SeverityBadge'
import type { RestockingAlert } from '@/features/restocking/types/restocking'
import { Button } from '@/shared/components/Button'
import { drawerOverlayClass, drawerPanelClass } from '@/shared/lib/modalClasses'
import { formatQuantity } from '@/shared/lib/formatters'
import { Portal } from '@/shared/components/Portal'

type AlertDetailsDrawerProps = {
  alert: RestockingAlert
  isActing: boolean
  onClose: () => void
  onAcknowledge: () => void
  onResolve: (reason: string) => void
  onDismiss: (reason: string) => void
}

export function AlertDetailsDrawer({ alert, isActing, onClose, onAcknowledge, onResolve, onDismiss }: AlertDetailsDrawerProps) {
  const { hasPermission } = useAuth()
  const [prompt, setPrompt] = useState<'resolve' | 'dismiss' | null>(null)

  const canAcknowledge = alert.status === 'active' && hasPermission('restocking.acknowledge')
  const canResolve = (alert.status === 'active' || alert.status === 'acknowledged') && hasPermission('restocking.resolve')

  const availableStock = Number(alert.availableQuantitySnapshot) || 0
  const reorderPoint = Number(alert.reorderPointSnapshot) || 0
  const isBelowRop = availableStock <= reorderPoint

  return (
    <Portal>
      <div className={drawerOverlayClass} role="presentation" onMouseDown={onClose}>
        <aside
          aria-labelledby="alert-details-title"
          aria-modal="true"
          className={drawerPanelClass('sm:max-w-xl')}
          role="dialog"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-6 bg-slate-50/50">
            <div>
              <p className="font-mono text-xs text-muted">Restocking Alert #{alert.id}</p>
              <h2 id="alert-details-title" className="mt-1 text-xl font-bold tracking-tight text-ink">
                {alert.productName}
              </h2>
              <p className="font-mono text-xs text-muted mt-0.5">{alert.productSku}</p>
              <div className="mt-3 flex gap-2">
                <AlertStatusBadge status={alert.status} />
                <SeverityBadge severity={alert.severity} />
              </div>
            </div>
            <Button aria-label="Close alert details" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {/* Actionable Reorder Recommendation Banner */}
            <div className={`rounded-xl border p-4 text-xs ${isBelowRop ? 'border-amber-200 bg-amber-50/80 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
              <div className="flex items-start gap-2.5">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="font-bold text-sm">
                    {isBelowRop ? '⚠️ Stock Fallen Below Reorder Point (ROP)' : 'Restocking Status Notice'}
                  </h4>
                  <p className="mt-1 text-xs">
                    Current available stock (<strong>{formatQuantity(alert.availableQuantitySnapshot)} pcs</strong>) is at or below the calculated Reorder Point (<strong>{formatQuantity(alert.reorderPointSnapshot)} pcs</strong>).
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white/90 border border-amber-200/80 p-2.5">
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">Recommended Batch Order (EOQ):</span>
                      <p className="text-sm font-extrabold text-emerald-800 font-mono">
                        {alert.recommendedOrderQuantity ? `${formatQuantity(alert.recommendedOrderQuantity)} units` : 'Set in Reorder Policy'}
                      </p>
                    </div>
                    <Link
                      to={`/purchase-orders?newPo=1&productId=${alert.productId}&quantity=${alert.recommendedOrderQuantity ?? ''}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      <ShoppingCart size={13} />
                      Order Now
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Snapshots */}
            <section className="grid grid-cols-2 gap-3 rounded-xl border border-border p-4 text-sm bg-white shadow-2xs">
              <div>
                <p className="text-xs text-muted">Available Stock</p>
                <p className={`font-mono text-base font-bold ${isBelowRop ? 'text-danger-text' : 'text-ink'}`}>
                  {formatQuantity(alert.availableQuantitySnapshot)} pcs
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Reorder Point (ROP)</p>
                <p className="font-mono text-base font-bold text-ink">
                  {formatQuantity(alert.reorderPointSnapshot)} pcs
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-muted">Incoming on PO</p>
                <p className="font-mono text-sm font-semibold text-slate-700">
                  {formatQuantity(alert.incomingQuantitySnapshot)} pcs
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-muted">Recommended (EOQ)</p>
                <p className="font-mono text-sm font-bold text-emerald-700">
                  {formatQuantity(alert.recommendedOrderQuantity)} pcs
                </p>
              </div>
            </section>

            {alert.dismissalReason ? (
              <section className="rounded-xl border border-border bg-slate-50 p-3 text-xs">
                <h3 className="font-semibold text-ink">Dismissal Reason</h3>
                <p className="mt-1 text-muted">{alert.dismissalReason}</p>
              </section>
            ) : null}

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Alert History</h3>
              <ul className="mt-2 space-y-1.5">
                {alert.events.map((event) => (
                  <li key={event.id} className="rounded-lg border border-border px-3 py-2 text-xs flex items-center justify-between bg-white">
                    <span className="font-medium capitalize text-ink">{event.eventType.replace('_', ' ')}</span>
                    <span className="text-[11px] text-muted">{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : '—'}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 bg-slate-50/50">
            <div className="flex gap-2">
              {canAcknowledge ? <Button disabled={isActing} onClick={onAcknowledge}>Acknowledge Alert</Button> : null}
              {canResolve ? <Button disabled={isActing} onClick={() => setPrompt('resolve')}>Mark Resolved</Button> : null}
              {canResolve ? <Button disabled={isActing} variant="ghost" onClick={() => setPrompt('dismiss')}>Dismiss</Button> : null}
            </div>
          </footer>
        </aside>

        {prompt === 'resolve' ? (
          <ReasonPromptDialog
            confirmLabel="Resolve alert"
            description="Confirm this alert reflects a verified stock recovery or approved replenishment."
            isSubmitting={isActing}
            title="Resolve restocking alert"
            onClose={() => setPrompt(null)}
            onConfirm={(reason) => {
              onResolve(reason)
              setPrompt(null)
            }}
          />
        ) : null}

        {prompt === 'dismiss' ? (
          <ReasonPromptDialog
            confirmLabel="Dismiss alert"
            description="Dismissal is auditable and requires a documented reason."
            isSubmitting={isActing}
            title="Dismiss restocking alert"
            onClose={() => setPrompt(null)}
            onConfirm={(reason) => {
              onDismiss(reason)
              setPrompt(null)
            }}
          />
        ) : null}
      </div>
    </Portal>
  )
}
