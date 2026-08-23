import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, FileText, Printer, ScanBarcode, User } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { getPosProducts } from '@/features/pos/api/posApi'
import { useFinalizeSale } from '@/features/pos/hooks/usePos'
import { playScanBeep, useBarcodeScanner } from '@/features/pos/hooks/useBarcodeScanner'
import { computeCartTotals } from '@/features/pos/lib/cartTotals'
import { usePosCartStore } from '@/features/pos/state/posCartStore'
import { CartTable } from '@/features/pos/components/CartTable'
import { CheckoutSummary } from '@/features/pos/components/CheckoutSummary'
import { HeldOrdersDialog } from '@/features/pos/components/HeldOrdersDialog'
import { PaymentsPanel } from '@/features/pos/components/PaymentsPanel'
import { ProductSearchPanel } from '@/features/pos/components/ProductSearchPanel'
import { ReceiptDialog } from '@/features/pos/components/ReceiptDialog'
import { lineRequiresOverrideReason } from '@/features/pos/lib/cartTotals'
import type { Sale } from '@/features/sales/types/sale'
import { type ApiError } from '@/shared/api/client'

export default function PosPage() {
  const { session, hasPermission } = useAuth()
  const cart = usePosCartStore()
  const finalizeMutation = useFinalizeSale()
  const [receiptSaleNumber, setReceiptSaleNumber] = useState<string | null>(null)
  const [scanNotice, setScanNotice] = useState<string | null>(null)
  const [showHeldOrders, setShowHeldOrders] = useState(false)
  const [showCustomerSection, setShowCustomerSection] = useState(false)
  const [lastCompletedSale, setLastCompletedSale] = useState<{
    sale: Sale
    tendered: number
    change: number
  } | null>(null)

  const defaultBranchId = (session?.user.branches.find((branch) => branch.isDefault) ?? session?.user.branches[0])?.id ?? null
  useEffect(() => {
    if (defaultBranchId) cart.setBranch(defaultBranchId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultBranchId])

  // Global background barcode scanner auto-capture hook
  useBarcodeScanner({
    enabled: Boolean(cart.branchId),
    onScan: async (scannedCode) => {
      if (!cart.branchId) return
      try {
        const matches = await getPosProducts(cart.branchId, scannedCode)
        const exactMatch =
          matches.find(
            (p) =>
              p.barcode === scannedCode ||
              p.sku.toLowerCase() === scannedCode.toLowerCase(),
          ) ?? matches[0]

        if (exactMatch) {
          playScanBeep('success')
          cart.addProduct(exactMatch)
          setScanNotice(`Scanned: ${exactMatch.name}`)
          setTimeout(() => setScanNotice(null), 3000)
        } else {
          playScanBeep('error')
          setScanNotice(`No product found for barcode: "${scannedCode}"`)
          setTimeout(() => setScanNotice(null), 4000)
        }
      } catch {
        playScanBeep('error')
      }
    },
  })

  const canOverridePrice = hasPermission('pos.price_override')
  const canOverrideDiscount = hasPermission('pos.discount_override')

  const totals = computeCartTotals(cart.lines, cart.isTaxIncluded)
  const paymentsTotal = cart.payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
  const hasOverStockLine = cart.lines.some((line) => line.availableQuantity !== null && line.quantity > Number(line.availableQuantity))
  const missingOverrideReason = cart.lines.some((line) => lineRequiresOverrideReason(line) && line.overrideReason.trim() === '')
  const isFullyPaid = cart.payments.length > 0 && paymentsTotal >= totals.total - 0.01
  const changeDue = Math.max(0, paymentsTotal - totals.total)

  let disabledReason: string | null = null
  if (cart.lines.length === 0) disabledReason = 'Add at least one product to the cart.'
  else if (hasOverStockLine) disabledReason = 'One or more lines exceed available stock.'
  else if (missingOverrideReason) disabledReason = 'Provide a reason for each overridden price or discount.'
  else if (!isFullyPaid) disabledReason = `Tender at least ₱${totals.total.toFixed(2)} to complete checkout.`

  const isValid = disabledReason === null

  const finalize = () => {
    if (!cart.branchId) return

    const recordedTendered = paymentsTotal
    const recordedChange = changeDue

    // If single payment tendered is higher than total (e.g. Cash ₱1000 for ₱450 sale), settle payment record to sale total
    const isSinglePayment = cart.payments.length === 1
    const paymentsPayload = cart.payments.map((payment) => ({
      paymentMethod: payment.paymentMethod,
      amount:
        isSinglePayment && Number(payment.amount) > totals.total
          ? totals.total.toFixed(2)
          : payment.amount,
      externalReference: payment.externalReference || undefined,
    }))

    const combinedNotes =
      [
        cart.customerName ? `Customer: ${cart.customerName}` : null,
        cart.customerTin ? `TIN: ${cart.customerTin}` : null,
        cart.notes ? cart.notes : null,
      ]
        .filter(Boolean)
        .join(' | ') || undefined

    finalizeMutation.mutate(
      {
        branchId: cart.branchId,
        soldAt: new Date().toISOString(),
        currencyCode: 'PHP',
        taxExempt: !cart.isTaxIncluded,
        notes: combinedNotes,
        lines: cart.lines.map((line) => ({
          productId: line.productId,
          productUnitId: line.productUnitId,
          quantity: line.quantity,
          unitPrice: line.overriddenUnitPrice ?? undefined,
          discountAmount: Number(line.discountAmount) > 0 ? line.discountAmount : undefined,
          overrideReason: lineRequiresOverrideReason(line) ? line.overrideReason : undefined,
        })),
        payments: paymentsPayload,
      },
      {
        onSuccess: (sale) => {
          setLastCompletedSale({
            sale,
            tendered: recordedTendered,
            change: recordedChange,
          })
          setReceiptSaleNumber(
            `${sale.saleNumber} · Paid: ₱${recordedTendered.toFixed(2)}${recordedChange > 0 ? ` · Change: ₱${recordedChange.toFixed(2)}` : ''}`
          )
          cart.clear()
        },
      },
    )
  }

  const error = finalizeMutation.error as ApiError | null

  return (
    <div className="flex flex-col gap-2.5 lg:h-[calc(100dvh-5.5rem)]">
      {/* Sleek Compact Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">
            Point of Sale
          </h1>
          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            Counter POS
          </span>

          {/* Held Orders Pill */}
          {cart.heldOrders.length > 0 && (
            <button
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-900 hover:bg-amber-500/20 transition cursor-pointer"
              type="button"
              onClick={() => setShowHeldOrders(true)}
            >
              <Clock size={13} />
              Parked Orders ({cart.heldOrders.length})
            </button>
          )}
        </div>
        <p className="hidden sm:block text-xs text-muted">
          Scan barcode or tap products to ring up sale
        </p>
      </div>

      {receiptSaleNumber ? (
        <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-xs sm:text-sm text-success-text shrink-0" role="status">
          <div className="flex items-center gap-3">
            <span>Sale {receiptSaleNumber} completed successfully.</span>
            {lastCompletedSale && (
              <button
                className="inline-flex items-center gap-1 font-bold underline hover:text-success-text/80 cursor-pointer"
                type="button"
                onClick={() => {
                  // Reopen receipt dialog
                  setLastCompletedSale({ ...lastCompletedSale })
                }}
              >
                <Printer size={13} />
                View Receipt
              </button>
            )}
          </div>
          <button className="font-semibold underline cursor-pointer" type="button" onClick={() => setReceiptSaleNumber(null)}>Dismiss</button>
        </div>
      ) : null}

      {scanNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-50/90 px-4 py-1.5 text-xs font-bold text-brand-900 shadow-xs animate-fadeIn shrink-0" role="status">
          <ScanBarcode size={15} className="text-brand-600 shrink-0" />
          <span>{scanNotice}</span>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-xs sm:text-sm text-danger-text shrink-0" role="alert">
          {error.message}{error.requestId ? ` Request ID: ${error.requestId}` : ''}
        </div>
      ) : null}

      {/* 2-PANEL MASTER-DETAIL SPLIT: 60% Catalog | 40% Order & Checkout Station */}
      <div className="flex flex-col gap-3 lg:grid lg:flex-1 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_440px] 2xl:grid-cols-[1fr_480px] lg:overflow-hidden min-h-0">
        {/* Left Panel: Spacious Product Catalog */}
        <div className="h-[520px] lg:h-full min-h-0">
          <ProductSearchPanel branchId={cart.branchId} onAdd={cart.addProduct} />
        </div>

        {/* Right Panel: Cohesive Order & Checkout Station */}
        <div className="flex flex-col h-full rounded-2xl border border-border bg-surface shadow-panel overflow-hidden min-h-0">
          {/* Scrollable Cart List */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CartTable
              canOverrideDiscount={canOverrideDiscount}
              canOverridePrice={canOverridePrice}
              isTaxIncluded={cart.isTaxIncluded}
              lines={cart.lines}
              onClear={cart.clear}
              onDiscountChange={cart.setDiscount}
              onHold={() => cart.holdCurrentOrder()}
              onPriceChange={cart.setOverriddenPrice}
              onQuantityChange={cart.setQuantity}
              onReasonChange={cart.setOverrideReason}
              onRemove={cart.removeLine}
            />
          </div>

          {/* Collapsible Customer & Invoice Details */}
          <div className="border-t border-border/70 px-3 py-1.5 bg-subtle/20 shrink-0">
            <button
              className="flex w-full items-center justify-between text-xs font-bold text-slate-700 hover:text-brand-700 transition cursor-pointer"
              type="button"
              onClick={() => setShowCustomerSection(!showCustomerSection)}
            >
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-brand-600" />
                Customer / TIN / Notes {cart.customerName ? `(${cart.customerName})` : ''}
              </span>
              {showCustomerSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showCustomerSection && (
              <div className="mt-2 space-y-2 pt-2 border-t border-border/60 animate-fadeIn">
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase block" htmlFor="pos-customer-name">
                    Customer / Business Name
                  </label>
                  <input
                    className="h-7.5 w-full rounded-md border border-border bg-surface px-2 text-xs text-ink outline-none focus:border-brand-600 mt-0.5"
                    id="pos-customer-name"
                    placeholder="e.g. Acme Hydro Co."
                    type="text"
                    value={cart.customerName}
                    onChange={(e) => cart.setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase block" htmlFor="pos-customer-tin">
                    Tax Identification # (TIN)
                  </label>
                  <input
                    className="h-7.5 w-full rounded-md border border-border bg-surface px-2 text-xs text-ink outline-none focus:border-brand-600 mt-0.5"
                    id="pos-customer-tin"
                    placeholder="000-000-000-000"
                    type="text"
                    value={cart.customerTin}
                    onChange={(e) => cart.setCustomerTin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted uppercase block" htmlFor="pos-sale-notes">
                    Sale Notes / Memo
                  </label>
                  <input
                    className="h-7.5 w-full rounded-md border border-border bg-surface px-2 text-xs text-ink outline-none focus:border-brand-600 mt-0.5"
                    id="pos-sale-notes"
                    placeholder="Optional memo or reference"
                    type="text"
                    value={cart.notes}
                    onChange={(e) => cart.setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compact Checkout & Payments Footer */}
          <div className="border-t border-border bg-surface p-3 space-y-2 shrink-0 max-h-[50vh] overflow-y-auto shadow-xs">
            <PaymentsPanel
              payments={cart.payments}
              totalDue={totals.total}
              onAdd={cart.addPayment}
              onRemove={cart.removePayment}
              onUpdate={cart.updatePayment}
            />

            <CheckoutSummary
              disabledReason={disabledReason}
              isSubmitting={finalizeMutation.isPending}
              isTaxIncluded={cart.isTaxIncluded}
              isValid={isValid}
              paymentsTotal={paymentsTotal}
              totals={totals}
              onFinalize={finalize}
              onToggleTax={cart.setIsTaxIncluded}
            />
          </div>
        </div>
      </div>

      {/* Printable Thermal Receipt Modal */}
      {lastCompletedSale && (
        <ReceiptDialog
          changeAmount={lastCompletedSale.change}
          sale={lastCompletedSale.sale}
          tenderedAmount={lastCompletedSale.tendered}
          onClose={() => setLastCompletedSale(null)}
          onNewSale={() => {
            setLastCompletedSale(null)
            setReceiptSaleNumber(null)
          }}
        />
      )}

      {/* Parked / Held Orders Dialog */}
      {showHeldOrders && (
        <HeldOrdersDialog
          heldOrders={cart.heldOrders}
          onClose={() => setShowHeldOrders(false)}
          onDiscard={(id) => cart.discardHeldOrder(id)}
          onResume={(id) => cart.resumeHeldOrder(id)}
        />
      )}
    </div>
  )
}
