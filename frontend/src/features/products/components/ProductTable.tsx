import { Archive, Edit3, PanelRightOpen, RotateCcw } from 'lucide-react'
import type { Product } from '@/features/products/types/product'
import { type ComputedStockStatus, StockBadge } from '@/features/products/components/StockBadge'
import { Avatar } from '@/shared/components/Avatar'
import { Button } from '@/shared/components/Button'
import { RecordCard } from '@/shared/components/RecordCard'
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from '@/shared/components/Table'
import { formatQuantity } from '@/shared/lib/formatters'
import { cn } from '@/shared/lib/cn'

export type EnrichedProduct = Product & {
  computedStockStatus?: ComputedStockStatus
}

type ProductTableProps = {
  products: EnrichedProduct[]
  isArchivedView?: boolean
  onEdit: (product: Product) => void
  onView: (product: Product) => void
  onArchive?: (product: Product) => void
  onUnarchive?: (product: Product) => void
}

export function ProductTable({
  products,
  isArchivedView = false,
  onEdit,
  onView,
  onArchive,
  onUnarchive,
}: ProductTableProps) {
  return (
    <>
      {/* Mobile: card list (no horizontal scroll) */}
      <div className="space-y-3 md:hidden">
        {products.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">
            {isArchivedView ? 'No archived products found.' : 'No products match these filters.'}
          </p>
        ) : (
          products.map((product) => {
            const status = product.computedStockStatus
            const mobileCardHighlight = cn(
              status === 'low_stock' && 'border-l-4 border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-200/60',
              status === 'overstock' && 'border-l-4 border-indigo-500 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-200/60',
              status === 'out_of_stock' && 'border-l-4 border-rose-500 bg-rose-50/60 shadow-sm ring-1 ring-rose-200/60',
              isArchivedView && 'opacity-90 bg-slate-50/80 border-slate-300',
            )

            return (
              <div key={product.id} className={mobileCardHighlight}>
                <RecordCard
                  ariaLabel={`View ${product.name}`}
                  badge={
                    isArchivedView ? (
                      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                        Archived
                      </span>
                    ) : (
                      <StockBadge computedStatus={product.computedStockStatus} stock={product.stock} />
                    )
                  }
                  title={
                    <span className="flex items-center gap-3">
                      <Avatar className="rounded-md" name={product.name} size="sm" src={product.imageUrl} />
                      <span className="truncate">{product.name}</span>
                    </span>
                  }
                  subtitle={<span className="font-mono">{product.sku}</span>}
                  fields={[
                    { label: 'Category', value: product.category?.name ?? '—' },
                    { label: 'Unit', value: product.stockUnit?.symbol ?? '—' },
                    { label: 'Price', value: formatQuantity(product.sellingPrice) },
                    {
                      label: 'State',
                      value: isArchivedView ? (
                        <span className="font-semibold text-slate-500">Archived</span>
                      ) : product.isActive ? (
                        'Active'
                      ) : (
                        'Inactive'
                      ),
                    },
                  ]}
                  actions={
                    isArchivedView ? (
                      <Button
                        aria-label={`Unarchive ${product.name}`}
                        className="text-emerald-700 hover:text-emerald-900 border-emerald-300 bg-emerald-50 text-xs font-bold"
                        size="sm"
                        variant="secondary"
                        onClick={() => onUnarchive?.(product)}
                      >
                        <RotateCcw aria-hidden="true" size={14} /> Unarchive
                      </Button>
                    ) : (
                      <>
                        <Button aria-label={`Edit ${product.name}`} size="icon" variant="ghost" onClick={() => onEdit(product)}>
                          <Edit3 aria-hidden="true" size={16} />
                        </Button>
                        <Button aria-label={`Archive ${product.name}`} size="icon" variant="ghost" onClick={() => onArchive?.(product)}>
                          <Archive aria-hidden="true" size={16} />
                        </Button>
                      </>
                    )
                  }
                  onClick={() => onView(product)}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Desktop: full table with prominent status row highlighting */}
      <div className="hidden md:block">
        <Table minWidth={950}>
          <TableHead>
            <tr>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>SKU</TableHeaderCell>
              <TableHeaderCell>Stock unit</TableHeaderCell>
              <TableHeaderCell align="right">Price</TableHeaderCell>
              <TableHeaderCell>Stock status</TableHeaderCell>
              <TableHeaderCell>State</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableEmptyState colSpan={8}>
                {isArchivedView ? 'No archived products found.' : 'No products match these filters.'}
              </TableEmptyState>
            ) : (
              products.map((product) => {
                const status = product.computedStockStatus

                // Contextual row highlighting
                const rowClass = cn(
                  status === 'low_stock' && 'bg-amber-500/10 hover:bg-amber-500/20 border-l-4 border-amber-500 font-medium',
                  status === 'overstock' && 'bg-indigo-500/10 hover:bg-indigo-500/20 border-l-4 border-indigo-500 font-medium',
                  status === 'out_of_stock' && 'bg-rose-500/10 hover:bg-rose-500/20 border-l-4 border-rose-500 font-medium',
                  isArchivedView && 'opacity-85 bg-slate-50/60',
                )

                return (
                  <TableRow key={product.id} className={rowClass}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="rounded-md" name={product.name} size="sm" src={product.imageUrl} />
                        <span
                          className={cn(
                            'font-semibold text-ink',
                            status === 'low_stock' && 'text-amber-950',
                            status === 'overstock' && 'text-indigo-950',
                            status === 'out_of_stock' && 'text-rose-950',
                            isArchivedView && 'text-slate-600 line-through',
                          )}
                        >
                          {product.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted">{product.category?.name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted">{product.sku}</TableCell>
                    <TableCell className="text-muted">{product.stockUnit?.symbol ?? '—'}</TableCell>
                    <TableCell align="right">{formatQuantity(product.sellingPrice)}</TableCell>
                    <TableCell>
                      {isArchivedView ? (
                        <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          Archived Item
                        </span>
                      ) : (
                        <StockBadge computedStatus={product.computedStockStatus} stock={product.stock} />
                      )}
                    </TableCell>
                    <TableCell>
                      {isArchivedView ? (
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Archived</span>
                      ) : (
                        <span className={product.isActive ? 'text-sm font-medium text-success-text' : 'text-sm font-medium text-muted'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end gap-1.5 items-center">
                        <Button aria-label={`View ${product.name}`} size="icon" variant="ghost" onClick={() => onView(product)}>
                          <PanelRightOpen aria-hidden="true" size={18} />
                        </Button>

                        {isArchivedView ? (
                          <Button
                            aria-label={`Unarchive ${product.name}`}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                            size="sm"
                            variant="secondary"
                            onClick={() => onUnarchive?.(product)}
                          >
                            <RotateCcw aria-hidden="true" size={13} />
                            Unarchive
                          </Button>
                        ) : (
                          <>
                            <Button aria-label={`Edit ${product.name}`} size="icon" variant="ghost" onClick={() => onEdit(product)}>
                              <Edit3 aria-hidden="true" size={16} />
                            </Button>
                            <Button aria-label={`Archive ${product.name}`} size="icon" variant="ghost" onClick={() => onArchive?.(product)}>
                              <Archive aria-hidden="true" size={16} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
