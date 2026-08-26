import { Calculator, Edit3, PlusCircle } from 'lucide-react'
import type { Product } from '@/features/products/types/product'
import type { ReorderPolicy } from '@/features/restocking/types/restocking'
import { Button } from '@/shared/components/Button'
import { RecordCard } from '@/shared/components/RecordCard'
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/shared/components/Table'
import { formatQuantity } from '@/shared/lib/formatters'

type AllRestockingProductsTableProps = {
  products: Product[]
  policyMap: Map<string, ReorderPolicy>
  onViewPolicy: (policy: ReorderPolicy) => void
  onEditPolicy?: (policy: ReorderPolicy) => void
  onCreatePolicy: (productId: string) => void
}

export function AllRestockingProductsTable({
  products,
  policyMap,
  onViewPolicy,
  onEditPolicy,
  onCreatePolicy,
}: AllRestockingProductsTableProps) {
  return (
    <>
      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {products.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">
            No products match the search criteria.
          </p>
        ) : (
          products.map((product) => {
            const policy = policyMap.get(product.id)
            const hasPolicy = Boolean(policy)
            return (
              <RecordCard
                key={product.id}
                ariaLabel={`View product ${product.name}`}
                badge={
                  hasPolicy ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      ● Active Policy
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                      ● No Policy
                    </span>
                  )
                }
                title={product.name}
                subtitle={<span className="font-mono">{product.sku}</span>}
                fields={[
                  { label: 'Category', value: product.category?.name ?? '—' },
                  {
                    label: 'Reorder Point (ROP)',
                    value: policy?.reorderPointQuantity
                      ? `Trigger ≤ ${formatQuantity(policy.reorderPointQuantity)}`
                      : '—',
                  },
                ]}
                actions={
                  policy && onEditPolicy ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditPolicy(policy)
                      }}
                    >
                      <Edit3 size={14} /> Edit
                    </Button>
                  ) : undefined
                }
                onClick={() => {
                  if (policy) {
                    onViewPolicy(policy)
                  } else {
                    onCreatePolicy(product.id)
                  }
                }}
              />
            )
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table minWidth={850}>
          <TableHead>
            <tr>
              <TableHeaderCell>Product & SKU</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell align="right">Safety Stock</TableHeaderCell>
              <TableHeaderCell align="right">Reorder Point (ROP)</TableHeaderCell>
              <TableHeaderCell>Policy Status</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableEmptyState colSpan={6}>No products match the search criteria.</TableEmptyState>
            ) : (
              products.map((product) => {
                const policy = policyMap.get(product.id)
                const hasPolicy = Boolean(policy)
                return (
                  <TableRow key={product.id} className="hover:bg-slate-50/70 transition">
                    <TableCell>
                      <p className="font-semibold text-ink">{product.name}</p>
                      <p className="font-mono text-xs text-muted">{product.sku}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {product.category?.name ?? 'Uncategorized'}
                      </span>
                    </TableCell>
                    <TableCell align="right" className="font-mono tabular-nums text-slate-700">
                      {policy?.safetyStockQuantity
                        ? `${formatQuantity(policy.safetyStockQuantity)} pcs`
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {policy?.reorderPointQuantity ? (
                        <div>
                          <span className="font-mono font-bold text-brand-700">
                            &le; {formatQuantity(policy.reorderPointQuantity)} pcs
                          </span>
                          <p className="text-[10px] text-slate-400">Order trigger</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasPolicy ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          ● Active Policy
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          ● No Policy
                        </span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end gap-1.5 items-center">
                        {policy ? (
                          <>
                            {onEditPolicy && (
                              <Button
                                aria-label={`Edit policy for ${product.name}`}
                                size="sm"
                                variant="secondary"
                                onClick={() => onEditPolicy(policy)}
                                className="text-xs font-semibold hover:border-slate-400"
                              >
                                <Edit3 size={13} className="text-slate-600" />
                                Edit
                              </Button>
                            )}
                            <Button
                              aria-label={`Calculate EOQ for ${product.name}`}
                              size="sm"
                              variant="secondary"
                              onClick={() => onViewPolicy(policy)}
                              className="text-xs font-semibold"
                            >
                              <Calculator size={14} className="text-blue-600" />
                              Calculate EOQ
                            </Button>
                          </>
                        ) : (
                          <Button
                            aria-label={`Set reorder policy for ${product.name}`}
                            size="sm"
                            onClick={() => onCreatePolicy(product.id)}
                            className="text-xs font-semibold"
                          >
                            <PlusCircle size={14} />
                            Set Policy
                          </Button>
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
