import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  History,
  PackageCheck,
  Search,
  Truck,
  Warehouse,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { getInventoryBalances, inventoryQueryKeys, transferInventory, type StockTransferValues } from '@/features/inventory/api/inventoryApi'
import { getPurchaseOrders, purchaseOrderQueryKeys } from '@/features/purchase-orders/api/purchaseOrdersApi'
import { getGoodsReceipts, goodsReceiptQueryKeys, createGoodsReceipt, postGoodsReceipt } from '@/features/receiving/api/goodsReceiptsApi'
import type { PurchaseOrder } from '@/features/purchase-orders/types/purchaseOrder'
import type { GoodsReceiptFormValues } from '@/features/receiving/types/goodsReceipt'
import { ReceiveDeliveryModal } from '@/features/purchase-orders/components/ReceiveDeliveryModal'
import { TransferStockModal } from '@/features/warehouse/components/TransferStockModal'
import { PurchaseOrderStatusBadge } from '@/features/purchase-orders/components/PurchaseOrderStatusBadge'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from '@/shared/components/Table'
import { formatCurrency, formatQuantity } from '@/shared/lib/formatters'

type TabType = 'incoming' | 'receipts' | 'inventory'

export default function BudiaoWarehousePage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('incoming')
  const [search, setSearch] = useState('')
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | undefined>()
  const [isTransferOpen, setIsTransferOpen] = useState(false)

  // Locate Budiao Warehouse branch ID dynamically
  const budiaoBranch =
    session?.user.branches.find(
      (b) => b.code === 'BUD-WH' || b.name.toLowerCase().includes('budiao') || b.name.toLowerCase().includes('warehouse'),
    ) ?? session?.user.branches[1] ?? session?.user.branches[0]

  const branchId = budiaoBranch?.id ?? '2'

  // 1. Inbound Purchase Orders to Budiao Warehouse
  const poQuery = useQuery({
    queryKey: purchaseOrderQueryKeys.list({ branchId, supplierId: 'all', status: 'all', search, page: 1, perPage: 100 }),
    queryFn: () => getPurchaseOrders({ branchId, supplierId: 'all', status: 'all', search, page: 1, perPage: 100 }),
    enabled: Boolean(branchId),
  })

  // 2. Goods Receipts History at Budiao Warehouse
  const receiptsQuery = useQuery({
    queryKey: goodsReceiptQueryKeys.list({ branchId, purchaseOrderId: 'all', status: 'all', page: 1, perPage: 100 }),
    queryFn: () => getGoodsReceipts({ branchId, purchaseOrderId: 'all', status: 'all', page: 1, perPage: 100 }),
    enabled: Boolean(branchId),
  })

  // 3. Current Stock on Hand at Budiao Warehouse
  const stockQuery = useQuery({
    queryKey: inventoryQueryKeys.balances({ branchId, availability: 'all', search, page: 1, perPage: 100 }),
    queryFn: () => getInventoryBalances({ branchId, availability: 'all', search, page: 1, perPage: 100 }),
    enabled: Boolean(branchId),
  })

  const receiveMutation = useMutation({
    mutationFn: async (values: GoodsReceiptFormValues) => {
      const draft = await createGoodsReceipt(branchId, values)
      return await postGoodsReceipt(draft)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: goodsReceiptQueryKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ['inventory-balances'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setReceivingPo(undefined)
    },
  })

  const transferMutation = useMutation({
    mutationFn: async (values: StockTransferValues) => {
      return await transferInventory(values)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory-balances'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setIsTransferOpen(false)
    },
  })

  const purchaseOrders = poQuery.data?.data ?? []
  const goodsReceipts = receiptsQuery.data?.data ?? []
  const stockBalances = stockQuery.data?.data ?? []

  // Filter incoming/receivable POs
  const incomingDeliveries = purchaseOrders.filter(
    (po) => po.status === 'ordered' || po.status === 'partially_received' || po.status === 'approved',
  )
  const fullyReceivedCount = purchaseOrders.filter((po) => po.status === 'received' || po.status === 'closed').length
  const lowStockCount = stockBalances.filter((sb) => Number(sb.availableQuantity || 0) <= 5).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budiao Warehouse Inbound Hub"
        description="Monitor and detect incoming supplier deliveries, record received goods, and track live warehouse stock in Budiao, Daraga, Albay."
        actions={
          <div className="flex items-center gap-2">
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
              onClick={() => setIsTransferOpen(true)}
            >
              <ArrowRightLeft size={15} />
              Transfer Stock to Store
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs">
              <Warehouse size={16} className="text-amber-700" />
              Budiao Warehouse (BUD-WH)
            </span>
          </div>
        }
      />

      {/* KPI Cards: Incoming, Received, Stock, Low Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Incoming Deliveries
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <Truck size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{incomingDeliveries.length}</p>
          <p className="mt-0.5 text-xs text-amber-700 font-medium">Awaiting supplier delivery</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Deliveries Received
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <CheckCircle2 size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{fullyReceivedCount}</p>
          <p className="mt-0.5 text-xs text-emerald-700 font-medium">Completed procurement orders</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Warehouse SKUs
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100 text-blue-800">
              <Boxes size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stockBalances.length}</p>
          <p className="mt-0.5 text-xs text-blue-700 font-medium">Products stored in Budiao</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Low Stock Alerts
            </span>
            <span className={`grid h-8 w-8 place-items-center rounded-xl ${lowStockCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
              <AlertTriangle size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{lowStockCount}</p>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">Items near depletion</p>
        </div>
      </div>

      {/* Tabs Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'incoming'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'border border-border bg-surface text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Truck size={15} />
            Detected Supplier Deliveries ({incomingDeliveries.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'receipts'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'border border-border bg-surface text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History size={15} />
            Delivery History ({goodsReceipts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'border border-border bg-surface text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Boxes size={15} />
            Warehouse Stock on Hand ({stockBalances.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="h-9 w-full rounded-xl border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-brand-600"
            placeholder="Search PO, SKU, or Supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TAB 1: Detected Inbound Supplier Deliveries */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-950">
              <Truck size={16} className="text-amber-700 shrink-0" />
              <span>
                Naka-filter ang listahang ito para sa lahat ng supplier orders na nakatakdang i-deliver sa <strong>Budiao Warehouse</strong>.
              </span>
            </div>
          </div>

          <Table minWidth={850}>
            <TableHead>
              <tr>
                <TableHeaderCell>PO Number</TableHeaderCell>
                <TableHeaderCell>Supplier</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Expected Date</TableHeaderCell>
                <TableHeaderCell align="right">Total Items</TableHeaderCell>
                <TableHeaderCell align="right">Total Value</TableHeaderCell>
                <TableHeaderCell align="right">Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {incomingDeliveries.length === 0 ? (
                <TableEmptyState colSpan={7}>
                  Walang pending o paparating na supplier deliveries sa Budiao Warehouse sa kasalukuyan.
                </TableEmptyState>
              ) : (
                incomingDeliveries.map((po) => {
                  const totalOrdered = po.lines.reduce((acc, l) => acc + Number(l.orderedQuantity || 0), 0)
                  const totalReceived = po.lines.reduce((acc, l) => acc + Number(l.receivedQuantity || 0), 0)
                  const canReceive = po.status === 'ordered' || po.status === 'partially_received'

                  return (
                    <TableRow key={po.id} className="hover:bg-slate-50/70 transition">
                      <TableCell className="font-mono text-xs font-bold text-ink">{po.poNumber}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{po.supplier?.legalName ?? '—'}</TableCell>
                      <TableCell>
                        <PurchaseOrderStatusBadge status={po.status} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {po.expectedReceiptAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            {new Date(po.expectedReceiptAt).toLocaleDateString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right" className="text-xs font-mono font-bold">
                        <span className="text-emerald-700">{totalReceived}</span> / {totalOrdered} pcs
                      </TableCell>
                      <TableCell align="right" className="font-mono font-bold text-slate-900">
                        {formatCurrency(po.totalAmount, po.currencyCode)}
                      </TableCell>
                      <TableCell align="right">
                        {canReceive ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                            onClick={() => setReceivingPo(po)}
                          >
                            <PackageCheck size={14} />
                            Receive Delivery
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">Awaiting Approval</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAB 2: Delivery & Inspection History */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <Table minWidth={850}>
            <TableHead>
              <tr>
                <TableHeaderCell>Receipt #</TableHeaderCell>
                <TableHeaderCell>DR / Ref #</TableHeaderCell>
                <TableHeaderCell>Date Received</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Inspection & Delivered Items</TableHeaderCell>
                <TableHeaderCell>Notes / Remarks</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {goodsReceipts.length === 0 ? (
                <TableEmptyState colSpan={6}>
                  Walang nakatalang Goods Receipts para sa Budiao Warehouse.
                </TableEmptyState>
              ) : (
                goodsReceipts.map((gr) => (
                  <TableRow key={gr.id}>
                    <TableCell className="font-mono text-xs font-bold text-ink">{gr.receiptNumber}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-700 font-semibold">
                      {gr.supplierDeliveryNumber ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted">
                      {gr.receivedAt ? new Date(gr.receivedAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          gr.status === 'posted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : gr.status === 'reversed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {gr.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {gr.lines.map((l) => (
                          <div key={l.id} className="text-xs">
                            <span className="font-medium text-slate-800">{l.productName}: </span>
                            <span className="font-bold text-emerald-700">Accepted: {formatQuantity(l.acceptedQuantity)}</span>
                            {Number(l.rejectedQuantity) > 0 && (
                              <span className="ml-2 font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">
                                Damaged: {formatQuantity(l.rejectedQuantity)} ({l.rejectionReason})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 italic">
                      {gr.notes ? `"${gr.notes}"` : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* TAB 3: Current Stock on Hand in Budiao */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <Table minWidth={850}>
            <TableHead>
              <tr>
                <TableHeaderCell>SKU</TableHeaderCell>
                <TableHeaderCell>Product Name</TableHeaderCell>
                <TableHeaderCell align="right">On Hand</TableHeaderCell>
                <TableHeaderCell align="right">Reserved</TableHeaderCell>
                <TableHeaderCell align="right">Available Stock</TableHeaderCell>
                <TableHeaderCell>Stock Status</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {stockBalances.length === 0 ? (
                <TableEmptyState colSpan={6}>
                  Walang nakitang inventory records para sa Budiao Warehouse.
                </TableEmptyState>
              ) : (
                stockBalances.map((sb) => {
                  const onHand = Number(sb.onHandQuantity || 0)
                  const reserved = Number(sb.reservedQuantity || 0)
                  const available = Number(sb.availableQuantity || 0)
                  const isLow = available <= 5

                  return (
                    <TableRow key={sb.id}>
                      <TableCell className="font-mono text-xs font-bold text-ink">{sb.product?.sku ?? '—'}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{sb.product?.name ?? '—'}</TableCell>
                      <TableCell align="right" className="font-mono font-bold text-slate-800">
                        {formatQuantity(sb.onHandQuantity)}
                      </TableCell>
                      <TableCell align="right" className="font-mono text-slate-500">
                        {formatQuantity(sb.reservedQuantity)}
                      </TableCell>
                      <TableCell align="right" className="font-mono font-black text-emerald-800">
                        {formatQuantity(sb.availableQuantity)}
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                          <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                            ⚠️ Low Stock ({available})
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            ✓ In Stock
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Receive Delivery Modal */}
      {receivingPo && (
        <ReceiveDeliveryModal
          purchaseOrder={receivingPo}
          isSubmitting={receiveMutation.isPending}
          onClose={() => setReceivingPo(undefined)}
          onConfirm={(values) => receiveMutation.mutate(values)}
        />
      )}

      {/* Transfer Stock Modal */}
      {isTransferOpen && (
        <TransferStockModal
          sourceBalances={stockBalances}
          defaultFromBranchId={branchId}
          defaultToBranchId="1"
          isSubmitting={transferMutation.isPending}
          onClose={() => setIsTransferOpen(false)}
          onConfirm={(values) => transferMutation.mutate(values)}
        />
      )}
    </div>
  )
}
