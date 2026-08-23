import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, Check, ChevronDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/formatters'

export type SalesTrendDataPoint = {
  date: string
  totalAmount: string
  saleCount: number
}

type MovingAverageTrendChartProps = {
  salesTrend?: SalesTrendDataPoint[]
}

const TIMEFRAME_OPTIONS = ['Last 14 Days', 'Last 30 Days', 'Last 60 Days'] as const
type TimeframeOption = (typeof TIMEFRAME_OPTIONS)[number]

export function MovingAverageTrendChart({ salesTrend = [] }: MovingAverageTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('Last 30 Days')
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

  // Process and slice daily series
  const rawSeries = useMemo(() => {
    const daysLimit = timeframe === 'Last 14 Days' ? 14 : timeframe === 'Last 30 Days' ? 30 : 60
    const sliced = salesTrend.slice(-daysLimit)

    if (sliced.length === 0) {
      // Fallback synthetic baseline if backend has 0 sales yet
      const today = new Date()
      return Array.from({ length: daysLimit }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - (daysLimit - 1 - i))
        return {
          date: d.toISOString().split('T')[0],
          amount: 0,
          count: 0,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }
      })
    }

    return sliced.map((item) => {
      const d = new Date(item.date)
      const label = isNaN(d.getTime())
        ? item.date
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return {
        date: item.date,
        amount: Number(item.totalAmount) || 0,
        count: item.saleCount || 0,
        label,
      }
    })
  }, [salesTrend, timeframe])

  // Fast MA window: 3 days; Slow MA window: 7 days
  const fastWindow = timeframe === 'Last 14 Days' ? 3 : 5
  const slowWindow = timeframe === 'Last 14 Days' ? 7 : 12

  const computedPoints = useMemo(() => {
    return rawSeries.map((pt, idx, arr) => {
      // Fast SMA
      const fastStart = Math.max(0, idx - fastWindow + 1)
      const fastSlice = arr.slice(fastStart, idx + 1)
      const fastMA = fastSlice.reduce((sum, item) => sum + item.amount, 0) / fastSlice.length

      // Slow SMA
      const slowStart = Math.max(0, idx - slowWindow + 1)
      const slowSlice = arr.slice(slowStart, idx + 1)
      const slowMA = slowSlice.reduce((sum, item) => sum + item.amount, 0) / slowSlice.length

      return {
        ...pt,
        fastMA,
        slowMA,
      }
    })
  }, [rawSeries, fastWindow, slowWindow])

  // Trend Crossover status
  const trendAnalysis = useMemo(() => {
    if (computedPoints.length === 0) return { status: 'neutral', percent: 0 }
    const latest = computedPoints[computedPoints.length - 1]
    if (latest.slowMA === 0) return { status: 'neutral', percent: 0 }

    const diff = latest.fastMA - latest.slowMA
    const percent = Math.round((diff / (latest.slowMA || 1)) * 100)

    if (percent > 3) return { status: 'bullish', percent }
    if (percent < -3) return { status: 'bearish', percent: Math.abs(percent) }
    return { status: 'neutral', percent: Math.abs(percent) }
  }, [computedPoints])

  const width = 560
  const height = 230
  const padLeft = 50
  const padRight = 25
  const padTop = 25
  const padBottom = 35

  const maxValRaw = Math.max(
    ...computedPoints.map((d) => Math.max(d.amount, d.fastMA, d.slowMA)),
    100,
  )
  const maxVal = Math.ceil((maxValRaw * 1.15) / 50) * 50 || 200
  const minVal = 0
  const range = maxVal - minVal || 1

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(computedPoints.length - 1, 1)) * (width - padLeft - padRight)
  const getY = (val: number) =>
    height - padBottom - ((val - minVal) / range) * (height - padTop - padBottom)

  const fastPts = computedPoints.map((d, i) => ({ x: getX(i), y: getY(d.fastMA) }))
  const slowPts = computedPoints.map((d, i) => ({ x: getX(i), y: getY(d.slowMA) }))

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

  const fastLinePath = createSmoothPath(fastPts)
  const slowLinePath = createSmoothPath(slowPts)

  const yTicks = [
    { label: `₱${(maxVal / 1000).toFixed(0)}k`, val: maxVal },
    { label: `₱${((maxVal * 0.75) / 1000).toFixed(0)}k`, val: maxVal * 0.75 },
    { label: `₱${((maxVal * 0.5) / 1000).toFixed(0)}k`, val: maxVal * 0.5 },
    { label: `₱${((maxVal * 0.25) / 1000).toFixed(0)}k`, val: maxVal * 0.25 },
    { label: '0', val: 0 },
  ]

  // Filter label ticks to keep x-axis clean
  const step = Math.ceil(computedPoints.length / 6)
  const xLabels = computedPoints.filter((_, idx) => idx % step === 0 || idx === computedPoints.length - 1)

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="text-indigo-600" size={17} />
            <h2 className="text-sm font-bold text-slate-800">
              Moving Average Sales Trend
            </h2>
            {trendAnalysis.status === 'bullish' ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] font-bold text-emerald-700">
                <ArrowUpRight size={11} /> Bullish Surge (+{trendAnalysis.percent}%)
              </span>
            ) : trendAnalysis.status === 'bearish' ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.2 text-[10px] font-bold text-rose-700">
                <ArrowDownRight size={11} /> Momentum Cooling (-{trendAnalysis.percent}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.2 text-[10px] font-bold text-slate-600">
                Stable Flow
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fast ({fastWindow}D) vs. Slow ({slowWindow}D) Moving Average demand velocity
          </p>
        </div>

        {/* Timeframe Dropdown */}
        <div ref={dropdownRef} className="relative self-start sm:self-auto">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>{timeframe}</span>
            <ChevronDown size={13} className="text-slate-500" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg animate-fadeIn">
              {TIMEFRAME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                  type="button"
                  onClick={() => {
                    setTimeframe(opt)
                    setIsDropdownOpen(false)
                  }}
                >
                  <span>{opt}</span>
                  {timeframe === opt && <Check size={13} className="text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart Graphic */}
      <div className="relative w-full overflow-hidden my-1">
        <svg
          className="w-full h-auto overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Gridlines */}
          {yTicks.map((tick) => {
            const y = getY(tick.val)
            return (
              <g key={tick.val}>
                <line
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                />
                <text
                  alignmentBaseline="middle"
                  className="text-[10px] fill-slate-400 font-mono"
                  textAnchor="end"
                  x={padLeft - 8}
                  y={y}
                >
                  {tick.label}
                </text>
              </g>
            )
          })}

          {/* Actual Sales Bars (Subtle background volume bars) */}
          {computedPoints.map((pt, i) => {
            const x = getX(i)
            const y = getY(pt.amount)
            const barH = height - padBottom - y
            const isHovered = hoverIndex === i

            return (
              <rect
                key={`bar-${pt.date}-${i}`}
                className={`transition-all duration-150 ${
                  isHovered ? 'fill-indigo-300' : 'fill-slate-200/80 hover:fill-slate-300'
                }`}
                height={Math.max(0, barH)}
                rx={2}
                width={Math.max(4, (width - padLeft - padRight) / computedPoints.length - 3)}
                x={x - Math.max(2, (width - padLeft - padRight) / computedPoints.length / 2 - 1.5)}
                y={y}
              />
            )
          })}

          {/* Slow Moving Average Line (Amber / Orange 30D Trend) */}
          <path
            d={slowLinePath}
            fill="none"
            stroke="#f59e0b"
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeWidth="2.2"
          />

          {/* Fast Moving Average Line (Indigo / Blue 7D Responsive) */}
          <path
            d={fastLinePath}
            fill="none"
            stroke="#4f46e5"
            strokeLinecap="round"
            strokeWidth="2.8"
          />

          {/* Hover Interaction Vertical Cursor & Nodes */}
          {hoverIndex !== null && computedPoints[hoverIndex] && (
            <g>
              <line
                stroke="#6366f1"
                strokeDasharray="2 2"
                strokeWidth="1.5"
                x1={getX(hoverIndex)}
                x2={getX(hoverIndex)}
                y1={padTop}
                y2={height - padBottom}
              />

              {/* Fast MA Node */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(computedPoints[hoverIndex].fastMA)}
                fill="#4f46e5"
                r="4.5"
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* Slow MA Node */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(computedPoints[hoverIndex].slowMA)}
                fill="#f59e0b"
                r="4"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Transparent Hover Hitboxes */}
          {computedPoints.map((_, i) => (
            <rect
              key={`hit-${i}`}
              className="cursor-pointer fill-transparent"
              height={height}
              width={(width - padLeft - padRight) / computedPoints.length}
              x={getX(i) - (width - padLeft - padRight) / computedPoints.length / 2}
              y={0}
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}

          {/* X-Axis Date Labels */}
          {xLabels.map((pt) => {
            const idx = computedPoints.findIndex((p) => p.date === pt.date)
            if (idx === -1) return null
            return (
              <text
                key={`label-${pt.date}`}
                className="text-[10px] fill-slate-400 font-medium"
                textAnchor="middle"
                x={getX(idx)}
                y={height - 12}
              >
                {pt.label}
              </text>
            )
          })}
        </svg>

        {/* Hover Tooltip Box */}
        {hoverIndex !== null && computedPoints[hoverIndex] && (
          <div
            className="pointer-events-none absolute z-30 rounded-lg border border-slate-200 bg-white/95 p-2.5 text-xs shadow-xl backdrop-blur-xs space-y-1 transition-all"
            style={{
              left: `${Math.min(Math.max(getX(hoverIndex) - 70, 10), width - 160)}px`,
              top: '10px',
            }}
          >
            <p className="font-bold text-slate-800 border-b border-slate-100 pb-1">
              {computedPoints[hoverIndex].label}
            </p>
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300" /> Daily Revenue:
              </span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(computedPoints[hoverIndex].amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-indigo-700 font-semibold">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-600" /> Fast MA ({fastWindow}D):
              </span>
              <span className="font-mono font-bold">
                {formatCurrency(computedPoints[hoverIndex].fastMA)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-amber-700 font-semibold">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Slow MA ({slowWindow}D):
              </span>
              <span className="font-mono font-bold">
                {formatCurrency(computedPoints[hoverIndex].slowMA)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-xs bg-slate-200 border border-slate-300" />
            <span className="text-[11px] font-medium text-slate-600">Daily Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-3.5 rounded-full bg-indigo-600" />
            <span className="text-[11px] font-bold text-indigo-900">Fast MA ({fastWindow}D)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-3.5 rounded-full bg-amber-500 border border-amber-600/30" />
            <span className="text-[11px] font-bold text-amber-900">Slow MA ({slowWindow}D)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Cross analysis helps identify demand breakout trends.
        </div>
      </div>
    </div>
  )
}
