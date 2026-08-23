import { apiClient } from '@/shared/api/client'
import type { FinalizeSalePayload, PosProduct } from '@/features/pos/types/pos'
import type { Sale } from '@/features/sales/types/sale'

type ApiEnvelope<T> = { data: T; meta?: { page: number; perPage: number; total: number } }

export const posProductQueryKeys = {
  list: (branchId: string | null, query: string, categoryId?: string) =>
    ['pos-products', branchId, query, categoryId ?? 'all'] as const,
}

export async function getPosProducts(
  branchId: string,
  query: string,
  categoryId?: string,
): Promise<PosProduct[]> {
  const response = await apiClient.get<ApiEnvelope<PosProduct[]>>('/pos/products', {
    params: {
      branchId,
      query: query || undefined,
      categoryId: categoryId && categoryId !== 'all' ? categoryId : undefined,
      perPage: 100,
    },
  })
  return response.data.data
}

export async function finalizeSale(payload: FinalizeSalePayload): Promise<Sale> {
  const response = await apiClient.post<ApiEnvelope<Sale>>(
    '/sales',
    {
      branchId: payload.branchId,
      soldAt: payload.soldAt,
      currencyCode: payload.currencyCode,
      taxExempt: payload.taxExempt,
      notes: payload.notes || undefined,
      approvedByUserId: payload.approvedByUserId || undefined,
      lines: payload.lines,
      payments: payload.payments,
    },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return response.data.data
}
