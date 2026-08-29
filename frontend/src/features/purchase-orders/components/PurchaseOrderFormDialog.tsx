import { type FormEvent, useState } from 'react'
import { Building2, Plus, Trash2, Warehouse, X } from 'lucide-react'
import type { UnitOption } from '@/features/products/types/product'
import type { SupplierOption } from '@/features/suppliers/types/supplier'
import type { PurchaseOrderFormValues, PurchaseOrderLineInput } from '@/features/purchase-orders/types/purchaseOrder'
import { Button } from '@/shared/components/Button'
import { Portal } from '@/shared/components/Portal'
import { SearchableProductSelect } from '@/shared/components/SearchableProductSelect'
import { cn } from '@/shared/lib/cn'
import { cleanNumericInput } from '@/shared/lib/formatters'
import { modalOverlayClass, modalPanelClass, sheetBodyClass, sheetFooterClass, sheetHeaderClass } from '@/shared/lib/modalClasses'

type ProductOption = { id: string; sku: string; name: string }

type BranchOption = { id: string; code: string; name: string }

type PurchaseOrderFormDialogProps = {
  supplierOptions: SupplierOption[]
  productOptions: ProductOption[]
  unitOptions: UnitOption[]
  branchOptions?: BranchOption[]
  defaultBranchId?: string
  initialValues?: Partial<PurchaseOrderFormValues>
  isSaving: boolean
  onClose: () => void
  onSave: (values: PurchaseOrderFormValues) => void
}

const emptyLine: PurchaseOrderLineInput = { productId: '', unitId: '', orderedQuantity: '', unitCost: '', taxRate: '12', discountAmount: '0' }

