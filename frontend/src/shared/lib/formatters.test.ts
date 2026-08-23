import { describe, expect, it } from 'vitest'
import { formatCurrency, formatPercent, formatQuantity } from './formatters'

describe('formatQuantity', () => {
  it('formats numeric string with 4 decimals to 2 decimals', () => {
    expect(formatQuantity('15.0000')).toBe('15.00')
    expect(formatQuantity('0.8571')).toBe('0.86')
    expect(formatQuantity('0.0000')).toBe('0.00')
  })

  it('formats numbers with thousands separator', () => {
    expect(formatQuantity('1234567.8912')).toBe('1,234,567.89')
    expect(formatQuantity(1000)).toBe('1,000.00')
  })

  it('handles null, undefined, and empty string with fallback', () => {
    expect(formatQuantity(null)).toBe('\u2014')
    expect(formatQuantity(undefined)).toBe('\u2014')
    expect(formatQuantity('')).toBe('\u2014')
    expect(formatQuantity(null, '0.00')).toBe('0.00')
  })
})

describe('formatCurrency', () => {
  it('formats currency with currency code prefix', () => {
    expect(formatCurrency('250.0000')).toBe('PHP 250.00')
    expect(formatCurrency('12500.5000', 'PHP')).toBe('PHP 12,500.50')
  })
})

describe('formatPercent', () => {
  it('formats percentage to 2 decimals with % suffix', () => {
    expect(formatPercent('12.0000')).toBe('12.00%')
    expect(formatPercent(5.5)).toBe('5.50%')
  })
})