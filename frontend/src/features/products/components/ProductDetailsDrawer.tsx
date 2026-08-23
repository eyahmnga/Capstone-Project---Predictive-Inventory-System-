import { Image as ImageIcon, X } from 'lucide-react'
import type { Product } from '@/features/products/types/product'
import { StockBadge } from '@/features/products/components/StockBadge'
import { Button } from '@/shared/components/Button'
import { drawerOverlayClass, drawerPanelClass } from '@/shared/lib/modalClasses'
import { formatQuantity } from '@/shared/lib/formatters'
import { Portal } from '@/shared/components/Portal'

export function ProductDetailsDrawer({
  product,
  onClose,
  onEdit,
}: {
  product: Product
  onClose: () => void
  onEdit: (product: Product) => void
}) {
  return (
    <Portal>
      <div className={drawerOverlayClass} role="presentation" onMouseDown={onClose}>
        <aside
          aria-labelledby="product-details-title"
          aria-modal="true"
          className={drawerPanelClass('sm:max-w-xl')}
          role="dialog"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-6">
            <div>
              <p className="font-mono text-xs text-muted">{product.sku}</p>
              <h2 id="product-details-title" className="mt-1 text-xl font-bold tracking-tight text-ink">
                {product.name}
              </h2>
              <div className="mt-3">
                <StockBadge stock={product.stock} />
              </div>
            </div>
            <Button aria-label="Close product details" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
            {/* Product Image Section */}
            {product.imageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-slate-50 p-2 shadow-xs">
                <img
                  alt={product.name}
                  className="h-48 w-full rounded-xl object-contain bg-white"
                  src={product.imageUrl}
                />
              </div>
            ) : (
              <div className="flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-slate-50 text-muted">
                <ImageIcon aria-hidden="true" size={32} />
                <span className="mt-2 text-xs font-medium">No product photo uploaded</span>
              </div>
            )}

            <section>
              <h3 className="text-sm font-semibold text-ink">Inventory position</h3>
              {product.stock ? (
                <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Detail label="On hand" value={formatQuantity(product.stock.onHandQuantity)} />
                  <Detail label="Available" value={formatQuantity(product.stock.availableQuantity)} />
                  <Detail label="Incoming" value={formatQuantity(product.stock.incomingQuantity)} />
                  <Detail
                    label="Last movement"
                    value={
                      product.stock.lastMovementAt
                        ? new Date(product.stock.lastMovementAt).toLocaleString()
                        : 'No movements yet'
                    }
                  />
                </dl>
              ) : (
                <p className="mt-2 text-sm text-muted">Inventory balance is not shown here without a branch scope.</p>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-ink">Product details</h3>
              <dl className="mt-3 space-y-3">
                <Detail label="Category" value={product.category?.name ?? 'Uncategorized'} />
                <Detail
                  label="Stock unit"
                  value={product.stockUnit ? `${product.stockUnit.code} (${product.stockUnit.symbol})` : '—'}
                />
                <Detail label="Product type" value={product.productType.replace('_', ' ')} />
                <Detail label="Tax rate" value={`${Number(product.defaultTaxRate).toFixed(2)}%`} />
                <Detail label="Status" value={product.isActive ? 'Active' : 'Inactive'} />
                {product.description ? <Detail label="Description" value={product.description} /> : null}
              </dl>
            </section>
          </div>

          <footer className="border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
            <Button className="w-full" onClick={() => onEdit(product)}>
              Edit product
            </Button>
          </footer>
        </aside>
      </div>
    </Portal>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 capitalize text-sm text-ink">{value}</dd>
    </div>
  )
}
