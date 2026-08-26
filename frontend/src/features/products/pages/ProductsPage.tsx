import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { AlertOctagon, AlertTriangle, Archive, Boxes, FilterX, PackagePlus, RotateCcw, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { archiveProduct, createProduct, productQueryKeys, unarchiveProduct, updateProduct } from '@/features/products/api/productsApi'
import { ArchiveProductDialog } from '@/features/products/components/ArchiveProductDialog'
import { ProductDetailsDrawer } from '@/features/products/components/ProductDetailsDrawer'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { ProductTable, type EnrichedProduct } from '@/features/products/components/ProductTable'
import { UnarchiveProductDialog } from '@/features/products/components/UnarchiveProductDialog'
import { useCategoryOptions, useProducts, useUnitOptions } from '@/features/products/hooks/useProducts'
import { useReorderPolicies, useRestockingAlerts } from '@/features/restocking/hooks/useRestocking'
import { classifyProductStock } from '@/features/inventory/lib/stockClassification'
import type { Product, ProductFilters, ProductFormValues, ProductType } from '@/features/products/types/product'
import { useAuth } from '@/features/auth/AuthProvider'
import { type ApiError } from '@/shared/api/client'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/components/Toast'
import { cn } from '@/shared/lib/cn'

const PAGE_SIZE = 15

const defaultFilters: ProductFilters = {
  search: '',
  categoryId: 'all',
  productType: 'all',
  active: 'all',
  branchId: null,
  page: 1,
  perPage: 100, // Fetch full active catalog so client-side stock status filtering works across all 32 items
}

export default function ProductsPage() {
  const { session, hasPermission } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategoryId = searchParams.get('categoryId') || 'all'
  const initialSearch = searchParams.get('search') || ''
  const stockStatusParam = searchParams.get('stockStatus') || 'all'
  const tabParam = searchParams.get('view') === 'archived' ? 'archived' : 'active'

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>(tabParam)
  const [filters, setFilters] = useState<ProductFilters>(() => ({
    ...defaultFilters,
    categoryId: initialCategoryId,
    search: initialSearch,
    active: tabParam === 'archived' ? 'archived' : 'all',
  }))
  const [stockStatusFilter, setStockStatusFilter] = useState<string>(stockStatusParam)

  const defaultBranchId = (session?.user.branches.find((branch) => branch.isDefault) ?? session?.user.branches[0])?.id
  const { toast } = useToast()

  useEffect(() => {
    if (defaultBranchId && filters.branchId !== defaultBranchId) {
      setFilters((state) => ({ ...state, branchId: defaultBranchId }))
    }
  }, [defaultBranchId, filters.branchId])

  // Sync state if URL search param changes
  useEffect(() => {
    const currentCategory = searchParams.get('categoryId') || 'all'
    const currentStockStatus = searchParams.get('stockStatus') || 'all'
    const currentSearch = searchParams.get('search') ?? ''
    const currentView = searchParams.get('view') === 'archived' ? 'archived' : 'active'

    setActiveTab(currentView)
    setStockStatusFilter(currentStockStatus)
    setFilters((state) => {
      let changed = false
      const next = { ...state }
      if (next.search !== currentSearch) {
        next.search = currentSearch
        next.page = 1
        changed = true
      }
      if (next.categoryId !== currentCategory) {
        next.categoryId = currentCategory
        next.page = 1
        changed = true
      }
      const targetActive = currentView === 'archived' ? 'archived' : (state.active === 'archived' ? 'all' : state.active)
      if (next.active !== targetActive) {
        next.active = targetActive
        next.page = 1
        changed = true
      }
      return changed ? next : state
    })
  }, [searchParams])

  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>()
  const [editingProduct, setEditingProduct] = useState<Product | undefined>()
  const [archivingProduct, setArchivingProduct] = useState<Product | undefined>()
  const [unarchivingProduct, setUnarchivingProduct] = useState<Product | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const queryClient = useQueryClient()
  const productsQuery = useProducts(filters)
  const categoryOptionsQuery = useCategoryOptions()
  const unitOptionsQuery = useUnitOptions()

  // Query reorder policies and active restocking alerts for accurate stock categorization
  const reorderPoliciesQuery = useReorderPolicies({
    branchId: defaultBranchId ?? null,
    page: 1,
    perPage: 100,
  })

  const restockingAlertsQuery = useRestockingAlerts({
    branchId: defaultBranchId ?? null,
    status: 'active',
    severity: 'all',
    page: 1,
    perPage: 100,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() })
  }

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      invalidate()
      setIsFormOpen(false)
      toast({ title: 'Product created', description: 'New product added to catalog.', variant: 'success' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ product, values }: { product: Product; values: ProductFormValues }) => updateProduct(product, values),
    onSuccess: () => {
      invalidate()
      setIsFormOpen(false)
      setEditingProduct(undefined)
      toast({ title: 'Product updated', description: 'Product changes saved successfully.', variant: 'success' })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      invalidate()
      setArchivingProduct(undefined)
      toast({
        title: 'Product archived',
        description: 'The product was moved to the Archived tab. You can unarchive it anytime.',
        variant: 'success',
      })
    },
  })

  const unarchiveMutation = useMutation({
    mutationFn: (product: Product) => unarchiveProduct(product.id),
    onSuccess: (restored) => {
      invalidate()
      setUnarchivingProduct(undefined)
      toast({
        title: 'Product restored',
        description: `${restored.name} (${restored.sku}) is now active in the catalog!`,
        variant: 'success',
      })
    },
  })

  const error = (createMutation.error ?? updateMutation.error ?? archiveMutation.error ?? unarchiveMutation.error ?? productsQuery.error) as ApiError | null
  const rawProducts = productsQuery.data?.data ?? []
  const categoryOptions = categoryOptionsQuery.data ?? []
  const unitOptions = unitOptionsQuery.data ?? []

  // Classify each product as out_of_stock, low_stock, overstock, or optimal
  const enrichedProducts = useMemo<EnrichedProduct[]>(() => {
    const policies = reorderPoliciesQuery.data?.data ?? []
    const alerts = restockingAlertsQuery.data?.data ?? []

    return rawProducts.map((product) => ({
      ...product,
      computedStockStatus: classifyProductStock(product, policies, alerts),
    }))
  }, [rawProducts, reorderPoliciesQuery.data, restockingAlertsQuery.data])

  // STRICT Filter: Filter out non-matching products when stockStatusFilter is active
  const filteredProducts = useMemo(() => {
    return enrichedProducts.filter((product) => {
      // Category Filter
      if (filters.categoryId !== 'all' && product.category?.id !== filters.categoryId) {
        return false
      }
      // Product Type Filter
      if (filters.productType !== 'all' && product.productType !== filters.productType) {
        return false
      }
      // Search Filter
      if (filters.search) {
        const query = filters.search.toLowerCase().trim()
        const nameMatch = product.name.toLowerCase().includes(query)
        const skuMatch = product.sku.toLowerCase().includes(query)
        if (!nameMatch && !skuMatch) return false
      }
      // Strict Stock Status Filter
      if (stockStatusFilter !== 'all') {
        if (product.computedStockStatus !== stockStatusFilter) {
          return false
        }
      }
      return true
    })
  }, [enrichedProducts, filters.categoryId, filters.productType, filters.search, stockStatusFilter])

  const totalMatchingProducts = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalMatchingProducts / PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)

  // Paginated slice for the current view
  const displayedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredProducts.slice(start, start + PAGE_SIZE)
  }, [filteredProducts, currentPage])

  const updateFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) =>
    setFilters((state) => ({ ...state, [key]: value, page: key === 'page' ? Number(value) : 1 }))

  const handleTabChange = (tab: 'active' | 'archived') => {
    setActiveTab(tab)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'archived') {
        next.set('view', 'archived')
      } else {
        next.delete('view')
      }
      return next
    })
    setFilters((state) => ({
      ...state,
      active: tab === 'archived' ? 'archived' : 'all',
      page: 1,
    }))
  }

  const handleCategoryFilterChange = (categoryId: string) => {
    updateFilter('categoryId', categoryId)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (categoryId === 'all') {
        next.delete('categoryId')
      } else {
        next.set('categoryId', categoryId)
      }
      return next
    })
  }

  const handleStockStatusFilterChange = (newStatus: string) => {
    setStockStatusFilter(newStatus)
    setFilters((state) => ({ ...state, page: 1 }))
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newStatus === 'all') {
        next.delete('stockStatus')
      } else {
        next.set('stockStatus', newStatus)
      }
      return next
    })
  }

  const openCreate = () => {
    setEditingProduct(undefined)
    setIsFormOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const save = (values: ProductFormValues) =>
    editingProduct ? updateMutation.mutate({ product: editingProduct, values }) : createMutation.mutate(values)

  const isArchivedView = activeTab === 'archived'

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          !isArchivedView && hasPermission('catalog.products.manage') ? (
            <Button onClick={openCreate}>
              <PackagePlus aria-hidden="true" size={18} /> New Product
            </Button>
          ) : undefined
        }
        description="Catalog of items available for sale, assembly, and replenishment tracking."
        title="Products"
      />

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-text" role="alert">
          {error.message}
          {error.requestId ? ` Request ID: ${error.requestId}` : ''}
        </div>
      ) : null}

      {/* Top Catalog & Archive Navigation Tabs */}
      <nav aria-label="Product views" className="flex gap-2 border-b border-border">
        <button
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'active'
              ? 'border-brand-600 text-brand-700 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
          type="button"
          onClick={() => handleTabChange('active')}
        >
          📦 Active Products
        </button>

        <button
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'archived'
              ? 'border-brand-600 text-brand-700 font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
          type="button"
          onClick={() => handleTabChange('archived')}
        >
          <Archive size={15} />
          🗄️ Archived Products
        </button>
      </nav>

      {/* Archived Notice Banner */}
      {isArchivedView && (
        <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-100/90 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
              <Archive size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Archived Products Storage
              </p>
              <p className="text-xs text-slate-600">
                These products are retired from active sales. You can restore/unarchive any product anytime using the <strong>Unarchive</strong> button.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Controls Bar */}
      <section className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-panel sm:p-6 md:grid-cols-[minmax(0,1fr)_200px_180px_180px]">
        {/* Search */}
        <label className="relative block">
          <span className="sr-only">Search products</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            placeholder="Search by product name or SKU"
            type="search"
            value={filters.search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateFilter('search', event.target.value)}
          />
        </label>

        {/* Stock Level Filter */}
        <select
          aria-label="Filter by stock status"
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm font-medium outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          value={stockStatusFilter}
          onChange={(event) => handleStockStatusFilterChange(event.target.value)}
        >
          <option value="all">All stock levels</option>
          <option value="low_stock">⚠️ Low stock only</option>
          <option value="overstock">📦 Overstocked only</option>
          <option value="out_of_stock">🚫 Out of stock only</option>
        </select>

        {/* Categories */}
        <select
          aria-label="Filter by category"
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          value={filters.categoryId}
          onChange={(event) => handleCategoryFilterChange(event.target.value)}
        >
          <option value="all">All categories</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {/* Product Type */}
        <select
          aria-label="Filter by product type"
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          value={filters.productType}
          onChange={(event) => updateFilter('productType', event.target.value as ProductType | 'all')}
        >
          <option value="all">All product types</option>
          <option value="stock">Stock product</option>
          <option value="service">Service</option>
        </select>
      </section>

      {/* Prominent Active Filter Banner */}
      {stockStatusFilter !== 'all' && (
        <div
          className={cn(
            'flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between',
            stockStatusFilter === 'low_stock' && 'border-amber-300 bg-amber-50/95 text-amber-950',
            stockStatusFilter === 'overstock' && 'border-indigo-300 bg-indigo-50/95 text-indigo-950',
            stockStatusFilter === 'out_of_stock' && 'border-rose-300 bg-rose-50/95 text-rose-950',
          )}
        >
          <div className="flex items-center gap-3">
            {stockStatusFilter === 'low_stock' && <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-600" />}
            {stockStatusFilter === 'overstock' && <Boxes aria-hidden="true" className="h-5 w-5 shrink-0 text-indigo-600" />}
            {stockStatusFilter === 'out_of_stock' && <AlertOctagon aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-600" />}

            <div>
              <p className="text-sm font-bold">
                {stockStatusFilter === 'low_stock' && `Low Stock Filter: Showing ${totalMatchingProducts} low-stock product${totalMatchingProducts === 1 ? '' : 's'}`}
                {stockStatusFilter === 'overstock' && `Overstock Filter: Showing ${totalMatchingProducts} overstocked product${totalMatchingProducts === 1 ? '' : 's'}`}
                {stockStatusFilter === 'out_of_stock' && `Out of Stock Filter: Showing ${totalMatchingProducts} out-of-stock product${totalMatchingProducts === 1 ? '' : 's'}`}
              </p>
              <p className="text-xs opacity-85">
                {stockStatusFilter === 'low_stock' && 'Only products at or below their reorder point are displayed.'}
                {stockStatusFilter === 'overstock' && 'Only products exceeding their standard economic order batch are displayed.'}
                {stockStatusFilter === 'out_of_stock' && 'Only products with zero available stock are displayed.'}
              </p>
            </div>
          </div>

          <Button
            className="shrink-0 bg-white/90 px-3 py-1 text-xs font-bold text-slate-800 shadow-xs hover:bg-white"
            variant="secondary"
            onClick={() => handleStockStatusFilterChange('all')}
          >
            <FilterX aria-hidden="true" size={14} /> Clear filter / Show all
          </Button>
        </div>
      )}

      {/* Counter & Status Header */}
      <div className="flex items-center justify-between text-sm text-muted">
        <p>
          Showing <strong>{displayedProducts.length}</strong> of <strong>{totalMatchingProducts}</strong> {isArchivedView ? 'archived' : 'active'} products
          {stockStatusFilter !== 'all' ? ` (${totalMatchingProducts} filtered)` : ''}
        </p>
        <p>{productsQuery.isFetching ? 'Updating…' : 'Live catalog sync'}</p>
      </div>

      {/* Product Table with Filtered Results */}
      <ProductTable
        isArchivedView={isArchivedView}
        products={displayedProducts}
        onArchive={setArchivingProduct}
        onEdit={openEdit}
        onUnarchive={setUnarchivingProduct}
        onView={setSelectedProduct}
      />

      {/* Pagination */}
      <nav aria-label="Product pagination" className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button disabled={currentPage <= 1} variant="secondary" onClick={() => updateFilter('page', currentPage - 1)}>
            Previous
          </Button>
          <Button disabled={currentPage >= totalPages} variant="secondary" onClick={() => updateFilter('page', currentPage + 1)}>
            Next
          </Button>
        </div>
      </nav>

      {/* Modals & Drawers */}
      {selectedProduct ? <ProductDetailsDrawer product={selectedProduct} onClose={() => setSelectedProduct(undefined)} onEdit={openEdit} /> : null}
      {isFormOpen ? (
        <ProductFormDialog
          categoryOptions={categoryOptions}
          isSaving={createMutation.isPending || updateMutation.isPending}
          product={editingProduct}
          unitOptions={unitOptions}
          onClose={() => {
            setIsFormOpen(false)
            setEditingProduct(undefined)
          }}
          onSave={save}
        />
      ) : null}
      {archivingProduct ? (
        <ArchiveProductDialog
          isArchiving={archiveMutation.isPending}
          product={archivingProduct}
          onClose={() => setArchivingProduct(undefined)}
          onConfirm={() => archiveMutation.mutate(archivingProduct)}
        />
      ) : null}
      {unarchivingProduct ? (
        <UnarchiveProductDialog
          isRestoring={unarchiveMutation.isPending}
          product={unarchivingProduct}
          onClose={() => setUnarchivingProduct(undefined)}
          onConfirm={() => unarchiveMutation.mutate(unarchivingProduct)}
        />
      ) : null}
    </div>
  )
}
