import { useMemo, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { createProduct, productQueryKeys } from '@/features/products/api/productsApi'
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog'
import { useCategoryOptions, useProducts, useUnitOptions } from '@/features/products/hooks/useProducts'
import type { ProductFormValues } from '@/features/products/types/product'
import { useForecastRun, useForecastRuns } from '@/features/forecasting/hooks/useForecast'
import { useReorderPolicies, useRestockingAlerts } from '@/features/restocking/hooks/useRestocking'
import { classifyProductStock } from '@/features/inventory/lib/stockClassification'

import { KpiCardsRow } from '@/features/dashboard/components/KpiCardsRow'
import { DashboardQuickActionsCard } from '@/features/dashboard/components/DashboardQuickActionsCard'
import { FastSlowMovingProductsChart } from '@/features/dashboard/components/FastSlowMovingProductsChart'
import { HistoricalValueAreaChart, type MonthlyDataPoint } from '@/features/dashboard/components/HistoricalValueAreaChart'
import { ProjectionForecastLineChart, type ForecastDataPoint } from '@/features/dashboard/components/ProjectionForecastLineChart'
import { DashboardAlertsRow, type BottomAlertItem } from '@/features/dashboard/components/DashboardAlertsRow'

import { ForecastSummaryPanel } from '@/features/dashboard/components/ForecastSummaryPanel'
import { PendingPurchaseOrdersPanel } from '@/features/dashboard/components/PendingPurchaseOrdersPanel'
import { RecentSalesPanel } from '@/features/dashboard/components/RecentSalesPanel'
import { SyncHealthPanel } from '@/features/dashboard/components/SyncHealthPanel'

import { type ApiError } from '@/shared/api/client'
import { Button } from '@/shared/components/Button'
import { useToast } from '@/shared/components/Toast'

export default function DashboardPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)

  const defaultBranch =
    session?.user.branches.find((branch) => branch.isDefault) ??
    session?.user.branches[0]

  const branchId = defaultBranch?.id

  // Telemetry queries connecting to backend database services
  const dashboardQuery = useDashboard(branchId)
  const productsQuery = useProducts({
    branchId: branchId ?? null,
    categoryId: 'all',
    productType: 'all',
    active: 'active',
    search: '',
    page: 1,
    perPage: 100,
  })
  const alertsQuery = useRestockingAlerts({
    branchId: branchId ?? null,
    status: 'active',
    severity: 'all',
    page: 1,
    perPage: 100,
  })
  const reorderPoliciesQuery = useReorderPolicies({
    branchId: branchId ?? null,
    page: 1,
    perPage: 100,
  })
  const forecastRunsQuery = useForecastRuns({
    branchId: branchId ?? null,
    page: 1,
    perPage: 10,
  })

  const categoryOptionsQuery = useCategoryOptions()
  const unitOptionsQuery = useUnitOptions()

  const latestForecastRunId = forecastRunsQuery.data?.data?.[0]?.id
  const forecastDetailQuery = useForecastRun(latestForecastRunId)

  // Product Creation Mutation from Dashboard Quick Action
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void productsQuery.refetch()
      setIsProductModalOpen(false)
      toast({
        title: 'Product created',
        description: `${product.name} (${product.sku}) was added to catalog`,
        variant: 'success',
      })
    },
  })

  // 1. KPI dynamic data connection
  const kpiData = useMemo(() => {
    const products = productsQuery.data?.data ?? []
    const policies = reorderPoliciesQuery.data?.data ?? []
    const alerts = alertsQuery.data?.data ?? []

    const computedValuation = products.reduce((sum, p) => {
      const qty = Number(p.stock?.onHandQuantity) || 0
      const price = Number(p.sellingPrice) || 0
      return sum + qty * price
    }, 0)

    const totalCount = productsQuery.data?.meta.total ?? products.length

    let lowCount = 0
    let outOfStockCount = 0
    let overstockCount = 0

    products.forEach((p) => {
      const status = classifyProductStock(p, policies, alerts)
      if (status === 'out_of_stock') outOfStockCount++
      else if (status === 'low_stock') lowCount++
      else if (status === 'overstock') overstockCount++
    })

    return {
      totalInventoryValue: computedValuation,
      totalItems: totalCount,
      lowStockCount: lowCount,
      overstockCount: overstockCount,
      outOfStockCount: outOfStockCount,
      growthPercent: '+0.0%',
    }
  }, [productsQuery.data, reorderPoliciesQuery.data, alertsQuery.data])

  // 2. Dynamic Historical Area Chart data from Sales Trend
  const historicalPoints: MonthlyDataPoint[] = useMemo(() => {
    const trend = dashboardQuery.data?.data.salesTrend ?? []
    if (trend.length > 0) {
      return trend.slice(-6).map((pt) => ({
        label: pt.date.slice(5),
        value: Number(pt.totalAmount) || 0,
      }))
    }
    return []
  }, [dashboardQuery.data])

  // 3. Dynamic Projection Forecast points aggregated across products for upcoming months
  const forecastPoints: ForecastDataPoint[] = useMemo(() => {
    const items = forecastDetailQuery.data?.items ?? []
    if (items.length === 0) {
      return []
    }

    // Sum total forecasted demand across all products (or manual quantity if overridden)
    const totalDailyDemand = items.reduce((sum, item) => {
      const qty = item.manualQuantity !== null && item.manualQuantity !== undefined
        ? Number(item.manualQuantity)
        : Number(item.forecastQuantity)
      return sum + (Number.isFinite(qty) ? Math.max(0, qty) : 0)
    }, 0)

    if (totalDailyDemand <= 0) {
      return []
    }

    // Projected monthly baseline demand = total daily demand * 30 days
    const monthlyBaseline = Math.round(totalDailyDemand * 30)
    const currentDate = new Date()
    const points: ForecastDataPoint[] = []

    for (let i = 1; i <= 12; i++) {
      const futureDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      const monthLabel = futureDate.toLocaleString('en-US', { month: 'short' })
      
      // Slight smooth projection variation factor
      const factor = 1 + Math.sin(i * 0.7) * 0.04
      const projected = Math.max(1, Math.round(monthlyBaseline * factor))
      
      points.push({
        label: monthLabel,
        forecast: projected,
        upper: Math.round(projected * 1.15),
        lower: Math.max(0, Math.round(projected * 0.85)),
      })
    }

    return points
  }, [forecastDetailQuery.data])

  // 4. Dynamic Alert Feed synthesized strictly from live backend events
  const alertsFeed: BottomAlertItem[] = useMemo(() => {
    const list: BottomAlertItem[] = []

    const formatAlertDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return 'Just now'
      try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return 'Just now'
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        return `${datePart} • ${timePart}`
      } catch {
        return 'Just now'
      }
    }

    // 1. Out of stock / Critical alert
    const criticalAlert = alertsQuery.data?.data.find((a) => a.severity === 'critical')
    if (criticalAlert) {
      list.push({
        id: `alt-crit-${criticalAlert.id}`,
        type: 'out_of_stock',
        title: `${criticalAlert.productName ?? 'Product'} is out of stock.`,
        timestamp: formatAlertDate(criticalAlert.firstTriggeredAt ?? criticalAlert.lastEvaluatedAt),
        link: '/restocking',
      })
    }

    // 2. Low stock alert
    const lowAlert = alertsQuery.data?.data.find((a) => ['high', 'medium', 'low'].includes(a.severity))
    if (lowAlert) {
      list.push({
        id: `alt-low-${lowAlert.id}`,
        type: 'low_stock',
        title: `${lowAlert.productName ?? 'Product'} is running low.`,
        timestamp: formatAlertDate(lowAlert.firstTriggeredAt ?? lowAlert.lastEvaluatedAt),
        link: '/restocking',
      })
    }

    // 3. Demand forecast run
    const forecastRun = forecastRunsQuery.data?.data?.[0]
    if (forecastRun) {
      const count = forecastRun.itemCount ?? forecastRun.items?.length ?? 0
      list.push({
        id: `alt-fc-${forecastRun.id}`,
        type: 'forecast',
        title: `Demand forecast updated for ${count} items.`,
        timestamp: formatAlertDate(forecastRun.createdAt),
        link: '/forecasting',
      })
    }

    // 4. New order received
    const recentSale = dashboardQuery.data?.data.recentSales?.[0]
    if (recentSale) {
      list.push({
        id: `alt-sale-${recentSale.id}`,
        type: 'order',
        title: `New order #${recentSale.saleNumber} received.`,
        timestamp: formatAlertDate(recentSale.soldAt),
        link: '/sales',
      })
    }

    return list
  }, [alertsQuery.data, forecastRunsQuery.data, dashboardQuery.data])

  const handleSaveProduct = (values: ProductFormValues) => {
    createProductMutation.mutate(values)
  }

  const error = (dashboardQuery.error ?? createProductMutation.error) as ApiError | null

  return (
    <div className="space-y-5 sm:space-y-6 pb-10">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
            Inventory Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Real-time analytics, predictive demand optimization, and operational feeds
          </p>
        </div>
        <Button
          aria-label="Refresh dashboard data"
          className="h-9 rounded-lg px-3"
          disabled={dashboardQuery.isFetching}
          variant="secondary"
          onClick={() => {
            void dashboardQuery.refetch()
            void productsQuery.refetch()
            void alertsQuery.refetch()
            void reorderPoliciesQuery.refetch()
            void forecastRunsQuery.refetch()
          }}
        >
          <RefreshCw
            aria-hidden="true"
            className={`mr-1.5 ${dashboardQuery.isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`}
            size={14}
          />
          <span className="text-xs font-semibold">Refresh</span>
        </Button>
      </div>

      {!branchId ? (
        <div
          className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-text"
          role="status"
        >
          You are not assigned to a branch, so no dashboard data is available.
        </div>
      ) : dashboardQuery.isError && error ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger-text"
          role="alert"
        >
          <AlertCircle aria-hidden="true" size={16} />
          <span>{error.message}</span>
        </div>
      ) : (
        <>
          {/* Row 1: 5 KPI Cards */}
          <KpiCardsRow data={kpiData} />

          {/* Row 2: Quick Actions (Left) & Demand Projection Chart (Right) */}
          <section aria-label="Quick Actions and Demand Forecast" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <DashboardQuickActionsCard onAddProduct={() => setIsProductModalOpen(true)} />
            <ProjectionForecastLineChart data={forecastPoints} />
          </section>

          {/* Fast & Slow Moving Product Movement Graph (Above Recent Alerts) */}
          <section aria-label="Fast and Slow Moving Products">
            <FastSlowMovingProductsChart
              forecastItems={forecastDetailQuery.data?.items}
              productVelocity={dashboardQuery.data?.data.productVelocity}
              products={productsQuery.data?.data}
            />
          </section>

          {/* Real-time System Alerts & Activity Feed (Full-Width Pill Row) */}
          <DashboardAlertsRow alerts={alertsFeed} />

          {/* Additional Integrated Operational Modules */}
          {dashboardQuery.data ? (
            <div className="space-y-6 pt-2">
              <div className="border-t border-slate-200/80 pt-6">
                <h2 className="text-base font-bold text-slate-800">
                  Operational Activity & Procurement
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time transaction tracking and pending procurement orders
                </p>
              </div>

              <section aria-label="Activity and Procurement" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RecentSalesPanel sales={dashboardQuery.data.data.recentSales} />
                <PendingPurchaseOrdersPanel
                  count={dashboardQuery.data.data.pendingPurchaseOrders.count}
                  items={dashboardQuery.data.data.pendingPurchaseOrders.items}
                />
              </section>

              <div className="border-t border-slate-200/80 pt-6">
                <h2 className="text-base font-bold text-slate-800">
                  Demand Forecasting, Valuation Trends & System Synchronization
                </h2>
                <p className="text-xs text-slate-500">
                  Historical valuation metrics, model coverage analytics, and offline sync queue health
                </p>
              </div>

              <section aria-label="Forecast, Valuation Trend, and Sync Health" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <HistoricalValueAreaChart
                  dailyData={dashboardQuery.data?.data.salesTrend}
                  data={historicalPoints}
                />
                <ForecastSummaryPanel summary={dashboardQuery.data.data.forecastSummary} />
                <SyncHealthPanel health={dashboardQuery.data.data.syncHealth} />
              </section>
            </div>
          ) : null}
        </>
      )}

      {/* Product Form Dialog triggered directly from Quick Actions */}
      {isProductModalOpen ? (
        <ProductFormDialog
          categoryOptions={categoryOptionsQuery.data ?? []}
          isSaving={createProductMutation.isPending}
          unitOptions={unitOptionsQuery.data ?? []}
          onClose={() => setIsProductModalOpen(false)}
          onSave={handleSaveProduct}
        />
      ) : null}
    </div>
  )
}
