import { ArrowUpRight, Box, Boxes, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatQuantity } from '@/shared/lib/formatters'

export type KpiRowData = {
  totalInventoryValue: number | string
  totalItems: number | string
  lowStockCount: number | string
  overstockCount: number | string
  outOfStockCount: number | string
  growthPercent?: string
}

type KpiCardsRowProps = {
  data?: Partial<KpiRowData>
}

export function KpiCardsRow({ data }: KpiCardsRowProps) {
  const totalValueFormatted =
    data?.totalInventoryValue !== undefined
      ? typeof data.totalInventoryValue === 'number'
        ? `₱ ${data.totalInventoryValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : String(data.totalInventoryValue)
      : '₱ 0.00'

  const totalItems = data?.totalItems !== undefined ? formatQuantity(data.totalItems) : '0'
  const lowStock = data?.lowStockCount !== undefined ? String(data.lowStockCount) : '0'
  const overstock = data?.overstockCount !== undefined ? String(data.overstockCount) : '0'
  const outOfStock = data?.outOfStockCount !== undefined ? String(data.outOfStockCount) : '0'
  const growth = data?.growthPercent || '0.0%'

  return (
    <section aria-label="KPI Cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 xl:gap-5">
      {/* 1. Total Inventory Value */}
      <div className="relative flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <CreditCard aria-hidden="true" size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-600 truncate">Total Inventory Value</p>
          <h3 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 tabular-nums truncate">
            {totalValueFormatted}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <ArrowUpRight aria-hidden="true" size={13} className="shrink-0" />
            <span>{growth} vs last month</span>
          </p>
        </div>
      </div>

      {/* 2. Total Items -> Links to /products */}
      <div className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:scale-105">
            <Box aria-hidden="true" size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-600">Total Items</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {totalItems}
            </h3>
          </div>
        </div>
        <div className="mt-3 border-t border-slate-100 pt-2 text-left">
          <Link
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            to="/products"
          >
            View all items
          </Link>
        </div>
      </div>

      {/* 3. Low Stock Items -> Links to /products?stockStatus=low_stock */}
      <div className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 transition group-hover:scale-105">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
              !
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-600">Low Stock Items</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {lowStock}
            </h3>
          </div>
        </div>
        <div className="mt-3 border-t border-slate-100 pt-2 text-left">
          <Link
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            to="/products?stockStatus=low_stock"
          >
            View details
          </Link>
        </div>
      </div>

      {/* 4. Overstock Items */}
      <div className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
            <Boxes aria-hidden="true" size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-600">Overstock Items</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {overstock}
            </h3>
          </div>
        </div>
        <div className="mt-3 border-t border-slate-100 pt-2 text-left">
          <Link
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            to="/products?stockStatus=overstock"
          >
            View details
          </Link>
        </div>
      </div>

      {/* 5. Out of Stock Items */}
      <div className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-rose-300 hover:shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition group-hover:scale-105">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
              ✕
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-600">Out of Stock Items</p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {outOfStock}
            </h3>
          </div>
        </div>
        <div className="mt-3 border-t border-slate-100 pt-2 text-left">
          <Link
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            to="/products?stockStatus=out_of_stock"
          >
            View details
          </Link>
        </div>
      </div>
    </section>
  )
}
