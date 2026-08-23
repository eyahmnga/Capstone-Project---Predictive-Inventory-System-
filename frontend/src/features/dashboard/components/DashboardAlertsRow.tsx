import { Link } from 'react-router-dom'
import { Check, CheckCircle2, FileText, FileWarning, TrendingUp } from 'lucide-react'

export type BottomAlertItem = {
  id: string
  type: 'out_of_stock' | 'low_stock' | 'forecast' | 'order'
  title: string
  timestamp: string
  link?: string
}

type DashboardAlertsRowProps = {
  alerts?: BottomAlertItem[]
}

export function DashboardAlertsRow({
  alerts = [],
}: DashboardAlertsRowProps) {
  const renderIcon = (type: BottomAlertItem['type']) => {
    switch (type) {
      case 'out_of_stock':
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
            <FileWarning aria-hidden="true" size={20} strokeWidth={2.2} />
          </div>
        )
      case 'low_stock':
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <FileText aria-hidden="true" size={20} strokeWidth={2.2} />
          </div>
        )
      case 'forecast':
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <TrendingUp aria-hidden="true" size={20} strokeWidth={2.4} />
          </div>
        )
      case 'order':
        return (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check aria-hidden="true" size={20} strokeWidth={2.6} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      {/* Header without dividing border to match screenshot */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Recent Alerts</h2>
        <Link
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          to="/restocking"
        >
          View All Alerts
        </Link>
      </div>

      {/* 4 Equally Spaced Columns or Clean Empty State */}
      {alerts.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 aria-hidden="true" size={18} />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-700">No Active System Alerts</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            All inventory levels, procurement orders, and system operations are running normally.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 items-start">
          {alerts.map((item) => {
            const content = (
              <div key={item.id} className="flex items-start gap-3.5 min-w-0">
                {renderIcon(item.type)}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 leading-snug break-words">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    {item.timestamp}
                  </p>
                </div>
              </div>
            )

            if (item.link) {
              return (
                <Link
                  key={item.id}
                  to={item.link}
                  className="group block rounded-lg transition hover:bg-slate-50/80 -m-2 p-2"
                >
                  {content}
                </Link>
              )
            }

            return content
          })}
        </div>
      )}
    </div>
  )
}
