import { useState } from 'react'
import { AlertCircle, Clock, Minus, Pencil, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { computeLineTotals, lineRequiresOverrideReason } from '@/features/pos/lib/cartTotals'
import type { CartLine } from '@/features/pos/types/pos'
import { Button } from '@/shared/components/Button'
import { formatCurrency, formatQuantity } from '@/shared/lib/formatters'

type CartTableProps = {
  lines: CartLine[]
  canOverridePrice: boolean
  canOverrideDiscount: boolean
  isTaxIncluded?: boolean
  onQuantityChange: (productId: string, quantity: number) => void
  onPriceChange: (productId: string, price: string | null) => void
  onDiscountChange: (productId: string, discountAmount: string) => void
  onReasonChange: (productId: string, reason: string) => void
  onRemove: (productId: string) => void
  onClear?: () => void
  onHold?: () => void
}

export function CartTable({
  lines,
  canOverridePrice,
  canOverrideDiscount,
  isTaxIncluded = true,
  onQuantityChange,
  onPriceChange,
  onDiscountChange,
  onReasonChange,
  onRemove,
  onClear,
  onHold,
}: CartTableProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [expandedOverrides, setExpandedOverrides] = useState<Record<string, boolean>>({})

  const toggleOverride = (productId: string) => {
    setExpandedOverrides((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  const distinctLinesCount = lines.length
  const totalPcsCount = lines.reduce((sum, line) => sum + (line.quantity || 0), 0)

  if (lines.length === 0) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center p-6 text-center text-muted">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle text-muted mb-2.5">
          <ShoppingCart size={22} />
        </div>
        <p className="font-bold text-slate-800 text-sm">Active cart is empty</p>
        <p className="text-xs text-muted mt-1 max-w-[200px]">
          Tap products from the catalog or scan a barcode to begin.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cart Summary Bar with Item Counts, Hold Order, & Clear Cart */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-2.5 bg-subtle/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="text-brand-600" size={16} />
          <h2 className="text-xs sm:text-sm font-bold text-slate-800">Current Cart</h2>
          <span className="inline-flex items-center rounded-full bg-brand-50 border border-brand-200/70 px-2 py-0.2 text-[11px] font-bold text-brand-700">
            {distinctLinesCount} {distinctLinesCount === 1 ? 'item' : 'items'} ({totalPcsCount} pcs)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onHold && (
            <button
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 transition cursor-pointer border border-amber-200/60"
              title="Park / Hold this order to serve another customer"
              type="button"
              onClick={onHold}
            >
              <Clock size={12} />
              Hold
            </button>
          )}

          {onClear && (
            <div>
              {showClearConfirm ? (
                <div className="flex items-center gap-1 animate-fadeIn">
                  <span className="text-xs text-rose-600 font-semibold">Clear?</span>
                  <button
                    className="rounded-md bg-rose-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer"
                    type="button"
                    onClick={() => {
                      onClear()
                      setShowClearConfirm(false)
                    }}
                  >
                    Yes
                  </button>
                  <button
                    className="rounded-md bg-subtle px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-border transition cursor-pointer"
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
                  title="Discard all items in cart"
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unified Elegant POS Line Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60 p-3 space-y-2">
        {lines.map((line) => {
          const totals = computeLineTotals(line, isTaxIncluded)
          const overQty =
            line.availableQuantity !== null && line.quantity > Number(line.availableQuantity)
          const needsReason = lineRequiresOverrideReason(line)
          const isOverridden =
            Boolean(line.overriddenUnitPrice) || Number(line.discountAmount) > 0
          const showOverrideForm = expandedOverrides[line.productId] || needsReason

          return (
            <div
              key={line.productId}
              className="rounded-xl border border-border/80 bg-surface p-3 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
            >
              {/* Product Header Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                    {line.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[11px] text-muted">{line.sku}</span>
                    <span className="text-xs text-slate-500">
                      @ {formatCurrency(Number(line.overriddenUnitPrice ?? line.catalogUnitPrice) || 0)}
                    </span>
                  </div>
                </div>

                {/* Line Total */}
                <div className="text-right shrink-0">
                  <span className="font-black text-sm text-brand-900 tabular-nums">
                    {formatCurrency(totals.totalAmount)}
                  </span>
                  {Number(line.discountAmount) > 0 && (
                    <span className="block text-[10px] text-emerald-700 font-semibold">
                      (-{formatCurrency(Number(line.discountAmount))})
                    </span>
                  )}
                </div>
              </div>

              {/* Over stock warning */}
              {overQty && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-danger-text bg-danger/10 px-2 py-0.5 rounded-md">
                  <AlertCircle size={13} />
                  <span>Exceeds stock ({formatQuantity(line.availableQuantity)} avail)</span>
                </div>
              )}

              {/* Action Controls Row (Stepper + Override Toggle + Remove) */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                {/* Quantity Stepper */}
                <div className="flex items-center rounded-lg border border-border bg-surface overflow-hidden shadow-2xs">
                  <button
                    aria-label="Decrease quantity"
                    className="flex h-7 w-7 items-center justify-center bg-subtle/70 text-slate-700 hover:bg-border active:scale-95 transition cursor-pointer"
                    disabled={line.quantity <= 1}
                    type="button"
                    onClick={() => onQuantityChange(line.productId, Math.max(1, line.quantity - 1))}
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    aria-label={`Quantity for ${line.name}`}
                    className="h-7 w-10 text-center text-xs font-bold outline-none"
                    min="1"
                    step="1"
                    type="number"
                    value={line.quantity}
                    onChange={(event) =>
                      onQuantityChange(line.productId, Math.max(1, Number(event.target.value) || 1))
                    }
                  />
                  <button
                    aria-label="Increase quantity"
                    className="flex h-7 w-7 items-center justify-center bg-subtle/70 text-slate-700 hover:bg-border active:scale-95 transition cursor-pointer"
                    type="button"
                    onClick={() => onQuantityChange(line.productId, line.quantity + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {/* Override Discount / Price Button */}
                  {(canOverridePrice || canOverrideDiscount) && (
                    <button
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                        isOverridden
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'text-muted hover:bg-subtle hover:text-ink'
                      }`}
                      title="Adjust discount or unit price"
                      type="button"
                      onClick={() => toggleOverride(line.productId)}
                    >
                      <Pencil size={11} />
                      {isOverridden ? 'Modified' : 'Discount / Price'}
                    </button>
                  )}

                  {/* Remove Button */}
                  <Button
                    aria-label={`Remove ${line.name}`}
                    className="h-7 w-7 text-muted hover:text-danger-text"
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemove(line.productId)}
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </Button>
                </div>
              </div>

              {/* Expandable Override Inputs (Price / Discount / Reason) */}
              {showOverrideForm && (
                <div className="p-2.5 rounded-lg bg-subtle/40 border border-border/80 space-y-2 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    {canOverridePrice && (
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase block">
                          Custom Price
                        </label>
                        <input
                          className="mt-0.5 h-7.5 w-full rounded-md border border-border bg-surface px-2 text-xs font-semibold outline-none focus:border-brand-600"
                          placeholder={line.catalogUnitPrice}
                          step="0.01"
                          type="number"
                          value={line.overriddenUnitPrice ?? ''}
                          onChange={(e) =>
                            onPriceChange(line.productId, e.target.value === '' ? null : e.target.value)
                          }
                        />
                      </div>
                    )}

                    {canOverrideDiscount && (
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase block">
                          Discount (₱)
                        </label>
                        <input
                          className="mt-0.5 h-7.5 w-full rounded-md border border-border bg-surface px-2 text-xs font-semibold outline-none focus:border-brand-600"
                          min="0"
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={line.discountAmount}
                          onChange={(e) => onDiscountChange(line.productId, e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {needsReason && (
                    <div>
                      <label className="text-[10px] font-bold text-amber-800 uppercase block">
                        Reason for Override (Required)
                      </label>
                      <input
                        className="mt-0.5 h-7.5 w-full rounded-md border border-warning/40 bg-warning/10 px-2 text-xs outline-none focus:border-brand-600"
                        placeholder="e.g. Bulk discount, damaged box"
                        value={line.overrideReason}
                        onChange={(e) => onReasonChange(line.productId, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
