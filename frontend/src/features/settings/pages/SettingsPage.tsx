import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { SyncHealthPanel } from '@/features/dashboard/components/SyncHealthPanel'
import { settingsQueryKeys, updateSetting } from '@/features/settings/api/settingsApi'
import { SettingEditDialog } from '@/features/settings/components/SettingEditDialog'
import { SettingsTable } from '@/features/settings/components/SettingsTable'
import { useSettings } from '@/features/settings/hooks/useSettings'
import type { Setting } from '@/features/settings/types/settings'
import { type ApiError } from '@/shared/api/client'
import { PageHeader } from '@/shared/components/PageHeader'

export default function SettingsPage() {
  const { session, hasPermission } = useAuth()
  const [selectedKey, setSelectedKey] = useState<string | undefined>()
  const queryClient = useQueryClient()

  const defaultBranchId = (session?.user.branches.find((branch) => branch.isDefault) ?? session?.user.branches[0])?.id
  const dashboardQuery = useDashboard(defaultBranchId)

  const settingsQuery = useSettings(null)
  const selected = settingsQuery.data?.find((setting) => setting.key === selectedKey)

  const updateMutation = useMutation({
    mutationFn: (value: string | number | boolean) => updateSetting(selected!.key, { branchId: selected!.branchId, valueType: selected!.valueType, value, version: selected!.version }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.list(null) })
      setSelectedKey(undefined)
    },
  })

  const error = (settingsQuery.error ?? updateMutation.error) as ApiError | null

  return (
    <div className="space-y-6">
      <PageHeader description="Typed, versioned system configuration and offline synchronization status." title="Settings & Administration" />
      {error && !updateMutation.isPending ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-text" role="alert">{error.message}{error.requestId ? ` Request ID: ${error.requestId}` : ''}</div> : null}

      {/* Relocated Sync Health Panel */}
      {dashboardQuery.data ? (
        <SyncHealthPanel health={dashboardQuery.data.data.syncHealth} />
      ) : null}

      <SettingsTable canManage={hasPermission('settings.manage')} settings={settingsQuery.data ?? []} onEdit={(setting: Setting) => setSelectedKey(setting.key)} />

      {selected ? (
        <SettingEditDialog
          error={updateMutation.error as ApiError | null}
          isSaving={updateMutation.isPending}
          setting={selected}
          onClose={() => { setSelectedKey(undefined); updateMutation.reset() }}
          onSave={(value) => updateMutation.mutate(value)}
        />
      ) : null}
    </div>
  )
}
