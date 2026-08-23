import { RotateCcw, X } from 'lucide-react'
import type { Product } from '@/features/products/types/product'
import { Button } from '@/shared/components/Button'
import { Portal } from '@/shared/components/Portal'
import { confirmDialogOverlayClass, confirmDialogPanelClass } from '@/shared/lib/modalClasses'

export function UnarchiveProductDialog({
  product,
  isRestoring,
  onClose,
  onConfirm,
}: {
  product: Product
  isRestoring: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Portal>
      <div className={confirmDialogOverlayClass} role="presentation">
        <section
          aria-labelledby="unarchive-product-title"
          aria-modal="true"
          className={confirmDialogPanelClass('max-w-md')}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <RotateCcw size={18} />
              </span>
              <h2 id="unarchive-product-title" className="text-lg font-bold text-ink">
                Unarchive product
              </h2>
            </div>
            <Button aria-label="Close dialog" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>

          <p className="mt-3 text-sm text-muted">
            Restore <strong className="text-ink">{product.name}</strong> (
            <span className="font-mono text-xs">{product.sku}</span>) back into your active catalog?
          </p>
          <p className="mt-2 text-xs text-slate-500">
            This product will immediately become available again for sales, POS orders, stock balances, and restocking planning.
          </p>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              disabled={isRestoring}
              onClick={onConfirm}
            >
              {isRestoring ? 'Restoring…' : 'Restore / Unarchive'}
            </Button>
          </div>
        </section>
      </div>
    </Portal>
  )
}
