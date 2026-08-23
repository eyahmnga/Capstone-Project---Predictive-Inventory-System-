import { Archive, Edit3, Package, PackagePlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Category } from '@/features/categories/types/category'
import { Button } from '@/shared/components/Button'
import { RecordCard } from '@/shared/components/RecordCard'
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from '@/shared/components/Table'

const statusBadge = (isActive: boolean) => (
  <span
    className={
      isActive
        ? 'inline-flex rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success-text'
        : 'inline-flex rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold text-muted'
    }
  >
    {isActive ? 'Active' : 'Inactive'}
  </span>
)

type CategoryTableProps = {
  categories: Category[]
  onEdit: (category: Category) => void
  onArchive: (category: Category) => void
  onAddProduct?: (category: Category) => void
}

export function CategoryTable({ categories, onEdit, onArchive, onAddProduct }: CategoryTableProps) {
  return (
    <>
      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {categories.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">
            No categories match these filters.
          </p>
        ) : (
          categories.map((category) => (
            <RecordCard
              key={category.id}
              badge={statusBadge(category.isActive)}
              title={
                <Link
                  className="font-semibold text-ink transition hover:text-brand-600 hover:underline"
                  title={`View products in ${category.name}`}
                  to={`/products?categoryId=${category.id}`}
                >
                  {category.name}
                </Link>
              }
              subtitle={category.description ?? undefined}
              fields={[
                { label: 'Code', value: <span className="font-mono">{category.code}</span> },
                { label: 'Parent', value: category.parentName ?? 'Top level' },
                {
                  label: 'Products',
                  value: (
                    <Link
                      className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                      to={`/products?categoryId=${category.id}`}
                    >
                      <Package size={14} />
                      {category.productCount} products
                    </Link>
                  ),
                },
              ]}
              actions={
                <>
                  {onAddProduct && (
                    <Button
                      aria-label={`Add product in ${category.name}`}
                      size="icon"
                      title="Add product to this category"
                      variant="ghost"
                      onClick={() => onAddProduct(category)}
                    >
                      <PackagePlus aria-hidden="true" size={16} />
                    </Button>
                  )}
                  <Button aria-label={`Edit ${category.name}`} size="icon" variant="ghost" onClick={() => onEdit(category)}>
                    <Edit3 aria-hidden="true" size={16} />
                  </Button>
                  <Button
                    aria-label={`Archive ${category.name}`}
                    size="icon"
                    variant="ghost"
                    onClick={() => onArchive(category)}
                  >
                    <Archive aria-hidden="true" size={16} />
                  </Button>
                </>
              }
            />
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table minWidth={800}>
          <TableHead>
            <tr>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Code</TableHeaderCell>
              <TableHeaderCell>Parent</TableHeaderCell>
              <TableHeaderCell align="right">Products</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {categories.length === 0 ? (
              <TableEmptyState colSpan={6}>No categories match these filters.</TableEmptyState>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Link
                      className="group/cat block text-left outline-none"
                      title={`View all products in ${category.name}`}
                      to={`/products?categoryId=${category.id}`}
                    >
                      <p className="font-semibold text-ink group-hover/cat:text-brand-600 group-hover/cat:underline transition">
                        {category.name}
                      </p>
                      {category.description ? (
                        <p className="mt-0.5 text-xs text-muted">{category.description}</p>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted">{category.code}</TableCell>
                  <TableCell className="text-muted">{category.parentName ?? 'Top level'}</TableCell>
                  <TableCell align="right">
                    <Link
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 transition hover:bg-brand-50 hover:text-brand-700"
                      title={`View ${category.productCount} product(s) in ${category.name}`}
                      to={`/products?categoryId=${category.id}`}
                    >
                      <Package size={13} className="text-slate-400" />
                      {category.productCount}
                    </Link>
                  </TableCell>
                  <TableCell>{statusBadge(category.isActive)}</TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1">
                      {onAddProduct && (
                        <Button
                          aria-label={`Add product in ${category.name}`}
                          size="icon"
                          title="Add product to this category"
                          variant="ghost"
                          onClick={() => onAddProduct(category)}
                        >
                          <PackagePlus aria-hidden="true" size={16} />
                        </Button>
                      )}
                      <Button
                        aria-label={`Edit ${category.name}`}
                        size="icon"
                        title="Edit category"
                        variant="ghost"
                        onClick={() => onEdit(category)}
                      >
                        <Edit3 aria-hidden="true" size={16} />
                      </Button>
                      <Button
                        aria-label={`Archive ${category.name}`}
                        size="icon"
                        title="Archive category"
                        variant="ghost"
                        onClick={() => onArchive(category)}
                      >
                        <Archive aria-hidden="true" size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
