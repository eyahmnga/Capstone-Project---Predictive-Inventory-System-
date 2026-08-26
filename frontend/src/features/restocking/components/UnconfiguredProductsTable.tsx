import { PlusCircle } from 'lucide-react'
import type { Product } from '@/features/products/types/product'
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

type UnconfiguredProductsTableProps = {
  products: Product[]
  onCreatePolicy: (productId: string) => void
}

export function UnconfiguredProductsTable({
  products,
  onCreatePolicy,
}: UnconfiguredProductsTableProps) {
  return (
    <>
      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {products.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">
            All catalog products currently have an active reorder policy!
          </p>
        ) : (
          products.map((product) => (
            <RecordCard
              key={product.id}
              ariaLabel={`Set policy for ${product.name}`}
              badge={
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  ● No Policy
                </span>
              }
              title={product.name}
              subtitle={<span className="font-mono">{product.sku}</span>}
              fields={[
                { label: 'Category', value: product.category?.name ?? '—' },
                {
                  label: 'Current Stock',
                  value: `${formatQuantity(product.stock?.onHandQuantity ?? 0)} ${product.stockUnit?.code ?? 'pcs'}`,
                },
              ]}
              onClick={() => onCreatePolicy(product.id)}
            />
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table minWidth={800}>
          <TableHead>
            <tr>
              <TableHeaderCell>Product & SKU</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell align="right">Current On-Hand Stock</TableHeaderCell>
              <TableHeaderCell>Policy Status</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableEmptyState colSpan={5}>
                All catalog products currently have an active reorder policy!
              </TableEmptyState>
            ) : (
              products.map((product) => {
                const onHand = Number(product.stock?.onHandQuantity ?? 0)
                const isOutOfStock = onHand <= 0
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
                      {isOutOfStock ? (
                        <span className="inline-flex rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="font-bold text-ink">
                          {formatQuantity(product.stock?.onHandQuantity ?? 0)}{' '}
                          {product.stockUnit?.code ?? 'pcs'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        ● No Policy
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end">
                        <Button
                          aria-label={`Set reorder policy for ${product.name}`}
                          size="sm"
                          onClick={() => onCreatePolicy(product.id)}
                          className="text-xs font-semibold"
                        >
                          <PlusCircle size={14} />
                          Set Policy
                        </Button>
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
