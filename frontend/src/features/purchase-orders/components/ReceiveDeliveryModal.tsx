import { type FormEvent, useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, Loader2, PackageCheck, Truck, Warehouse, X } from 'lucide-react'
import type { PurchaseOrder, PurchaseOrderLine } from '@/features/purchase-orders/types/purchaseOrder'
import { usePurchaseOrder } from '@/features/purchase-orders/hooks/usePurchaseOrders'
import type { GoodsReceiptFormValues, GoodsReceiptLineInput } from '@/features/receiving/types/goodsReceipt'
import { Button } from '@/shared/components/Button'
import { Portal } from '@/shared/components/Portal'
import { cleanNumericInput, formatQuantity } from '@/shared/lib/formatters'
import { modalOverlayClass, modalPanelClass, sheetBodyClass, sheetFooterClass, sheetHeaderClass } from '@/shared/lib/modalClasses'

type DeliveryPreset = 'complete' | 'partial' | 'damaged'

type ReceiveDeliveryModalProps = {
  purchaseOrder: PurchaseOrder
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (values: GoodsReceiptFormValues) => void
}

function initLine(line: PurchaseOrderLine): GoodsReceiptLineInput {
  const remaining = Math.max(0, Number(line.orderedQuantity) - Number(line.receivedQuantity))
  const remainingStr = remaining.toFixed(4)
  return {
    purchaseOrderLineId: line.id,
    productSku: line.productSku,
    productName: line.productName,
    remainingQuantity: remainingStr,
    receivedQuantity: remainingStr,
    acceptedQuantity: remainingStr,
    rejectedQuantity: '0',
    lotNumber: '',
    serialNumber: '',
    expiryDate: '',
    rejectionReason: '',
    notes: '',
  }
}

