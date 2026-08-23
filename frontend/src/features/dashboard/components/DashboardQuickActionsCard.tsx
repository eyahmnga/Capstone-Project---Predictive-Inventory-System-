import { ArrowUpRight, Boxes, History, PackagePlus, ShoppingCart, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'

type DashboardQuickActionsCardProps = {
  onAddProduct: () => void
}

export function DashboardQuickActionsCard({ onAddProduct }: DashboardQuickActionsCardProps) {
  const { hasPermission } = useAuth()
  const canCreateProduct = hasPermission('products.create')

  return (
    <section
      aria-label="Quick Actions"
      className="flex flex-col justify-between rounded-card border border-border bg-surface p-5 shadow-panel transition-all"
    >
      <div>
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Zap aria-hidden="true" size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-800">Quick Actions</h2>
              <p className="text-[11px] text-muted">Frequently used daily workflows & shortcuts</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Shortcuts
          </span>
        </div>

        {/* Action Grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* 1. Point of Sale */}
          <Link
            className="group relative flex flex-col justify-between rounded-xl border border-border/90 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs transition-all hover:border-brand-500 hover:bg-brand-50/30 hover:shadow-sm"
            to="/pos"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <ShoppingCart size={18} />
              </div>
              <ArrowUpRight
                className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600 transition-transform"
                size={16}
              />
            </div>
            <div className="mt-3">
              <span className="block text-sm font-bold text-slate-800 group-hover:text-brand-700 transition-colors">
                Point of Sale (POS)
              </span>
              <span className="block text-[11px] text-muted line-clamp-1 mt-0.5">
                Barcode scan, cart & checkout
              </span>
            </div>
          </Link>

          {/* 2. Inventory Balances */}
          <Link
            className="group relative flex flex-col justify-between rounded-xl border border-border/90 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs transition-all hover:border-brand-500 hover:bg-brand-50/30 hover:shadow-sm"
            to="/inventory"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <Boxes size={18} />
              </div>
              <ArrowUpRight
                className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600 transition-transform"
                size={16}
              />
            </div>
            <div className="mt-3">
              <span className="block text-sm font-bold text-slate-800 group-hover:text-brand-700 transition-colors">
                Inventory Stock
              </span>
              <span className="block text-[11px] text-muted line-clamp-1 mt-0.5">
                Check balances & adjustments
              </span>
            </div>
          </Link>

          {/* 3. Sales History */}
          <Link
            className="group relative flex flex-col justify-between rounded-xl border border-border/90 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs transition-all hover:border-brand-500 hover:bg-brand-50/30 hover:shadow-sm"
            to="/sales"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                <History size={18} />
              </div>
              <ArrowUpRight
                className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600 transition-transform"
                size={16}
              />
            </div>
            <div className="mt-3">
              <span className="block text-sm font-bold text-slate-800 group-hover:text-brand-700 transition-colors">
                Sales History
              </span>
              <span className="block text-[11px] text-muted line-clamp-1 mt-0.5">
                Receipts, transactions & voids
              </span>
            </div>
          </Link>

          {/* 4. Add Product */}
          {canCreateProduct ? (
            <button
              className="group relative flex flex-col justify-between rounded-xl border border-dashed border-brand-300 bg-brand-50/40 p-3.5 text-left shadow-xs transition-all hover:border-brand-600 hover:bg-brand-50/80 hover:shadow-sm"
              type="button"
              onClick={onAddProduct}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <PackagePlus size={18} />
                </div>
                <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">
                  + New
                </span>
              </div>
              <div className="mt-3">
                <span className="block text-sm font-bold text-brand-900 group-hover:text-brand-700 transition-colors">
                  Add New Product
                </span>
                <span className="block text-[11px] text-brand-700/80 line-clamp-1 mt-0.5">
                  Create SKU, unit & pricing
                </span>
              </div>
            </button>
          ) : (
            <Link
              className="group relative flex flex-col justify-between rounded-xl border border-border/90 bg-gradient-to-br from-white to-slate-50/60 p-3.5 shadow-xs transition-all hover:border-brand-500 hover:bg-brand-50/30 hover:shadow-sm"
              to="/products"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                  <PackagePlus size={18} />
                </div>
                <ArrowUpRight
                  className="text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600 transition-transform"
                  size={16}
                />
              </div>
              <div className="mt-3">
                <span className="block text-sm font-bold text-slate-800 group-hover:text-brand-700 transition-colors">
                  Product Catalog
                </span>
                <span className="block text-[11px] text-muted line-clamp-1 mt-0.5">
                  View full catalog & items
                </span>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/80 pt-3 text-[11px] text-muted">
        <span>Instant operational routing</span>
        <span className="font-semibold text-brand-700">Quick Access</span>
      </div>
    </section>
  )
}
