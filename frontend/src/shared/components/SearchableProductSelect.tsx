import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Package, Search, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export type ProductOption = {
  id: string
  sku: string
  name: string
  categoryName?: string
  sellingPrice?: string | number
}

type SearchableProductSelectProps = {
  options: ProductOption[]
  value: string
  onChange: (productId: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  id?: string
}

export function SearchableProductSelect({
  options,
  value,
  onChange,
  placeholder = 'Search or select a product...',
  disabled = false,
  required = false,
  className,
  id,
}: SearchableProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Find currently selected product
  const selectedProduct = useMemo(
    () => options.find((opt) => opt.id === value),
    [options, value],
  )

  // Filter options with case-insensitive, multi-word / any substring matching
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return options

    const tokens = query.split(/\s+/).filter(Boolean)

    return options.filter((opt) => {
      const name = (opt.name || '').toLowerCase()
      const sku = (opt.sku || '').toLowerCase()
      const cat = (opt.categoryName || '').toLowerCase()
      const fullSearchTarget = `${name} ${sku} ${cat}`

      // Match if ALL search words/tokens appear anywhere in the target string
      return tokens.every((token) => fullSearchTarget.includes(token))
    })
  }, [options, searchQuery])

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement | undefined
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  const handleSelect = (productId: string) => {
    onChange(productId)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchQuery('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  return (
    <div className={cn('relative w-full', className)} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Hidden input for native form validation if required */}
      {required && (
        <input
          aria-hidden="true"
          className="sr-only"
          id={id}
          required={required}
          tabIndex={-1}
          value={value}
          onChange={() => {}}
        />
      )}

      {/* Main Trigger Button */}
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'flex h-10.5 w-full items-center justify-between gap-2 rounded-xl border bg-surface px-3 text-left text-sm transition',
          isOpen
            ? 'border-brand-600 ring-2 ring-brand-600/20'
            : 'border-border hover:border-slate-300',
          disabled && 'cursor-not-allowed opacity-60',
          !selectedProduct && 'text-muted',
        )}
        disabled={disabled}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Package aria-hidden="true" className="shrink-0 text-slate-400" size={16} />
          {selectedProduct ? (
            <div className="truncate">
              <span className="font-medium text-ink">{selectedProduct.name}</span>
              <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {selectedProduct.sku}
              </span>
            </div>
          ) : (
            <span className="truncate text-muted">{placeholder}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {selectedProduct && !disabled && (
            <button
              aria-label="Clear selection"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              type="button"
              onClick={handleClear}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn('text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')}
            size={16}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 max-h-80 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Search Input Box */}
          <div className="border-b border-slate-100 p-2 bg-slate-50/70">
            <div className="relative flex items-center">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 text-slate-400" size={15} />
              <input
                ref={inputRef}
                aria-autocomplete="list"
                aria-controls="product-options-list"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium outline-none placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                placeholder="Search product name or SKU (e.g. sand, valve)..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  aria-label="Clear search"
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  type="button"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            aria-label="Product options"
            className="max-h-56 overflow-y-auto p-1 text-sm scrollbar-thin"
            id="product-options-list"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-muted" role="status">
                <Package className="mx-auto mb-1.5 text-slate-300" size={20} />
                <p className="font-semibold text-slate-700">No matching products</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  No products found matching &ldquo;{searchQuery}&rdquo;
                </p>
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.id === value
                const isHighlighted = index === highlightedIndex

                return (
                  <li
                    key={option.id}
                    aria-selected={isSelected}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition',
                      isHighlighted && 'bg-brand-50/70 text-brand-900',
                      isSelected && !isHighlighted && 'bg-slate-50 font-semibold',
                      !isHighlighted && !isSelected && 'hover:bg-slate-50 text-slate-800',
                    )}
                    role="option"
                    onClick={() => handleSelect(option.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold">{option.name}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-mono font-medium text-slate-600">{option.sku}</span>
                        {option.categoryName && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate">{option.categoryName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check aria-hidden="true" className="shrink-0 text-brand-600" size={15} />
                    )}
                  </li>
                )
              })
            )}
          </ul>

          {/* Footer count indicator */}
          <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-100 bg-slate-50/90 px-3 py-1.5 text-[10.5px] text-slate-500">
            <span className="truncate">
              {filteredOptions.length} of {options.length} products
            </span>
            <span className="text-[10px] text-slate-400">Press ↑↓ to navigate</span>
          </div>
        </div>
      )}
    </div>
  )
}
