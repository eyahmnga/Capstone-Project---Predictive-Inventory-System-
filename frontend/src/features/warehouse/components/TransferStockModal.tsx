import { useState } from 'react'
import { ArrowRight, ArrowRightLeft, Boxes, Building2, CheckCircle2, ShieldAlert, Truck, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import type { InventoryBalance } from '@/features/inventory/types/inventory'
import type { StockTransferValues } from '@/features/inventory/api/inventoryApi'
import { Button } from '@/shared/components/Button'

type TransferStockModalProps = {
  sourceBalances: InventoryBalance[]
  defaultFromBranchId?: string
  defaultToBranchId?: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (values: StockTransferValues) => void
}

export function TransferStockModal({
  sourceBalances,
  defaultFromBranchId = '2',
  defaultToBranchId = '1',
  isSubmitting,
  onClose,
  onConfirm,
}: TransferStockModalProps) {
  const { session } = useAuth()
  const [fromBranchId, setFromBranchId] = useState(defaultFromBranchId)
  const [toBranchId, setToBranchId] = useState(defaultToBranchId)
  const [selectedProductId, setSelectedProductId] = useState<string>(
    sourceBalances.find((b) => Number(b.availableQuantity || 0) > 0)?.product?.id ??
      sourceBalances[0]?.product?.id ??
      '',
  )
  const [transferQty, setTransferQty] = useState<number>(5)
  const [notes, setNotes] = useState<string>('Stock replenishment from Budiao Warehouse to Legazpi Store')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const branches = session?.user.branches ?? [
    { id: '1', code: 'MAIN', name: 'Legazpi Branch', isDefault: true },
    { id: '2', code: 'BUD-WH', name: 'Budiao Warehouse', isDefault: false },
  ]

  const selectedBalance = sourceBalances.find((b) => b.product?.id === selectedProductId)
  const availableQty = Number(selectedBalance?.availableQuantity || 0)

  const handleSwapBranches = () => {
    const prevFrom = fromBranchId
    setFromBranchId(toBranchId)
    setToBranchId(prevFrom)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedProductId) {
      setErrorMsg('Pumili ng produktong ililipat.')
      return
    }

    if (transferQty <= 0) {
      setErrorMsg('Ang ililipat na dami (quantity) ay dapat mas mataas sa 0.')
      return
    }

    if (transferQty > availableQty) {
      setErrorMsg(`Kulang ang available stock (${availableQty} pcs) para sa hiniling na ${transferQty} pcs.`)
      return
    }

    onConfirm({
      fromBranchId,
      toBranchId,
      lines: [
        {
          productId: selectedProductId,
          quantity: transferQty,
        },
      ],
      notes: notes.trim() || undefined,
    })
  }

  const fromBranchName = branches.find((b) => b.id === fromBranchId)?.name ?? 'Source Facility'
  const toBranchName = branches.find((b) => b.id === toBranchId)?.name ?? 'Target Facility'

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fadeIn"
      role="dialog"
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-scaleIn">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-linear-to-r from-amber-500/10 via-brand-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-700">
              <ArrowRightLeft size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Inter-Facility Stock Transfer</h2>
              <p className="text-xs text-muted">
                Maglipat ng stock sa pagitan ng Budiao Warehouse at Legazpi Branch
              </p>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-muted hover:bg-subtle hover:text-ink transition cursor-pointer"
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-900">
              <ShieldAlert size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Facility Selection: Origin -> Destination */}
          <div className="rounded-xl border border-border bg-subtle/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Direction of Transfer
              </span>
              <button
                type="button"
                onClick={handleSwapBranches}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800 transition cursor-pointer"
              >
                <ArrowRightLeft size={13} />
                Switch Direction
              </button>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-2.5">
                <span className="block text-[10px] font-bold uppercase text-amber-800">From (Source)</span>
                <span className="block text-xs font-bold text-slate-900 mt-0.5 truncate">{fromBranchName}</span>
              </div>

              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-slate-700">
                <ArrowRight size={14} />
              </span>

              <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-2.5">
                <span className="block text-[10px] font-bold uppercase text-emerald-800">To (Destination)</span>
                <span className="block text-xs font-bold text-slate-900 mt-0.5 truncate">{toBranchName}</span>
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase block" htmlFor="transfer-product-select">
              Product to Transfer
            </label>
            <select
              id="transfer-product-select"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-slate-900 outline-none focus:border-brand-600 shadow-2xs"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
            >
              {sourceBalances.map((sb) => (
                <option key={sb.id} value={sb.product?.id}>
                  {sb.product?.sku} — {sb.product?.name} (Available: {sb.availableQuantity} pcs)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Stock Availability Insight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase block" htmlFor="transfer-qty-input">
                Quantity to Transfer (pcs)
              </label>
              <div className="relative">
                <input
                  id="transfer-qty-input"
                  type="number"
                  min="1"
                  max={Math.max(1, availableQty)}
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-black text-slate-900 outline-none focus:border-brand-600 shadow-2xs"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-subtle/40 p-2.5 flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase text-muted">Available at Source</span>
              <p className="text-sm font-black text-emerald-800 mt-0.5">
                {availableQty} pcs available
              </p>
              <span className="text-[10px] text-muted">
                Natitira sa source pagkatapos ng lipat: <strong>{Math.max(0, availableQty - transferQty)} pcs</strong>
              </span>
            </div>
          </div>

          {/* Notes / Transfer Purpose */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase block" htmlFor="transfer-notes-input">
              Transfer Reason / Reference Memo
            </label>
            <input
              id="transfer-notes-input"
              type="text"
              placeholder="e.g. Replenishment of fast-moving filters for Legazpi POS"
              className="h-9 w-full rounded-xl border border-border bg-surface px-3 text-xs outline-none focus:border-brand-600 shadow-2xs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              disabled={isSubmitting || availableQty <= 0}
            >
              {isSubmitting ? (
                'Transferring...'
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  Confirm & Transfer Stock
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
