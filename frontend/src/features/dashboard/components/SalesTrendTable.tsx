import type { SalesTrendPoint } from '@/features/dashboard/types/dashboard'
import { formatQuantity } from '@/shared/lib/formatters'

/**
 * A plain accessible table rather than a chart. CLAUDE.md section 30
 * requires every visualization to have an accessible tabular
 * equivalent — since no visual chart is built yet, the table itself is
 * the primary (and only) representation, so it can never fall out of
 * sync with a chart it would otherwise duplicate.
 */
export function SalesTrendTable({ points }: { points: SalesTrendPoint[] }) {
  const activePoints = points.filter((point) => point.saleCount > 0 || Number(point.totalAmount) > 0)
  const nonZeroDays = activePoints.length

  return (
    <section className="rounded-card border border-border bg-surface p-8 shadow-panel">
      <div>
        <h2 className="text-lg font-semibold text-ink">Sales trend</h2>
        <p className="mt-1 text-sm text-muted">{nonZeroDays} day{nonZeroDays === 1 ? '' : 's'} with completed sales in range.</p>
      </div>
      {nonZeroDays === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center py-8 text-center border-t border-border pt-6">
          <p className="text-xs font-semibold text-slate-700">No completed sales recorded</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Sales transactions will appear here by date once orders are finalized at the POS.
          </p>
        </div>
      ) : (
        <div className="mt-4 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs font-semibold text-muted">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3 text-right">Sales</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activePoints.map((point) => (
                <tr key={point.date}>
                  <td className="py-2 pr-3 tabular-nums text-ink">{point.date}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted">{point.saleCount}</td>
                  <td className="py-2 text-right font-medium tabular-nums text-ink">{formatQuantity(point.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
