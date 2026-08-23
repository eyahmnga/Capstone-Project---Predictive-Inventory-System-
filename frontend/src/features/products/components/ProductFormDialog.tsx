import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Link as LinkIcon, Loader2, Trash2, Upload, X } from 'lucide-react'
import { uploadProductImage } from '@/features/products/api/productsApi'
import type { CategoryOption, Product, ProductFormValues, UnitOption } from '@/features/products/types/product'
import { Button } from '@/shared/components/Button'
import { cn } from '@/shared/lib/cn'
import { modalOverlayClass, modalPanelClass, sheetBodyClass, sheetFooterClass, sheetHeaderClass } from '@/shared/lib/modalClasses'
import { Portal } from '@/shared/components/Portal'

type ProductFormDialogProps = {
  product?: Product
  initialCategoryId?: string
  categoryOptions: CategoryOption[]
  unitOptions: UnitOption[]
  isSaving: boolean
  onClose: () => void
  onSave: (values: ProductFormValues) => void
}

function valuesFrom(product?: Product, initialCategoryId?: string): ProductFormValues {
  return product
    ? {
        categoryId: product.category?.id ?? '',
        stockUnitId: product.stockUnit?.id ?? '',
        sku: product.sku,
        barcode: product.barcode ?? '',
        name: product.name,
        description: product.description ?? '',
        imageUrl: product.imageUrl ?? null,
        productType: product.productType,
        defaultTaxRate: product.defaultTaxRate ? Number(product.defaultTaxRate).toFixed(2) : '12.00',
        sellingPrice: product.sellingPrice ? Number(product.sellingPrice).toFixed(2) : '0.00',
        isActive: product.isActive,
        isLotTracked: product.isLotTracked,
        isSerialTracked: product.isSerialTracked,
        isExpiryTracked: product.isExpiryTracked,
      }
    : {
        categoryId: initialCategoryId ?? '',
        stockUnitId: '',
        sku: '',
        barcode: '',
        name: '',
        description: '',
        imageUrl: null,
        productType: 'stock',
        defaultTaxRate: '12.00',
        sellingPrice: '0.00',
        isActive: true,
        isLotTracked: false,
        isSerialTracked: false,
        isExpiryTracked: false,
      }
}