export function PurchaseOrderFormDialog({
  supplierOptions,
  productOptions,
  unitOptions,
  branchOptions = [],
  defaultBranchId,
  initialValues,
  isSaving,
  onClose,
  onSave,
}: PurchaseOrderFormDialogProps) {
  const [values, setValues] = useState<PurchaseOrderFormValues>(() => {
    const defaultUnitId = unitOptions[0]?.id ?? ''
    const effectiveBranchId = initialValues?.branchId || defaultBranchId || branchOptions[0]?.id || ''

    if (initialValues) {
      const initialLines =
        initialValues.lines && initialValues.lines.length > 0
          ? initialValues.lines.map((line) => ({
              productId: line.productId || '',
              unitId: line.unitId || defaultUnitId,
              orderedQuantity: line.orderedQuantity || '',
              unitCost: line.unitCost || '100',
              taxRate: line.taxRate || '12',
              discountAmount: line.discountAmount || '0',
            }))
          : [{ ...emptyLine, unitId: defaultUnitId }]

      return {
        branchId: effectiveBranchId,
        supplierId: initialValues.supplierId || supplierOptions[0]?.id || '',
        currencyCode: initialValues.currencyCode || 'PHP',
        expectedReceiptAt: initialValues.expectedReceiptAt || '',
        supplierReference: initialValues.supplierReference || '',
        notes: initialValues.notes || '',
        lines: initialLines,
      }
    }
    return {
      branchId: effectiveBranchId,
      supplierId: supplierOptions[0]?.id || '',
      currencyCode: 'PHP',
      expectedReceiptAt: '',
      supplierReference: '',
      notes: '',
      lines: [{ ...emptyLine, unitId: defaultUnitId }],
    }
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave({
      ...values,
      lines: values.lines.map((line) => ({
        ...line,
        orderedQuantity: cleanNumericInput(line.orderedQuantity),
        unitCost: cleanNumericInput(line.unitCost),
        taxRate: cleanNumericInput(line.taxRate) || '12',
        discountAmount: cleanNumericInput(line.discountAmount) || '0',
      })),
    })
  }

  const updateLine = (index: number, patch: Partial<PurchaseOrderLineInput>) => {
    setValues((state) => ({ ...state, lines: state.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) }))
  }

  const addLine = () => {
    const defaultUnitId = unitOptions[0]?.id ?? ''
    setValues((state) => ({ ...state, lines: [...state.lines, { ...emptyLine, unitId: defaultUnitId }] }))
  }
  const removeLine = (index: number) => setValues((state) => ({ ...state, lines: state.lines.filter((_, i) => i !== index) }))

  const isValid = values.supplierId !== '' && values.lines.length > 0
    && values.lines.every((line) => line.productId && line.unitId && line.orderedQuantity && line.unitCost)

  return (
    <Portal>
    <div className={modalOverlayClass} role="presentation">
      <section aria-labelledby="po-form-title" aria-modal="true" className={modalPanelClass('sm:max-w-4xl')} role="dialog">
        <div className={sheetHeaderClass}><div><h2 id="po-form-title" className="text-lg font-bold text-ink">Create purchase order to supplier</h2><p className="mt-1 text-sm text-muted">Set supplier delivery location and order line items.</p></div><Button aria-label="Close dialog" size="icon" variant="ghost" onClick={onClose}><X aria-hidden="true" size={18} /></Button></div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className={cn(sheetBodyClass, 'space-y-5')}>
            {/* Top Row: Supplier & Delivery Destination */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-ink">Supplier
                <select className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" required value={values.supplierId} onChange={(event) => {
                  const supplier = supplierOptions.find((option) => option.id === event.target.value)
                  setValues((state) => ({ ...state, supplierId: event.target.value, currencyCode: supplier?.defaultCurrencyCode ?? state.currencyCode }))
                }}>
                  <option value="" disabled>Select a supplier</option>
                  {supplierOptions.map((option) => <option key={option.id} value={option.id}>{option.legalName}</option>)}
                </select>
              </label>

              {/* Delivery Destination: Legazpi Branch vs Budiao Warehouse */}
              <label className="text-sm font-semibold text-ink">
                Deliver To (Branch / Warehouse)
                <select
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                  value={values.branchId}
                  onChange={(event) => setValues((state) => ({ ...state, branchId: event.target.value }))}
                >
                  {branchOptions.length > 0 ? (
                    branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code === 'BUD-WH' ? '(Budiao, Daraga, Albay)' : '(Legazpi City, Albay)'}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="1">Legazpi Branch (Legazpi City, Albay)</option>
                      <option value="2">Budiao Warehouse (Budiao, Daraga, Albay)</option>
                    </>
                  )}
                </select>
                <span className="block mt-1 text-[11px] font-normal text-slate-500">
                  Where supplier will deliver: Legazpi Branch or Budiao Warehouse
                </span>
              </label>
            </div>

            {/* Second Row: Currency & Expected Receipt Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-ink">Currency<input className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm uppercase outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" maxLength={3} required value={values.currencyCode} onChange={(event) => setValues((state) => ({ ...state, currencyCode: event.target.value.toUpperCase() }))} /></label>
              <label className="text-sm font-semibold text-ink">Expected receipt date<input className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" type="date" value={values.expectedReceiptAt} onChange={(event) => setValues((state) => ({ ...state, expectedReceiptAt: event.target.value }))} /></label>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Order Line Items</h3>
                <Button size="icon" type="button" variant="ghost" onClick={addLine}><Plus aria-hidden="true" size={16} /><span className="sr-only">Add line</span></Button>
              </div>
              <div className="mt-2 space-y-3">
                {values.lines.map((line, index) => (
                  <div className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:grid sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_90px_100px_80px_80px_36px] sm:items-end" key={index}>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted">
                        Product
                      </label>
                      <SearchableProductSelect
                        options={productOptions}
                        placeholder="Search product..."
                        required
                        value={line.productId}
                        onChange={(productId) => {
                          const unitId = line.unitId || unitOptions[0]?.id || ''
                          updateLine(index, { productId, unitId })
                        }}
                      />
                    </div>
                    <label className="text-xs font-semibold text-muted">Unit
                      <select className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-brand-600" required value={line.unitId} onChange={(event) => updateLine(index, { unitId: event.target.value })}>
                        <option value="" disabled>Select</option>
                        {unitOptions.map((option) => <option key={option.id} value={option.id}>{option.symbol}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-muted">Qty
                      <input className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-brand-600" inputMode="decimal" placeholder="0" required type="text" value={line.orderedQuantity} onChange={(event) => updateLine(index, { orderedQuantity: event.target.value.replace(/[^0-9.,]/g, '') })} />
                    </label>
                    <label className="text-xs font-semibold text-muted">Unit cost
                      <input className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-brand-600" inputMode="decimal" placeholder="0.00" required type="text" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value.replace(/[^0-9.,]/g, '') })} />
                    </label>
                    <label className="text-xs font-semibold text-muted">Tax %
                      <input className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-brand-600" inputMode="decimal" placeholder="12" type="text" value={line.taxRate} onChange={(event) => updateLine(index, { taxRate: event.target.value.replace(/[^0-9.,]/g, '') })} />
                    </label>
                    <label className="text-xs font-semibold text-muted">Discount
                      <input className="mt-1 h-11 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-brand-600" inputMode="decimal" placeholder="0.00" type="text" value={line.discountAmount} onChange={(event) => updateLine(index, { discountAmount: event.target.value.replace(/[^0-9.,]/g, '') })} />
                    </label>
                    <Button aria-label="Remove line" className="self-end sm:mb-0.5" disabled={values.lines.length === 1} size="icon" type="button" variant="ghost" onClick={() => removeLine(index)}><Trash2 aria-hidden="true" size={16} /></Button>
                  </div>
                ))}
              </div>
            </div>

            <label className="block text-sm font-semibold text-ink">Special Delivery Notes
              <textarea className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20" placeholder="e.g. Deliver to Gate 2, look for warehouse supervisor..." rows={2} value={values.notes} onChange={(event) => setValues((state) => ({ ...state, notes: event.target.value }))} />
            </label>
          </div>

          <div className={sheetFooterClass}>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={isSaving || !isValid} type="submit">{isSaving ? 'Saving' : 'Create Purchase Order'}</Button>
          </div>
        </form>
      </section>
    </div>
    </Portal>
  )
}
