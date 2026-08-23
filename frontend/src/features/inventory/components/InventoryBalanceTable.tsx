import { useMemo } from 'react'
import { ShoppingCart } from 'lucide-react'
import { usePosCartStore } from '@/features/pos/state/posCartStore'
import type { InventoryBalance } from '@/features/inventory/types/inventory'
import { RecordCard } from '@/shared/components/RecordCard'
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from '@/shared/components/Table'
import { formatQuantity } from '@/shared/lib/formatters'

export function InventoryBalanceTable({ balances }: { balances: InventoryBalance[] }) {
  const heldOrders = usePosCartStore((state) => state.heldOrders)

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

  // Enrich balances with real-time POS held reservations
  const enrichedBalances = useMemo(() => {
    return balances.map((balance) => {
      const prodId = balance.product?.id ?? ''
      const posHeld = posHeldMap.get(prodId) ?? 0
      const serverReserved = Number(balance.reservedQuantity) || 0
      const totalReserved = serverReserved + posHeld
      const onHand = Number(balance.onHandQuantity) || 0
      const realAvailable = Math.max(0, onHand - totalReserved)

      return {
        ...balance,
        posHeldQuantity: posHeld,
        totalReservedQuantity: totalReserved,
        realAvailableQuantity: realAvailable,
      }
    })
  }, [balances, posHeldMap])

  return (
    <>
      <div className="space-y-3 md:hidden">
        {enrichedBalances.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-6 text-center text-sm text-muted shadow-panel">
            No inventory balances for this branch yet.
          </p>
        ) : (
          enrichedBalances.map((balance) => (
            <RecordCard
              key={balance.id}
              title={balance.product?.name ?? '—'}
              subtitle={<span className="font-mono">{balance.product?.sku ?? '—'}</span>}
              fields={[
                { label: 'On hand', value: `${formatQuantity(balance.onHandQuantity)} pcs` },
                {
                  label: 'Reserved',
                  value: (
                    <div>
                      <span className={balance.totalReservedQuantity > 0 ? 'font-bold text-amber-700 font-mono' : 'text-slate-500 font-mono'}>
                        {formatQuantity(balance.totalReservedQuantity)} pcs
                      </span>
                      {balance.posHeldQuantity > 0 ? (
                        <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                          ({formatQuantity(balance.posHeldQuantity)} held in POS)
                        </p>
                      ) : null}
                    </div>
                  ),
                },
                {
                  label: 'Available',
                  value: (
                    <span className={balance.realAvailableQuantity <= 0 ? 'font-bold text-danger-text font-mono' : 'font-bold text-ink font-mono'}>
                      {formatQuantity(balance.realAvailableQuantity)} pcs
                    </span>
                  ),
                },
                { label: 'Incoming', value: `${formatQuantity(balance.incomingQuantity)} pcs` },
                { label: 'Last movement', value: balance.lastMovementAt ? new Date(balance.lastMovementAt).toLocaleString() : '—', full: true },
              ]}
            />
          ))
        )}
      </div>

      <div className="hidden md:block">
        <Table minWidth={800}>
          <TableHead>
            <tr>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell align="right">On hand</TableHeaderCell>
              <TableHeaderCell align="right">Reserved</TableHeaderCell>
              <TableHeaderCell align="right">Available</TableHeaderCell>
              <TableHeaderCell align="right">Incoming</TableHeaderCell>
              <TableHeaderCell>Last movement</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {enrichedBalances.length === 0 ? (
              <TableEmptyState colSpan={6}>No inventory balances for this branch yet.</TableEmptyState>
            ) : (
              enrichedBalances.map((balance) => (
                <TableRow key={balance.id} className="hover:bg-slate-50/70 transition">
                  <TableCell>
                    <p className="font-semibold text-ink">{balance.product?.name ?? '—'}</p>
                    <p className="font-mono text-xs text-muted">{balance.product?.sku ?? '—'}</p>
                  </TableCell>
                  <TableCell align="right" className="font-mono tabular-nums text-ink">
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
                    className={`font-mono tabular-nums font-bold ${
                      balance.realAvailableQuantity <= 0 ? 'text-danger-text' : 'text-emerald-700'
                    }`}
                  >
                    {formatQuantity(balance.realAvailableQuantity)}
                  </TableCell>
                  <TableCell align="right" className="font-mono tabular-nums text-muted">
                    {formatQuantity(balance.incomingQuantity)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted">
                      {balance.lastMovementAt ? new Date(balance.lastMovementAt).toLocaleString() : '—'}
                    </span>
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
