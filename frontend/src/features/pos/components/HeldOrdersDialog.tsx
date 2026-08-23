import { Clock, Play, Trash2, X } from 'lucide-react'
import { computeCartTotals } from '@/features/pos/lib/cartTotals'
import type { HeldOrder } from '@/features/pos/state/posCartStore'
import { Button } from '@/shared/components/Button'
import { Portal } from '@/shared/components/Portal'
import { formatCurrency, formatDateTime } from '@/shared/lib/formatters'

type HeldOrdersDialogProps = {
  heldOrders: HeldOrder[]
  onResume: (id: string) => void
  onDiscard: (id: string) => void
  onClose: () => void
}

export function HeldOrdersDialog({
  heldOrders,
  onResume,
  onDiscard,
  onClose,
}: HeldOrdersDialogProps) {
  return (
    <Portal>
      <div
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs"
        role="dialog"
      >
        <div className="relative flex w-full max-w-lg flex-col rounded-2xl bg-surface shadow-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-subtle/40">
            <div className="flex items-center gap-2">
              <Clock className="text-brand-600" size={18} />
              <div>
                <h2 className="text-base font-bold text-slate-900">Parked / Held Orders</h2>
                <p className="text-xs text-muted">
                  Resume a held transaction or discard unattended orders.
                </p>
              </div>
            </div>
            <button
              aria-label="Close dialog"
              className="rounded-lg p-1.5 text-muted hover:bg-subtle hover:text-ink transition"
              type="button"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto p-5 space-y-3">
            {heldOrders.length === 0 ? (
              <div className="py-8 text-center text-muted text-sm">
                No orders are currently parked.
              </div>
            ) : (
              heldOrders.map((held, index) => {
                const totals = computeCartTotals(held.lines, held.isTaxIncluded)
                const totalPcs = held.lines.reduce((acc, l) => acc + l.quantity, 0)

                return (
                  <div
                    key={held.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/90 bg-surface p-4 shadow-2xs hover:border-brand-300 transition"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {held.customerName || `Parked Order #${index + 1}`}
                        </span>
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                          {held.lines.length} items ({totalPcs} pcs)
                        </span>
                      </div>
                      <p className="text-[11px] text-muted flex items-center gap-1">
                        <Clock size={12} />
                        Parked at {formatDateTime(held.heldAt)}
                      </p>
                      <p className="font-black text-sm text-brand-900 pt-0.5">
                        {formatCurrency(totals.total)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                      <Button
                        aria-label={`Discard parked order ${index + 1}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => onDiscard(held.id)}
                      >
                        <Trash2 aria-hidden="true" className="text-rose-600" size={15} />
                      </Button>
                      <Button
                        className="gap-1 bg-brand-600 hover:bg-brand-700 text-white font-bold"
                        size="sm"
                        type="button"
                        onClick={() => {
                          onResume(held.id)
                          onClose()
                        }}
                      >
                        <Play size={14} />
                        Resume
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-border bg-subtle/20 px-5 py-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
