import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Filter,
  History,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  createForecastRun,
  forecastQueryKeys,
  getForecastRun,
  recordManualPlan,
} from '@/features/forecasting/api/forecastApi'
import { ForecastRunDetailsDrawer } from '@/features/forecasting/components/ForecastRunDetailsDrawer'
import { ForecastRunFormDialog } from '@/features/forecasting/components/ForecastRunFormDialog'
import { useForecastRuns } from '@/features/forecasting/hooks/useForecast'
import { computeHistoryStartDate, defaultHistoryEndDate } from '@/features/forecasting/lib/period'
import type {
  CreateForecastRunPayload,
  ForecastRunFilters,
  ForecastRunItem,
} from '@/features/forecasting/types/forecast'
import { type ApiError } from '@/shared/api/client'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { formatQuantity } from '@/shared/lib/formatters'

const defaultFilters: ForecastRunFilters = { branchId: null, page: 1, perPage: 10 }

export default function ForecastingPage() {
  const { session, hasPermission } = useAuth()
  const [filters, setFilters] = useState<ForecastRunFilters>(defaultFilters)
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const defaultBranchId = (session?.user.branches.find((branch) => branch.isDefault) ?? session?.user.branches[0])?.id
  useEffect(() => {
    if (!defaultBranchId) return
    setFilters((state) => (state.branchId === defaultBranchId ? state : { ...state, branchId: defaultBranchId }))
  }, [defaultBranchId])

  const runsQuery = useForecastRuns(filters)
  const latestRunId = runsQuery.data?.data?.[0]?.id

  // Fetch active run details to display directly in the main view
  const activeRunId = selectedRunId ?? latestRunId
  const activeRunQuery = useQuery({
    queryKey: forecastQueryKeys.detail(activeRunId ?? ''),
    queryFn: () => getForecastRun(activeRunId as string),
    enabled: Boolean(activeRunId),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: forecastQueryKeys.lists() })
    if (activeRunId) void queryClient.invalidateQueries({ queryKey: forecastQueryKeys.detail(activeRunId) })
  }

  const createMutation = useMutation({
    mutationFn: (payload: Omit<CreateForecastRunPayload, 'branchId' | 'modelCode'>) =>
      createForecastRun({ ...payload, branchId: filters.branchId as string, modelCode: 'sma' }),
    onSuccess: (run) => {
      invalidate()
      setIsFormOpen(false)
      setSelectedRunId(run.id)
    },
  })

  const manualPlanMutation = useMutation({
    mutationFn: ({
      item,
      manualQuantity,
      reason,
      expiresAt,
    }: {
      item: ForecastRunItem
      manualQuantity: string
      reason: string
      expiresAt: string
    }) =>
      recordManualPlan(activeRunId as string, item.productId, manualQuantity, reason, expiresAt),
    onSuccess: invalidate,
  })

  const error = (createMutation.error ?? manualPlanMutation.error) as ApiError | null
  const branchId = filters.branchId
  const activeItems = activeRunQuery.data?.items ?? []

  // Quick 1-click forecast run with 14-day history ending today
  const handleQuickRun = () => {
    if (!branchId) return
    const endDate = defaultHistoryEndDate()
    const startDate = computeHistoryStartDate('daily', 14, endDate)
    createMutation.mutate({
      periodGrain: 'daily',
      windowPeriods: 14,
      historyStartDate: startDate,
      historyEndDate: endDate,
    })
  }

  // Sort active demand items to the top, and filter by search
  const displayedItems = useMemo(() => {
    let list = [...activeItems]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (item) =>
          item.productName?.toLowerCase().includes(q) ||
          item.productSku?.toLowerCase().includes(q),
      )
    }

    return list.sort((a, b) => {
      const aDemand = Number(a.demandTotal) || 0
      const bDemand = Number(b.demandTotal) || 0
      return bDemand - aDemand
    })
  }, [activeItems, searchQuery])

  const activeDemandCount = activeItems.filter((i) => (Number(i.demandTotal) || 0) > 0).length

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          hasPermission('forecasting.run') ? (
            <div className="flex gap-2">
              <Button
                disabled={!branchId || createMutation.isPending}
                variant="secondary"
                onClick={handleQuickRun}
                className="text-xs font-semibold"
              >
                <RefreshCw
                  aria-hidden="true"
                  size={15}
                  className={createMutation.isPending ? 'animate-spin text-blue-600' : ''}
                />
                Quick 14-Day Recalculate
              </Button>
              <Button disabled={!branchId || createMutation.isPending} onClick={() => setIsFormOpen(true)}>
                <PlayCircle aria-hidden="true" size={18} />
                {createMutation.isPending ? 'Calculating…' : 'Custom SMA Run'}
              </Button>
            </div>
          ) : undefined
        }
        description="Predicts future customer demand per day and month using Simple Moving Average (SMA) over completed POS transactions."
        title="Demand Forecast (SMA)"
      />

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-text" role="alert">
          {error.message}
        </div>
      ) : null}

      {/* 3 Straightforward Concept Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-xs">
              1
            </span>
            <span className="text-xs font-semibold text-slate-500">What is SMA?</span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-800">
            Simple Moving Average
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Takes your total sales over rolling days and calculates how many units sell <strong>per day</strong>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs">
              2
            </span>
            <span className="text-xs font-semibold text-slate-500">Active Demand</span>
          </div>
          <p className="mt-2 text-sm font-bold text-emerald-700">
            {activeDemandCount} Items with Live Sales
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Daily Forecast = Total Units Sold &divide; Number of Days
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
                3
              </span>
              <span className="text-xs font-semibold text-slate-500">Next Step</span>
            </div>
            <Link
              to="/restocking"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              Reorder Plan <ArrowRight size={13} />
            </Link>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-800">
            Calculate EOQ & ROP
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Feeds directly into your reorder points and optimal purchase order size.
          </p>
        </div>
      </div>

      {/* Main Direct Products Demand Forecast Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">
                📊 Product Demand Rates (SMA Results)
              </h2>
              {activeRunQuery.data && (
                <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                  Run #{activeRunQuery.data.id} ({activeRunQuery.data.historyStartDate} to {activeRunQuery.data.historyEndDate})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Straightforward daily selling speed and 30-day projected requirements for each product
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/restocking"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Calculator size={14} />
              Proceed to Reorder Planning (EOQ)
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              className="h-9 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              placeholder="Search products in forecast..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-sm font-semibold text-slate-700">No active forecast records</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;Quick 14-Day Recalculate&quot; to compute daily demand across all completed POS sales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Historical Sold</th>
                  <th className="px-4 py-3 text-right">SMA Daily Demand</th>
                  <th className="px-4 py-3 text-right">Estimated 30-Day Demand</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Reorder Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayedItems.map((item) => {
                  const dailyRate =
                    Number(item.coldStartStatus === 'manual_override' ? item.manualQuantity : item.forecastQuantity) || 0
                  const monthlyRate = Math.round(dailyRate * 30)
                  const hasSales = (Number(item.demandTotal) || 0) > 0

                  return (
                    <tr
                      key={item.productId}
                      className={`transition ${hasSales ? 'bg-emerald-50/20 font-medium hover:bg-emerald-50/40' : 'hover:bg-slate-50/70'}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{item.productName}</p>
                        <p className="font-mono text-xs text-slate-400">{item.productSku}</p>
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums font-mono text-slate-700">
                        {formatQuantity(item.demandTotal)} pcs
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums font-mono font-bold text-emerald-700">
                        {dailyRate > 0 ? `${formatQuantity(dailyRate)} pcs / day` : '0 pcs / day'}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums font-mono font-extrabold text-blue-700">
                        {dailyRate > 0 ? `~${monthlyRate} pcs / month` : '—'}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            dailyRate > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {dailyRate > 0 ? '✓ Active Demand' : 'No Sales In Period'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/restocking"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                        >
                          View ROP & EOQ <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen ? (
        <ForecastRunFormDialog
          isSaving={createMutation.isPending}
          onClose={() => setIsFormOpen(false)}
          onSave={(payload) => createMutation.mutate(payload)}
        />
      ) : null}

      {activeRunQuery.data && selectedRunId ? (
        <ForecastRunDetailsDrawer
          canOverride={hasPermission('forecasting.override')}
          isSaving={manualPlanMutation.isPending}
          run={activeRunQuery.data}
          onClose={() => setSelectedRunId(undefined)}
          onManualPlan={(item, manualQuantity, reason, expiresAt) =>
            manualPlanMutation.mutate({ item, manualQuantity, reason, expiresAt })
          }
        />
      ) : null}
    </div>
  )
}
