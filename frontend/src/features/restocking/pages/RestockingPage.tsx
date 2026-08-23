import { useEffect, useState } from 'react'
import { ArrowLeft, Calculator, PlusCircle, RefreshCw, ShoppingCart, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProductOptions } from '@/features/products/hooks/useProducts'
import {
  acknowledgeAlert,
  calculateEoq,
  createReorderPolicy,
  dismissAlert,
  evaluateRestockingAlerts,
  getRestockingAlert,
  recalculateRop,
  reorderPolicyQueryKeys,
  resolveAlert,
  restockingAlertQueryKeys,
} from '@/features/restocking/api/restockingApi'
import { AlertDetailsDrawer } from '@/features/restocking/components/AlertDetailsDrawer'
import { AlertTable } from '@/features/restocking/components/AlertTable'
import { ReorderPolicyDetailsDrawer } from '@/features/restocking/components/ReorderPolicyDetailsDrawer'
import { ReorderPolicyFormDialog } from '@/features/restocking/components/ReorderPolicyFormDialog'
import { ReorderPolicyTable } from '@/features/restocking/components/ReorderPolicyTable'
import { useReorderPolicies, useRestockingAlerts } from '@/features/restocking/hooks/useRestocking'
import type {
  AlertSeverity,
  AlertStatus,
  CreateReorderPolicyPayload,
  ReorderPolicy,
  ReorderPolicyFilters,
  RestockingAlertFilters,
} from '@/features/restocking/types/restocking'
import { type ApiError } from '@/shared/api/client'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'

type Tab = 'policies' | 'alerts'

const tabs: { id: Tab; label: string; badgeCount?: number }[] = [
  { id: 'policies', label: 'Reorder Policies (ROP & EOQ)' },
  { id: 'alerts', label: 'Restocking Alerts' },
]

const defaultPolicyFilters: ReorderPolicyFilters = { branchId: null, page: 1, perPage: 10 }
const defaultAlertFilters: RestockingAlertFilters = { branchId: null, status: 'all', severity: 'all', page: 1, perPage: 10 }

