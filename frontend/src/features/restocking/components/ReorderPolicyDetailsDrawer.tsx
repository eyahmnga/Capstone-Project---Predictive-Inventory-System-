import { type FormEvent, useState } from 'react'
import { ArrowRight, Calculator, Info, RefreshCw, ShoppingCart, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEoqHistory } from '@/features/restocking/hooks/useRestocking'
import type { ReorderPolicy } from '@/features/restocking/types/restocking'
import { Button } from '@/shared/components/Button'
import { drawerOverlayClass, drawerPanelClass } from '@/shared/lib/modalClasses'
import { formatQuantity } from '@/shared/lib/formatters'
import { Portal } from '@/shared/components/Portal'

type ReorderPolicyDetailsDrawerProps = {
  policy: ReorderPolicy
  canCalculate: boolean
  canCalculateEoq: boolean
  isActing: boolean
  onClose: () => void
  onRecalculateRop: () => void
  onCalculateEoq: (annualDemandQuantity: string, orderingCost: string, annualHoldingCostPerUnit: string) => void
}

export function ReorderPolicyDetailsDrawer({
  policy,
  canCalculate,
  canCalculateEoq,
  isActing,
  onClose,
  onRecalculateRop,
  onCalculateEoq,
}: ReorderPolicyDetailsDrawerProps) {
  const eoqHistoryQuery = useEoqHistory(policy.id)
  const [annualDemand, setAnnualDemand] = useState('150')
  const [orderingCost, setOrderingCost] = useState('120')
  const [holdingCost, setHoldingCost] = useState('15')

  const submitEoq = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onCalculateEoq(annualDemand, orderingCost, holdingCost)
  }

  const latestEoq = eoqHistoryQuery.data && eoqHistoryQuery.data.length > 0 ? eoqHistoryQuery.data[0] : null

  return (
    <Portal>
      <div className={drawerOverlayClass} role="presentation" onMouseDown={onClose}>
        <aside
          aria-labelledby="rop-details-title"
          aria-modal="true"
          className={drawerPanelClass('sm:max-w-2xl')}
          role="dialog"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-6 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted">Policy #{policy.id}</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.2 text-[10px] font-bold">
                  {policy.isActive ? 'Active Policy' : 'Inactive'}
                </span>
              </div>
              <h2 id="rop-details-title" className="mt-1 text-xl font-bold tracking-tight text-ink">
                {policy.productName}
              </h2>
              <p className="font-mono text-xs text-muted mt-0.5">{policy.productSku}</p>
            </div>
            <Button aria-label="Close reorder policy details" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {/* Section 1: Reorder Point (ROP) - WHEN TO BUY */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-blue-950">
                      Reorder Point (ROP) &bull; When to Order
                    </h3>
                    <p className="text-[11px] text-blue-800">
                      ROP = (Daily Demand from SMA &times; Lead Time) + Safety Stock
                    </p>
                  </div>
                </div>
                {canCalculate ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isActing}
                    onClick={onRecalculateRop}
                    className="text-xs font-semibold"
                  >
                    <RefreshCw aria-hidden="true" size={14} className={isActing ? 'animate-spin' : ''} />
                    Recalculate ROP
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-100 bg-white p-3 rounded-lg">
                <div>
                  <p className="text-[11px] text-muted">Safety Stock</p>
                  <p className="font-bold text-ink font-mono text-xs">{formatQuantity(policy.safetyStockQuantity)} pcs</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">Lead Time</p>
                  <p className="font-bold text-ink font-mono text-xs">{policy.leadTimeDaysOverride ?? '—'} days</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-muted">Reorder Threshold</p>
                  <p className="font-extrabold text-blue-700 font-mono text-sm">
                    {policy.reorderPointQuantity ? `Order at ≤ ${formatQuantity(policy.reorderPointQuantity)} pcs` : 'Needs calculation'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Economic Order Quantity (EOQ) - HOW MUCH TO BUY */}
            {canCalculateEoq ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white font-bold text-xs">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Economic Order Quantity (EOQ) &bull; How Much to Order
                    </h3>
                    <p className="text-[11px] text-emerald-800">
                      Calculates the exact batch size that minimizes holding costs and delivery fees.
                    </p>
                  </div>
                </div>

                {/* Latest EOQ Highlight */}
                {latestEoq && latestEoq.recommendedOrderQuantity ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-white p-3.5 shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        ⭐ Recommended Order Quantity (EOQ):
                      </span>
                      <p className="text-xl font-extrabold text-emerald-700 font-mono">
                        {formatQuantity(latestEoq.recommendedOrderQuantity)} units / order
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Calculated at: {latestEoq.calculatedAt ? new Date(latestEoq.calculatedAt).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>

                    <Link
                      to="/purchase-orders"
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
                    >
                      <ShoppingCart size={14} />
                      Create PO for {formatQuantity(latestEoq.recommendedOrderQuantity)} pcs
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                ) : null}

                {/* EOQ Input Form */}
                <form className="space-y-3 rounded-lg border border-border bg-white p-3.5" onSubmit={submitEoq}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">EOQ Parameter Inputs</h4>
                    <span className="text-[10px] text-slate-400">Formula: &radic;(2DS / H)</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="text-xs font-semibold text-slate-700">
                      Annual Demand (D)
                      <span className="block text-[10px] font-normal text-slate-400">Total units/year</span>
                      <input
                        className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2.5 text-xs font-mono outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/30"
                        min="0"
                        required
                        step="1"
                        type="number"
                        value={annualDemand}
                        onChange={(event) => setAnnualDemand(event.target.value)}
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-700">
                      Ordering Cost (S)
                      <span className="block text-[10px] font-normal text-slate-400">Cost per delivery (PHP)</span>
                      <input
                        className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2.5 text-xs font-mono outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/30"
                        min="0"
                        required
                        step="0.01"
                        type="number"
                        value={orderingCost}
                        onChange={(event) => setOrderingCost(event.target.value)}
                      />
                    </label>

                    <label className="text-xs font-semibold text-slate-700">
                      Holding Cost / Unit (H)
                      <span className="block text-[10px] font-normal text-slate-400">Storage cost/yr (PHP)</span>
                      <input
                        className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2.5 text-xs font-mono outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/30"
                        min="0.01"
                        required
                        step="0.01"
                        type="number"
                        value={holdingCost}
                        onChange={(event) => setHoldingCost(event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button disabled={isActing} size="sm" type="submit" className="text-xs font-bold">
                      <Calculator size={14} />
                      Calculate Optimal EOQ
                    </Button>
                  </div>
                </form>

                {/* Calculation History */}
                {eoqHistoryQuery.data && eoqHistoryQuery.data.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Previous EOQ Runs</p>
                    <ul className="space-y-1.5 text-xs">
                      {eoqHistoryQuery.data.slice(0, 3).map((calc) => (
                        <li key={calc.id} className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2">
                          <span className="text-muted text-[11px]">
                            {calc.calculatedAt ? new Date(calc.calculatedAt).toLocaleString() : '—'}
                          </span>
                          <span className="font-bold text-emerald-700 font-mono">
                            {calc.recommendedOrderQuantity ? `${formatQuantity(calc.recommendedOrderQuantity)} units` : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </Portal>
  )
}
