export type StatusBreakdownItem = {
  label: string
  count: number
  percent: number
  color: string
}

type InventoryStatusDonutCardProps = {
  totalItems?: number
  items?: StatusBreakdownItem[]
}

const defaultStatusItems: StatusBreakdownItem[] = [
  { label: 'in Stock', count: 0, percent: 0, color: '#22c55e' },
  { label: 'Low Stock', count: 0, percent: 0, color: '#eab308' },
  { label: 'Overstock', count: 0, percent: 0, color: '#3b82f6' },
  { label: 'Out of stock', count: 0, percent: 0, color: '#ef4444' },
  { label: 'Others', count: 0, percent: 0, color: '#94a3b8' },
]

export function InventoryStatusDonutCard({
  totalItems = 0,
  items = defaultStatusItems,
}: InventoryStatusDonutCardProps) {
  const radius = 62
  const strokeWidth = 20
  const circumference = 2 * Math.PI * radius
  let accumulatedOffset = 0

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-800">Inventory Status Overview</h2>
      </div>

      {/* Main Body: Donut Chart on Left, Legend on Right */}
      <div className="my-auto flex flex-col items-center justify-between gap-4 py-3 sm:flex-row sm:gap-2">
        {/* SVG Donut Chart */}
        <div className="relative flex h-44 w-44 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
            {/* Background Ring */}
            <circle
              cx="80"
              cy="80"
              fill="transparent"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {/* Colored Segments */}
            {items.map((item) => {
              const dashLength = (item.percent / 100) * circumference
              const strokeDasharray = `${dashLength} ${circumference}`
              const strokeDashoffset = -accumulatedOffset
              accumulatedOffset += dashLength

              return (
                <circle
                  key={item.label}
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r={radius}
                  stroke={item.color}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeWidth={strokeWidth}
                />
              )
            })}
          </svg>

          {/* Centered Total Items Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">
              {totalItems}
            </span>
            <span className="mt-1 text-[11px] font-semibold text-slate-500">
              Total Items
            </span>
          </div>
        </div>

        {/* Legend on Right */}
        <div className="flex w-full flex-col justify-center gap-2 text-xs sm:w-auto">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-slate-700">{item.label}</span>
              </div>
              <span className="font-medium text-slate-600 tabular-nums">
                {item.count} ({item.percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
