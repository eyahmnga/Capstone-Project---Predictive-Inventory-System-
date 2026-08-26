import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  Filter,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProducts, useProductOptions } from '@/features/products/hooks/useProducts'
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
  updateReorderPolicy,
} from '@/features/restocking/api/restockingApi'
import { AlertDetailsDrawer } from '@/features/restocking/components/AlertDetailsDrawer'
import { AlertTable } from '@/features/restocking/components/AlertTable'
import { AllRestockingProductsTable } from '@/features/restocking/components/AllRestockingProductsTable'
import { ReorderPolicyDetailsDrawer } from '@/features/restocking/components/ReorderPolicyDetailsDrawer'
import { ReorderPolicyFormDialog } from '@/features/restocking/components/ReorderPolicyFormDialog'
import { ReorderPolicyTable } from '@/features/restocking/components/ReorderPolicyTable'
import { UnconfiguredProductsTable } from '@/features/restocking/components/UnconfiguredProductsTable'
import { useReorderPolicies, useRestockingAlerts } from '@/features/restocking/hooks/useRestocking'
import type {
  AlertSeverity,
  AlertStatus,
  CreateReorderPolicyPayload,
  ReorderPolicy,
  ReorderPolicyFilters,
  RestockingAlertFilters,
  UpdateReorderPolicyPayload,
} from '@/features/restocking/types/restocking'
import { type ApiError } from '@/shared/api/client'
import { Button } from '@/shared/components/Button'
import { PageHeader } from '@/shared/components/PageHeader'
import { cn } from '@/shared/lib/cn'

type Tab = 'policies' | 'alerts'
type PolicyFilterMode = 'with_policy' | 'without_policy' | 'all'

const tabs: { id: Tab; label: string }[] = [
  { id: 'policies', label: '1. Reorder Planning (ROP & EOQ Rules)' },
  { id: 'alerts', label: '2. Restock Alerts & Actions' },
]

const defaultPolicyFilters: ReorderPolicyFilters = { branchId: null, page: 1, perPage: 100 }
const defaultAlertFilters: RestockingAlertFilters = {
  branchId: null,
  status: 'all',
  severity: 'all',
  page: 1,
  perPage: 20,
}

