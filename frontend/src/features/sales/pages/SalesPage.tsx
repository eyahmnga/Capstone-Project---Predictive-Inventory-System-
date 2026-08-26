import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { MetricCard } from '@/features/dashboard/components/MetricCard'
import { RecentSalesPanel } from '@/features/dashboard/components/RecentSalesPanel'
import { SalesTrendTable } from '@/features/dashboard/components/SalesTrendTable'
import { getSale, refundSale, saleQueryKeys, voidSale } from '@/features/sales/api/salesApi'
import { SaleDetailsDrawer } from '@/features/sales/components/SaleDetailsDrawer'
import { SaleTable } from '@/features/sales/components/SaleTable'
import { useSales } from '@/features/sales/hooks/useSales'
import type {
  RefundLineInput,
  RefundPaymentInput,
  Sale,
  SaleFilters,
  SaleStatus,
} from '@/features/sales/types/sale'
import type { DashboardMetric } from '@/features/dashboard/types/dashboard'
import { type ApiError } from '@/shared/api/client'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { cn } from '@/shared/lib/cn'

const now = new Date()
const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const thisMonthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const thisYearISO = String(now.getFullYear())

const defaultFilters: SaleFilters = {
  branchId: null,
  status: 'all',
  saleNumber: '',
  period: 'all',
  specificDate: todayISO,
  specificMonth: thisMonthISO,
  specificYear: thisYearISO,
  from: '',
  to: '',
  page: 1,
  perPage: 15,
}

