import type { Product } from '@/features/products/types/product'
import type { ReorderPolicy, RestockingAlert } from '@/features/restocking/types/restocking'
import type { ComputedStockStatus } from '@/features/products/components/StockBadge'

/**
 * Authoritative client-side stock classification used across Dashboard and Products management.
 * Guarantees 100% synchronization between KPI counters and table row highlights.
 */
export function classifyProductStock(
  product: Product,
  policies: ReorderPolicy[] = [],
  alerts: RestockingAlert[] = [],
): ComputedStockStatus {
  if (!product.stock) {
    return 'out_of_stock'
  }

  const available = Number(product.stock.availableQuantity) || 0
  const onHand = Number(product.stock.onHandQuantity) || 0

  // 1. Out of Stock: 0 on-hand or 0 available
  if (available <= 0 || onHand <= 0) {
    return 'out_of_stock'
  }

  // 2. Low Stock: active alert OR available <= effective threshold (ROP or Safety Stock)
  const alert = alerts.find((a) => a.productId === product.id || a.productSku === product.sku)
  const policy = policies.find((p) => p.productId === product.id)
  const threshold =
    (policy?.reorderPointQuantity ? Number(policy.reorderPointQuantity) : null) ??
    (policy?.safetyStockQuantity ? Number(policy.safetyStockQuantity) : null) ??
    0

  if ((alert && alert.severity !== 'critical') || (threshold > 0 && available <= threshold)) {
    return 'low_stock'
  }

  // 3. Overstock: inventory on hand exceeds calculated EOQ batch and threshold
  const price = Number(product.sellingPrice) || 100
  const annualDemand = Math.max(12, threshold * 12)
  const orderCost = 150
  const holdingCost = Math.max(1, price * 0.15)
  const eoqSuggested = Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCost)) || 20
  const excess = Math.max(0, onHand - eoqSuggested)

  if (policy && onHand > eoqSuggested && excess > 0 && onHand > threshold) {
    return 'overstock'
  }

  // 4. Optimal healthy stock
  return 'optimal'
}
