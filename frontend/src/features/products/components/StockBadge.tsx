import type { ProductStock } from '@/features/products/types/product'
import { Badge } from '@/shared/components/Badge'
import { formatQuantity } from '@/shared/lib/formatters'

export type ComputedStockStatus = 'low_stock' | 'overstock' | 'out_of_stock' | 'optimal'

export function StockBadge({
  stock,
  computedStatus,
}: {
  stock: ProductStock | null
  computedStatus?: ComputedStockStatus
}) {
  if (!stock) {
    return <Badge tone="neutral">Not tracked</Badge>
  }

  const available = Number(stock.availableQuantity)

  if (computedStatus === 'out_of_stock' || available <= 0) {
    return <Badge tone="danger">Out of stock</Badge>
  }

  if (computedStatus === 'low_stock') {
    return <Badge tone="warning">Low stock ({formatQuantity(stock.availableQuantity)})</Badge>
  }

  if (computedStatus === 'overstock') {
    return <Badge tone="info">Overstocked ({formatQuantity(stock.availableQuantity)})</Badge>
  }

  return (
    <Badge tone="success">
      {formatQuantity(stock.availableQuantity)} available
    </Badge>
  )
}
