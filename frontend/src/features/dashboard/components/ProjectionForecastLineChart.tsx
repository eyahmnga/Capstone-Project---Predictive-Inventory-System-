import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, TrendingUp } from 'lucide-react'

export type ForecastDataPoint = {
  label: string
  forecast: number
  upper: number
  lower: number
}

export type ProjectionForecastLineChartProps = {
  data?: ForecastDataPoint[]
}

const FORECAST_PERIOD_OPTIONS = ['3 Months', '6 Months', '12 Months'] as const
type ForecastPeriodOption = (typeof FORECAST_PERIOD_OPTIONS)[number]

export function ProjectionForecastLineChart({
  data,
}: ProjectionForecastLineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [timeframe, setTimeframe] = useState<ForecastPeriodOption>('6 Months')
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

  // Slices or scales forecast data according to selected timeframe
  const activeData: ForecastDataPoint[] = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }
    const count = timeframe === '3 Months' ? 3 : timeframe === '6 Months' ? 6 : 12
    return data.slice(0, count)
  }, [data, timeframe])

  const hasValidData = activeData.length > 0 && activeData.some((d) => d.forecast > 0 || d.upper > 0)

  const width = 560
  const height = 230
  const padLeft = 45
  const padRight = 25
  const padTop = 25
  const padBottom = 35

  const rawMax = hasValidData ? Math.max(...activeData.map((d) => d.upper), 0) : 100
  const maxVal = rawMax > 0 ? Math.ceil((rawMax * 1.2) / 50) * 50 : 200
  const minVal = 0
  const range = maxVal - minVal || 1

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(activeData.length - 1, 1)) * (width - padLeft - padRight)
  const getY = (val: number) =>
    height - padBottom - ((val - minVal) / range) * (height - padTop - padBottom)

  // Confidence band paths
  const upperPts = activeData.map((d, i) => ({ x: getX(i), y: getY(d.upper) }))
  const lowerPts = activeData.map((d, i) => ({ x: getX(i), y: getY(d.lower) }))
  const forecastPts = activeData.map((d, i) => ({ x: getX(i), y: getY(d.forecast) }))

  const createSmoothPath = (pts: { x: number; y: number }[]) =>
    pts.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.y}`
      const prev = arr[i - 1]
      const cx1 = prev.x + (pt.x - prev.x) / 2
      const cy1 = prev.y
      const cx2 = prev.x + (pt.x - prev.x) / 2
      const cy2 = pt.y
      return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`
    }, '')

  const upperPath = createSmoothPath(upperPts)
  const lowerPathReversed = [...lowerPts].reverse().reduce((acc, pt) => `${acc} L ${pt.x},${pt.y}`, '')
  const bandPath = `${upperPath} ${lowerPathReversed} Z`

  const forecastLinePath = createSmoothPath(forecastPts)
  const upperLinePath = createSmoothPath(upperPts)
  const lowerLinePath = createSmoothPath(lowerPts)

  const yTicks = [
    { label: String(maxVal), val: maxVal },
    { label: String(Math.round(maxVal * 0.75)), val: maxVal * 0.75 },
    { label: String(Math.round(maxVal * 0.5)), val: maxVal * 0.5 },
    { label: String(Math.round(maxVal * 0.25)), val: maxVal * 0.25 },
    { label: '0', val: 0 },
  ]

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Demand Forecast (Next {timeframe})
          </h2>
          <p className="text-[11px] text-slate-400">Simple moving average projection with confidence interval</p>
        </div>

        {/* Interactive Month Selection Dropdown */}
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
              {FORECAST_PERIOD_OPTIONS.map((opt) => {
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

      {/* Legend */}
      <div className="mt-2.5 flex flex-wrap items-center gap-5 text-xs text-slate-600">
        {/* Forecast (SMA) */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center">
            <span className="h-0.5 w-3 bg-blue-600 rounded-full" />
            <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white -mx-0.5" />
            <span className="h-0.5 w-3 bg-blue-600 rounded-full" />
          </span>
          <span className="font-semibold text-slate-700 text-[11px]">Forecast (SMA)</span>
        </div>

        {/* Lower Bound */}
        <div className="flex items-center gap-1.5">
          <span className="flex items-center">
            <span className="h-0.5 w-2.5 border-t border-dashed border-sky-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300 -mx-0.5" />
            <span className="h-0.5 w-2.5 border-t border-dashed border-sky-400" />
          </span>
          <span className="font-medium text-slate-500 text-[11px]">Lower Bound</span>
        </div>

        {/* Upper Bound */}
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 border-t border-dashed border-sky-400" />
          <span className="font-medium text-slate-500 text-[11px]">Upper Bound</span>
        </div>
      </div>

      {/* Main Chart Body or Empty State */}
      {!hasValidData ? (
        <div className="flex h-52 flex-col items-center justify-center py-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <TrendingUp aria-hidden="true" size={22} />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-700">No Forecast Run Recorded</p>
          <p className="mt-0.5 max-w-xs text-[11px] text-slate-400">
            No SMA forecast has been generated yet. Demand projections will automatically populate once forecast runs are created.
          </p>
        </div>
      ) : (
        <div className="relative mt-3 w-full">
          <svg
            aria-label={`${timeframe} SMA projected inventory demand forecast with confidence band`}
            className="w-full h-auto overflow-visible"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              <linearGradient id="bandGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.08" />
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

            {/* Confidence Interval Band Fill */}
            <path d={bandPath} fill="url(#bandGradient)" />

            {/* Upper Dashed Line */}
            <path
              d={upperLinePath}
              fill="none"
              stroke="#60a5fa"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />

            {/* Lower Dashed Line */}
            <path
              d={lowerLinePath}
              fill="none"
              stroke="#60a5fa"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />

            {/* Main SMA Forecast Line */}
            <path
              d={forecastLinePath}
              fill="none"
              stroke="#2563eb"
              strokeLinecap="round"
              strokeWidth="2.5"
            />

            {/* Data Points */}
            {forecastPts.map((pt, i) => {
              const isHovered = hoverIndex === i
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
                        x={pt.x - 55}
                        y={pt.y - 34}
                        width="110"
                        height="24"
                        rx="4"
                        fill="#1e293b"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 18}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-white"
                      >
                        SMA: {activeData[i]?.forecast ?? 0} units
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
