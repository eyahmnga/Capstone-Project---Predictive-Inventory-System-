import { useMemo } from 'react'
import { ArrowRight, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePosCartStore } from '@/features/pos/state/posCartStore'
import type { InventoryBalance } from '@/features/inventory/types/inventory'
import type { ReorderPolicy } from '@/features/restocking/types/restocking'
import { RecordCard } from '@/shared/components/RecordCard'
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from '@/shared/components/Table'
import { formatQuantity } from '@/shared/lib/formatters'

type InventoryBalanceTableProps = {
  balances: InventoryBalance[]
  policies?: ReorderPolicy[]
}

export function InventoryBalanceTable({ balances, policies = [] }: InventoryBalanceTableProps) {
  const heldOrders = usePosCartStore((state) => state.heldOrders)

  // Map policies by productId for fast ROP lookup
  const policyMap = useMemo(() => {
    const map = new Map<string, ReorderPolicy>()
    policies.forEach((policy) => {
      if (policy.productId) {
        map.set(policy.productId, policy)
      }
    })
    return map
  }, [policies])

  // Aggregate quantities of all items currently held/parked across POS carts
  const posHeldMap = useMemo(() => {
    const map = new Map<string, number>()
    heldOrders.forEach((order) => {
      order.lines.forEach((line) => {
        const curr = map.get(line.productId) ?? 0
        map.set(line.productId, curr + line.quantity)
      })
    })
    return map
  }, [heldOrders])

  // Enrich balances with real-time POS held reservations and ROP status
  const enrichedBalances = useMemo(() => {
    return balances.map((balance) => {
      const prodId = balance.product?.id ?? ''
      const posHeld = posHeldMap.get(prodId) ?? 0
      const serverReserved = Number(balance.reservedQuantity) || 0
      const totalReserved = serverReserved + posHeld
      const onHand = Number(balance.onHandQuantity) || 0
      const realAvailable = Math.max(0, onHand - totalReserved)

      const policy = policyMap.get(prodId)
      const rop = policy?.reorderPointQuantity ? Number(policy.reorderPointQuantity) : 0

      const isOutOfStock = realAvailable <= 0
      const isLowStock = !isOutOfStock && rop > 0 && realAvailable <= rop

      return {
        ...balance,
        posHeldQuantity: posHeld,
        totalReservedQuantity: totalReserved,
        realAvailableQuantity: realAvailable,
        reorderPoint: rop,
        isOutOfStock,
        isLowStock,
      }
    })
  }, [balances, posHeldMap, policyMap])

  return (
    <>
      <div className="space-y-3 md:hidden">
        {enrichedBalances.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">
            No inventory balances for this branch yet.
          </p>
        ) : (
          enrichedBalances.map((balance) => {
            const statusBadge = balance.isOutOfStock ? (
              <span className="inline-flex rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-800">
                🔴 Out of Stock
              </span>
            ) : balance.isLowStock ? (
              <span className="inline-flex rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                ⚠️ Low Stock (&le; ROP)
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800">
                🟢 In Stock
              </span>
            )

            return (
              <RecordCard
                key={balance.id}
                badge={statusBadge}
                title={balance.product?.name ?? '—'}
                subtitle={<span className="font-mono">{balance.product?.sku ?? '—'}</span>}
                fields={[
                  { label: 'On hand', value: `${formatQuantity(balance.onHandQuantity)} pcs` },
                  {
                    label: 'Reserved (POS)',
                    value: (
                      <div>
                        <span className={balance.totalReservedQuantity > 0 ? 'font-bold text-amber-700 font-mono' : 'text-slate-500 font-mono'}>
                          {formatQuantity(balance.totalReservedQuantity)} pcs
                        </span>
                        {balance.posHeldQuantity > 0 ? (
                          <p className="text-[10px] text-amber-600 font-medium">
                            ({formatQuantity(balance.posHeldQuantity)} held in POS)
                          </p>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    label: 'Available to Sell',
                    value: (
                      <span className={balance.realAvailableQuantity <= 0 ? 'font-extrabold text-rose-700 font-mono' : 'font-extrabold text-emerald-700 font-mono'}>
                        {formatQuantity(balance.realAvailableQuantity)} pcs
                      </span>
                    ),
                  },
                  { label: 'Incoming PO', value: `${formatQuantity(balance.incomingQuantity)} pcs` },
                  {
                    label: 'Reorder Action',
                    value: balance.isOutOfStock || balance.isLowStock ? (
                      <Link
                        to="/purchase-orders"
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 underline"
                      >
                        <ShoppingCart size={13} /> Reorder Stock Now
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Stock Safe</span>
                    ),
                    full: true,
                  },
                ]}
              />
            )
          })
        )}
      </div>

      <div className="hidden md:block">
        <Table minWidth={850}>
          <TableHead>
            <tr>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell align="right">On Hand</TableHeaderCell>
              <TableHeaderCell align="right">Reserved (POS Hold)</TableHeaderCell>
              <TableHeaderCell align="right">Available to Sell</TableHeaderCell>
              <TableHeaderCell align="right">Incoming PO</TableHeaderCell>
              <TableHeaderCell>Stock Status</TableHeaderCell>
              <TableHeaderCell align="right">Restock Action</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {enrichedBalances.length === 0 ? (
              <TableEmptyState colSpan={7}>No inventory balances for this branch yet.</TableEmptyState>
            ) : (
              enrichedBalances.map((balance) => (
                <TableRow key={balance.id} className="hover:bg-slate-50/70 transition">
                  <TableCell>
                    <p className="font-bold text-ink">{balance.product?.name ?? '—'}</p>
                    <p className="font-mono text-xs text-muted">{balance.product?.sku ?? '—'}</p>
                  </TableCell>

                  <TableCell align="right" className="font-mono tabular-nums text-slate-700">
                    {formatQuantity(balance.onHandQuantity)}
                  </TableCell>

                  <TableCell align="right" className="font-mono tabular-nums">
                    {balance.totalReservedQuantity > 0 ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="font-bold text-amber-800">
                          {formatQuantity(balance.totalReservedQuantity)}
                        </span>
                        {balance.posHeldQuantity > 0 ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9.5px] font-bold text-amber-800">
                            <ShoppingCart size={9} />
                            {balance.posHeldQuantity} in POS hold
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted">0.00</span>
                    )}
                  </TableCell>

                  <TableCell
                    align="right"
                    className={`font-mono tabular-nums font-extrabold text-sm ${
                      balance.realAvailableQuantity <= 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatQuantity(balance.realAvailableQuantity)}
                  </TableCell>

                  <TableCell align="right" className="font-mono tabular-nums text-muted">
                    {formatQuantity(balance.incomingQuantity)}
                  </TableCell>

                  <TableCell>
                    {balance.isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-xs font-extrabold text-rose-800 shadow-2xs">
                        🔴 Out of Stock
                      </span>
                    ) : balance.isLowStock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-800 shadow-2xs">
                        ⚠️ Low Stock (&le; ROP)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        🟢 In Stock
                      </span>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    {balance.isOutOfStock || balance.isLowStock ? (
                      <Link
                        to="/purchase-orders"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                      >
                        <ShoppingCart size={13} />
                        Reorder Now
                        <ArrowRight size={12} />
                      </Link>
                    ) : (
                      <Link
                        to="/restocking"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600"
                      >
                        Plan EOQ <ArrowRight size={12} />
                      </Link>
                    )}
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
