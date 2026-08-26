import { apiClient } from '@/shared/api/client'
import type { PaginatedSales, RefundLineInput, RefundPaymentInput, Sale, SaleFilters } from '@/features/sales/types/sale'

type ApiEnvelope<T> = { data: T; meta?: PaginatedSales['meta'] }

export const saleQueryKeys = {
  lists: () => ['sales'] as const,
  list: (filters: SaleFilters) => ['sales', filters] as const,
  detail: (id: string) => ['sales', 'detail', id] as const,
}

export function resolveDateRange(filters: SaleFilters): { from?: string; to?: string } {
  if (filters.from && filters.to) {
    return { from: filters.from, to: filters.to }
  }

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  switch (filters.period) {
    case 'today':
      return { from: todayStr, to: todayStr }
    case 'yesterday': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
      return { from: yStr, to: yStr }
    }
    case 'this_month': {
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
      return {
        from: `${year}-${month}-01`,
        to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
      }
    }
    case 'last_month': {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const year = lastMonthDate.getFullYear()
      const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0')
      const lastDay = new Date(year, lastMonthDate.getMonth() + 1, 0).getDate()
      return {
        from: `${year}-${month}-01`,
        to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
      }
    }
    case 'this_year': {
      const year = now.getFullYear()
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      }
    }
    case 'specific_day':
      if (filters.specificDate) {
        return { from: filters.specificDate, to: filters.specificDate }
      }
      return {}
    case 'specific_month':
      if (filters.specificMonth) {
        const [y, m] = filters.specificMonth.split('-').map(Number)
        const lastDay = new Date(y, m, 0).getDate()
        return {
          from: `${filters.specificMonth}-01`,
          to: `${filters.specificMonth}-${String(lastDay).padStart(2, '0')}`,
        }
      }
      return {}
    case 'specific_year':
      if (filters.specificYear) {
        return {
          from: `${filters.specificYear}-01-01`,
          to: `${filters.specificYear}-12-31`,
        }
      }
      return {}
    case 'custom':
      return { from: filters.from || undefined, to: filters.to || undefined }
    case 'all':
    default:
      return {}
  }
}

export async function getSales(filters: SaleFilters): Promise<PaginatedSales> {
  const dateRange = resolveDateRange(filters)
  const response = await apiClient.get<ApiEnvelope<Sale[]>>('/sales', {
    params: {
      branchId: filters.branchId ?? undefined,
      status: filters.status === 'all' ? undefined : filters.status,
      saleNumber: filters.saleNumber || undefined,
      from: dateRange.from,
      to: dateRange.to,
      page: filters.page,
      perPage: filters.perPage,
    },
  })
  return { data: response.data.data, meta: response.data.meta ?? { page: filters.page, perPage: filters.perPage, total: 0 } }
}

export async function getSale(id: string): Promise<Sale> {
  const response = await apiClient.get<ApiEnvelope<Sale>>(`/sales/${id}`)
  return response.data.data
}

export async function voidSale(sale: Sale, reason: string): Promise<Sale> {
  const response = await apiClient.post<ApiEnvelope<Sale>>(
    `/sales/${sale.id}/void`,
    { reason, version: sale.version },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return response.data.data
}

export async function refundSale(sale: Sale, reason: string, lines: RefundLineInput[], payments: RefundPaymentInput[]): Promise<Sale> {
  const response = await apiClient.post<ApiEnvelope<Sale>>(
    `/sales/${sale.id}/refunds`,
    { reason, version: sale.version, lines, payments },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )
  return response.data.data
}
