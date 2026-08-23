import { Link } from 'react-router-dom'
import { Cylinder, Database, Layers, Package } from 'lucide-react'

export type OverstockRow = {
  id: string
  name: string
  currentStock: string
  eoqSuggested: string
  excess: string
  iconType?: 'tank' | 'cation' | 'anion' | 'housing'
}

const defaultOverstockRows: OverstockRow[] = [
  {
    id: 'ov-1',
    name: 'Pressure Tank 100L',
    currentStock: '45 pcs',
    eoqSuggested: '20 pcs',
    excess: '25 pcs',
    iconType: 'tank',
  },
  {
    id: 'ov-2',
    name: 'Resin (Cation) 25L',
    currentStock: '60 bags',
    eoqSuggested: '30 bags',
    excess: '30 bags',
    iconType: 'cation',
  },
  {
    id: 'ov-3',
    name: 'Resin (Anion) 25L',
    currentStock: '55 bags',
    eoqSuggested: '25 bags',
    excess: '30 bags',
    iconType: 'anion',
  },
  {
    id: 'ov-4',
    name: 'Big Blue Housing 20"',
    currentStock: '35 pcs',
    eoqSuggested: '15 pcs',
    excess: '20 pcs',
    iconType: 'housing',
  },
]

type TopOverstockEoqCardProps = {
  items?: OverstockRow[]
}

export function TopOverstockEoqCard({
  items = [],
}: TopOverstockEoqCardProps) {
  const renderItemThumbnail = (type?: string) => {
    switch (type) {
      case 'tank':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
            <Cylinder aria-hidden="true" size={18} />
          </div>
        )
      case 'cation':
      case 'anion':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <Package aria-hidden="true" size={18} />
          </div>
        )
      case 'housing':
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-600">
            <Database aria-hidden="true" size={18} />
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
        <h2 className="text-sm font-bold text-slate-800">Top Overstock Items</h2>
        <Link
          className="text-xs font-semibold text-blue-600 hover:underline"
          to="/products?stockStatus=overstock"
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
          <p className="mt-2.5 text-xs font-bold text-slate-700">No overstock items</p>
          <p className="text-[11px] text-slate-400">All products are within optimal EOQ thresholds.</p>
        </div>
      ) : (
        <div className="mt-2 flex-1 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 pr-2 font-medium">Item</th>
                <th className="py-2.5 px-2 text-center font-medium">Current Stock</th>
                <th className="py-2.5 px-2 text-center font-medium">EOQ Suggested</th>
                <th className="py-2.5 pl-2 text-right font-medium">Excess</th>
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
                    {row.eoqSuggested}
                  </td>
                  <td className="py-3 pl-2 text-right font-semibold text-rose-500 tabular-nums">
                    {row.excess}
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