export default function SalesPage() {
  const { session } = useAuth()
  const [filters, setFilters] = useState<SaleFilters>(defaultFilters)
  const [activePeriodTab, setActivePeriodTab] = useState<'all' | 'day' | 'month' | 'year' | 'custom'>('all')
  const [selectedSaleId, setSelectedSaleId] = useState<string | undefined>()
  const queryClient = useQueryClient()

  const defaultBranchId = (session?.user.branches.find((branch) => branch.isDefault) ?? session?.user.branches[0])?.id
  useEffect(() => {
    if (!defaultBranchId) return
    setFilters((state) => (state.branchId === defaultBranchId ? state : { ...state, branchId: defaultBranchId }))
  }, [defaultBranchId])

  const salesQuery = useSales(filters)
  const dashboardQuery = useDashboard(defaultBranchId)
  const selectedSaleQuery = useQuery({
    queryKey: saleQueryKeys.detail(selectedSaleId ?? ''),
    queryFn: () => getSale(selectedSaleId as string),
    enabled: selectedSaleId !== undefined,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: ['inventory-balances'] })
    if (selectedSaleId) void queryClient.invalidateQueries({ queryKey: saleQueryKeys.detail(selectedSaleId) })
  }

  const voidMutation = useMutation({
    mutationFn: ({ sale, reason }: { sale: Sale; reason: string }) => voidSale(sale, reason),
    onSuccess: invalidate,
  })
  const refundMutation = useMutation({
    mutationFn: ({
      sale,
      reason,
      lines,
      payments,
    }: {
      sale: Sale
      reason: string
      lines: RefundLineInput[]
      payments: RefundPaymentInput[]
    }) => refundSale(sale, reason, lines, payments),
    onSuccess: invalidate,
  })

  const isActing = voidMutation.isPending || refundMutation.isPending
  const error = (voidMutation.error ?? refundMutation.error) as ApiError | null

  // Switch Period Mode
  const handlePeriodTabChange = (tab: 'all' | 'day' | 'month' | 'year' | 'custom') => {
    setActivePeriodTab(tab)
    if (tab === 'all') {
      setFilters((prev) => ({
        ...prev,
        period: 'all',
        from: '',
        to: '',
        page: 1,
      }))
    } else if (tab === 'day') {
      setFilters((prev) => ({
        ...prev,
        period: 'specific_day',
        specificDate: prev.specificDate || todayISO,
        from: '',
        to: '',
        page: 1,
      }))
    } else if (tab === 'month') {
      setFilters((prev) => ({
        ...prev,
        period: 'specific_month',
        specificMonth: prev.specificMonth || thisMonthISO,
        from: '',
        to: '',
        page: 1,
      }))
    } else if (tab === 'year') {
      setFilters((prev) => ({
        ...prev,
        period: 'specific_year',
        specificYear: prev.specificYear || thisYearISO,
        from: '',
        to: '',
        page: 1,
      }))
    } else if (tab === 'custom') {
      setFilters((prev) => ({
        ...prev,
        period: 'custom',
        from: prev.from || todayISO,
        to: prev.to || todayISO,
        page: 1,
      }))
    }
  }

  // Quick Day Set
  const handleQuickDay = (dayType: 'today' | 'yesterday') => {
    if (dayType === 'today') {
      setFilters((prev) => ({
        ...prev,
        period: 'specific_day',
        specificDate: todayISO,
        page: 1,
      }))
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
      setFilters((prev) => ({
        ...prev,
        period: 'specific_day',
        specificDate: yStr,
        page: 1,
      }))
    }
  }

  // Quick Month Set
  const handleQuickMonth = (monthType: 'this_month' | 'last_month') => {
    if (monthType === 'this_month') {
      setFilters((prev) => ({
        ...prev,
        period: 'specific_month',
        specificMonth: thisMonthISO,
        page: 1,
      }))
    } else {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lmStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
      setFilters((prev) => ({
        ...prev,
        period: 'specific_month',
        specificMonth: lmStr,
        page: 1,
      }))
    }
  }

  // Reset all filters
  const resetFilters = () => {
    setActivePeriodTab('all')
    setFilters({
      ...defaultFilters,
      branchId: defaultBranchId ?? null,
    })
  }

  // Calculations for filtered KPI
  const totalSalesCount = salesQuery.data?.meta.total ?? 0
  const totalSalesRevenue = Number(salesQuery.data?.meta.totalSalesAmount ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalSalesCount / filters.perPage))

  // Compute period label for Metric Card
  const periodLabel = useMemo(() => {
    switch (activePeriodTab) {
      case 'day':
        return filters.specificDate === todayISO ? 'Sales Today' : `Sales on ${filters.specificDate}`
      case 'month':
        return filters.specificMonth === thisMonthISO ? 'This Month Sales' : `Sales in ${filters.specificMonth}`
      case 'year':
        return filters.specificYear === thisYearISO ? 'This Year Sales' : `Sales in ${filters.specificYear}`
      case 'custom':
        return 'Custom Range Sales'
      case 'all':
      default:
        return 'Total Sales Revenue'
    }
  }, [activePeriodTab, filters.specificDate, filters.specificMonth, filters.specificYear])

  const filteredSalesMetric: DashboardMetric = {
    label: periodLabel,
    value: String(totalSalesRevenue),
    detail: `${totalSalesCount} completed transaction${totalSalesCount === 1 ? '' : 's'}`,
  }

  const transactionsMetric: DashboardMetric = {
    label: 'Filtered Transactions',
    value: String(totalSalesCount),
    detail: activePeriodTab === 'all' ? 'All recorded transactions' : `Filtered by ${activePeriodTab}`,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review completed sales, filter by day, month, or year, track sales trends, and manage transactions."
        title="Sales"
      />

      {error ? (
        <div
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-text"
          role="alert"
        >
          {error.message}
          {error.requestId ? ` Request ID: ${error.requestId}` : ''}
        </div>
      ) : null}

      {/* Top Metric Cards Row: Consistent system styling */}
      {dashboardQuery.data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              icon={<TrendingUp aria-hidden="true" size={22} />}
              isCurrency
              metric={dashboardQuery.data.data.kpis.salesToday}
              tone="success"
            />
            <MetricCard
              icon={<Receipt aria-hidden="true" size={22} />}
              isCurrency
              metric={filteredSalesMetric}
              tone="default"
            />
            <MetricCard
              icon={<ShoppingBag aria-hidden="true" size={22} />}
              metric={transactionsMetric}
              tone="default"
            />
          </div>

          {/* Recent Sales Panel & Sales Trend Table */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentSalesPanel sales={dashboardQuery.data.data.recentSales} />
            <SalesTrendTable points={dashboardQuery.data.data.salesTrend} />
          </div>
        </div>
      ) : null}

      {/* Filter Toolbar with Date & Period Selection */}
      <section className="space-y-4 rounded-card border border-border bg-surface p-4 shadow-panel sm:p-6" id="sales-table">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="text-brand-600" size={16} />
            <h3 className="text-sm font-bold text-ink">Sales History & Filter</h3>
          </div>
          <Button size="sm" type="button" variant="ghost" onClick={resetFilters}>
            <RotateCcw size={14} />
            Reset filters
          </Button>
        </div>

        {/* Time Period Filter Tabs */}
        <div>
          <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                activePeriodTab === 'all'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              type="button"
              onClick={() => handlePeriodTabChange('all')}
            >
              All Time
            </button>
            <button
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                activePeriodTab === 'day'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              type="button"
              onClick={() => handlePeriodTabChange('day')}
            >
              By Day
            </button>
            <button
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                activePeriodTab === 'month'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              type="button"
              onClick={() => handlePeriodTabChange('month')}
            >
              By Month
            </button>
            <button
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                activePeriodTab === 'year'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              type="button"
              onClick={() => handlePeriodTabChange('year')}
            >
              By Year
            </button>
            <button
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                activePeriodTab === 'custom'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              type="button"
              onClick={() => handlePeriodTabChange('custom')}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Dynamic Contextual Date Pickers */}
        {activePeriodTab === 'day' && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <button
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                  filters.specificDate === todayISO
                    ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
                type="button"
                onClick={() => handleQuickDay('today')}
              >
                Today
              </button>
              <button
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                  filters.specificDate !== todayISO
                    ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
                type="button"
                onClick={() => handleQuickDay('yesterday')}
              >
                Yesterday
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">Or pick date:</span>
              <input
                className="h-9 rounded-lg border border-border bg-white px-3 text-xs font-medium outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                type="date"
                value={filters.specificDate ?? todayISO}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    period: 'specific_day',
                    specificDate: e.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
          </div>
        )}

        {activePeriodTab === 'month' && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <button
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                  filters.specificMonth === thisMonthISO
                    ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
                type="button"
                onClick={() => handleQuickMonth('this_month')}
              >
                This Month
              </button>
              <button
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                  filters.specificMonth !== thisMonthISO
                    ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
                type="button"
                onClick={() => handleQuickMonth('last_month')}
              >
                Last Month
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">Or pick month:</span>
              <input
                className="h-9 rounded-lg border border-border bg-white px-3 text-xs font-medium outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                type="month"
                value={filters.specificMonth ?? thisMonthISO}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    period: 'specific_month',
                    specificMonth: e.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
          </div>
        )}

        {activePeriodTab === 'year' && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <span className="text-xs text-muted font-medium">Select year:</span>
            <select
              className="h-9 rounded-lg border border-border bg-white px-3 text-xs font-medium outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              value={filters.specificYear ?? thisYearISO}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  period: 'specific_year',
                  specificYear: e.target.value,
                  page: 1,
                }))
              }
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        )}

        {activePeriodTab === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted font-medium">From:</span>
              <input
                className="h-9 rounded-lg border border-border bg-white px-3 text-xs font-medium outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    period: 'custom',
                    from: e.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted font-medium">To:</span>
              <input
                className="h-9 rounded-lg border border-border bg-white px-3 text-xs font-medium outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    period: 'custom',
                    to: e.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
          </div>
        )}

        {/* Search by Number & Status Filter */}
        <div className="grid gap-3 pt-1 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              placeholder="Search by sale number (e.g. 5N898)..."
              value={filters.saleNumber}
              onChange={(event) =>
                setFilters((state) => ({ ...state, saleNumber: event.target.value, page: 1 }))
              }
            />
          </div>
          <select
            className="h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            value={filters.status}
            onChange={(event) =>
              setFilters((state) => ({
                ...state,
                status: event.target.value as SaleStatus | 'all',
                page: 1,
              }))
            }
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </section>

      {/* Results Count */}
      <p className="text-sm text-muted">
        {totalSalesCount} sales {salesQuery.isFetching ? '· Updating…' : ''}
      </p>

      {/* Sales Table */}
      <SaleTable sales={salesQuery.data?.data ?? []} onView={(sale) => setSelectedSaleId(sale.id)} />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav
          aria-label="Sales pagination"
          className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted"
        >
          <span>
            Page <strong>{filters.page}</strong> of <strong>{totalPages}</strong> ({totalSalesCount} total sales)
          </span>
          <div className="flex items-center gap-1">
            <Button
              disabled={filters.page <= 1}
              size="sm"
              variant="secondary"
              onClick={() => setFilters((state) => ({ ...state, page: Math.max(1, state.page - 1) }))}
            >
              <ChevronLeft size={14} />
              Previous
            </Button>
            <Button
              disabled={filters.page >= totalPages}
              size="sm"
              variant="secondary"
              onClick={() => setFilters((state) => ({ ...state, page: Math.min(totalPages, state.page + 1) }))}
            >
              Next
              <ChevronRight size={14} />
            </Button>
          </div>
        </nav>
      )}

      {/* Sale Details Drawer */}
      {selectedSaleQuery.data ? (
        <SaleDetailsDrawer
          isActing={isActing}
          sale={selectedSaleQuery.data}
          onClose={() => setSelectedSaleId(undefined)}
          onRefund={(reason, lines, payments) =>
            refundMutation.mutate({ sale: selectedSaleQuery.data, reason, lines, payments })
          }
          onVoid={(reason) => voidMutation.mutate({ sale: selectedSaleQuery.data, reason })}
        />
      ) : null}
    </div>
  )
}
