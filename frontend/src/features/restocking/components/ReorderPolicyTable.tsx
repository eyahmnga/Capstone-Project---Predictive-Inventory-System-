import { Calculator, PanelRightOpen } from 'lucide-react'
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

export function ReorderPolicyTable({ policies, onView }: { policies: ReorderPolicy[]; onView: (policy: ReorderPolicy) => void }) {
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
                { label: 'Safety stock', value: `${formatQuantity(policy.safetyStockQuantity)} pcs` },
                { label: 'Lead time', value: `${policy.leadTimeDaysOverride ?? '—'} days` },
                { label: 'Reorder trigger point (ROP)', value: policy.reorderPointQuantity ? `Trigger at ≤ ${formatQuantity(policy.reorderPointQuantity)} pcs` : 'Not calculated', full: true },
              ]}
              onClick={() => onView(policy)}
            />
          ))
        )}
      </div>

      <div className="hidden md:block">
        <Table minWidth={800}>
          <TableHead>
            <tr>
              <TableHeaderCell>Product & Supplier</TableHeaderCell>
              <TableHeaderCell align="right">Safety Stock (Buffer)</TableHeaderCell>
              <TableHeaderCell align="right">Lead Time</TableHeaderCell>
              <TableHeaderCell align="right">Reorder Point (ROP)</TableHeaderCell>
              <TableHeaderCell>Policy Status</TableHeaderCell>
              <TableHeaderCell align="right">EOQ & Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {policies.length === 0 ? (
              <TableEmptyState colSpan={6}>No reorder policies match these filters.</TableEmptyState>
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
                    <div className="flex justify-end gap-1.5">
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
