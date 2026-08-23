import { useState } from 'react'
import { ArrowRight, Calculator, Info, PencilLine, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ColdStartBadge } from '@/features/forecasting/components/ColdStartBadge'
import { ManualPlanDialog } from '@/features/forecasting/components/ManualPlanDialog'
import type { ForecastRun, ForecastRunItem } from '@/features/forecasting/types/forecast'
import { Button } from '@/shared/components/Button'
import { drawerOverlayClass, drawerPanelClass } from '@/shared/lib/modalClasses'
import { formatQuantity } from '@/shared/lib/formatters'
import { Portal } from '@/shared/components/Portal'

type ForecastRunDetailsDrawerProps = {
  run: ForecastRun
  canOverride: boolean
  isSaving: boolean
  onClose: () => void
  onManualPlan: (item: ForecastRunItem, manualQuantity: string, reason: string, expiresAt: string) => void
}

export function ForecastRunDetailsDrawer({ run, canOverride, isSaving, onClose, onManualPlan }: ForecastRunDetailsDrawerProps) {
  const [overrideItem, setOverrideItem] = useState<ForecastRunItem | null>(null)

  return (
    <Portal>
      <div className={drawerOverlayClass} role="presentation" onMouseDown={onClose}>
        <aside
          aria-labelledby="forecast-run-details-title"
          aria-modal="true"
          className={drawerPanelClass('sm:max-w-4xl')}
          role="dialog"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-6 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                  SMA Model #{run.id}
                </span>
                <span className="text-xs text-muted">Version: {run.modelVersion}</span>
              </div>
              <h2 id="forecast-run-details-title" className="mt-1 text-xl font-bold tracking-tight text-ink capitalize">
                {run.periodGrain} Simple Moving Average ({run.windowPeriods} Periods)
              </h2>
              <p className="mt-1 text-xs text-muted">
                Analyzed History: {run.historyStartDate} – {run.historyEndDate} &bull; Data Cutoff: {run.dataCutoffAt ? new Date(run.dataCutoffAt).toLocaleString() : '—'}
              </p>
            </div>
            <Button aria-label="Close forecast run details" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {/* Explanatory Pipeline Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs text-blue-900">
              <div className="flex items-start gap-2.5">
                <Info className="text-blue-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-semibold text-blue-950">
                    How this Forecast connects to your Reorder Planning:
                  </p>
                  <p className="text-blue-800 text-[11px] mt-0.5">
                    1. <strong>Daily SMA Demand</strong> &times; <strong>Lead Time</strong> = <strong>Reorder Point (ROP)</strong> <em>(Tells you WHEN to order)</em>
                    <br />
                    2. <strong>Annual Demand</strong> in the EOQ formula = <strong>Recommended Order Quantity (EOQ)</strong> <em>(Tells you HOW MUCH to order)</em>
                  </p>
                </div>
              </div>
              <Link
                to="/restocking"
                onClick={onClose}
                className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <Calculator size={13} />
                Open Reorder Planning (EOQ)
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Mobile View */}
            <div className="space-y-2 sm:hidden">
              {run.items.map((item) => {
                const forecastVal = Number(item.coldStartStatus === 'manual_override' ? item.manualQuantity : item.forecastQuantity) || 0
                const estMonthly = Math.round(forecastVal * 30)

                return (
                  <div className="rounded-xl border border-border p-3 text-sm bg-white shadow-2xs" key={item.productId}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{item.productName}</p>
                        <p className="text-xs text-muted font-mono">{item.productSku}</p>
                      </div>
                      {canOverride ? (
                        <Button aria-label={`Manual plan for ${item.productName}`} size="icon" variant="ghost" onClick={() => setOverrideItem(item)}>
                          <PencilLine aria-hidden="true" size={16} />
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <ColdStartBadge status={item.coldStartStatus} />
                      <dl className="flex gap-3 text-xs">
                        <div>
                          <dt className="text-muted">Total Sold</dt>
                          <dd className="tabular-nums font-mono text-ink">{formatQuantity(item.demandTotal)} pcs</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Daily Rate</dt>
                          <dd className="tabular-nums font-mono font-bold text-emerald-700">{formatQuantity(forecastVal)}/day</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Est. Monthly</dt>
                          <dd className="tabular-nums font-mono font-bold text-blue-700">~{estMonthly}/mo</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block shadow-2xs">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-subtle text-left text-xs font-semibold text-muted border-b border-border">
                  <tr>
                    <th className="px-3.5 py-2.5">Product</th>
                    <th className="px-3 py-2.5 text-right">Historical Sold (14d)</th>
                    <th className="px-3 py-2.5 text-right">Daily Demand (SMA)</th>
                    <th className="px-3 py-2.5 text-right">Est. 30-Day Demand</th>
                    <th className="px-3 py-2.5">Reliability Status</th>
                    <th className="px-3 py-2.5 text-right">Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {run.items.map((item) => {
                    const forecastVal = Number(item.coldStartStatus === 'manual_override' ? item.manualQuantity : item.forecastQuantity) || 0
                    const estMonthly = Math.round(forecastVal * 30)

                    return (
                      <tr key={item.productId} className="hover:bg-slate-50/70 transition">
                        <td className="px-3.5 py-2.5">
                          <p className="font-semibold text-ink">{item.productName}</p>
                          <p className="font-mono text-xs text-muted">{item.productSku}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-mono text-slate-700">
                          {formatQuantity(item.demandTotal)} pcs
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold font-mono text-emerald-700">
                          {item.coldStartStatus === 'manual_override' ? `${formatQuantity(item.manualQuantity)} (manual)` : `${formatQuantity(item.forecastQuantity)}/day`}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold font-mono text-blue-700">
                          {forecastVal > 0 ? `~${estMonthly} pcs/mo` : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <ColdStartBadge status={item.coldStartStatus} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {canOverride ? (
                            <Button aria-label={`Manual plan for ${item.productName}`} size="icon" variant="ghost" onClick={() => setOverrideItem(item)}>
                              <PencilLine aria-hidden="true" size={16} />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </aside>

        {overrideItem ? (
          <ManualPlanDialog
            isSaving={isSaving}
            item={overrideItem}
            onClose={() => setOverrideItem(null)}
            onSave={(quantity, reason, expiresAt) => {
              onManualPlan(overrideItem, quantity, reason, expiresAt)
              setOverrideItem(null)
            }}
          />
        ) : null}
      </div>
    </Portal>
  )
}
