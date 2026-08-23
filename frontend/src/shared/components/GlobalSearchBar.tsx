import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Boxes,
  ChevronRight,
  FileBarChart,
  History,
  LayoutDashboard,
  Loader2,
  Package,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProducts } from '@/features/products/hooks/useProducts'
import { usePurchaseOrders } from '@/features/purchase-orders/hooks/usePurchaseOrders'
import { cn } from '@/shared/lib/cn'

type NavShortcut = {
  label: string
  path: string
  category: string
  icon: typeof LayoutDashboard
  keywords: string[]
}

const NAV_SHORTCUTS: NavShortcut[] = [
  { label: 'Dashboard', path: '/dashboard', category: 'Navigation', icon: LayoutDashboard, keywords: ['dashboard', 'home', 'kpi', 'overview', 'stats'] },
  { label: 'Products Management', path: '/products', category: 'Operations', icon: Package, keywords: ['products', 'catalog', 'sku', 'items', 'add product', 'price'] },
  { label: 'Inventory & Stock', path: '/inventory', category: 'Operations', icon: Boxes, keywords: ['inventory', 'stock', 'levels', 'adjustments', 'balance'] },
  { label: 'Sales & POS', path: '/sales', category: 'Operations', icon: ShoppingCart, keywords: ['sales', 'pos', 'cashier', 'checkout', 'orders', 'sell'] },
  { label: 'Goods Receipts', path: '/receipts', category: 'Operations', icon: Receipt, keywords: ['receipts', 'goods', 'deliveries', 'receiving', 'receiving log'] },
  { label: 'Restocking & Reorder Alerts', path: '/restocking', category: 'Planning', icon: RotateCcw, keywords: ['restocking', 'reorder', 'alerts', 'eoq', 'rop', 'safety stock'] },
  { label: 'Forecasting (SMA)', path: '/forecasting', category: 'Planning', icon: TrendingUp, keywords: ['forecasting', 'sma', 'demand', 'prediction', 'moving average'] },
  { label: 'Reports & Exports', path: '/reports', category: 'Planning', icon: FileBarChart, keywords: ['reports', 'export', 'csv', 'pdf', 'sales report', 'inventory valuation'] },
  { label: 'Suppliers & Branches', path: '/suppliers', category: 'Administration', icon: Truck, keywords: ['suppliers', 'vendors', 'branches', 'contacts'] },
  { label: 'User Management', path: '/users', category: 'Administration', icon: Users, keywords: ['users', 'roles', 'permissions', 'team', 'staff', 'accounts'] },
  { label: 'System Settings', path: '/settings', category: 'Administration', icon: Settings, keywords: ['settings', 'config', 'sync health', 'preferences'] },
]

