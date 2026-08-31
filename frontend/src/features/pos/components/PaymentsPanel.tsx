import { Banknote, Coins, Plus, Trash2 } from 'lucide-react'
import { PAYMENT_METHODS } from '@/features/sales/types/sale'
import type { CartPayment } from '@/features/pos/types/pos'
import type { PaymentMethod } from '@/features/sales/types/sale'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/lib/formatters'

type PaymentsPanelProps = {
  payments: CartPayment[]
  totalDue: number
  onAdd: (initial?: Partial<Omit<CartPayment, 'localId'>>) => void
  onUpdate: (localId: string, patch: Partial<Omit<CartPayment, 'localId'>>) => void
  onRemove: (localId: string) => void
  onSetQuickCash?: (amount: string, method?: PaymentMethod) => void
}

const PREDEFINED_AMOUNTS = [10, 20, 50, 100, 200, 300, 400, 500, 1000] as const

export function PaymentsPanel({
  payments,
  totalDue,
  onAdd,
  onUpdate,
  onRemove,
  onSetQuickCash,
}: PaymentsPanelProps) {
  // Handle clicking a predefined denomination button with 1 single click
  const handlePredefinedAmountClick = (amount: number) => {
    const amountStr = amount.toFixed(2)
    if (onSetQuickCash) {
      onSetQuickCash(amountStr, 'cash')
      return
    }
    const firstPayment = payments[0]
    if (firstPayment) {
      onUpdate(firstPayment.localId, {
        amount: amountStr,
        paymentMethod: firstPayment.paymentMethod || 'cash',
      })
    } else {
      onAdd({ amount: amountStr, paymentMethod: 'cash' })
    }
  }

  // Handle clicking Exact button with 1 single click
  const handleExactAmountClick = () => {
    if (totalDue <= 0) return
    const exactStr = totalDue.toFixed(2)
    if (onSetQuickCash) {
      onSetQuickCash(exactStr, 'cash')
      return
    }
    const firstPayment = payments[0]
    if (firstPayment) {
      onUpdate(firstPayment.localId, {
        amount: exactStr,
        paymentMethod: firstPayment.paymentMethod || 'cash',
      })
    } else {
      onAdd({ amount: exactStr, paymentMethod: 'cash' })
    }
  }

  return (
    <div aria-label="Payments & Tender" className="space-y-2">
      {/* Quick Cash Tender Grid */}
      <div className="rounded-xl border border-border/80 bg-subtle/30 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
            <Banknote size={12} className="text-brand-600" />
            Quick Cash Tender
          </span>
          <button
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800 transition cursor-pointer"
            disabled={totalDue <= 0}
            type="button"
            onClick={handleExactAmountClick}
          >
            <Coins size={12} />
            Exact ({formatCurrency(totalDue)})
          </button>
        </div>

        {/* Denominations Grid: 10, 20, 50, 100, 200, 300, 400, 500, 1000 */}
        <div className="grid grid-cols-5 gap-1">
          {PREDEFINED_AMOUNTS.map((val) => {
            const isSelected =
              payments.length === 1 && Math.abs(Number(payments[0].amount) - val) < 0.01

            return (
              <button
                key={val}
                className={`rounded-lg border py-1 text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'border-brand-600 bg-brand-600 text-white shadow-xs'
                    : 'border-border/80 bg-surface text-slate-800 hover:border-brand-500 hover:bg-brand-50/50 hover:text-brand-700 shadow-2xs'
                }`}
                type="button"
                onClick={() => handlePredefinedAmountClick(val)}
              >
                ₱{val}
              </button>
            )
          })}
          <button
            className={`rounded-lg border py-1 text-[11px] font-bold transition active:scale-95 shadow-2xs cursor-pointer ${
              payments.length === 1 && totalDue > 0 && Math.abs(Number(payments[0].amount) - totalDue) < 0.01
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
            disabled={totalDue <= 0}
            title="Set exact total due"
            type="button"
            onClick={handleExactAmountClick}
          >
            Exact
          </button>
        </div>
      </div>

      {/* Payment Rows & Split Payments */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Tender Method
          </span>
          <button
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800 transition cursor-pointer"
            type="button"
            onClick={() => onAdd()}
          >
            <Plus size={12} />
            Split payment
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-2.5 text-center">
            <p className="text-[11px] text-muted">
              Tap a quick cash button above or enter amount to record payment.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {payments.map((payment, index) => (
              <div
                key={payment.localId}
                className="flex items-center gap-2 rounded-lg border border-border/90 bg-surface p-1.5 shadow-2xs"
              >
                {/* Payment Method Selector */}
                <select
                  aria-label={`Payment method ${index + 1}`}
                  className="h-8 flex-1 rounded-md border border-border bg-subtle/30 px-2 text-xs font-semibold text-ink outline-none focus:border-brand-600"
                  value={payment.paymentMethod}
                  onChange={(event) =>
                    onUpdate(payment.localId, {
                      paymentMethod: event.target.value as CartPayment['paymentMethod'],
                    })
                  }
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>

                {/* Amount Input */}
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                    ₱
                  </span>
                  <input
                    aria-label={`Payment amount ${index + 1}`}
                    className="h-8 w-24 rounded-md border border-border bg-surface pl-5 pr-1.5 text-right text-xs font-bold text-ink outline-none focus:border-brand-600"
                    inputMode="decimal"
                    placeholder="0.00"
                    type="text"
                    value={payment.amount}
                    onChange={(event) => onUpdate(payment.localId, { amount: event.target.value.replace(/[^0-9.,]/g, '') })}
                  />
                </div>

                {/* Remove Split Button */}
                {payments.length > 1 && (
                  <Button
                    aria-label="Remove payment split"
                    className="h-8 w-8 text-muted hover:text-danger-text"
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemove(payment.localId)}
                  >
                    <Trash2 aria-hidden="true" size={13} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
