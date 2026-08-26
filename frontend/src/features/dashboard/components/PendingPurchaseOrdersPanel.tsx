import { ClipboardList, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PendingPurchaseOrderItem } from '@/features/dashboard/types/dashboard'
import { formatCurrency } from '@/shared/lib/formatters'

type PendingPurchaseOrdersPanelProps = {
  count: number
  items: PendingPurchaseOrderItem[]
  onSelectPo?: (id: string) => void
}

const statusBadgeClasses: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ordered: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function PendingPurchaseOrdersPanel({ count, items, onSelectPo }: PendingPurchaseOrdersPanelProps) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-ink">Pending Procurement</h2>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-bold text-blue-700">
              {count} Active
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {count} purchase order{count === 1 ? '' : 's'} currently in draft, submitted, or awaiting delivery.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800 transition"
          to="/purchase-orders"
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-muted">
          No pending purchase orders. All procurement orders are completed or none created yet.
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-slate-100">
          {items.map((po) => (
            <li
              key={po.id}
              onClick={() => onSelectPo?.(po.id)}
              className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition rounded-lg ${
                onSelectPo ? 'cursor-pointer hover:bg-slate-50/80 px-2 -mx-2' : ''
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <ClipboardList aria-hidden="true" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold font-mono text-ink">{po.poNumber}</p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-bold capitalize ${
                      statusBadgeClasses[po.status] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {po.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted font-medium">{po.supplierName}</p>
              </div>
              <p className="shrink-0 text-xs font-bold font-mono tabular-nums text-slate-800">
                {formatCurrency(po.totalAmount)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
