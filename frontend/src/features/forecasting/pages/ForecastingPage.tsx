import { useEffect, useState } from 'react'
import { ArrowRight, Calculator, PlayCircle, Sparkles, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { ForecastSummaryPanel } from '@/features/dashboard/components/ForecastSummaryPanel'
import { createForecastRun, forecastQueryKeys, getForecastRun, recordManualPlan } from '@/features/forecasting/api/forecastApi'
import { ForecastRunDetailsDrawer } from '@/features/forecasting/components/ForecastRunDetailsDrawer'
import { ForecastRunFormDialog } from '@/features/forecasting/components/ForecastRunFormDialog'
import { ForecastRunTable } from '@/features/forecasting/components/ForecastRunTable'
import { useForecastRuns } from '@/features/forecasting/hooks/useForecast'
import type { CreateForecastRunPayload, ForecastRunFilters, ForecastRunItem } from '@/features/forecasting/types/forecast'
import { type ApiError } from '@/shared/api/client'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'

const defaultFilters: ForecastRunFilters = { branchId: null, page: 1, perPage: 10 }

export default function ForecastingPage() {
  const { session, hasPermission } = useAuth()
  const [filters, setFilters] = useState<ForecastRunFilters>(defaultFilters)
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const queryClient = useQueryClient()

  const defaultBranchId = (session?.user.branches.find((branch) => branch.isDefault) ?? session?.user.branches[0])?.id
  useEffect(() => {
    if (!defaultBranchId) return
    setFilters((state) => (state.branchId === defaultBranchId ? state : { ...state, branchId: defaultBranchId }))
  }, [defaultBranchId])

  const runsQuery = useForecastRuns(filters)
  const dashboardQuery = useDashboard(filters.branchId ?? undefined)
  const selectedRunQuery = useQuery({
    queryKey: forecastQueryKeys.detail(selectedRunId ?? ''),
    queryFn: () => getForecastRun(selectedRunId as string),
    enabled: selectedRunId !== undefined,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: forecastQueryKeys.lists() })
    if (selectedRunId) void queryClient.invalidateQueries({ queryKey: forecastQueryKeys.detail(selectedRunId) })
  }

  const createMutation = useMutation({
    mutationFn: (payload: Omit<CreateForecastRunPayload, 'branchId' | 'modelCode'>) =>
      createForecastRun({ ...payload, branchId: filters.branchId as string, modelCode: 'sma' }),
    onSuccess: (run) => { invalidate(); setIsFormOpen(false); setSelectedRunId(run.id) },
  })

  const manualPlanMutation = useMutation({
    mutationFn: ({ item, manualQuantity, reason, expiresAt }: { item: ForecastRunItem; manualQuantity: string; reason: string; expiresAt: string }) =>
      recordManualPlan(selectedRunId as string, item.productId, manualQuantity, reason, expiresAt),
    onSuccess: invalidate,
  })

  const error = (createMutation.error ?? manualPlanMutation.error) as ApiError | null
  const branchId = filters.branchId

  return (
    <div className="space-y-6">
      <PageHeader
        actions={hasPermission('forecasting.run') ? (
          <Button disabled={!branchId} onClick={() => setIsFormOpen(true)}>
            <PlayCircle aria-hidden="true" size={18} /> Run SMA Forecast
          </Button>
        ) : undefined}
        description="Analyzes historical sales to predict future daily customer demand using Simple Moving Average (SMA)."
        title="Demand Forecasting (SMA)"
      />

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-text" role="alert">
          {error.message}{error.requestId ? ` Request ID: ${error.requestId}` : ''}
        </div>
      ) : null}

      {/* Interactive Predictive Process Flow Banner */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                  Step 1 of 2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Predict Demand via Simple Moving Average (SMA)
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                The algorithm averages past 14-day sales transactions to compute your <strong>Daily Demand Rate</strong>. This rate directly calculates your reorder quantities in Step 2.
              </p>
            </div>
          </div>

          <Link
            to="/restocking"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:border-blue-300 hover:text-blue-600 transition shrink-0"
          >
            <Calculator className="text-blue-600" size={15} />
            Proceed to Step 2: Reorder Planning (EOQ & ROP)
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Forecast Coverage Summary Panel */}
      {dashboardQuery.data ? (
        <ForecastSummaryPanel
          summary={dashboardQuery.data.data.forecastSummary}
        />
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          Generated Forecast History ({runsQuery.data?.meta.total ?? 0} runs) {runsQuery.isFetching ? '· Updating…' : ''}
        </p>
        <span className="text-xs text-slate-400">Click any run row to inspect product-level demand</span>
      </div>

      <ForecastRunTable runs={runsQuery.data?.data ?? []} onView={(run) => setSelectedRunId(run.id)} />

      {isFormOpen ? (
        <ForecastRunFormDialog isSaving={createMutation.isPending} onClose={() => setIsFormOpen(false)} onSave={(payload) => createMutation.mutate(payload)} />
      ) : null}

      {selectedRunQuery.data ? (
        <ForecastRunDetailsDrawer
          canOverride={hasPermission('forecasting.override')}
          isSaving={manualPlanMutation.isPending}
          run={selectedRunQuery.data}
          onClose={() => setSelectedRunId(undefined)}
          onManualPlan={(item, manualQuantity, reason, expiresAt) => manualPlanMutation.mutate({ item, manualQuantity, reason, expiresAt })}
        />
      ) : null}
    </div>
  )
}
