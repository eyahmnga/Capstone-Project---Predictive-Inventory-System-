import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, Check, ChevronDown } from 'lucide-react'

export type MonthlyDataPoint = {
  label: string
  value: number
}

export type HistoricalValueAreaChartProps = {
  data?: MonthlyDataPoint[]
  dailyData?: { date: string; totalAmount: string }[]
}

const TIMEFRAME_OPTIONS = ['Monthly', 'Weekly', 'Daily'] as const
type TimeframeOption = (typeof TIMEFRAME_OPTIONS)[number]

export function HistoricalValueAreaChart({
  data,
  dailyData = [],
}: HistoricalValueAreaChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('Monthly')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Dynamically compute dataset based on selected timeframe
  const activeData: MonthlyDataPoint[] = useMemo(() => {
    if (timeframe === 'Daily' && dailyData.length > 0) {
      return dailyData.slice(-14).map((d) => ({
        label: d.date.slice(5), // MM-DD
        value: Number(d.totalAmount) || 0,
      }))
    }

    if (timeframe === 'Weekly' && dailyData.length > 0) {
      const weeks: MonthlyDataPoint[] = []
      for (let i = 0; i < dailyData.length; i += 7) {
        const chunk = dailyData.slice(i, i + 7)
        const total = chunk.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0)
        weeks.push({
          label: `Wk ${weeks.length + 1}`,
          value: total,
        })
      }
      return weeks.slice(-6)
    }

    // Default Monthly
    if (data && data.length > 0) {
      return data
    }

    return []
  }, [data, dailyData, timeframe])

  const hasValidData = activeData.length > 0 && activeData.some((d) => d.value > 0)

  const width = 560
  const height = 230
  const padLeft = 60
  const padRight = 25
  const padTop = 25
  const padBottom = 35

  const rawMax = hasValidData ? Math.max(...activeData.map((d) => d.value), 0) : 100000
  const maxVal = rawMax > 0 ? Math.ceil((rawMax * 1.25) / 100000) * 100000 : 100000
  const minVal = 0
  const range = maxVal - minVal || 1

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(activeData.length - 1, 1)) * (width - padLeft - padRight)
  const getY = (val: number) =>
    height - padBottom - ((val - minVal) / range) * (height - padTop - padBottom)

  const points = activeData.map((d, i) => ({ x: getX(i), y: getY(d.value) }))

  const linePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`
    const prev = arr[i - 1]
    const cx1 = prev.x + (pt.x - prev.x) / 2
    const cy1 = prev.y
    const cx2 = prev.x + (pt.x - prev.x) / 2
    const cy2 = pt.y
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`
  }, '')

  const firstPt = points[0]
  const lastPt = points[points.length - 1]
  const areaPath = firstPt && lastPt ? `${linePath} L ${lastPt.x},${height - padBottom} L ${firstPt.x},${height - padBottom} Z` : ''

  const formatTick = (val: number) => {
    if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `₱${(val / 1000).toFixed(0)}K`
    return `₱${val}`
  }

  const yTicks = [
    { label: formatTick(maxVal), val: maxVal },
    { label: formatTick(maxVal * 0.75), val: maxVal * 0.75 },
    { label: formatTick(maxVal * 0.5), val: maxVal * 0.5 },
    { label: formatTick(maxVal * 0.25), val: maxVal * 0.25 },
    { label: '₱0', val: 0 },
  ]

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Inventory Value Over Time</h2>
          <p className="text-[11px] text-slate-400">Historical trend and valuation velocity</p>
        </div>

        {/* Interactive Timeframe Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            <span>{timeframe}</span>
            <ChevronDown aria-hidden="true" size={13} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div
              className="absolute right-0 z-20 mt-1.5 w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
              role="listbox"
            >
              {TIMEFRAME_OPTIONS.map((opt) => {
                const isSelected = timeframe === opt
                return (
                  <button
                    key={opt}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                      isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => {
                      setTimeframe(opt)
                      setIsDropdownOpen(false)
                    }}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check aria-hidden="true" size={13} className="text-blue-600" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Chart Body or Empty State */}
      {!hasValidData ? (
        <div className="flex h-52 flex-col items-center justify-center py-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <BarChart3 aria-hidden="true" size={22} />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-700">No Historical Data Recorded</p>
          <p className="mt-0.5 max-w-xs text-[11px] text-slate-400">
            No sales transactions or inventory valuations have been recorded for this branch yet.
          </p>
        </div>
      ) : (
        <div className="relative mt-3 w-full">
          <svg
            aria-label={`${timeframe} inventory value area chart`}
            className="w-full h-auto overflow-visible"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              <linearGradient id="invValueBlueGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {/* Grid lines and Y Labels */}
            {yTicks.map((tick) => {
              const y = getY(tick.val)
              return (
                <g key={tick.label}>
                  <line
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    x1={padLeft}
                    x2={width - padRight}
                    y1={y}
                    y2={y}
                  />
                  <text
                    className="text-[10px] font-medium fill-slate-500"
                    textAnchor="end"
                    x={padLeft - 8}
                    y={y + 3}
                  >
                    {tick.label}
                  </text>
                </g>
              )
            })}

            {/* Area Fill */}
            <path d={areaPath} fill="url(#invValueBlueGradient)" />

            {/* Solid Blue Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#2563eb"
              strokeLinecap="round"
              strokeWidth="2.5"
            />

            {/* Data Points */}
            {points.map((pt, i) => {
              const isHovered = hoverIndex === i
              const itemVal = activeData[i]?.value ?? 0
              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    fill="#1d4ed8"
                    r={isHovered ? 6 : 4.5}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 2}
                  />
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g>
                      <rect
                        x={pt.x - 50}
                        y={pt.y - 32}
                        width="100"
                        height="22"
                        rx="4"
                        fill="#1e293b"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 18}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-white"
                      >
                        {itemVal >= 1000000 ? `₱ ${(itemVal / 1000000).toFixed(2)}M` : itemVal >= 1000 ? `₱ ${(itemVal / 1000).toFixed(1)}K` : `₱ ${itemVal}`}
                      </text>
                    </g>
                  )}
                  {/* X Axis Labels */}
                  <text
                    className={`text-[11px] ${isHovered ? 'font-bold fill-blue-700' : 'font-medium fill-slate-600'}`}
                    textAnchor="middle"
                    x={pt.x}
                    y={height - 10}
                  >
                    {activeData[i]?.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      )}
    </div>
  )
}