export default function RestockingPage() {
  const { session, hasPermission } = useAuth()
  const [tab, setTab] = useState<Tab>('policies')
  const [policyFilterMode, setPolicyFilterMode] = useState<PolicyFilterMode>('with_policy')
  const [searchQuery, setSearchQuery] = useState('')
  const [policyFilters, setPolicyFilters] = useState<ReorderPolicyFilters>(defaultPolicyFilters)
  const [alertFilters, setAlertFilters] = useState<RestockingAlertFilters>(defaultAlertFilters)
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>()
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<ReorderPolicy | undefined>()
  const [defaultProductIdForForm, setDefaultProductIdForForm] = useState<string | undefined>()
  const queryClient = useQueryClient()

  const defaultBranchId = (session?.user.branches.find((branch) => branch.isDefault) ?? session?.user.branches[0])?.id
  useEffect(() => {
    if (!defaultBranchId) return
    setPolicyFilters((state) => (state.branchId === defaultBranchId ? state : { ...state, branchId: defaultBranchId }))
    setAlertFilters((state) => (state.branchId === defaultBranchId ? state : { ...state, branchId: defaultBranchId }))
  }, [defaultBranchId])

  const branchId = policyFilters.branchId

  // Queries
  const policiesQuery = useReorderPolicies(policyFilters)
  const alertsQuery = useRestockingAlerts(alertFilters)
  const productOptionsQuery = useProductOptions()
  const productsQuery = useProducts({
    branchId: branchId ?? null,
    categoryId: 'all',
    productType: 'all',
    active: 'active',
    search: '',
    page: 1,
    perPage: 100,
  })

  const policies = policiesQuery.data?.data ?? []
  const allProducts = productsQuery.data?.data ?? []

  // Map policy by productId
  const policyByProductId = useMemo(() => {
    return new Map<string, ReorderPolicy>(policies.map((p) => [p.productId, p]))
  }, [policies])

  // Split into with-policy and without-policy lists
  const productsWithPolicy = useMemo(() => {
    return allProducts.filter((product) => policyByProductId.has(product.id))
  }, [allProducts, policyByProductId])

  const productsWithoutPolicy = useMemo(() => {
    return allProducts.filter((product) => !policyByProductId.has(product.id))
  }, [allProducts, policyByProductId])

  // Counts for KPI Cards
  const totalProductsCount = allProducts.length
  const withPolicyCount = productsWithPolicy.length
  const withoutPolicyCount = productsWithoutPolicy.length
  const coveragePercent =
    totalProductsCount > 0 ? ((withPolicyCount / totalProductsCount) * 100).toFixed(1) : '0.0'

  // Filtered by search term
  const queryLower = searchQuery.toLowerCase().trim()

  const filteredPolicies = useMemo(() => {
    if (!queryLower) return policies
    return policies.filter(
      (p) =>
        p.productName?.toLowerCase().includes(queryLower) ||
        p.productSku?.toLowerCase().includes(queryLower) ||
        p.preferredSupplierName?.toLowerCase().includes(queryLower),
    )
  }, [policies, queryLower])

  const filteredUnconfiguredProducts = useMemo(() => {
    if (!queryLower) return productsWithoutPolicy
    return productsWithoutPolicy.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.sku.toLowerCase().includes(queryLower) ||
        p.category?.name.toLowerCase().includes(queryLower),
    )
  }, [productsWithoutPolicy, queryLower])

  const filteredAllProducts = useMemo(() => {
    if (!queryLower) return allProducts
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.sku.toLowerCase().includes(queryLower) ||
        p.category?.name.toLowerCase().includes(queryLower),
    )
  }, [allProducts, queryLower])

  const selectedPolicy = policies.find((policy) => policy.id === selectedPolicyId)
  const selectedAlertQuery = useQuery({
    queryKey: restockingAlertQueryKeys.detail(selectedAlertId ?? ''),
    queryFn: () => getRestockingAlert(selectedAlertId as string),
    enabled: selectedAlertId !== undefined,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: reorderPolicyQueryKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: restockingAlertQueryKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: ['products'] })
    if (selectedPolicyId) void queryClient.invalidateQueries({ queryKey: reorderPolicyQueryKeys.eoqHistory(selectedPolicyId) })
    if (selectedAlertId) void queryClient.invalidateQueries({ queryKey: restockingAlertQueryKeys.detail(selectedAlertId) })
  }

  const createPolicyMutation = useMutation({
    mutationFn: (payload: Omit<CreateReorderPolicyPayload, 'branchId'>) =>
      createReorderPolicy({ ...payload, branchId: policyFilters.branchId as string }),
    onSuccess: () => {
      invalidate()
      setIsFormOpen(false)
      setDefaultProductIdForForm(undefined)
      setEditingPolicy(undefined)
    },
  })

  const updatePolicyMutation = useMutation({
    mutationFn: ({ policy, payload }: { policy: ReorderPolicy; payload: UpdateReorderPolicyPayload }) =>
      updateReorderPolicy(policy, payload),
    onSuccess: () => {
      invalidate()
      setIsFormOpen(false)
      setEditingPolicy(undefined)
      setDefaultProductIdForForm(undefined)
    },
  })

  const recalculateMutation = useMutation({
    mutationFn: (policy: ReorderPolicy) => recalculateRop(policy),
    onSuccess: invalidate,
  })
  const eoqMutation = useMutation({
    mutationFn: ({
      policy,
      annualDemandQuantity,
      orderingCost,
      annualHoldingCostPerUnit,
    }: {
      policy: ReorderPolicy
      annualDemandQuantity: string
      orderingCost: string
      annualHoldingCostPerUnit: string
    }) =>
      calculateEoq(policy, annualDemandQuantity, orderingCost, annualHoldingCostPerUnit, 'PHP'),
    onSuccess: invalidate,
  })

  const evaluateMutation = useMutation({
    mutationFn: () => evaluateRestockingAlerts(alertFilters.branchId as string),
    onSuccess: invalidate,
  })
  const acknowledgeMutation = useMutation({
    mutationFn: (payload: { alert: NonNullable<typeof selectedAlertQuery.data> }) =>
      acknowledgeAlert(payload.alert),
    onSuccess: invalidate,
  })
  const resolveMutation = useMutation({
    mutationFn: (payload: { alert: NonNullable<typeof selectedAlertQuery.data>; reason: string }) =>
      resolveAlert(payload.alert, payload.reason),
    onSuccess: invalidate,
  })
  const dismissMutation = useMutation({
    mutationFn: (payload: { alert: NonNullable<typeof selectedAlertQuery.data>; reason: string }) =>
      dismissAlert(payload.alert, payload.reason),
    onSuccess: invalidate,
  })

  const isActingOnAlert =
    acknowledgeMutation.isPending || resolveMutation.isPending || dismissMutation.isPending
  const error = (createPolicyMutation.error ??
    updatePolicyMutation.error ??
    recalculateMutation.error ??
    eoqMutation.error ??
    evaluateMutation.error ??
    acknowledgeMutation.error ??
    resolveMutation.error ??
    dismissMutation.error) as ApiError | null

  const handleOpenCreatePolicy = (productId?: string) => {
    setEditingPolicy(undefined)
    setDefaultProductIdForForm(productId)
    setIsFormOpen(true)
  }

  const handleOpenEditPolicy = (policy: ReorderPolicy) => {
    setEditingPolicy(policy)
    setDefaultProductIdForForm(undefined)
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          tab === 'policies' && hasPermission('planning.rop.manage') ? (
            <Button disabled={!branchId} onClick={() => handleOpenCreatePolicy()}>
              <PlusCircle aria-hidden="true" size={18} /> New Reorder Policy
            </Button>
          ) : tab === 'alerts' && hasPermission('restocking.evaluate') ? (
            <Button disabled={!branchId || evaluateMutation.isPending} onClick={() => evaluateMutation.mutate()}>
              <RefreshCw
                aria-hidden="true"
                size={18}
                className={evaluateMutation.isPending ? 'animate-spin' : ''}
              />
              {evaluateMutation.isPending ? 'Evaluating…' : 'Scan & Evaluate Alerts'}
            </Button>
          ) : undefined
        }
        description="Determines exactly WHEN to reorder (ROP) and HOW MUCH to buy (EOQ) to minimize costs and prevent stockouts."
        title="Reorder Planning (EOQ & ROP)"
      />

      {error ? (
        <div
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-text"
          role="alert"
        >
          {error.message}
        </div>
      ) : null}

      {/* 3 Interactive Status KPI Cards: Clickable to Filter Policies vs Unconfigured Products */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Products with Policy */}
        <button
          type="button"
          onClick={() => {
            setTab('policies')
            setPolicyFilterMode('with_policy')
          }}
          className={cn(
            'group flex flex-col justify-between rounded-xl border p-4 shadow-sm transition text-left cursor-pointer',
            tab === 'policies' && policyFilterMode === 'with_policy'
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-md'
              : 'border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-md',
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
              <CheckCircle2 aria-hidden="true" size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-600">Products with Policy</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {withPolicyCount}
              </h3>
            </div>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-700">
              {tab === 'policies' && policyFilterMode === 'with_policy'
                ? '● Showing configured items'
                : 'Click to view configured'}
            </span>
            <ArrowRight size={13} className="text-emerald-600" />
          </div>
        </button>

        {/* Card 2: Products without Policy */}
        <button
          type="button"
          onClick={() => {
            setTab('policies')
            setPolicyFilterMode('without_policy')
          }}
          className={cn(
            'group flex flex-col justify-between rounded-xl border p-4 shadow-sm transition text-left cursor-pointer',
            tab === 'policies' && policyFilterMode === 'without_policy'
              ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-md'
              : 'border-slate-200/80 bg-white hover:border-amber-300 hover:shadow-md',
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition group-hover:scale-105">
              <AlertCircle aria-hidden="true" size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-600">Products without Policy</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {withoutPolicyCount}
              </h3>
            </div>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-700">
              {tab === 'policies' && policyFilterMode === 'without_policy'
                ? '● Showing unconfigured items'
                : 'Click to view unconfigured'}
            </span>
            <ArrowRight size={13} className="text-amber-600" />
          </div>
        </button>

        {/* Card 3: Total Catalog Items & Coverage */}
        <button
          type="button"
          onClick={() => {
            setTab('policies')
            setPolicyFilterMode('all')
          }}
          className={cn(
            'group flex flex-col justify-between rounded-xl border p-4 shadow-sm transition text-left cursor-pointer',
            tab === 'policies' && policyFilterMode === 'all'
              ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-md'
              : 'border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-md',
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:scale-105">
              <Box aria-hidden="true" size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-600">Total Catalog Items</p>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {totalProductsCount}
              </h3>
            </div>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-700">
              Coverage: {coveragePercent}% ({withPolicyCount}/{totalProductsCount})
            </span>
            <ArrowRight size={13} className="text-blue-600" />
          </div>
        </button>
      </div>

      {/* Main Tabs Navigation */}
      <nav aria-label="Restocking sections" className="flex gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
              tab === item.id
                ? 'border-brand-600 text-brand-700 font-bold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
            type="button"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Tab 1: Reorder Planning (ROP & EOQ) */}
      {tab === 'policies' ? (
        <div className="space-y-4">
          {/* Filter Bar & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter Toggle Buttons */}
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setPolicyFilterMode('with_policy')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  policyFilterMode === 'with_policy'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                ✓ With Policy ({withPolicyCount})
              </button>
              <button
                type="button"
                onClick={() => setPolicyFilterMode('without_policy')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  policyFilterMode === 'without_policy'
                    ? 'bg-white text-amber-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                ⚠ Without Policy ({withoutPolicyCount})
              </button>
              <button
                type="button"
                onClick={() => setPolicyFilterMode('all')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  policyFilterMode === 'all'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                All Products ({totalProductsCount})
              </button>
            </div>

            {/* Link to SMA Demand Forecast */}
            <Link
              to="/forecasting"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 self-start sm:self-auto"
            >
              <ArrowLeft size={13} /> Review SMA Demand Forecast
            </Link>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              placeholder="Search product name, SKU, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Dynamic Table Rendering */}
          {policyFilterMode === 'with_policy' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">
                Showing <strong>{filteredPolicies.length}</strong> configured policy product(s)
                {policiesQuery.isFetching ? ' · Updating…' : ''}
              </p>
              <ReorderPolicyTable
                policies={filteredPolicies}
                onEdit={handleOpenEditPolicy}
                onView={(policy) => setSelectedPolicyId(policy.id)}
              />
            </div>
          )}

          {policyFilterMode === 'without_policy' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">
                Showing <strong>{filteredUnconfiguredProducts.length}</strong> unconfigured product(s) needing reorder policy
                {productsQuery.isFetching ? ' · Updating…' : ''}
              </p>
              <UnconfiguredProductsTable
                products={filteredUnconfiguredProducts}
                onCreatePolicy={(pId) => handleOpenCreatePolicy(pId)}
              />
            </div>
          )}

          {policyFilterMode === 'all' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">
                Showing <strong>{filteredAllProducts.length}</strong> total catalog product(s)
                {productsQuery.isFetching || policiesQuery.isFetching ? ' · Updating…' : ''}
              </p>
              <AllRestockingProductsTable
                products={filteredAllProducts}
                policyMap={policyByProductId}
                onEditPolicy={handleOpenEditPolicy}
                onViewPolicy={(policy) => setSelectedPolicyId(policy.id)}
                onCreatePolicy={(pId) => handleOpenCreatePolicy(pId)}
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Tab 2: Restock Alerts & Actions */}
      {tab === 'alerts' ? (
        <div className="space-y-4">
          <section className="grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-2xs sm:p-5 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Filter by Status</label>
              <select
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/30"
                value={alertFilters.status}
                onChange={(event) =>
                  setAlertFilters((state) => ({
                    ...state,
                    status: event.target.value as AlertStatus | 'all',
                    page: 1,
                  }))
                }
              >
                <option value="all">All statuses</option>
                <option value="active">Active (Needs Immediate Restocking)</option>
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
                onChange={(event) =>
                  setAlertFilters((state) => ({
                    ...state,
                    severity: event.target.value as AlertSeverity | 'all',
                    page: 1,
                  }))
                }
              >
                <option value="all">All severities</option>
                <option value="critical">Critical (Out of Stock)</option>
                <option value="high">High (Below ROP)</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </section>
          <p className="text-sm text-muted">
            {alertsQuery.data?.meta.total ?? 0} total alert records{' '}
            {alertsQuery.isFetching ? '· Updating…' : ''}
          </p>
          <AlertTable
            alerts={alertsQuery.data?.data ?? []}
            onView={(alert) => setSelectedAlertId(alert.id)}
          />
        </div>
      ) : null}

      {/* Form Dialog for Creating or Editing Reorder Policy */}
      {isFormOpen ? (
        <ReorderPolicyFormDialog
          defaultProductId={defaultProductIdForForm}
          policy={editingPolicy}
          isSaving={createPolicyMutation.isPending || updatePolicyMutation.isPending}
          productOptions={productOptionsQuery.data ?? []}
          onClose={() => {
            setIsFormOpen(false)
            setDefaultProductIdForForm(undefined)
            setEditingPolicy(undefined)
          }}
          onSave={(payload) => createPolicyMutation.mutate(payload)}
          onUpdate={(payload) => {
            if (editingPolicy) {
              updatePolicyMutation.mutate({ policy: editingPolicy, payload })
            }
          }}
        />
      ) : null}

      {/* Reorder Policy Details & EOQ Drawer */}
      {selectedPolicy ? (
        <ReorderPolicyDetailsDrawer
          canCalculate={hasPermission('planning.rop.calculate')}
          canCalculateEoq={hasPermission('planning.eoq.calculate')}
          isActing={recalculateMutation.isPending || eoqMutation.isPending}
          policy={selectedPolicy}
          onEditPolicy={(p) => {
            setSelectedPolicyId(undefined)
            handleOpenEditPolicy(p)
          }}
          onCalculateEoq={(annualDemandQuantity, orderingCost, annualHoldingCostPerUnit) =>
            eoqMutation.mutate({
              policy: selectedPolicy,
              annualDemandQuantity,
              orderingCost,
              annualHoldingCostPerUnit,
            })
          }
          onClose={() => setSelectedPolicyId(undefined)}
          onRecalculateRop={() => recalculateMutation.mutate(selectedPolicy)}
        />
      ) : null}

      {/* Restocking Alert Details Drawer */}
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
