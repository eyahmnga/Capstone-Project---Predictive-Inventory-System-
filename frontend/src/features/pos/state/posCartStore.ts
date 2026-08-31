import { create } from 'zustand'
import type { CartLine, CartPayment, PosProduct } from '@/features/pos/types/pos'
import type { PaymentMethod } from '@/features/sales/types/sale'

export type HeldOrder = {
  id: string
  heldAt: string
  branchId: string | null
  lines: CartLine[]
  payments: CartPayment[]
  isTaxIncluded: boolean
  customerName?: string
  customerTin?: string
  notes?: string
}

type PosCartState = {
  branchId: string | null
  lines: CartLine[]
  payments: CartPayment[]
  isTaxIncluded: boolean
  customerName: string
  customerTin: string
  notes: string
  heldOrders: HeldOrder[]
  setBranch: (branchId: string) => void
  setIsTaxIncluded: (isTaxIncluded: boolean) => void
  setCustomerName: (customerName: string) => void
  setCustomerTin: (customerTin: string) => void
  setNotes: (notes: string) => void
  addProduct: (product: PosProduct) => void
  setQuantity: (productId: string, quantity: number) => void
  setOverriddenPrice: (productId: string, price: string | null) => void
  setDiscount: (productId: string, discountAmount: string) => void
  setOverrideReason: (productId: string, reason: string) => void
  removeLine: (productId: string) => void
  addPayment: (initial?: Partial<Omit<CartPayment, 'localId'>>) => void
  setQuickCashPayment: (amount: string, method?: PaymentMethod) => void
  updatePayment: (localId: string, patch: Partial<Omit<CartPayment, 'localId'>>) => void
  removePayment: (localId: string) => void
  holdCurrentOrder: (customTag?: string) => void
  resumeHeldOrder: (heldId: string) => void
  discardHeldOrder: (heldId: string) => void
  clear: () => void
}

export const usePosCartStore = create<PosCartState>()((set, get) => ({
  branchId: null,
  lines: [],
  payments: [],
  isTaxIncluded: true,
  customerName: '',
  customerTin: '',
  notes: '',
  heldOrders: [],

  setBranch: (branchId) =>
    set((state) =>
      state.branchId === branchId
        ? state
        : { branchId, lines: [], payments: [], isTaxIncluded: true, customerName: '', customerTin: '', notes: '' },
    ),

  setIsTaxIncluded: (isTaxIncluded) => set({ isTaxIncluded }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerTin: (customerTin) => set({ customerTin }),
  setNotes: (notes) => set({ notes }),

  addProduct: (product) => {
    if (!product.stockUnit) return
    const existing = get().lines.find((line) => line.productId === product.id)
    if (existing) {
      set((state) => ({
        lines: state.lines.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      }))
      return
    }
    const newLine: CartLine = {
      productId: product.id,
      productUnitId: product.stockUnit.id,
      sku: product.sku,
      name: product.name,
      productType: product.productType,
      quantity: 1,
      catalogUnitPrice: product.sellingPrice,
      overriddenUnitPrice: null,
      discountAmount: '0',
      overrideReason: '',
      taxRate: product.defaultTaxRate,
      availableQuantity: product.stock?.availableQuantity ?? null,
    }
    set((state) => ({ lines: [...state.lines, newLine] }))
  },

  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.productId === productId ? { ...line, quantity: Math.max(1, quantity) } : line,
      ),
    })),

  setOverriddenPrice: (productId, price) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.productId === productId ? { ...line, overriddenUnitPrice: price } : line,
      ),
    })),

  setDiscount: (productId, discountAmount) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.productId === productId ? { ...line, discountAmount } : line,
      ),
    })),

  setOverrideReason: (productId, overrideReason) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.productId === productId ? { ...line, overrideReason } : line,
      ),
    })),

  removeLine: (productId) =>
    set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),

  addPayment: (initial) =>
    set((state) => ({
      payments: [
        ...state.payments,
        {
          localId: crypto.randomUUID(),
          paymentMethod: initial?.paymentMethod || ('cash' as PaymentMethod),
          amount: initial?.amount ?? '',
          externalReference: initial?.externalReference ?? '',
        },
      ],
    })),

  setQuickCashPayment: (amount, method = 'cash') =>
    set((state) => {
      if (state.payments.length > 0) {
        return {
          payments: state.payments.map((payment, index) =>
            index === 0
              ? {
                  ...payment,
                  amount,
                  paymentMethod: payment.paymentMethod || method,
                }
              : payment,
          ),
        }
      }
      return {
        payments: [
          {
            localId: crypto.randomUUID(),
            paymentMethod: method,
            amount,
            externalReference: '',
          },
        ],
      }
    }),

  updatePayment: (localId, patch) =>
    set((state) => ({
      payments: state.payments.map((payment) =>
        payment.localId === localId ? { ...payment, ...patch } : payment,
      ),
    })),

  removePayment: (localId) =>
    set((state) => ({
      payments: state.payments.filter((payment) => payment.localId !== localId),
    })),

  holdCurrentOrder: (customTag) => {
    const current = get()
    if (current.lines.length === 0) return

    const newHeld: HeldOrder = {
      id: crypto.randomUUID(),
      heldAt: new Date().toISOString(),
      branchId: current.branchId,
      lines: [...current.lines],
      payments: [...current.payments],
      isTaxIncluded: current.isTaxIncluded,
      customerName: customTag || current.customerName || undefined,
      customerTin: current.customerTin || undefined,
      notes: current.notes || undefined,
    }

    set({
      heldOrders: [newHeld, ...current.heldOrders],
      lines: [],
      payments: [],
      customerName: '',
      customerTin: '',
      notes: '',
    })
  },

  resumeHeldOrder: (heldId) => {
    const current = get()
    const target = current.heldOrders.find((h) => h.id === heldId)
    if (!target) return

    // If current cart has items, hold it too
    const remainingHeld = current.heldOrders.filter((h) => h.id !== heldId)
    let updatedHeld = remainingHeld

    if (current.lines.length > 0) {
      const parkCurrent: HeldOrder = {
        id: crypto.randomUUID(),
        heldAt: new Date().toISOString(),
        branchId: current.branchId,
        lines: [...current.lines],
        payments: [...current.payments],
        isTaxIncluded: current.isTaxIncluded,
        customerName: current.customerName || undefined,
        customerTin: current.customerTin || undefined,
        notes: current.notes || undefined,
      }
      updatedHeld = [parkCurrent, ...remainingHeld]
    }

    set({
      heldOrders: updatedHeld,
      lines: target.lines,
      payments: target.payments,
      isTaxIncluded: target.isTaxIncluded,
      customerName: target.customerName || '',
      customerTin: target.customerTin || '',
      notes: target.notes || '',
    })
  },

  discardHeldOrder: (heldId) =>
    set((state) => ({
      heldOrders: state.heldOrders.filter((h) => h.id !== heldId),
    })),

  clear: () =>
    set((state) => ({
      lines: [],
      payments: [],
      isTaxIncluded: true,
      customerName: '',
      customerTin: '',
      notes: '',
      branchId: state.branchId,
    })),
}))
