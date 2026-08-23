import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { Link as LinkIcon, Loader2, Trash2, Upload, X } from 'lucide-react'
import { uploadUserAvatar } from '@/features/users/api/usersApi'
import type { BranchOption, ManagedUser, RoleOption, UserFormValues } from '@/features/users/types/user'
import { Avatar } from '@/shared/components/Avatar'
import { Button } from '@/shared/components/Button'
import { cn } from '@/shared/lib/cn'
import { modalOverlayClass, modalPanelClass, sheetBodyClass, sheetFooterClass, sheetHeaderClass } from '@/shared/lib/modalClasses'
import { Portal } from '@/shared/components/Portal'

type UserFormDialogProps = {
  user?: ManagedUser
  roleOptions: RoleOption[]
  branchOptions: BranchOption[]
  isSaving: boolean
  onClose: () => void
  onSave: (values: UserFormValues) => void
}

function formValuesFrom(user?: ManagedUser): UserFormValues {
  if (!user) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      avatarUrl: null,
      roleIds: [],
      branchIds: [],
      defaultBranchId: '',
      isActive: true,
    }
  }
  const defaultBranch = user.branches.find((branch) => branch.isDefault)
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? null,
    roleIds: user.roles.map((role) => role.id),
    branchIds: user.branches.map((branch) => branch.id),
    defaultBranchId: defaultBranch?.id ?? user.branches[0]?.id ?? '',
    isActive: user.isActive,
  }
}