export function GlobalSearchBar() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const defaultBranchId = useMemo(() => {
    return (session?.user.branches.find((b) => b.isDefault) ?? session?.user.branches[0])?.id ?? null
  }, [session])

  // Live Query for Products
  const trimmed = query.trim()
  const isQuerying = trimmed.length >= 1

  const productsQuery = useProducts({
    search: isQuerying ? trimmed : '',
    categoryId: 'all',
    productType: 'all',
    active: 'all',
    branchId: defaultBranchId,
    page: 1,
    perPage: 6,
  })

  // Live Query for Purchase Orders
  const poQuery = usePurchaseOrders({
    branchId: defaultBranchId,
    status: 'all',
    supplierId: 'all',
    search: isQuerying ? trimmed : '',
    page: 1,
    perPage: 5,
  })

  // Matching shortcuts
  const matchedShortcuts = useMemo(() => {
    if (!trimmed) return NAV_SHORTCUTS.slice(0, 4)
    const lower = trimmed.toLowerCase()
    return NAV_SHORTCUTS.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower) ||
        item.keywords.some((k) => k.includes(lower)),
    ).slice(0, 4)
  }, [trimmed])

  const products = useMemo(() => {
    if (!isQuerying) return []
    return productsQuery.data?.data ?? []
  }, [isQuerying, productsQuery.data])

  const purchaseOrders = useMemo(() => {
    if (!isQuerying) return []
    return poQuery.data?.data ?? []
  }, [isQuerying, poQuery.data])

  const totalResults = matchedShortcuts.length + products.length + purchaseOrders.length

  // Global hotkey: Ctrl+K or Cmd+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Outside click listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleSelectShortcut = (path: string) => {
    setIsOpen(false)
    setQuery('')
    navigate(path)
  }

  const handleSelectProduct = (sku: string) => {
    setIsOpen(false)
    setQuery('')
    navigate(`/products?search=${encodeURIComponent(sku)}`)
  }

  const handleSelectPO = (poNumber: string) => {
    setIsOpen(false)
    setQuery('')
    navigate(`/purchase-orders?search=${encodeURIComponent(poNumber)}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmed) return
    setIsOpen(false)

    // Smart routing: if query looks like a PO number (e.g. PO-...)
    if (trimmed.toUpperCase().startsWith('PO-')) {
      navigate(`/purchase-orders?search=${encodeURIComponent(trimmed)}`)
    } else {
      navigate(`/products?search=${encodeURIComponent(trimmed)}`)
    }
  }

  const isLoading = isQuerying && (productsQuery.isLoading || poQuery.isLoading)

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
          size={16}
        />
        <input
          ref={inputRef}
          aria-expanded={isOpen}
          aria-label="Search inventory, SKUs, or orders"
          autoComplete="off"
          className="h-9 w-full rounded-md border border-white/10 bg-white/10 pl-9 pr-14 text-xs text-white placeholder-slate-300 outline-none transition focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-400/20"
          placeholder="Search inventory, SKUs, or orders..."
          role="combobox"
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false)
              inputRef.current?.blur()
            }
          }}
        />

        {/* Right side controls: Loading spinner / Clear button / Shortcut pill */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="animate-spin text-blue-300" size={14} />
          ) : query ? (
            <button
              aria-label="Clear search"
              className="rounded p-0.5 text-slate-300 hover:text-white transition"
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>
      </form>

      {/* Instant Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-[28rem] overflow-y-auto rounded-xl border border-border bg-white text-slate-900 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Section: Matching Products */}
          {products.length > 0 && (
            <div className="p-2">
              <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Products & Inventory ({products.length})
              </p>
              <div className="space-y-0.5">
                {products.map((item) => (
                  <button
                    key={item.id}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-blue-50/80 group"
                    type="button"
                    onClick={() => handleSelectProduct(item.sku)}
                  >
                    {/* Product Avatar or Icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
                      {item.imageUrl ? (
                        <img alt={item.name} className="h-full w-full object-cover" src={item.imageUrl} />
                      ) : (
                        <Package className="text-slate-500" size={16} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                          {item.name}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono font-medium text-slate-600">
                          {item.sku}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.category?.name ?? 'Category'} · ₱{Number(item.sellingPrice).toLocaleString()}
                      </p>
                    </div>

                    <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition shrink-0" size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Matching Purchase Orders */}
          {purchaseOrders.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Purchase Orders ({purchaseOrders.length})
              </p>
              <div className="space-y-0.5">
                {purchaseOrders.map((po) => (
                  <button
                    key={po.id}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-blue-50/80 group"
                    type="button"
                    onClick={() => handleSelectPO(po.poNumber)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                      <ShoppingCart size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-700 font-mono">
                          {po.poNumber}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize">
                          {po.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        Supplier: {po.supplier?.legalName ?? 'N/A'} · ₱{Number(po.totalAmount).toLocaleString()}
                      </p>
                    </div>

                    <ChevronRight className="text-slate-300 group-hover:text-blue-600 transition shrink-0" size={14} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Navigation Shortcuts */}
          {matchedShortcuts.length > 0 && (
            <div className={cn('p-2', (products.length > 0 || purchaseOrders.length > 0) && 'border-t border-slate-100')}>
              <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick Navigation
              </p>
              <div className="space-y-0.5">
                {matchedShortcuts.map((nav) => {
                  const NavIcon = nav.icon
                  return (
                    <button
                      key={nav.path}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-slate-100 group"
                      type="button"
                      onClick={() => handleSelectShortcut(nav.path)}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition">
                        <NavIcon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-800 group-hover:text-slate-900">
                          {nav.label}
                        </span>
                        <span className="ml-2 text-[10px] text-slate-400 font-medium">{nav.category}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono group-hover:text-slate-600">Jump →</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {isQuerying && totalResults === 0 && !isLoading && (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-slate-800">No exact matches for "{query}"</p>
              <p className="mt-1 text-xs text-slate-500">
                Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd> to perform a deep catalog search for this item.
              </p>
              <button
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                type="button"
                onClick={handleSubmit}
              >
                Search all products for "{query}"
              </button>
            </div>
          )}

          {/* Footer Helper */}
          <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Press <kbd className="rounded bg-white border border-slate-200 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to search</span>
            <span>Press <kbd className="rounded bg-white border border-slate-200 px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close</span>
          </div>
        </div>
      )}
    </div>
  )
}
