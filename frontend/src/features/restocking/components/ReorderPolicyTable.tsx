import { Building2, Calculator, Edit3, MapPin, Warehouse } from 'lucide-react'
import type { ReorderPolicy } from '@/features/restocking/types/restocking'
import { Button } from '@/shared/components/Button'
import { RecordCard } from '@/shared/components/RecordCard'
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from '@/shared/components/Table'
import { formatQuantity } from '@/shared/lib/formatters'

const stateBadge = (isActive: boolean) => (
  <span className={isActive ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800' : 'inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500'}>
    {isActive ? '● Active Policy' : 'Inactive'}
  </span>
)

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

export function ReorderPolicyTable({
  policies,
  onView,
  onEdit,
}: {
  policies: ReorderPolicy[]
  onView: (policy: ReorderPolicy) => void
  onEdit?: (policy: ReorderPolicy) => void
}) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {policies.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">No reorder policies match these filters.</p>
        ) : (
          policies.map((policy) => (
            <RecordCard
              key={policy.id}
              ariaLabel={`View policy for ${policy.productName}`}
              badge={stateBadge(policy.isActive)}
              title={policy.productName ?? '—'}
              subtitle={<span className="font-mono">{policy.productSku}</span>}
              fields={[
                { label: 'Delivery destination', value: <DestinationBadge code={policy.branchCode} name={policy.branchName} />, full: true },
                { label: 'Safety stock', value: `${formatQuantity(policy.safetyStockQuantity)} pcs` },
                { label: 'Lead time', value: `${policy.leadTimeDaysOverride ?? '—'} days` },
                { label: 'Reorder trigger point (ROP)', value: policy.reorderPointQuantity ? `Trigger at ≤ ${formatQuantity(policy.reorderPointQuantity)} pcs` : 'Not calculated', full: true },
              ]}
              actions={
                <div className="flex gap-2">
                  {onEdit && (
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onEdit(policy) }}>
                      <Edit3 size={14} /> Edit
                    </Button>
                  )}
                  <Button size="sm" variant="primary" onClick={() => onView(policy)}>
                    <Calculator size={14} /> EOQ
                  </Button>
                </div>
              }
              onClick={() => onView(policy)}
            />
          ))
        )}
      </div>

      <div className="hidden md:block">
        <Table minWidth={850}>
          <TableHead>
            <tr>
              <TableHeaderCell>Product & Supplier</TableHeaderCell>
              <TableHeaderCell>Delivery Destination</TableHeaderCell>
              <TableHeaderCell align="right">Safety Stock</TableHeaderCell>
              <TableHeaderCell align="right">Lead Time</TableHeaderCell>
              <TableHeaderCell align="right">Reorder Point (ROP)</TableHeaderCell>
              <TableHeaderCell>Policy Status</TableHeaderCell>
              <TableHeaderCell align="right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {policies.length === 0 ? (
              <TableEmptyState colSpan={7}>No reorder policies match these filters.</TableEmptyState>
            ) : (
              policies.map((policy) => (
                <TableRow key={policy.id} className="hover:bg-slate-50/70 transition">
                  <TableCell>
                    <p className="font-semibold text-ink">{policy.productName ?? '—'}</p>
                    <p className="font-mono text-xs text-muted">{policy.productSku}</p>
                    {policy.preferredSupplierName ? (
                      <p className="text-[11px] text-slate-400 mt-0.5">Supplier: {policy.preferredSupplierName}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <DestinationBadge code={policy.branchCode} name={policy.branchName} />
                  </TableCell>
                  <TableCell align="right" className="font-mono tabular-nums text-slate-700">
                    {formatQuantity(policy.safetyStockQuantity)} pcs
                  </TableCell>
                  <TableCell align="right" className="font-mono tabular-nums text-slate-700">
                    {policy.leadTimeDaysOverride ?? '—'} days
                  </TableCell>
                  <TableCell align="right">
                    {policy.reorderPointQuantity ? (
                      <div>
                        <span className="font-mono font-bold text-brand-700">
                          &le; {formatQuantity(policy.reorderPointQuantity)} pcs
                        </span>
                        <p className="text-[10px] text-slate-400">Order when stock drops</p>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 italic">Needs Calculation</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {stateBadge(policy.isActive)}
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1.5 items-center">
                      {onEdit && (
                        <Button
                          aria-label={`Edit policy for ${policy.productName}`}
                          size="sm"
                          variant="secondary"
                          onClick={() => onEdit(policy)}
                          className="text-xs font-semibold hover:border-slate-400"
                        >
                          <Edit3 size={13} className="text-slate-600" />
                          Edit
                        </Button>
                      )}
                      <Button
                        aria-label={`Calculate EOQ & view policy for ${policy.productName}`}
                        size="sm"
                        variant="secondary"
                        onClick={() => onView(policy)}
                        className="text-xs font-semibold"
                      >
                        <Calculator size={14} className="text-blue-600" />
                        Calculate EOQ
                      </Button>
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