export function UserFormDialog({ user, roleOptions, branchOptions, isSaving, onClose, onSave }: UserFormDialogProps) {
  const [values, setValues] = useState<UserFormValues>(() => formValuesFrom(user))
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setValues(formValuesFrom(user)), [user])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file (PNG, JPG, WEBP, etc.)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size exceeds 5MB limit.')
      return
    }

    setAvatarError(null)
    setIsUploadingAvatar(true)

    try {
      const { url } = await uploadUserAvatar(file)
      setValues((state) => ({ ...state, avatarUrl: url }))
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar'
      setAvatarError(errorMessage)
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = () => {
    setValues((state) => ({ ...state, avatarUrl: null }))
    setAvatarError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(values)
  }

  const toggleRole = (roleId: string) => {
    setValues((state) => ({
      ...state,
      roleIds: state.roleIds.includes(roleId) ? state.roleIds.filter((id) => id !== roleId) : [...state.roleIds, roleId],
    }))
  }

  const toggleBranch = (branchId: string) => {
    setValues((state) => {
      const isSelected = state.branchIds.includes(branchId)
      const branchIds = isSelected ? state.branchIds.filter((id) => id !== branchId) : [...state.branchIds, branchId]
      const defaultBranchId = isSelected && state.defaultBranchId === branchId ? (branchIds[0] ?? '') : state.defaultBranchId || branchId
      return { ...state, branchIds, defaultBranchId }
    })
  }

  const isValid = values.roleIds.length > 0 && values.branchIds.length > 0 && values.defaultBranchId !== ''
  const displayName = `${values.firstName} ${values.lastName}`.trim() || 'User Profile'

  return (
    <Portal>
      <div className={modalOverlayClass} role="presentation">
        <section aria-labelledby="user-form-title" aria-modal="true" className={modalPanelClass('sm:max-w-lg')} role="dialog">
          <div className={sheetHeaderClass}>
            <div>
              <h2 id="user-form-title" className="text-lg font-bold text-ink">
                {user ? 'Edit user' : 'Create user'}
              </h2>
              <p className="mt-1 text-sm text-muted">Assign only the access required for the user’s responsibilities.</p>
            </div>
            <Button aria-label="Close dialog" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
            <div className={cn(sheetBodyClass, 'space-y-4')}>
              {/* Profile Photo / Avatar Section */}
              <div className="rounded-xl border border-border bg-slate-50/50 p-4">
                <span className="block text-sm font-semibold text-ink mb-2">Profile photo</span>
                <div className="flex items-center gap-4">
                  {/* Avatar Preview */}
                  <div className="relative">
                    <Avatar
                      className="h-16 w-16 text-lg shadow-xs ring-2 ring-border"
                      name={displayName}
                      size="lg"
                      src={values.avatarUrl}
                    />
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
                        <Loader2 className="animate-spin text-brand-600" size={20} />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        type="file"
                        onChange={handleFileChange}
                      />

                      <Button
                        disabled={isUploadingAvatar}
                        size="sm"
                        type="button"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload aria-hidden="true" size={14} />
                        {values.avatarUrl ? 'Change photo' : 'Upload photo'}
                      </Button>

                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                      >
                        <LinkIcon aria-hidden="true" size={14} />
                        {showUrlInput ? 'Hide URL' : 'Paste URL'}
                      </Button>

                      {values.avatarUrl && (
                        <Button
                          className="text-danger-text hover:bg-danger/10"
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={handleRemoveAvatar}
                        >
                          <Trash2 aria-hidden="true" size={14} />
                          Remove
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted">PNG, JPG, or WEBP up to 5MB.</p>

                    {showUrlInput && (
                      <div className="mt-2">
                        <input
                          className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                          placeholder="https://example.com/avatar.jpg"
                          type="url"
                          value={values.avatarUrl ?? ''}
                          onChange={(e) => setValues((state) => ({ ...state, avatarUrl: e.target.value || null }))}
                        />
                      </div>
                    )}

                    {avatarError && <p className="text-xs font-medium text-danger-text">{avatarError}</p>}
                  </div>
                </div>
              </div>

              {/* Name fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink">
                  First name
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    required
                    value={values.firstName}
                    onChange={(event) => setValues((state) => ({ ...state, firstName: event.target.value }))}
                  />
                </label>
                <label className="text-sm font-semibold text-ink">
                  Last name
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    required
                    value={values.lastName}
                    onChange={(event) => setValues((state) => ({ ...state, lastName: event.target.value }))}
                  />
                </label>
              </div>

              {/* Email & Phone */}
              <label className="block text-sm font-semibold text-ink">
                Email address
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  required
                  type="email"
                  value={values.email}
                  onChange={(event) => setValues((state) => ({ ...state, email: event.target.value }))}
                />
              </label>

              <label className="block text-sm font-semibold text-ink">
                Phone
                <input
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  value={values.phone}
                  onChange={(event) => setValues((state) => ({ ...state, phone: event.target.value }))}
                />
              </label>

              {/* Roles */}
              <fieldset>
                <legend className="text-sm font-semibold text-ink">Roles</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roleOptions.map((role) => (
                    <label key={role.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-ink cursor-pointer select-none">
                      <input
                        checked={values.roleIds.includes(role.id)}
                        className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                        type="checkbox"
                        onChange={() => toggleRole(role.id)}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Branches */}
              <fieldset>
                <legend className="text-sm font-semibold text-ink">Branches</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {branchOptions.map((branch) => (
                    <label key={branch.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-ink cursor-pointer select-none">
                      <input
                        checked={values.branchIds.includes(branch.id)}
                        className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                        type="checkbox"
                        onChange={() => toggleBranch(branch.id)}
                      />
                      {branch.name}
                    </label>
                  ))}
                </div>
              </fieldset>

              {values.branchIds.length > 0 ? (
                <label className="block text-sm font-semibold text-ink">
                  Default branch
                  <select
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    value={values.defaultBranchId}
                    onChange={(event) => setValues((state) => ({ ...state, defaultBranchId: event.target.value }))}
                  >
                    {branchOptions
                      .filter((branch) => values.branchIds.includes(branch.id))
                      .map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}

              <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer select-none">
                <input
                  checked={values.isActive}
                  className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-600/20 cursor-pointer"
                  type="checkbox"
                  onChange={(event) => setValues((state) => ({ ...state, isActive: event.target.checked }))}
                />
                Active
              </label>
            </div>

            <div className={sheetFooterClass}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={isSaving || !isValid || isUploadingAvatar} type="submit">
                {isSaving ? 'Saving…' : user ? 'Save changes' : 'Create user'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </Portal>
  )
}
