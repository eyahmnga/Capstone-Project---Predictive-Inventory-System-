import { type ChangeEvent, useMemo, useState } from 'react'
import { FolderPlus, PackagePlus, Search } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { archiveCategory, categoryQueryKeys, createCategory, updateCategory } from '@/features/categories/api/categoriesApi'
import { ArchiveCategoryDialog } from '@/features/categories/components/ArchiveCategoryDialog'
import { CategoryFormDialog } from '@/features/categories/components/CategoryFormDialog'
import { CategoryTable } from '@/features/categories/components/CategoryTable'
import { useCategories } from '@/features/categories/hooks/useCategories'
import type { Category, CategoryFilters, CategoryFormValues } from '@/features/categories/types/category'
import { createProduct, productQueryKeys } from '@/features/products/api/productsApi'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { useCategoryOptions, useUnitOptions } from '@/features/products/hooks/useProducts'
import type { ProductFormValues } from '@/features/products/types/product'
import { type ApiError } from '@/shared/api/client'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/shared/components/Toast'

const defaultFilters: CategoryFilters = { search: '', parent: 'all', active: 'all', page: 1, perPage: 10 }
const parentOptionFilters: CategoryFilters = { search: '', parent: 'all', active: 'active', page: 1, perPage: 100 }

export default function CategoriesPage() {
  const { hasPermission } = useAuth()
  const { toast } = useToast()
  const [filters, setFilters] = useState<CategoryFilters>(defaultFilters)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()
  const [archivingCategory, setArchivingCategory] = useState<Category | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Product Form creation state
  const [isProductFormOpen, setIsProductFormOpen] = useState(false)
  const [selectedCategoryIdForProduct, setSelectedCategoryIdForProduct] = useState<string | undefined>()

  const queryClient = useQueryClient()
  const categoriesQuery = useCategories(filters)
  const parentOptionsQuery = useCategories(parentOptionFilters)
  const categoryOptionsQuery = useCategoryOptions()
  const unitOptionsQuery = useUnitOptions()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: categoryQueryKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() })
  }

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void invalidate()
      setIsFormOpen(false)
      toast({ title: 'Category created', description: 'Category added successfully', variant: 'success' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ category, values }: { category: Category; values: CategoryFormValues }) =>
      updateCategory(category, values),
    onSuccess: () => {
      void invalidate()
      setIsFormOpen(false)
      setEditingCategory(undefined)
      toast({ title: 'Category updated', description: 'Category updated successfully', variant: 'success' })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveCategory,
    onSuccess: () => {
      void invalidate()
      setArchivingCategory(undefined)
      toast({ title: 'Category archived', description: 'Category archived successfully', variant: 'success' })
    },
  })

  // Product creation mutation
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      void invalidate()
      setIsProductFormOpen(false)
      setSelectedCategoryIdForProduct(undefined)
      toast({
        title: 'Product created',
        description: `${product.name} (${product.sku}) was added to catalog`,
        variant: 'success',
      })
    },
  })

  const totalPages = Math.max(1, Math.ceil((categoriesQuery.data?.meta.total ?? 0) / filters.perPage))
  const error = (createMutation.error ??
    updateMutation.error ??
    archiveMutation.error ??
    createProductMutation.error) as ApiError | null
  const categories = categoriesQuery.data?.data ?? []
  const parentOptions = parentOptionsQuery.data?.data ?? []
  const previewMode = categoriesQuery.isPlaceholderData
  const resultLabel = useMemo(
    () => `${categoriesQuery.data?.meta.total ?? 0} categor${(categoriesQuery.data?.meta.total ?? 0) === 1 ? 'y' : 'ies'}`,
    [categoriesQuery.data?.meta.total],
  )

  const updateFilter = <K extends keyof CategoryFilters>(key: K, value: CategoryFilters[K]) =>
    setFilters((state) => ({ ...state, [key]: value, page: key === 'page' ? Number(value) : 1 }))

  const openCreate = () => {
    setEditingCategory(undefined)
    setIsFormOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  const openCreateProduct = (categoryId?: string) => {
    setSelectedCategoryIdForProduct(categoryId)
    setIsProductFormOpen(true)
  }

  const save = (values: CategoryFormValues) =>
    editingCategory ? updateMutation.mutate({ category: editingCategory, values }) : createMutation.mutate(values)

  const saveProduct = (values: ProductFormValues) => {
    createProductMutation.mutate(values)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Maintain product classification, hierarchy, and new-product eligibility."
        title="Category management"
        actions={
          <div className="flex items-center gap-2">
            {hasPermission('products.create') && (
              <Button variant="secondary" onClick={() => openCreateProduct()}>
                <PackagePlus aria-hidden="true" size={18} /> Add product
              </Button>
            )}
            <Button onClick={openCreate}>
              <FolderPlus aria-hidden="true" size={18} /> Create category
            </Button>
          </div>
        }
      />

      {previewMode ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-text">
          Preview categories are shown until the category-management API is available.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-text" role="alert">
          {error.message}
          {error.requestId ? ` Request ID: ${error.requestId}` : ''}
        </div>
      ) : null}

      <section className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-panel sm:p-6 md:grid-cols-[minmax(0,1fr)_180px_160px]">
        <label className="relative block">
          <span className="sr-only">Search categories</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            placeholder="Search by name or code"
            value={filters.search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateFilter('search', event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filter by parent</span>
          <select
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            value={filters.parent}
            onChange={(event) => updateFilter('parent', event.target.value)}
          >
            <option value="all">All categories</option>
            <option value="top_level">Top level only</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                Under {option.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            value={filters.active}
            onChange={(event) => updateFilter('active', event.target.value as CategoryFilters['active'])}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </section>

      <div className="flex items-center justify-between text-sm text-muted">
        <p>{resultLabel}</p>
        <p>{categoriesQuery.isFetching ? 'Updating…' : 'Server pagination enabled'}</p>
      </div>

      <CategoryTable
        categories={categories}
        onAddProduct={hasPermission('products.create') ? (cat) => openCreateProduct(cat.id) : undefined}
        onArchive={setArchivingCategory}
        onEdit={openEdit}
      />

      <nav aria-label="Category pagination" className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Page {filters.page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button disabled={filters.page <= 1} variant="secondary" onClick={() => updateFilter('page', filters.page - 1)}>
            Previous
          </Button>
          <Button disabled={filters.page >= totalPages} variant="secondary" onClick={() => updateFilter('page', filters.page + 1)}>
            Next
          </Button>
        </div>
      </nav>

      {isFormOpen ? (
        <CategoryFormDialog
          category={editingCategory}
          isSaving={createMutation.isPending || updateMutation.isPending}
          parentOptions={parentOptions}
          onClose={() => {
            setIsFormOpen(false)
            setEditingCategory(undefined)
          }}
          onSave={save}
        />
      ) : null}

      {isProductFormOpen ? (
        <ProductFormDialog
          categoryOptions={categoryOptionsQuery.data ?? []}
          initialCategoryId={selectedCategoryIdForProduct}
          isSaving={createProductMutation.isPending}
          unitOptions={unitOptionsQuery.data ?? []}
          onClose={() => {
            setIsProductFormOpen(false)
            setSelectedCategoryIdForProduct(undefined)
          }}
          onSave={saveProduct}
        />
      ) : null}

      {archivingCategory ? (
        <ArchiveCategoryDialog
          category={archivingCategory}
          isArchiving={archiveMutation.isPending}
          onClose={() => setArchivingCategory(undefined)}
          onConfirm={() => archiveMutation.mutate(archivingCategory)}
        />
      ) : null}
    </div>
  )
}
