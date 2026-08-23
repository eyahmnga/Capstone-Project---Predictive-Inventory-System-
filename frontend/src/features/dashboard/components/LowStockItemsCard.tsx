import { Link } from 'react-router-dom'
import { Droplet, Layers, Package, ShieldAlert } from 'lucide-react'

export type LowStockRow = {
  id: string
  name: string
  currentStock: string
  reorderPoint: string
  status: string
  iconType?: 'filter' | 'carbon' | 'membrane' | 'housing'
}

const defaultLowStockItems: LowStockRow[] = [
  {
    id: 'ls-1',
    name: 'PP Sediment Filter 10" 5 microm',
    currentStock: '8 pcs',
    reorderPoint: '20 pcs',
    status: 'Low Stock',
    iconType: 'filter',
  },
  {
    id: 'ls-2',
    name: 'Granular Activated Carbon 25kg',
    currentStock: '6 bags',
    reorderPoint: '15 bags',
    status: 'Low Stock',
    iconType: 'carbon',
  },
  {
    id: 'ls-3',
    name: 'RO Membrance 4040',
    currentStock: '2 pcs',
    reorderPoint: '5 pcs',
    status: 'Low Stock',
    iconType: 'membrane',
  },
  {
    id: 'ls-4',
    name: 'UDF Carbon Filter 20"',
    currentStock: '7 pcs',
    reorderPoint: '15 pcs',
    status: 'Low Stock',
    iconType: 'housing',
  },
]

type LowStockItemsCardProps = {
  items?: LowStockRow[]
}

export function LowStockItemsCard({
  items = [],
}: LowStockItemsCardProps) {
  const renderItemThumbnail = (type?: string) => {
    switch (type) {
      case 'filter':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <Layers aria-hidden="true" size={18} />
          </div>
        )
      case 'carbon':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
            <Package aria-hidden="true" size={18} />
          </div>
        )
      case 'membrane':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-600">
            <Droplet aria-hidden="true" size={18} />
          </div>
        )
      default:
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <Package aria-hidden="true" size={18} />
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-800">Low Stock Items</h2>
        <Link
          className="text-xs font-semibold text-blue-600 hover:underline"
          to="/products?stockStatus=low_stock"
        >
          View All
        </Link>
      </div>

      {/* Table Content or Empty State */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Package aria-hidden="true" size={20} />
          </div>
          <p className="mt-2.5 text-xs font-bold text-slate-700">No low stock items</p>
          <p className="text-[11px] text-slate-400">All inventory levels are above reorder points.</p>
        </div>
      ) : (
        <div className="mt-2 flex-1 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-2 font-medium">Item</th>
                <th className="py-2.5 px-2 text-center font-medium">Current Stock</th>
                <th className="py-2.5 px-2 text-center font-medium">Reorder Point</th>
                <th className="py-2.5 pl-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {items.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2.5">
                      {renderItemThumbnail(row.iconType)}
                      <span className="font-semibold text-slate-800 leading-tight">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-semibold text-rose-500 tabular-nums">
                    {row.currentStock}
                  </td>
                  <td className="py-3 px-2 text-center text-slate-600 font-medium tabular-nums">
                    {row.reorderPoint}
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <span className="inline-block rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
