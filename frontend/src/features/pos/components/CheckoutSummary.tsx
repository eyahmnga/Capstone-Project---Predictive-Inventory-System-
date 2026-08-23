import type { CartTotals } from '@/features/pos/lib/cartTotals'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/lib/formatters'

type CheckoutSummaryProps = {
  totals: CartTotals
  paymentsTotal: number
  isTaxIncluded: boolean
  onToggleTax: (included: boolean) => void
  isValid: boolean
  isSubmitting: boolean
  disabledReason: string | null
  onFinalize: () => void
}

export function CheckoutSummary({
  totals,
  paymentsTotal,
  isTaxIncluded,
  onToggleTax,
  isValid,
  isSubmitting,
  disabledReason,
  onFinalize,
}: CheckoutSummaryProps) {
  const changeDue = Math.max(0, paymentsTotal - totals.total)
  const isUnderpaid = totals.total > 0 && paymentsTotal < totals.total - 0.01
  const isFullyPaid = totals.total > 0 && paymentsTotal >= totals.total - 0.01

  return (
    <div aria-label="Checkout summary" className="space-y-2.5 pt-2 border-t border-border/80">
      {/* Subtotal, Discount & Tax */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="tabular-nums font-semibold text-slate-700">
            ₱ {totals.subtotal.toFixed(2)}
          </span>
        </div>

        {totals.discount > 0 && (
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Discounts</span>
            <span className="tabular-nums">-₱ {totals.discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-muted">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              checked={isTaxIncluded}
              className="h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-600/20 cursor-pointer"
              type="checkbox"
              onChange={(e) => onToggleTax(e.target.checked)}
            />
            <span className="text-[11px]">12% VAT Included</span>
          </label>
          <span className="tabular-nums text-slate-700 font-semibold">₱ {totals.tax.toFixed(2)}</span>
        </div>
      </div>

      {/* Total Due Row */}
      <div className="flex items-baseline justify-between pt-1 border-t border-border/60">
        <span className="text-sm font-extrabold text-slate-900">Total Sale Due</span>
        <span className="text-xl font-black tabular-nums text-brand-900">
          {formatCurrency(totals.total)}
        </span>
      </div>

      {/* Change Due / Underpaid notification row */}
      {isFullyPaid && changeDue > 0 ? (
        <div className="flex justify-between items-center rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-emerald-950 font-bold">
          <span className="text-xs uppercase tracking-wide">Change Due:</span>
          <span className="tabular-nums text-base font-black text-emerald-700">
            {formatCurrency(changeDue)}
          </span>
        </div>
      ) : isUnderpaid ? (
        <div className="flex justify-between items-center rounded-xl bg-amber-50 border border-amber-300 px-3 py-1.5 text-amber-950 font-semibold text-xs">
          <span>Remaining Balance:</span>
          <span className="tabular-nums font-bold text-amber-800">
            {formatCurrency(totals.total - paymentsTotal)}
          </span>
        </div>
      ) : null}

      {disabledReason ? (
        <p className="text-[11px] text-danger-text font-medium">{disabledReason}</p>
      ) : null}

      {/* Finalize Button */}
      <Button
        className="w-full justify-center text-sm font-extrabold h-11 bg-brand-600 hover:bg-brand-700 shadow-md active:scale-[0.99] transition-all cursor-pointer"
        disabled={!isValid || isSubmitting}
        type="button"
        onClick={onFinalize}
      >
        {isSubmitting
          ? 'Finalizing Transaction…'
          : isFullyPaid && changeDue > 0
            ? `Finalize Sale (Change: ${formatCurrency(changeDue)})`
            : `Finalize Sale (${formatCurrency(totals.total)})`}
      </Button>
    </div>
  )
}
