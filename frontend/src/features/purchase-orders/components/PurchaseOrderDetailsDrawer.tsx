import { useState } from 'react'
import { AlertCircle, Building2, CheckCircle2, PackageCheck, Truck, Warehouse, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import type { PurchaseOrder } from '@/features/purchase-orders/types/purchaseOrder'
import { PurchaseOrderStatusBadge } from '@/features/purchase-orders/components/PurchaseOrderStatusBadge'
import { ReasonPromptDialog } from '@/features/purchase-orders/components/ReasonPromptDialog'
import { Button } from '@/shared/components/Button'
import { drawerOverlayClass, drawerPanelClass } from '@/shared/lib/modalClasses'
import { formatCurrency, formatQuantity } from '@/shared/lib/formatters'
import { Portal } from '@/shared/components/Portal'

type PurchaseOrderDetailsDrawerProps = {
  purchaseOrder: PurchaseOrder
  isActing: boolean
  onClose: () => void
  onSubmit: () => void
  onApprove: () => void
  onReject: (reason: string) => void
  onMarkOrdered: () => void
  onCancel: (reason: string) => void
  onOpenReceiveDelivery?: () => void
}

export function PurchaseOrderDetailsDrawer({
  purchaseOrder: po,
  isActing,
  onClose,
  onSubmit,
  onApprove,
  onReject,
  onMarkOrdered,
  onCancel,
  onOpenReceiveDelivery,
}: PurchaseOrderDetailsDrawerProps) {
  const { hasPermission } = useAuth()
  const [prompt, setPrompt] = useState<'reject' | 'cancel' | null>(null)

  const canCancel =
    hasPermission('purchase_orders.cancel') && ['draft', 'submitted', 'approved', 'ordered'].includes(po.status)
  const canReceive =
    hasPermission('goods_receipts.create') && (po.status === 'ordered' || po.status === 'partially_received')

  const destinationName = po.branch?.name || (po.branch?.code === 'BUD-WH' ? 'Budiao Warehouse' : 'Legazpi Branch')
  const isWarehouse = destinationName.toLowerCase().includes('warehouse') || po.branch?.code === 'BUD-WH'

  const totalOrderedQty = po.lines.reduce((acc, l) => acc + Number(l.orderedQuantity || 0), 0)
  const totalReceivedQty = po.lines.reduce((acc, l) => acc + Number(l.receivedQuantity || 0), 0)
  const totalRemainingQty = Math.max(0, totalOrderedQty - totalReceivedQty)

  return (
    <Portal>
      <div className={drawerOverlayClass} role="presentation" onMouseDown={onClose}>
        <aside
          aria-labelledby="po-details-title"
          aria-modal="true"
          className={drawerPanelClass('sm:max-w-2xl')}
          role="dialog"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-6 bg-slate-50/50">
            <div>
              <p className="font-mono text-xs text-muted">{po.poNumber}</p>
              <h2 id="po-details-title" className="mt-1 text-xl font-bold tracking-tight text-ink">
                {po.supplier?.legalName ?? 'Unknown supplier'}
              </h2>
              <div className="mt-2.5 flex items-center gap-2">
                <PurchaseOrderStatusBadge status={po.status} />
                {po.expectedReceiptAt && (
                  <span className="text-xs text-slate-500">
                    Expected: <strong>{new Date(po.expectedReceiptAt).toLocaleDateString()}</strong>
                  </span>
                )}
              </div>
            </div>
            <Button aria-label="Close purchase order details" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {/* Deliver To / Destination Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-3">
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
                    Deliver To / Receiving Destination
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {destinationName}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      ({isWarehouse ? 'Budiao, Daraga, Albay' : 'Legazpi City, Albay'})
                    </span>
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-mono font-bold text-slate-600">
                {po.branch?.code ?? 'MAIN'}
              </span>
            </div>

            {/* If PO is Ordered or Partially Received: Actionable Delivery Receiving Banner */}
            {canReceive && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Truck className="text-emerald-700 mt-0.5 shrink-0" size={18} />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        {po.status === 'partially_received'
                          ? 'Partial Delivery Received — Awaiting Balance'
                          : 'Awaiting Supplier Delivery'}
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        {totalRemainingQty > 0
                          ? `Total ${totalRemainingQty} pcs remaining to be delivered by supplier.`
                          : 'All ordered items have been delivered.'}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={onOpenReceiveDelivery}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs"
                  >
                    <PackageCheck size={15} />
                    Record Delivery
                  </Button>
                </div>
              </div>
            )}

            {/* Lines Items Table with Receiving Progress */}
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">Order Items & Delivery Status</h3>
                <span className="text-xs text-muted font-mono">
                  Delivered: {totalReceivedQty} / {totalOrderedQty} pcs
                </span>
              </div>

              <div className="mt-3 space-y-2 sm:hidden">
                {po.lines.map((line) => {
                  const rem = Math.max(0, Number(line.orderedQuantity) - Number(line.receivedQuantity))
                  return (
                    <div className="rounded-xl border border-border p-3 text-sm" key={line.id}>
                      <p className="font-medium text-ink">{line.productName}</p>
                      <p className="text-xs text-muted">{line.productSku}</p>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-muted">Ordered</dt>
                          <dd className="tabular-nums font-bold text-ink">{formatQuantity(line.orderedQuantity)} pcs</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Delivered</dt>
                          <dd className="tabular-nums font-bold text-emerald-700">{formatQuantity(line.receivedQuantity)} pcs</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Pending</dt>
                          <dd className={`tabular-nums font-bold ${rem > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                            {rem > 0 ? `${formatQuantity(rem.toString())} pcs` : 'Done'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 hidden overflow-x-auto rounded-xl border border-border sm:block">
                <table className="w-full min-w-[540px] text-sm">
                  <thead className="bg-subtle text-left text-xs font-semibold text-muted">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Ordered</th>
                      <th className="px-3 py-2 text-right">Delivered</th>
                      <th className="px-3 py-2 text-right">Pending</th>
                      <th className="px-3 py-2 text-right">Unit cost</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {po.lines.map((line) => {
                      const rem = Math.max(0, Number(line.orderedQuantity) - Number(line.receivedQuantity))
                      return (
                        <tr key={line.id}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-ink">{line.productName}</p>
                            <p className="text-xs text-muted">{line.productSku}</p>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold">
                            {formatQuantity(line.orderedQuantity)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">
                            {formatQuantity(line.receivedQuantity)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {rem > 0 ? (
                              <span className="font-bold text-amber-700">{formatQuantity(rem.toString())}</span>
                            ) : (
                              <span className="text-xs text-emerald-600 font-semibold">✓ Complete</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted">
                            {formatCurrency(line.unitCost, po.currencyCode)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-ink">
                            {formatCurrency(line.totalAmount, po.currencyCode)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Detail label="Subtotal" value={formatCurrency(po.subtotalAmount, po.currencyCode)} />
                <Detail label="Tax" value={formatCurrency(po.taxAmount, po.currencyCode)} />
                <Detail label="Discount" value={formatCurrency(po.discountAmount, po.currencyCode)} />
                <Detail label="Total Amount" value={formatCurrency(po.totalAmount, po.currencyCode)} />
              </dl>
            </section>

            {/* Delivery Receipts & Inspection History Section */}
            {po.goodsReceipts && po.goodsReceipts.length > 0 ? (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Delivery & Inspection History ({po.goodsReceipts.length})
                </h3>
                <div className="space-y-2.5">
                  {po.goodsReceipts.map((gr) => (
                    <div key={gr.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">{gr.receiptNumber}</span>
                        <span className="text-slate-400">
                          {gr.receivedAt ? new Date(gr.receivedAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      {gr.supplierDeliveryNumber && (
                        <p className="text-[11px] text-slate-500">
                          DR / Reference: <strong className="text-slate-700">{gr.supplierDeliveryNumber}</strong>
                        </p>
                      )}
                      {gr.notes && (
                        <p className="rounded-md bg-slate-50 border border-slate-100 p-2 text-slate-700 italic">
                          "{gr.notes}"
                        </p>
                      )}
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        {gr.lines.map((gl) => (
                          <div key={gl.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600">{gl.productName}:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-700">
                                Accepted: {formatQuantity(gl.acceptedQuantity)} pcs
                              </span>
                              {Number(gl.rejectedQuantity) > 0 && (
                                <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                  Damaged/Rejected: {formatQuantity(gl.rejectedQuantity)} pcs ({gl.rejectionReason})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Approval History */}
            {po.approvals.length > 0 ? (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Approval history</h3>
                <ul className="mt-2 space-y-2">
                  {po.approvals.map((approval) => (
                    <li key={approval.id} className="rounded-xl border border-border p-3 text-xs">
                      <p className="font-semibold capitalize text-ink">{approval.decision}</p>
                      {approval.reason ? <p className="mt-1 text-muted">{approval.reason}</p> : null}
                      <p className="mt-1 text-[11px] text-muted">{new Date(approval.decisionAt).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {po.notes ? (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Purchase Order Notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{po.notes}</p>
              </section>
            ) : null}
          </div>

          <footer className="flex flex-wrap gap-2 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 bg-slate-50/50">
            {po.status === 'draft' && hasPermission('purchase_orders.submit') ? (
              <Button disabled={isActing} onClick={onSubmit}>
                Submit for approval
              </Button>
            ) : null}
            {po.status === 'submitted' && hasPermission('purchase_orders.approve') ? (
              <Button disabled={isActing} onClick={onApprove}>
                Approve Order
              </Button>
            ) : null}
            {po.status === 'submitted' && hasPermission('purchase_orders.approve') ? (
              <Button disabled={isActing} variant="danger" onClick={() => setPrompt('reject')}>
                Reject
              </Button>
            ) : null}
            {po.status === 'approved' && hasPermission('purchase_orders.order') ? (
              <Button disabled={isActing} onClick={onMarkOrdered}>
                Mark ordered today
              </Button>
            ) : null}
            {canReceive ? (
              <Button
                disabled={isActing}
                onClick={onOpenReceiveDelivery}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <PackageCheck size={16} />
                Record Supplier Delivery
              </Button>
            ) : null}
            {canCancel ? (
              <Button disabled={isActing} variant="secondary" onClick={() => setPrompt('cancel')}>
                Cancel order
              </Button>
            ) : null}
          </footer>
        </aside>

        {prompt === 'reject' ? (
          <ReasonPromptDialog
            confirmLabel="Reject"
            description="This reason is recorded in the approval history and the order returns to draft for revision."
            isSubmitting={isActing}
            title="Reject purchase order"
            onClose={() => setPrompt(null)}
            onConfirm={(reason) => {
              onReject(reason)
              setPrompt(null)
            }}
          />
        ) : null}
        {prompt === 'cancel' ? (
          <ReasonPromptDialog
            confirmLabel="Cancel order"
            description="This purchase order will be cancelled and cannot be reopened."
            isSubmitting={isActing}
            title="Cancel purchase order"
            onClose={() => setPrompt(null)}
            onConfirm={(reason) => {
              onCancel(reason)
              setPrompt(null)
            }}
          />
        ) : null}
      </div>
    </Portal>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-ink">{value}</dd>
    </div>
  )
}