export default function RestockingPage() {
  const { session, hasPermission } = useAuth()
  const [tab, setTab] = useState<Tab>('policies')
  const [policyFilters, setPolicyFilters] = useState<ReorderPolicyFilters>(defaultPolicyFilters)
  const [alertFilters, setAlertFilters] = useState<RestockingAlertFilters>(defaultAlertFilters)
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>()
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const queryClient = useQueryClient()

  const defaultBranchId = (session?.user.branches.find((branch) => branch.isDefault) ?? session?.user.branches[0])?.id
  useEffect(() => {
    if (!defaultBranchId) return
    setPolicyFilters((state) => (state.branchId === defaultBranchId ? state : { ...state, branchId: defaultBranchId }))
    setAlertFilters((state) => (state.branchId === defaultBranchId ? state : { ...state, branchId: defaultBranchId }))
  }, [defaultBranchId])

  const policiesQuery = useReorderPolicies(policyFilters)
  const alertsQuery = useRestockingAlerts(alertFilters)
  const productOptionsQuery = useProductOptions()

  const selectedPolicy = policiesQuery.data?.data.find((policy) => policy.id === selectedPolicyId)
  const selectedAlertQuery = useQuery({
    queryKey: restockingAlertQueryKeys.detail(selectedAlertId ?? ''),
    queryFn: () => getRestockingAlert(selectedAlertId as string),
    enabled: selectedAlertId !== undefined,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: reorderPolicyQueryKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: restockingAlertQueryKeys.lists() })
    if (selectedPolicyId) void queryClient.invalidateQueries({ queryKey: reorderPolicyQueryKeys.eoqHistory(selectedPolicyId) })
    if (selectedAlertId) void queryClient.invalidateQueries({ queryKey: restockingAlertQueryKeys.detail(selectedAlertId) })
  }

  const createPolicyMutation = useMutation({
    mutationFn: (payload: Omit<CreateReorderPolicyPayload, 'branchId'>) => createReorderPolicy({ ...payload, branchId: policyFilters.branchId as string }),
    onSuccess: () => { invalidate(); setIsFormOpen(false) },
  })
  const recalculateMutation = useMutation({ mutationFn: (policy: ReorderPolicy) => recalculateRop(policy), onSuccess: invalidate })
  const eoqMutation = useMutation({
    mutationFn: ({ policy, annualDemandQuantity, orderingCost, annualHoldingCostPerUnit }: { policy: ReorderPolicy; annualDemandQuantity: string; orderingCost: string; annualHoldingCostPerUnit: string }) =>
      calculateEoq(policy, annualDemandQuantity, orderingCost, annualHoldingCostPerUnit, 'PHP'),
    onSuccess: invalidate,
  })

  const evaluateMutation = useMutation({ mutationFn: () => evaluateRestockingAlerts(alertFilters.branchId as string), onSuccess: invalidate })
  const acknowledgeMutation = useMutation({ mutationFn: (payload: { alert: NonNullable<typeof selectedAlertQuery.data> }) => acknowledgeAlert(payload.alert), onSuccess: invalidate })
  const resolveMutation = useMutation({ mutationFn: (payload: { alert: NonNullable<typeof selectedAlertQuery.data>; reason: string }) => resolveAlert(payload.alert, payload.reason), onSuccess: invalidate })
  const dismissMutation = useMutation({ mutationFn: (payload: { alert: NonNullable<typeof selectedAlertQuery.data>; reason: string }) => dismissAlert(payload.alert, payload.reason), onSuccess: invalidate })

  const isActingOnAlert = acknowledgeMutation.isPending || resolveMutation.isPending || dismissMutation.isPending
  const error = (createPolicyMutation.error ?? recalculateMutation.error ?? eoqMutation.error ?? evaluateMutation.error ?? acknowledgeMutation.error ?? resolveMutation.error ?? dismissMutation.error) as ApiError | null

  const branchId = policyFilters.branchId

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          tab === 'policies' && hasPermission('planning.rop.manage') ? (
            <Button disabled={!branchId} onClick={() => setIsFormOpen(true)}>
              <PlusCircle aria-hidden="true" size={18} /> New Reorder Policy
            </Button>
          ) : tab === 'alerts' && hasPermission('restocking.evaluate') ? (
            <Button disabled={!branchId || evaluateMutation.isPending} onClick={() => evaluateMutation.mutate()}>
              <RefreshCw aria-hidden="true" size={18} className={evaluateMutation.isPending ? 'animate-spin' : ''} />
              {evaluateMutation.isPending ? 'Evaluating…' : 'Scan & Evaluate Alerts'}
            </Button>
          ) : undefined
        }
        description="Calculate Reorder Points (ROP) and Economic Order Quantities (EOQ) based on your SMA Demand Forecast."
        title="Reorder Planning (EOQ & ROP)"
      />

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-text" role="alert">
          {error.message}{error.requestId ? ` Request ID: ${error.requestId}` : ''}
        </div>
      ) : null}

      {/* Connected Pipeline Step Banner */}
      <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
              <Calculator size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                  Step 2 of 2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Automate Reorder Timing (ROP) & Batch Sizing (EOQ)
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Using the predicted daily demand from <strong>SMA Forecasting</strong>, this module calculates the minimum threshold (<strong>ROP</strong>) and the most cost-effective replenishment batch (<strong>EOQ</strong>).
              </p>
            </div>
          </div>

          <Link
            to="/forecasting"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:border-emerald-300 hover:text-emerald-700 transition shrink-0"
          >
            <ArrowLeft size={14} />
            <TrendingUp className="text-blue-600" size={15} />
            Review Step 1: Demand Forecast (SMA)
          </Link>
        </div>
      </div>

      <nav aria-label="Restocking sections" className="flex gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
              tab === item.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted hover:text-ink'
            }`}
            type="button"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'policies' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {policiesQuery.data?.meta.total ?? 0} Product Reorder Policies {policiesQuery.isFetching ? '· Updating…' : ''}
            </p>
            <span className="text-xs text-slate-400">Click the panel icon on any row to calculate EOQ</span>
          </div>
          <ReorderPolicyTable policies={policiesQuery.data?.data ?? []} onView={(policy) => setSelectedPolicyId(policy.id)} />
        </div>
      ) : null}

      {tab === 'alerts' ? (
        <div className="space-y-4">
          <section className="grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-2xs sm:p-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Filter by Status</label>
              <select
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/30"
                value={alertFilters.status}
                onChange={(event) => setAlertFilters((state) => ({ ...state, status: event.target.value as AlertStatus | 'all', page: 1 }))}
              >
                <option value="all">All statuses</option>
                <option value="active">Active (Needs Attention)</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Filter by Severity</label>
              <select
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/30"
                value={alertFilters.severity}
                onChange={(event) => setAlertFilters((state) => ({ ...state, severity: event.target.value as AlertSeverity | 'all', page: 1 }))}
              >
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </section>
          <p className="text-sm text-muted">{alertsQuery.data?.meta.total ?? 0} active alerts {alertsQuery.isFetching ? '· Updating…' : ''}</p>
          <AlertTable alerts={alertsQuery.data?.data ?? []} onView={(alert) => setSelectedAlertId(alert.id)} />
        </div>
      ) : null}

      {isFormOpen ? (
        <ReorderPolicyFormDialog
          isSaving={createPolicyMutation.isPending}
          productOptions={productOptionsQuery.data ?? []}
          onClose={() => setIsFormOpen(false)}
          onSave={(payload) => createPolicyMutation.mutate(payload)}
        />
      ) : null}

      {selectedPolicy ? (
        <ReorderPolicyDetailsDrawer
          canCalculate={hasPermission('planning.rop.calculate')}
          canCalculateEoq={hasPermission('planning.eoq.calculate')}
          isActing={recalculateMutation.isPending || eoqMutation.isPending}
          policy={selectedPolicy}
          onCalculateEoq={(annualDemandQuantity, orderingCost, annualHoldingCostPerUnit) => eoqMutation.mutate({ policy: selectedPolicy, annualDemandQuantity, orderingCost, annualHoldingCostPerUnit })}
          onClose={() => setSelectedPolicyId(undefined)}
          onRecalculateRop={() => recalculateMutation.mutate(selectedPolicy)}
        />
      ) : null}

      {selectedAlertQuery.data ? (
        <AlertDetailsDrawer
          alert={selectedAlertQuery.data}
          isActing={isActingOnAlert}
          onAcknowledge={() => acknowledgeMutation.mutate({ alert: selectedAlertQuery.data })}
          onClose={() => setSelectedAlertId(undefined)}
          onDismiss={(reason) => dismissMutation.mutate({ alert: selectedAlertQuery.data, reason })}
          onResolve={(reason) => resolveMutation.mutate({ alert: selectedAlertQuery.data, reason })}
        />
      ) : null}
    </div>
  )
}
