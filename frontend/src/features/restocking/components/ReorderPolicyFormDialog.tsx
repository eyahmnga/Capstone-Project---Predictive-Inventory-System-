import { type FormEvent, useState } from 'react'
import { Check, Edit3, PlusCircle, X } from 'lucide-react'
import type {
  CreateReorderPolicyPayload,
  LeadTimeBasis,
  ReorderPolicy,
  SafetyStockBasis,
  UpdateReorderPolicyPayload,
} from '@/features/restocking/types/restocking'
import { Button } from '@/shared/components/Button'
import { Portal } from '@/shared/components/Portal'
import { SearchableProductSelect } from '@/shared/components/SearchableProductSelect'
import { confirmDialogOverlayClass, confirmDialogPanelClass } from '@/shared/lib/modalClasses'

type ProductOption = { id: string; sku: string; name: string }

type ReorderPolicyFormDialogProps = {
  productOptions: ProductOption[]
  defaultProductId?: string
  policy?: ReorderPolicy
  isSaving: boolean
  onClose: () => void
  onSave?: (payload: Omit<CreateReorderPolicyPayload, 'branchId'>) => void
  onUpdate?: (payload: UpdateReorderPolicyPayload) => void
}

export function ReorderPolicyFormDialog({
  productOptions,
  defaultProductId,
  policy,
  isSaving,
  onClose,
  onSave,
  onUpdate,
}: ReorderPolicyFormDialogProps) {
  const isEditMode = Boolean(policy)

  const [productId, setProductId] = useState(policy?.productId ?? defaultProductId ?? '')
  const [safetyStockQuantity, setSafetyStockQuantity] = useState(policy?.safetyStockQuantity ?? '0')
  const [safetyStockBasis, setSafetyStockBasis] = useState<SafetyStockBasis>(
    policy?.safetyStockBasis ?? 'policy_minimum',
  )
  const [leadTimeDaysOverride, setLeadTimeDaysOverride] = useState(
    policy?.leadTimeDaysOverride ?? '',
  )
  const [leadTimeBasis, setLeadTimeBasis] = useState<LeadTimeBasis>(
    policy?.leadTimeBasis ?? 'product_default',
  )
  const [isActive, setIsActive] = useState<boolean>(policy?.isActive ?? true)

  const isValid = (isEditMode || productId !== '') && safetyStockQuantity !== ''

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isEditMode && policy && onUpdate) {
      onUpdate({
        safetyStockQuantity,
        safetyStockBasis,
        leadTimeDaysOverride: leadTimeDaysOverride || null,
        leadTimeBasis: leadTimeDaysOverride ? 'override' : leadTimeBasis,
        isActive,
        version: policy.version,
      })
    } else if (onSave) {
      onSave({
        productId,
        safetyStockQuantity,
        safetyStockBasis,
        leadTimeDaysOverride: leadTimeDaysOverride || undefined,
        leadTimeBasis: leadTimeDaysOverride ? 'override' : leadTimeBasis,
      })
    }
  }

  return (
    <Portal>
      <div className={confirmDialogOverlayClass} role="presentation">
        <section
          aria-labelledby="reorder-policy-form-title"
          aria-modal="true"
          className={confirmDialogPanelClass('max-w-lg')}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isEditMode ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {isEditMode ? <Edit3 size={18} /> : <PlusCircle size={18} />}
              </div>
              <div>
                <h2 id="reorder-policy-form-title" className="text-lg font-bold text-ink">
                  {isEditMode ? 'Edit Reorder Policy' : 'Create Reorder Policy'}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {isEditMode
                    ? `Update safety buffer or lead time for ${policy?.productName ?? 'product'}`
                    : 'The reorder point is calculated automatically, never entered directly.'}
                </p>
              </div>
            </div>
            <Button aria-label="Close dialog" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={submit}>
            {/* Product selection (readonly in edit mode) */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700" htmlFor="product-select">
                Product
              </label>
              {isEditMode ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm">
                  <p className="font-bold text-slate-800">{policy?.productName}</p>
                  <p className="font-mono text-xs text-slate-500">{policy?.productSku}</p>
                </div>
              ) : (
                <SearchableProductSelect
                  id="product-select"
                  options={productOptions}
                  placeholder="Search product name or SKU..."
                  required
                  value={productId}
                  onChange={setProductId}
                />
              )}
            </div>

            {/* Safety Stock */}
            <label className="text-xs font-bold text-slate-700">
              Safety stock quantity (Emergency buffer)
              <input
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                min="0"
                required
                step="any"
                type="number"
                value={safetyStockQuantity}
                onChange={(event) => setSafetyStockQuantity(event.target.value)}
              />
            </label>

            {/* Safety Stock Basis */}
            <label className="text-xs font-bold text-slate-700">
              Safety stock basis
              <select
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                value={safetyStockBasis}
                onChange={(event) => setSafetyStockBasis(event.target.value as SafetyStockBasis)}
              >
                <option value="policy_minimum">Policy minimum (Default)</option>
                <option value="service_level">Service level (Automated target)</option>
                <option value="manual_override">Manual override</option>
              </select>
            </label>

            {/* Lead Time Override */}
            <label className="text-xs font-bold text-slate-700">
              Supplier Delivery Lead Time (days)
              <span className="block text-[10px] font-normal text-slate-400">
                Number of days it takes for new stock to arrive after placing an order.
              </span>
              <input
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                min="0"
                placeholder="e.g. 3"
                step="0.01"
                type="number"
                value={leadTimeDaysOverride}
                onChange={(event) => setLeadTimeDaysOverride(event.target.value)}
              />
            </label>

            {/* Active / Inactive toggle if in edit mode */}
            {isEditMode && (
              <label className="text-xs font-bold text-slate-700">
                Policy Active Status
                <select
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                >
                  <option value="active">Active (Restock alerts enabled)</option>
                  <option value="inactive">Inactive (Paused)</option>
                </select>
              </label>
            )}

            {/* Actions */}
            <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!isValid || isSaving} type="submit">
                {isSaving
                  ? isEditMode
                    ? 'Saving Changes…'
                    : 'Creating…'
                  : isEditMode
                  ? 'Save Changes'
                  : 'Create Reorder Policy'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </Portal>
  )
}
