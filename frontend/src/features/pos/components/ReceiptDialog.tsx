import { useRef } from 'react'
import { CheckCircle2, Copy, Download, Printer, RotateCcw, X } from 'lucide-react'
import type { Sale } from '@/features/sales/types/sale'
import { Button } from '@/shared/components/Button'
import { Portal } from '@/shared/components/Portal'
import { formatCurrency, formatDateTime, formatQuantity } from '@/shared/lib/formatters'

type ReceiptDialogProps = {
  sale: Sale
  tenderedAmount: number
  changeAmount: number
  onClose: () => void
  onNewSale: () => void
}

export function ReceiptDialog({
  sale,
  tenderedAmount,
  changeAmount,
  onClose,
  onNewSale,
}: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  const subtotal = Number(sale.subtotalAmount) || 0
  const discount = Number(sale.discountAmount) || 0
  const tax = Number(sale.taxAmount) || 0
  const total = Number(sale.totalAmount) || 0

  return (
    <Portal>
      {/* Modal Backdrop */}
      <div
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
        role="dialog"
      >
        <div className="relative flex w-full max-w-md flex-col rounded-2xl bg-surface shadow-2xl overflow-hidden border border-border">
          {/* Top Success & Action Bar (Hidden in Print) */}
          <div className="flex items-center justify-between border-b border-border bg-emerald-500/10 px-4 py-3 text-emerald-800 print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={20} />
              <div>
                <h2 className="text-sm font-bold text-emerald-950">Sale Completed!</h2>
                <p className="text-[11px] text-emerald-800">
                  {sale.saleNumber} has been finalized and recorded.
                </p>
              </div>
            </div>
            <button
              aria-label="Close dialog"
              className="rounded-lg p-1 text-emerald-800/80 hover:bg-emerald-500/20 hover:text-emerald-950 transition"
              type="button"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          {/* Printable 80mm Receipt Container */}
          <div className="max-h-[70vh] overflow-y-auto p-5 bg-slate-50/50 flex justify-center">
            <div
              ref={receiptRef}
              className="w-full max-w-[340px] rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm font-mono text-xs leading-relaxed"
              id="printable-receipt"
            >
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
                <p className="text-sm font-black tracking-wider uppercase">
                  STEVEN HYDROTECH EXPONENT
                </p>
                <p className="text-[10px] text-slate-600">
                  Water Filtration & Treatment Specialist
                </p>
                <p className="text-[10px] text-slate-500">
                  Branch: {sale.branchName || 'Main Branch'}
                  {sale.branchCode ? ` (${sale.branchCode})` : ''}
                </p>
                <p className="text-[11px] font-bold tracking-widest pt-1">
                  OFFICIAL SALES RECEIPT
                </p>
              </div>

              {/* Receipt Metadata */}
              <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt #:</span>
                  <span className="font-bold">{sale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date/Time:</span>
                  <span>{formatDateTime(sale.soldAt || new Date().toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span>{sale.cashierName || 'Staff Cashier'}</span>
                </div>
                {sale.notes && (
                  <div className="flex justify-between pt-0.5">
                    <span className="text-slate-500">Note:</span>
                    <span className="truncate max-w-[180px]">{sale.notes}</span>
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              <div className="py-2.5 border-b border-dashed border-slate-300">
                <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 pb-1">
                  <span>Item / Qty</span>
                  <span>Amount</span>
                </div>

                <div className="space-y-2 mt-1">
                  {sale.lines?.map((line) => (
                    <div key={line.id} className="text-[11px]">
                      <div className="font-semibold text-slate-800 line-clamp-1">
                        {line.productName}
                      </div>
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>
                          {formatQuantity(line.quantity)} × {formatCurrency(Number(line.unitPrice) || 0)}
                          {Number(line.discountAmount) > 0 && (
                            <span className="text-emerald-700 ml-1">
                              (-{formatCurrency(Number(line.discountAmount))})
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(Number(line.lineTotalAmount) || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Tax (12% VAT):</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
                  <span>TOTAL DUE:</span>
                  <span className="text-base font-black">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payments & Change Breakdown */}
              <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-700">
                  <span>Payment ({sale.payments?.[0]?.paymentMethod || 'Cash'}):</span>
                  <span className="font-bold">{formatCurrency(tenderedAmount > 0 ? tenderedAmount : total)}</span>
                </div>
                {changeAmount > 0 && (
                  <div className="flex justify-between font-black text-emerald-800 text-xs bg-emerald-50 px-1.5 py-0.5 rounded">
                    <span>CHANGE RETURNED:</span>
                    <span>{formatCurrency(changeAmount)}</span>
                  </div>
                )}
              </div>

              {/* Footer Notice */}
              <div className="text-center pt-3 space-y-1 text-[10px] text-slate-500">
                <p className="font-semibold text-slate-700">THANK YOU FOR YOUR BUSINESS!</p>
                <p>Please keep this receipt for warranty and service records.</p>
                <p className="text-[9px] font-mono tracking-widest text-slate-400 pt-1">
                  *** {sale.saleNumber} ***
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons (Print & New Sale) */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface p-4 print:hidden">
            <Button
              className="flex-1 justify-center gap-1.5"
              type="button"
              variant="secondary"
              onClick={onNewSale}
            >
              <RotateCcw size={15} />
              New Sale
            </Button>
            <Button
              className="flex-1 justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold"
              type="button"
              onClick={handlePrint}
            >
              <Printer size={16} />
              Print Receipt
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