export function ProductFormDialog({ product, initialCategoryId, categoryOptions, unitOptions, isSaving, onClose, onSave }: ProductFormDialogProps) {
  const [values, setValues] = useState<ProductFormValues>(() => valuesFrom(product, initialCategoryId))
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setValues(valuesFrom(product)), [product])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WEBP, etc.)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image size exceeds 5MB limit.')
      return
    }

    setImageError(null)
    setIsUploadingImage(true)

    try {
      const { url } = await uploadProductImage(file)
      setValues((state) => ({ ...state, imageUrl: url }))
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image'
      setImageError(errorMessage)
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    setValues((state) => ({ ...state, imageUrl: null }))
    setImageError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(values)
  }

  const isValid = values.categoryId !== '' && values.stockUnitId !== ''

  return (
    <Portal>
      <div className={modalOverlayClass} role="presentation">
        <section aria-labelledby="product-form-title" aria-modal="true" className={modalPanelClass('sm:max-w-2xl')} role="dialog">
          <div className={sheetHeaderClass}>
            <div>
              <h2 id="product-form-title" className="text-lg font-bold text-ink">
                {product ? 'Edit product' : 'Create product'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Product details, photo, and thresholds validated by the inventory API.
              </p>
            </div>
            <Button aria-label="Close dialog" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
            <div className={cn(sheetBodyClass, 'grid gap-4 sm:grid-cols-2')}>
              {/* Product Photo Upload Section */}
              <div className="rounded-xl border border-border bg-slate-50/50 p-4 sm:col-span-2">
                <span className="block text-sm font-semibold text-ink mb-2">Product image</span>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Image Preview / Placeholder */}
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-xs">
                    {values.imageUrl ? (
                      <img
                        alt="Product preview"
                        className="h-full w-full object-cover"
                        src={values.imageUrl}
                        onError={() => setImageError('Failed to load image preview')}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted">
                        <ImageIcon aria-hidden="true" size={28} />
                        <span className="mt-1 text-[10px] font-medium">No image</span>
                      </div>
                    )}

                    {isUploadingImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <Loader2 className="animate-spin text-brand-600" size={24} />
                      </div>
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        type="file"
                        onChange={handleFileChange}
                      />

                      <Button
                        disabled={isUploadingImage}
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload aria-hidden="true" size={14} />
                        {values.imageUrl ? 'Change photo' : 'Upload photo'}
                      </Button>

                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                      >
                        <LinkIcon aria-hidden="true" size={14} />
                        {showUrlInput ? 'Hide URL input' : 'Paste image URL'}
                      </Button>

                      {values.imageUrl && (
                        <Button
                          className="text-danger-text hover:bg-danger/10"
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={handleRemoveImage}
                        >
                          <Trash2 aria-hidden="true" size={14} />
                          Remove
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted">
                      PNG, JPG, or WEBP up to 5MB. Clear product photos will appear in tables, POS, and cards.
                    </p>

                    {showUrlInput && (
                      <div className="mt-2">
                        <input
                          className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                          placeholder="https://example.com/product-image.jpg"
                          type="url"
                          value={values.imageUrl ?? ''}
                          onChange={(e) => setValues((state) => ({ ...state, imageUrl: e.target.value || null }))}
                        />
                      </div>
                    )}

                    {imageError && (
                      <p className="text-xs font-medium text-danger-text">{imageError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Basic Fields */}
              <label className="text-sm font-semibold text-ink">
                Product name
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                  value={values.name}
                  onChange={(event) => setValues((state) => ({ ...state, name: event.target.value }))}
                />
              </label>

              <label className="text-sm font-semibold text-ink">
                SKU
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                  value={values.sku}
                  onChange={(event) => setValues((state) => ({ ...state, sku: event.target.value }))}
                />
              </label>

              <label className="text-sm font-semibold text-ink">
                Category
                <select
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                  value={values.categoryId}
                  onChange={(event) => setValues((state) => ({ ...state, categoryId: event.target.value }))}
                >
                  <option disabled value="">
                    Select a category
                  </option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-ink">
                Stock unit
                <select
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                  value={values.stockUnitId}
                  onChange={(event) => setValues((state) => ({ ...state, stockUnitId: event.target.value }))}
                >
                  <option disabled value="">
                    Select a unit
                  </option>
                  {unitOptions.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-ink">
                Selling price (₱)
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  value={values.sellingPrice}
                  onChange={(event) => setValues((state) => ({ ...state, sellingPrice: event.target.value }))}
                />
              </label>

              <label className="text-sm font-semibold text-ink">
                Tax rate (%)
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  min="0"
                  required
                  step="0.01"
                  type="number"
                  value={values.defaultTaxRate}
                  onChange={(event) => setValues((state) => ({ ...state, defaultTaxRate: event.target.value }))}
                />
              </label>

              <label className="text-sm font-semibold text-ink sm:col-span-2">
                Product type
                <select
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  value={values.productType}
                  onChange={(event) => setValues((state) => ({ ...state, productType: event.target.value as ProductFormValues['productType'] }))}
                >
                  <option value="stock">Stock product</option>
                  <option value="service">Service</option>
                </select>
              </label>

              <label className="block text-sm font-semibold text-ink sm:col-span-2">
                Description
                <textarea
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  rows={2}
                  value={values.description}
                  onChange={(event) => setValues((state) => ({ ...state, description: event.target.value }))}
                />
              </label>

              <div className="flex flex-wrap gap-5 sm:col-span-2 pt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none">
                  <input
                    checked={values.isActive}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                    type="checkbox"
                    onChange={(event) => setValues((state) => ({ ...state, isActive: event.target.checked }))}
                  />{' '}
                  Active for new transactions
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none">
                  <input
                    checked={values.isLotTracked}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                    type="checkbox"
                    onChange={(event) => setValues((state) => ({ ...state, isLotTracked: event.target.checked }))}
                  />{' '}
                  Lot tracked
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none">
                  <input
                    checked={values.isSerialTracked}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                    type="checkbox"
                    onChange={(event) => setValues((state) => ({ ...state, isSerialTracked: event.target.checked }))}
                  />{' '}
                  Serial tracked
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none">
                  <input
                    checked={values.isExpiryTracked}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                    type="checkbox"
                    onChange={(event) => setValues((state) => ({ ...state, isExpiryTracked: event.target.checked }))}
                  />{' '}
                  Expiry tracked
                </label>
              </div>
            </div>

            <div className={sheetFooterClass}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={isSaving || !isValid || isUploadingImage} type="submit">
                {isSaving ? 'Saving…' : product ? 'Save changes' : 'Create product'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </Portal>
  )
}
