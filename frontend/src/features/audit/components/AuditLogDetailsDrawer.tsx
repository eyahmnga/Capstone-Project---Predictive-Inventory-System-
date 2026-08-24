import { useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Code2, FileText, History, ShieldCheck, X } from 'lucide-react'
import type { AuditLogEntry } from '@/features/audit/types/audit'
import { Button } from '@/shared/components/Button'
import { drawerOverlayClass, drawerPanelClass } from '@/shared/lib/modalClasses'
import { Portal } from '@/shared/components/Portal'

function formatKeyName(key: string): string {
  // Convert camelCase or snake_case to Title Case with spaces
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '— (None)'
  if (typeof value === 'boolean') return value ? 'Yes (True)' : 'No (False)'
  if (typeof value === 'object') return JSON.stringify(value)

  const str = String(value)
  // Format common status codes
  const statusMap: Record<string, string> = {
    pending_approval: 'Pending Approval',
    posted: 'Posted / Applied',
    approved: 'Approved',
    rejected: 'Rejected',
    draft: 'Draft',
    active: 'Active',
    inactive: 'Inactive',
    completed: 'Completed',
    reversed: 'Reversed',
    voided: 'Voided',
    archived: 'Archived',
  }

  return statusMap[str] || str.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function formatActionTitle(action: string): string {
  return action
    .replace(/\./g, ' ➔ ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AuditLogDetailsDrawer({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  const [showRawJson, setShowRawJson] = useState(false)

  const beforeObj = (entry.changes?.before && typeof entry.changes.before === 'object') ? entry.changes.before : null
  const afterObj = (entry.changes?.after && typeof entry.changes.after === 'object') ? entry.changes.after : null

  // Extract all changed keys
  const changedKeys = Array.from(
    new Set([
      ...Object.keys(beforeObj || {}),
      ...Object.keys(afterObj || {}),
    ]),
  )

  return (
    <Portal>
      <div className={drawerOverlayClass} role="presentation" onMouseDown={onClose}>
        <aside
          aria-labelledby="audit-details-title"
          aria-modal="true"
          className={drawerPanelClass('sm:max-w-xl')}
          role="dialog"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <header className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-6 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                  <History size={12} />
                  Event #{entry.id}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {entry.entityType} {entry.entityId ? `(#${entry.entityId})` : ''}
                </span>
              </div>
              <h2 id="audit-details-title" className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
                {formatActionTitle(entry.action)}
              </h2>
            </div>
            <Button aria-label="Close audit event details" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
            {/* Meta Info Grid */}
            <section className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs sm:text-sm">
              <div>
                <p className="text-xs font-medium text-slate-500">Date & Time</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Performed By (Role)</p>
                <p className="font-bold text-indigo-700 capitalize mt-0.5 flex items-center gap-1">
                  <ShieldCheck size={14} />
                  {entry.actorRole ?? 'System'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Branch Location</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {entry.branchId ? `Branch #${entry.branchId}` : 'Main Branch / Global'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Target Entity</p>
                <p className="font-bold text-slate-800 mt-0.5 capitalize">
                  {entry.entityType.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <p className="text-[11px] font-medium text-slate-400">Tracking Correlation ID</p>
                <p className="font-mono text-[11px] text-slate-600 truncate">{entry.correlationId}</p>
              </div>
            </section>

            {/* User-Friendly Before & After Changes */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText size={16} className="text-blue-600" />
                  What Changed in this Event?
                </h3>
                <span className="text-xs text-slate-400">
                  {changedKeys.length} field{changedKeys.length === 1 ? '' : 's'} updated
                </span>
              </div>

              {changedKeys.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  No property modifications were recorded for this audit entry.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {changedKeys.map((key) => {
                    const beforeVal = beforeObj ? beforeObj[key] : undefined
                    const afterVal = afterObj ? afterObj[key] : undefined
                    const isNewField = beforeVal === undefined && afterVal !== undefined
                    const isRemovedField = beforeVal !== undefined && afterVal === undefined

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            {formatKeyName(key)}
                          </span>
                          {isNewField ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                              + Added Field
                            </span>
                          ) : isRemovedField ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                              - Removed Field
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                              Updated
                            </span>
                          )}
                        </div>

                        {/* Visual Before ➔ After Display */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {/* Before Card */}
                          <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-2.5">
                            <p className="text-[10px] font-bold uppercase text-amber-800 tracking-wider mb-1">
                              Previous Value (Before)
                            </p>
                            <p className="font-semibold text-slate-800 break-words">
                              {formatValue(beforeVal)}
                            </p>
                          </div>

                          {/* After Card */}
                          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                                New Value (After)
                              </p>
                              <CheckCircle2 size={12} className="text-emerald-600" />
                            </div>
                            <p className="font-bold text-emerald-950 break-words">
                              {formatValue(afterVal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Optional Technical JSON Accordion (For advanced users/developers) */}
            <section className="pt-2 border-t border-slate-200">
              <button
                type="button"
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-1 transition cursor-pointer"
                onClick={() => setShowRawJson(!showRawJson)}
              >
                <span className="flex items-center gap-1.5">
                  <Code2 size={14} />
                  {showRawJson ? 'Hide technical JSON code' : 'View raw JSON audit record'}
                </span>
                {showRawJson ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showRawJson && entry.changes ? (
                <div className="mt-3 space-y-3">
                  {entry.changes.before ? (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 mb-1">Raw Before JSON:</p>
                      <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 text-slate-100 p-3 text-[11px] font-mono">
                        {JSON.stringify(entry.changes.before, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {entry.changes.after ? (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 mb-1">Raw After JSON:</p>
                      <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 text-slate-100 p-3 text-[11px] font-mono">
                        {JSON.stringify(entry.changes.after, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </aside>
      </div>
    </Portal>
  )
}
