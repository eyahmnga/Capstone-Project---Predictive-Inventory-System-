import { useMemo, useState } from 'react'
import { Flame, Package, Snail, Sparkles, Zap } from 'lucide-react'
import type { Product } from '@/features/products/types/product'
import type { ForecastRunItem } from '@/features/forecasting/types/forecast'
import type { ProductVelocityItem } from '@/features/dashboard/types/dashboard'
import { formatQuantity } from '@/shared/lib/formatters'

export type SimpleVelocityProduct = {
  id: string
  name: string
  sku: string
  categoryName?: string
  sellingPrice: number
  onHandQuantity: number
  monthlySalesEstimate: number
  unitsSold: number
  daysOnHand: number
  isFastMoving: boolean
}

type FastSlowMovingProductsChartProps = {
  products?: Product[]
  forecastItems?: ForecastRunItem[]
  productVelocity?: Record<string, ProductVelocityItem>
}

type ViewFilter = 'both' | 'fast' | 'slow'

export function FastSlowMovingProductsChart({
  products = [],
  forecastItems = [],
  productVelocity,
}: FastSlowMovingProductsChartProps) {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('both')

  // Calculate clear and friendly product movement statistics
  const { fastMovingList, slowMovingList, maxSales, maxStock } = useMemo(() => {
    if (products.length === 0) {
      return { fastMovingList: [], slowMovingList: [], maxSales: 30, maxStock: 100 }
    }

    // 1. Live product sales velocity from real POS transactions
    const velocityMap = new Map<string, { totalSold: number; monthlyRate: number }>()

    if (productVelocity) {
      Object.values(productVelocity).forEach((pv) => {
        const soldQty = Number(pv.totalSoldQuantity) || 0
        if (soldQty > 0) {
          velocityMap.set(pv.productId, {
            totalSold: soldQty,
            monthlyRate: Math.max(soldQty, 1),
          })
        }
      })
    }

    // 2. Also incorporate statistical forecast items if available
    forecastItems.forEach((item) => {
      const demand =
        Number(item.forecastQuantity) ||
        (item.demandTotal ? Number(item.demandTotal) / Math.max(1, item.historyPeriodCount) : 0) ||
        0
      if (demand > 0 && item.productId) {
        const existing = velocityMap.get(item.productId)
        if (existing) {
          existing.monthlyRate = Math.max(existing.monthlyRate, Math.round(demand))
        } else {
          velocityMap.set(item.productId, {
            totalSold: 0,
            monthlyRate: Math.round(demand),
          })
        }
      }
    })

    const processed: SimpleVelocityProduct[] = products.map((product) => {
      const onHand = Number(product.stock?.onHandQuantity) || 0
      const price = Number(product.sellingPrice) || 0

      // Match velocity strictly from real POS sales or forecast
      const velocity = velocityMap.get(product.id)
      const unitsSold = velocity?.totalSold ?? 0
      const monthlySales = velocity?.monthlyRate ?? unitsSold

      const dailyRate = monthlySales > 0 ? monthlySales / 30 : 0
      const daysOnHand = dailyRate > 0 ? Math.round(onHand / dailyRate) : onHand > 0 ? 999 : 0

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryName: product.category?.name,
        sellingPrice: price,
        onHandQuantity: onHand,
        monthlySalesEstimate: monthlySales,
        unitsSold,
        daysOnHand,
        isFastMoving: false,
      }
    })

    // 1. Fast-Moving: Only items with real sales > 0, ranked from highest sales to lowest (up to top 5)
    const itemsWithSales = processed.filter((p) => p.unitsSold > 0 || p.monthlySalesEstimate > 0)
    const sortedBySales = [...itemsWithSales].sort(
      (a, b) =>
        b.unitsSold - a.unitsSold || b.monthlySalesEstimate - a.monthlySalesEstimate,
    )
    const fast = sortedBySales.slice(0, 5).map((p) => ({ ...p, isFastMoving: true }))

    // 2. Slow-Moving: Items with low or zero sales, ranked by highest stock on-hand (up to top 5)
    const slowCandidates = processed.filter((p) => !fast.some((f) => f.id === p.id))
    const slow = [...slowCandidates]
      .sort(
        (a, b) =>
          b.onHandQuantity - a.onHandQuantity || a.monthlySalesEstimate - b.monthlySalesEstimate,
      )
      .slice(0, 5)
      .map((p) => ({ ...p, isFastMoving: false }))

    const maxS = Math.max(...fast.map((p) => Math.max(p.unitsSold, p.monthlySalesEstimate)), 10)
    const maxQ = Math.max(...slow.map((p) => p.onHandQuantity), 20)

    return {
      fastMovingList: fast,
      slowMovingList: slow,
      maxSales: maxS,
      maxStock: maxQ,
    }
  }, [products, forecastItems, productVelocity])

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Zap size={14} />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Fast and Slow Moving Products</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Fast items sorted by sales velocity &bull; Slow items sorted by stock quantity
          </p>
        </div>

        {/* View Switcher Filter Buttons */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-start sm:self-auto">
          <button
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
              viewFilter === 'both'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            type="button"
            onClick={() => setViewFilter('both')}
          >
            Show Both
          </button>
          <button
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
              viewFilter === 'fast'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
            type="button"
            onClick={() => setViewFilter('fast')}
          >
            <Flame size={12} />
            Fast ({fastMovingList.length})
          </button>
          <button
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
              viewFilter === 'slow'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
            type="button"
            onClick={() => setViewFilter('slow')}
          >
            <Snail size={12} />
            Slow ({slowMovingList.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Package className="text-slate-300 mb-1" size={24} />
          <p className="text-xs font-semibold text-slate-700">No product sales yet</p>
          <p className="text-[11px] text-slate-500">
            Once products are added, fast and slow moving items will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-2.5">
          <div
            className={`grid gap-3 ${
              viewFilter === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {/* FAST MOVING CARD: Compact & high-density */}
            {(viewFilter === 'both' || viewFilter === 'fast') && (
              <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/20 p-2.5 sm:p-3">
                {/* Section Header */}
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100/70">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Flame size={12} />
                    </span>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                      🚀 Fast-Moving Products
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                    High Sales
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 pt-2">
                  {fastMovingList.length === 0 ? (
                    <p className="text-[11px] text-slate-500 py-3 text-center italic">
                      No sales recorded yet. Fast-moving items will appear here automatically as sales are made in POS.
                    </p>
                  ) : (
                    fastMovingList.map((item, index) => {
                      const displayQty = item.unitsSold > 0 ? item.unitsSold : item.monthlySalesEstimate
                      const barPercent = Math.min(
                        100,
                        Math.max(15, (displayQty / maxSales) * 100),
                      )
                      return (
                        <div
                          key={item.id}
                          className="rounded-md border border-emerald-100/80 bg-white px-2.5 py-1.5 shadow-2xs hover:border-emerald-300 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="font-bold text-emerald-800 text-[11px]">#{index + 1}</span>
                              <p className="truncate text-xs font-semibold text-slate-800" title={item.name}>
                                {item.name}
                              </p>
                              <span className="hidden sm:inline text-[10px] text-slate-400">({item.sku})</span>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-emerald-700 font-mono">
                                {item.unitsSold > 0 ? `${item.unitsSold} sold` : `~${item.monthlySalesEstimate}/mo`}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                &bull; {formatQuantity(item.onHandQuantity)} in stock
                              </span>
                            </div>
                          </div>

                          {/* Slim Progress Bar */}
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-emerald-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                                style={{ width: `${barPercent}%` }}
                              />
                            </div>
                            <span className="text-[9.5px] font-semibold text-emerald-700 shrink-0">
                              Fast Velocity
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* SLOW MOVING CARD: Compact & high-density */}
            {(viewFilter === 'both' || viewFilter === 'slow') && (
              <div className="rounded-lg border border-amber-200/70 bg-amber-50/20 p-2.5 sm:p-3">
                {/* Section Header */}
                <div className="flex items-center justify-between pb-2 border-b border-amber-100/70">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Snail size={12} />
                    </span>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      🐢 Slow-Moving Products
                    </h3>
                  </div>
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                    High Stock
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 pt-2">
                  {slowMovingList.length === 0 ? (
                    <p className="text-[11px] text-slate-500 py-2 text-center">No slow-moving items found.</p>
                  ) : (
                    slowMovingList.map((item, index) => {
                      const stockBarPercent = Math.min(
                        100,
                        Math.max(15, (item.onHandQuantity / maxStock) * 100),
                      )
                      return (
                        <div
                          key={item.id}
                          className="rounded-md border border-amber-100/80 bg-white px-2.5 py-1.5 shadow-2xs hover:border-amber-300 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="font-bold text-amber-800 text-[11px]">#{index + 1}</span>
                              <p className="truncate text-xs font-semibold text-slate-800" title={item.name}>
                                {item.name}
                              </p>
                              <span className="hidden sm:inline text-[10px] text-slate-400">({item.sku})</span>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-amber-800 font-mono">
                                {formatQuantity(item.onHandQuantity)} in stock
                              </span>
                              <span className="text-[10px] text-slate-400">
                                &bull; {item.unitsSold > 0 ? `${item.unitsSold} sold` : `~${item.monthlySalesEstimate}/mo`}
                              </span>
                            </div>
                          </div>

                          {/* Slim Stock Bar */}
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-amber-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                                style={{ width: `${stockBarPercent}%` }}
                              />
                            </div>
                            <span className="text-[9.5px] font-semibold text-amber-800 shrink-0">
                              {item.daysOnHand > 180 ? '⚠️ 180+ days supply' : `~${item.daysOnHand}d stock`}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Footer Tip */}
      <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-slate-50 border border-slate-100 px-2.5 py-1.5 text-[11px] text-slate-600">
        <Sparkles className="text-blue-600 shrink-0" size={13} />
        <span>
          <strong className="text-slate-800">Tip:</strong> Reorder <strong>Fast-Moving</strong> items to prevent stockouts, and pause <strong>Slow-Moving</strong> orders to prevent excess stock.
        </span>
      </div>
    </div>
  )
}
