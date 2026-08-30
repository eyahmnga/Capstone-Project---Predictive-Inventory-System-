import { Building2, PackageCheck, PanelRightOpen, Warehouse } from 'lucide-react'
import type { PurchaseOrder } from '@/features/purchase-orders/types/purchaseOrder'
import { PurchaseOrderStatusBadge } from '@/features/purchase-orders/components/PurchaseOrderStatusBadge'
import { Button } from '@/shared/components/Button'
import { RecordCard } from '@/shared/components/RecordCard'
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from '@/shared/components/Table'
import { formatCurrency, formatQuantity } from '@/shared/lib/formatters'

function DestinationBadge({ name, code }: { name?: string | null; code?: string | null }) {
  const displayName = name || (code === 'BUD-WH' ? 'Budiao Warehouse' : 'Legazpi Branch')
  const isWarehouse = displayName.toLowerCase().includes('warehouse') || code === 'BUD-WH'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
        isWarehouse
          ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : 'bg-blue-50 text-blue-800 border border-blue-200'
      }`}
    >
      {isWarehouse ? <Warehouse size={12} className="text-amber-600" /> : <Building2 size={12} className="text-blue-600" />}
      {displayName}
    </span>
  )
}

export function PurchaseOrderTable({
  purchaseOrders,
  onView,
  onReceiveDelivery,
}: {
  purchaseOrders: PurchaseOrder[]
  onView: (po: PurchaseOrder) => void
  onReceiveDelivery?: (po: PurchaseOrder) => void
}) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {purchaseOrders.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">No purchase orders match these filters.</p>
        ) : (
          purchaseOrders.map((po) => {
            const isReceivable = po.status === 'ordered' || po.status === 'partially_received'
            const totalOrdered = po.lines.reduce((acc, l) => acc + Number(l.orderedQuantity || 0), 0)
            const totalReceived = po.lines.reduce((acc, l) => acc + Number(l.receivedQuantity || 0), 0)

            return (
              <RecordCard
                key={po.id}
                ariaLabel={`View ${po.poNumber}`}
                badge={<PurchaseOrderStatusBadge status={po.status} />}
                title={<span className="font-mono">{po.poNumber}</span>}
                subtitle={po.supplier?.legalName ?? undefined}
                fields={[
                  { label: 'Deliver To', value: <DestinationBadge code={po.branch?.code} name={po.branch?.name} />, full: true },
                  { label: 'Total', value: formatCurrency(po.totalAmount, po.currencyCode) },
                  {
                    label: 'Delivery progress',
                    value: isReceivable ? `${totalReceived} / ${totalOrdered} pcs` : po.expectedReceiptAt ? new Date(po.expectedReceiptAt).toLocaleDateString() : '—',
                  },
                ]}
                actions={
                  <div className="flex gap-2">
                    {isReceivable && onReceiveDelivery && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        onClick={(e) => {
                          e.stopPropagation()
                          onReceiveDelivery(po)
                        }}
                      >
                        <PackageCheck size={14} /> Receive
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => onView(po)}>
                      Details
                    </Button>
                  </div>
                }
                onClick={() => onView(po)}
              />
            )
          })
        )}
      </div>

      <div className="hidden md:block">
        <Table minWidth={850}>
          <TableHead>
            <tr>
              <TableHeaderCell>PO number</TableHeaderCell>
              <TableHeaderCell>Supplier</TableHeaderCell>
              <TableHeaderCell>Deliver To</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell align="right">Total</TableHeaderCell>
              <TableHeaderCell>Delivery Status</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableEmptyState colSpan={7}>No purchase orders match these filters.</TableEmptyState>
            ) : (
              purchaseOrders.map((po) => {
                const isReceivable = po.status === 'ordered' || po.status === 'partially_received'
                const totalOrdered = po.lines.reduce((acc, l) => acc + Number(l.orderedQuantity || 0), 0)
                const totalReceived = po.lines.reduce((acc, l) => acc + Number(l.receivedQuantity || 0), 0)

                return (
                  <TableRow key={po.id} className="hover:bg-slate-50/70 transition">
                    <TableCell className="font-mono text-xs font-semibold text-ink">{po.poNumber}</TableCell>
                    <TableCell className="text-muted font-medium">{po.supplier?.legalName ?? '—'}</TableCell>
                    <TableCell>
                      <DestinationBadge code={po.branch?.code} name={po.branch?.name} />
                    </TableCell>
                    <TableCell><PurchaseOrderStatusBadge status={po.status} /></TableCell>
                    <TableCell align="right" className="text-ink font-semibold">{formatCurrency(po.totalAmount, po.currencyCode)}</TableCell>
                    <TableCell>
                      {isReceivable ? (
                        <div>
                          <span className="text-xs font-bold text-emerald-700">
                            {totalReceived} / {totalOrdered} pcs received
                          </span>
                          {po.expectedReceiptAt && (
                            <p className="text-[10px] text-muted">
                              Exp: {new Date(po.expectedReceiptAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">
                          {po.status === 'received' || po.status === 'closed'
                            ? '✓ Fully received'
                            : po.expectedReceiptAt
                            ? new Date(po.expectedReceiptAt).toLocaleDateString()
                            : '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end gap-1.5 items-center">
                        {isReceivable && onReceiveDelivery && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                            onClick={() => onReceiveDelivery(po)}
                          >
                            <PackageCheck size={13} />
                            Receive
                          </Button>
                        )}
                        <Button
                          aria-label={`View ${po.poNumber}`}
                          size="sm"
                          variant="secondary"
                          onClick={() => onView(po)}
                          className="text-xs font-semibold"
                        >
                          <PanelRightOpen size={13} />
                          Details
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
