import { Building2, PanelRightOpen, Warehouse } from 'lucide-react'
import type { PurchaseOrder } from '@/features/purchase-orders/types/purchaseOrder'
import { PurchaseOrderStatusBadge } from '@/features/purchase-orders/components/PurchaseOrderStatusBadge'
import { Button } from '@/shared/components/Button'
import { RecordCard } from '@/shared/components/RecordCard'
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from '@/shared/components/Table'
import { formatCurrency } from '@/shared/lib/formatters'

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

export function PurchaseOrderTable({ purchaseOrders, onView }: { purchaseOrders: PurchaseOrder[]; onView: (po: PurchaseOrder) => void }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {purchaseOrders.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">No purchase orders match these filters.</p>
        ) : (
          purchaseOrders.map((po) => (
            <RecordCard
              key={po.id}
              ariaLabel={`View ${po.poNumber}`}
              badge={<PurchaseOrderStatusBadge status={po.status} />}
              title={<span className="font-mono">{po.poNumber}</span>}
              subtitle={po.supplier?.legalName ?? undefined}
              fields={[
                { label: 'Deliver To', value: <DestinationBadge code={po.branch?.code} name={po.branch?.name} />, full: true },
                { label: 'Total', value: formatCurrency(po.totalAmount, po.currencyCode) },
                { label: 'Expected', value: po.expectedReceiptAt ? new Date(po.expectedReceiptAt).toLocaleDateString() : '—' },
              ]}
              onClick={() => onView(po)}
            />
          ))
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
              <TableHeaderCell>Expected receipt</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableEmptyState colSpan={7}>No purchase orders match these filters.</TableEmptyState>
            ) : (
              purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs font-semibold text-ink">{po.poNumber}</TableCell>
                  <TableCell className="text-muted">{po.supplier?.legalName ?? '—'}</TableCell>
                  <TableCell>
                    <DestinationBadge code={po.branch?.code} name={po.branch?.name} />
                  </TableCell>
                  <TableCell><PurchaseOrderStatusBadge status={po.status} /></TableCell>
                  <TableCell align="right" className="text-ink">{formatCurrency(po.totalAmount, po.currencyCode)}</TableCell>
                  <TableCell className="text-muted">{po.expectedReceiptAt ? new Date(po.expectedReceiptAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1">
                      <Button aria-label={`View ${po.poNumber}`} size="icon" variant="ghost" onClick={() => onView(po)}><PanelRightOpen aria-hidden="true" size={18} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
