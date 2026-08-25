export function formatQuantity(value: string | number | null | undefined, fallback = '\u2014'): string {
  if (value === null || value === undefined || value === '') return fallback
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
}

export function formatCurrency(
  value: string | number | null | undefined,
  currency = 'PHP',
  fallback = '\u2014',
): string {
  if (value === null || value === undefined || value === '') return fallback
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
  return `${currency} ${formatted}`
}

export function formatPercent(
  value: string | number | null | undefined,
  fallback = '\u2014',
): string {
  if (value === null || value === undefined || value === '') return fallback
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
  return `${formatted}%`
}

export function formatDate(value: string | Date | null | undefined, fallback = '\u2014'): string {
  if (!value) return fallback
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(value: string | Date | null | undefined, fallback = '\u2014'): string {
  if (!value) return fallback
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Strips commas and extraneous spaces from numeric input strings (e.g., "1,500.50" -> "1500.50").
 */
export function cleanNumericInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/,/g, '').trim()
}