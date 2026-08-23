import { useRef, useState } from 'react'
import { Filter, LayoutGrid, List, Package, Plus, Search, X } from 'lucide-react'
import { usePosProducts } from '@/features/pos/hooks/usePos'
import type { PosProduct } from '@/features/pos/types/pos'
import { useCategoryOptions } from '@/features/products/hooks/useProducts'
import { formatCurrency, formatQuantity } from '@/shared/lib/formatters'

type ProductSearchPanelProps = {
  branchId: string | null
  onAdd: (product: PosProduct) => void
}

export function ProductSearchPanel({ branchId, onAdd }: ProductSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const inputRef = useRef<HTMLInputElement>(null)

  const categoryOptionsQuery = useCategoryOptions()
  const categoryOptions = categoryOptionsQuery.data ?? []

  const productsQuery = usePosProducts(branchId, query, categoryId)
  const results = productsQuery.data ?? []

  const addFirstMatch = () => {
    if (results.length === 1) {
      onAdd(results[0])
      setQuery('')
      inputRef.current?.focus()
    }
  }

  const handleSelectCategory = (catId: string) => {
    setCategoryId(catId)
  }

  const clearFilters = () => {
    setQuery('')
    setCategoryId('all')
    inputRef.current?.focus()
  }

  const selectedCategoryName = categoryOptions.find((c) => c.id === categoryId)?.name

  return (
    <section
      aria-label="Product catalog and search"
      className="flex h-full flex-col rounded-2xl border border-border bg-surface shadow-panel overflow-hidden"
    >
      {/* Unified Compact Toolbar */}
      <div className="border-b border-border p-3 space-y-2.5 bg-subtle/30">
        {/* Main Search & Action Bar */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={17}
            />
            <input
              ref={inputRef}
              autoFocus
              className="h-9.5 w-full rounded-xl border border-border bg-surface pl-9 pr-8 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              id="pos-search"
              placeholder="Search products or scan barcode..."
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addFirstMatch()
                }
              }}
            />
            {query && (
              <button
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                type="button"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Category Dropdown */}
          <div className="relative w-36 sm:w-44 shrink-0 hidden sm:block">
            <select
              aria-label="Filter by category"
              className="h-9.5 w-full rounded-xl border border-border bg-surface pl-2.5 pr-6 text-xs font-semibold text-slate-700 outline-none focus:border-brand-600"
              value={categoryId}
              onChange={(e) => handleSelectCategory(e.target.value)}
            >
              <option value="all">All Categories ({categoryOptions.length})</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-surface p-0.5 shrink-0">
            <button
              aria-label="Grid view"
              className={`flex h-8.5 w-8.5 items-center justify-center rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
              title="Grid view"
              type="button"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              aria-label="List view"
              className={`flex h-8.5 w-8.5 items-center justify-center rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
              title="List view"
              type="button"
              onClick={() => setViewMode('list')}
            >
              <List size={15} />
            </button>
          </div>

          {(categoryId !== 'all' || query !== '') && (
            <button
              className="h-8.5 px-2.5 text-xs font-semibold text-muted hover:text-brand-600 rounded-lg hover:bg-subtle transition shrink-0"
              title="Reset search & category filter"
              type="button"
              onClick={clearFilters}
            >
              Reset
            </button>
          )}
        </div>

        {/* Quick Category Filter Chips */}
        {categoryOptions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 no-scrollbar scroll-smooth">
            <button
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
                categoryId === 'all'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-surface border border-border/90 text-slate-600 hover:text-ink hover:bg-subtle'
              }`}
              type="button"
              onClick={() => handleSelectCategory('all')}
            >
              All ({results.length})
            </button>
            {categoryOptions.map((cat) => {
              const isSelected = categoryId === cat.id
              return (
                <button
                  key={cat.id}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-surface border border-border/90 text-slate-600 hover:text-ink hover:bg-subtle'
                  }`}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Scrollable Product Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/40">
        {!branchId ? (
          <div className="p-8 text-center text-sm text-muted">
            Select a branch to view products.
          </div>
        ) : productsQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-muted">
            <p>Searching product catalog…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted space-y-1">
            <p className="font-semibold text-slate-800 text-base">No matching products found</p>
            <p className="text-xs">
              {categoryId !== 'all'
                ? `No items in "${selectedCategoryName}". Try selecting All Categories.`
                : query
                  ? 'No items matched your search query.'
                  : 'No active products available for sale.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* SPACIOUS RESPONSIVE PRODUCT CARD GRID */
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 p-4">
            {results.map((product) => {
              const outOfStock =
                product.productType === 'stock' && Number(product.stock?.availableQuantity ?? '0') <= 0
              const categoryName = product.category?.name

              return (
                <button
                  key={product.id}
                  className="group relative flex h-[230px] flex-col justify-between rounded-xl border border-border/80 bg-surface p-2.5 shadow-2xs hover:border-brand-500 hover:shadow-md hover:ring-2 hover:ring-brand-500/20 active:scale-[0.98] transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={outOfStock}
                  type="button"
                  onClick={() => onAdd(product)}
                >
                  {/* Product Image Box */}
                  <div className="relative h-28 w-full shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-1.5">
                    {product.imageUrl ? (
                      <img
                        alt={product.name}
                        className="h-full w-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        src={product.imageUrl}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 group-hover:text-brand-500 transition-colors">
                        <Package size={28} />
                      </div>
                    )}

                    {/* Stock Status Badge Overlay */}
                    {product.productType === 'stock' ? (
                      outOfStock ? (
                        <span className="absolute top-1.5 right-1.5 rounded-md bg-red-600/90 text-white px-1.5 py-0.5 text-[10px] font-bold shadow-xs">
                          Out of stock
                        </span>
                      ) : (
                        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
                          {formatQuantity(product.stock?.availableQuantity)} left
                        </span>
                      )
                    ) : null}

                    {/* Plus Icon Hover Overlay */}
                    <div className="absolute inset-0 bg-brand-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm scale-90 group-hover:scale-100 transition-transform">
                        <Plus size={16} />
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col justify-between min-h-0">
                    <div>
                      <span className="block h-3.5 text-[10px] font-semibold tracking-wider text-muted uppercase truncate">
                        {categoryName ?? 'Catalog Item'}
                      </span>
                      <span
                        className="block h-8 text-xs font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-brand-700 transition-colors mt-0.5"
                        title={product.name}
                      >
                        {product.name}
                      </span>
                      <span className="block h-3.5 font-mono text-[10px] text-muted truncate mt-0.5">
                        {product.sku}
                      </span>
                    </div>

                    {/* Price & Unit */}
                    <div className="pt-1.5 border-t border-border/60 flex items-center justify-between mt-auto">
                      <span className="text-xs sm:text-sm font-bold text-brand-700">
                        {formatCurrency(Number(product.sellingPrice) || 0)}
                      </span>
                      {product.stockUnit?.code && (
                        <span className="text-[10px] text-muted">/{product.stockUnit.code}</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          /* COMPACT LIST VIEW */
          <ul className="divide-y divide-border bg-surface">
            {results.map((product) => {
              const outOfStock =
                product.productType === 'stock' && Number(product.stock?.availableQuantity ?? '0') <= 0
              const categoryName = product.category?.name

              return (
                <li key={product.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-50/60 focus:bg-brand-50/80 outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    disabled={outOfStock}
                    type="button"
                    onClick={() => onAdd(product)}
                  >
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          alt={product.name}
                          className="h-full w-full object-contain p-0.5"
                          loading="lazy"
                          src={product.imageUrl}
                        />
                      ) : (
                        <Package className="text-slate-300" size={18} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs sm:text-sm font-bold text-ink">
                        {product.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-muted truncate">
                          {product.sku}
                        </span>
                        {categoryName && (
                          <span className="inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 truncate max-w-[110px]">
                            {categoryName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-sm font-bold tabular-nums text-brand-900">
                        {formatCurrency(Number(product.sellingPrice) || 0)}
                      </span>
                      {product.productType === 'stock' ? (
                        <span
                          className={`block text-[11px] ${
                            outOfStock ? 'text-danger-text font-bold' : 'text-muted'
                          }`}
                        >
                          {outOfStock
                            ? 'Out of stock'
                            : `${formatQuantity(product.stock?.availableQuantity)} left`}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