export function ReceiveDeliveryModal({
  purchaseOrder: initialPo,
  isSubmitting,
  onClose,
  onConfirm,
}: ReceiveDeliveryModalProps) {
  const poQuery = usePurchaseOrder(initialPo.id)
  const po = poQuery.data ?? initialPo

  const [deliveryPreset, setDeliveryPreset] = useState<DeliveryPreset>('complete')
  const [supplierDeliveryNumber, setSupplierDeliveryNumber] = useState('')
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [deliveryNotes, setDeliveryNotes] = useState('Complete and inspected in good condition.')
  const [lines, setLines] = useState<GoodsReceiptLineInput[]>(() =>
    (po.lines || [])
      .filter((line) => Math.max(0, Number(line.orderedQuantity) - Number(line.receivedQuantity)) > 0)
      .map(initLine),
  )

  // Sync lines when po detail query returns full lines
  useEffect(() => {
    if (po.lines && po.lines.length > 0) {
      const receivableLines = po.lines
        .filter((line) => Math.max(0, Number(line.orderedQuantity) - Number(line.receivedQuantity)) > 0)
        .map(initLine)
      setLines(receivableLines)
    }
  }, [po.lines])

  const destinationName = po.branch?.name || (po.branch?.code === 'BUD-WH' ? 'Budiao Warehouse' : 'Legazpi Branch')
  const isWarehouse = destinationName.toLowerCase().includes('warehouse') || po.branch?.code === 'BUD-WH'

  // Switch preset handlers
  const applyPreset = (preset: DeliveryPreset) => {
    setDeliveryPreset(preset)
    if (preset === 'complete') {
      setDeliveryNotes('Complete and inspected in good condition.')
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          receivedQuantity: l.remainingQuantity,
          acceptedQuantity: l.remainingQuantity,
          rejectedQuantity: '0',
          rejectionReason: '',
        })),
      )
    } else if (preset === 'partial') {
      setDeliveryNotes('Partial delivery received. Remaining balance to follow.')
    } else if (preset === 'damaged') {
      setDeliveryNotes('Delivery received with damaged / defective items noted.')
    }
  }

  const updateLine = (index: number, patch: Partial<GoodsReceiptLineInput>) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line
        const updated = { ...line, ...patch }

        // If received is changed, adjust accepted by default unless rejected is specified
        if ('receivedQuantity' in patch && !('acceptedQuantity' in patch)) {
          const recNum = Number(cleanNumericInput(patch.receivedQuantity ?? '0')) || 0
          const rejNum = Number(cleanNumericInput(updated.rejectedQuantity ?? '0')) || 0
          updated.acceptedQuantity = Math.max(0, recNum - rejNum).toString()
        }

        // If rejected is changed, adjust accepted accordingly
        if ('rejectedQuantity' in patch) {
          const recNum = Number(cleanNumericInput(updated.receivedQuantity ?? '0')) || 0
          const rejNum = Number(cleanNumericInput(patch.rejectedQuantity ?? '0')) || 0
          updated.acceptedQuantity = Math.max(0, recNum - rejNum).toString()
        }

        return updated
      }),
    )
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const preparedLines: GoodsReceiptLineInput[] = lines.map((l) => ({
      ...l,
      receivedQuantity: cleanNumericInput(l.receivedQuantity) || '0',
      acceptedQuantity: cleanNumericInput(l.acceptedQuantity) || '0',
      rejectedQuantity: cleanNumericInput(l.rejectedQuantity) || '0',
      rejectionReason: l.rejectionReason.trim(),
      notes: l.notes.trim(),
    }))

    onConfirm({
      purchaseOrderId: po.id,
      supplierDeliveryNumber: supplierDeliveryNumber.trim(),
      receivedAt: new Date(receivedAt).toISOString(),
      notes: deliveryNotes.trim(),
      lines: preparedLines,
    })
  }

  const isValid =
    lines.length > 0 &&
    lines.some((l) => Number(cleanNumericInput(l.acceptedQuantity)) > 0 || Number(cleanNumericInput(l.rejectedQuantity)) > 0) &&
    lines.every(
      (l) =>
        Number(cleanNumericInput(l.rejectedQuantity)) === 0 ||
        (l.rejectionReason && l.rejectionReason.trim().length > 0),
    )

  return (
    <Portal>
      <div className={modalOverlayClass} role="presentation">
        <section
          aria-labelledby="receive-delivery-title"
          aria-modal="true"
          className={modalPanelClass('sm:max-w-4xl')}
          role="dialog"
        >
          <div className={sheetHeaderClass}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted">{po.poNumber}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <Truck size={12} /> Supplier Delivery
                </span>
              </div>
              <h2 id="receive-delivery-title" className="mt-1 text-xl font-bold tracking-tight text-ink">
                Record Delivery & Receive Goods
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Supplier: <strong className="text-slate-800">{po.supplier?.legalName ?? 'Supplier'}</strong>
              </p>
            </div>
            <Button aria-label="Close dialog" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
            <div className={sheetBodyClass + ' space-y-5'}>
              {/* Delivery Facility Destination Badge */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isWarehouse ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isWarehouse ? <Warehouse size={20} /> : <Building2 size={20} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Receiving Destination Facility
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {destinationName}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({isWarehouse ? 'Budiao, Daraga, Albay' : 'Legazpi City, Albay'})
                      </span>
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-mono font-bold text-slate-600">
                  {po.branch?.code ?? 'MAIN'}
                </span>
              </div>

              {/* 3 Quick Presets for Delivery Condition */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Delivery Condition / Status:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => applyPreset('complete')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition cursor-pointer ${
                      deliveryPreset === 'complete'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'border-border bg-surface hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle2
                      size={18}
                      className={deliveryPreset === 'complete' ? 'text-emerald-600' : 'text-slate-400'}
                    />
                    <div>
                      <p className="text-xs font-bold text-ink">1. Complete Delivery</p>
                      <p className="text-[11px] text-muted mt-0.5">Lahat kumpleto at walang sira</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('partial')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition cursor-pointer ${
                      deliveryPreset === 'partial'
                        ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-600/20 shadow-xs'
                        : 'border-border bg-surface hover:border-amber-300'
                    }`}
                  >
                    <AlertTriangle
                      size={18}
                      className={deliveryPreset === 'partial' ? 'text-amber-600' : 'text-slate-400'}
                    />
                    <div>
                      <p className="text-xs font-bold text-ink">2. Incomplete / Kulang</p>
                      <p className="text-[11px] text-muted mt-0.5">May kulang na bilang (Partial)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('damaged')}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition cursor-pointer ${
                      deliveryPreset === 'damaged'
                        ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-600/20 shadow-xs'
                        : 'border-border bg-surface hover:border-rose-300'
                    }`}
                  >
                    <AlertCircle
                      size={18}
                      className={deliveryPreset === 'damaged' ? 'text-rose-600' : 'text-slate-400'}
                    />
                    <div>
                      <p className="text-xs font-bold text-ink">3. May Sira / Damaged</p>
                      <p className="text-[11px] text-muted mt-0.5">May rejected o may depekto</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Delivery Reference & Date Row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Supplier Delivery Receipt / DR #
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    placeholder="e.g. DR-2026-98765"
                    value={supplierDeliveryNumber}
                    onChange={(e) => setSupplierDeliveryNumber(e.target.value)}
                  />
                </label>

                <label className="text-xs font-bold text-slate-700">
                  Received Date
                  <input
                    className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    required
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                  />
                </label>
              </div>

              {/* Line Items Receiving Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Delivered Items Inspection
                </h3>

                {poQuery.isLoading && lines.length === 0 ? (
                  <div className="flex items-center justify-center p-8 rounded-xl border border-dashed border-slate-200 text-sm text-muted">
                    <Loader2 className="animate-spin mr-2" size={16} /> Loading order line items…
                  </div>
                ) : lines.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-muted text-center">
                    All ordered items on this purchase order have already been delivered and recorded.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lines.map((line, index) => {
                      const remNum = Number(line.remainingQuantity) || 0
                      const accNum = Number(cleanNumericInput(line.acceptedQuantity)) || 0
                      const rejNum = Number(cleanNumericInput(line.rejectedQuantity)) || 0
                      const isFullyAccepted = accNum === remNum && rejNum === 0
                      const isPartiallyAccepted = accNum > 0 && accNum < remNum
                      const hasRejection = rejNum > 0

                      return (
                        <div
                          key={line.purchaseOrderLineId}
                          className={`rounded-xl border p-3.5 space-y-3 transition ${
                            hasRejection
                              ? 'border-rose-300 bg-rose-50/30'
                              : isPartiallyAccepted
                              ? 'border-amber-300 bg-amber-50/20'
                              : 'border-border bg-white'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                              <p className="font-bold text-sm text-ink">{line.productName}</p>
                              <p className="font-mono text-xs text-muted">{line.productSku}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500">
                                Pending Order: <strong className="text-ink font-mono">{formatQuantity(line.remainingQuantity)} pcs</strong>
                              </span>
                              {isFullyAccepted ? (
                                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold text-[10px]">
                                  Full Delivery
                                </span>
                              ) : hasRejection ? (
                                <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 font-bold text-[10px]">
                                  With Damaged Items
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-bold text-[10px]">
                                  Partial Delivery
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                            <label className="text-xs font-semibold text-slate-700">
                              Delivered Quantity (Total)
                              <input
                                className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-xs font-mono outline-none focus:border-brand-600"
                                min="0"
                                max={line.remainingQuantity}
                                required
                                step="any"
                                type="number"
                                value={line.receivedQuantity}
                                onChange={(e) => updateLine(index, { receivedQuantity: e.target.value })}
                              />
                            </label>

                            <label className="text-xs font-semibold text-emerald-800">
                              Accepted (Add to Stock)
                              <input
                                className="mt-1 h-9 w-full rounded-lg border border-emerald-300 bg-emerald-50/40 px-2.5 text-xs font-mono font-bold text-emerald-900 outline-none focus:border-emerald-600"
                                min="0"
                                max={line.remainingQuantity}
                                required
                                step="any"
                                type="number"
                                value={line.acceptedQuantity}
                                onChange={(e) => updateLine(index, { acceptedQuantity: e.target.value })}
                              />
                            </label>

                            <label className="text-xs font-semibold text-rose-800">
                              Damaged / Rejected Qty
                              <input
                                className="mt-1 h-9 w-full rounded-lg border border-rose-300 bg-rose-50/40 px-2.5 text-xs font-mono font-bold text-rose-900 outline-none focus:border-rose-600"
                                min="0"
                                max={line.remainingQuantity}
                                required
                                step="any"
                                type="number"
                                value={line.rejectedQuantity}
                                onChange={(e) => updateLine(index, { rejectedQuantity: e.target.value })}
                              />
                            </label>
                          </div>

                          {/* Damage Reason Input if rejected > 0 */}
                          {Number(cleanNumericInput(line.rejectedQuantity)) > 0 ? (
                            <div className="pt-2 border-t border-rose-100">
                              <label className="block text-xs font-bold text-rose-900">
                                Damage / Rejection Reason (Required)
                                <input
                                  className="mt-1 h-9 w-full rounded-lg border border-rose-300 bg-white px-2.5 text-xs outline-none focus:border-rose-600"
                                  placeholder="e.g. Basag ang container / Defective nozzle / Expired packaging"
                                  required
                                  value={line.rejectionReason}
                                  onChange={(e) => updateLine(index, { rejectionReason: e.target.value })}
                                />
                              </label>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Delivery Inspection Notes & Remarks */}
              <label className="block text-xs font-bold text-slate-700">
                Delivery Notes & Inspection Remarks (Kulang / Damaged / Complete Remarks)
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  placeholder="e.g. Received complete by staff at Legazpi Branch, or May kulang na 2 pcs idedeliber sa Monday..."
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </label>
            </div>

            <div className={sheetFooterClass}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={isSubmitting || !isValid}
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <PackageCheck size={16} />
                {isSubmitting ? 'Posting Delivery to Stock…' : 'Confirm & Post to Inventory'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </Portal>
  )
}
