import { type ChangeEvent, type FormEvent, useRef, useState } from 'react'
import { Link as LinkIcon, Loader2, Trash2, Upload, User, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { updateMyProfile, uploadMyAvatar } from '@/features/users/api/usersApi'
import { Avatar } from '@/shared/components/Avatar'
import { Button } from '@/shared/components/Button'
import { cn } from '@/shared/lib/cn'
import { modalOverlayClass, modalPanelClass, sheetBodyClass, sheetFooterClass, sheetHeaderClass } from '@/shared/lib/modalClasses'
import { Portal } from '@/shared/components/Portal'

type UserProfileDialogProps = {
  isOpen: boolean
  onClose: () => void
}

export function UserProfileDialog({ isOpen, onClose }: UserProfileDialogProps) {
  const { session, refreshSession } = useAuth()

  const [firstName, setFirstName] = useState(session?.user.firstName ?? '')
  const [lastName, setLastName] = useState(session?.user.lastName ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(session?.user.avatarUrl ?? null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen || !session) return null

  const displayName = `${firstName} ${lastName}`.trim() || session.user.displayName

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP, etc.)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit.')
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      const { url } = await uploadMyAvatar(file)
      setAvatarUrl(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo'
      setError(msg)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = () => {
    setAvatarUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      await updateMyProfile({
        firstName,
        lastName,
        avatarUrl,
      })
      await refreshSession()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile'
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Portal>
      <div className={modalOverlayClass} role="presentation">
        <section aria-labelledby="profile-dialog-title" aria-modal="true" className={modalPanelClass('sm:max-w-md')} role="dialog">
          <div className={sheetHeaderClass}>
            <div>
              <h2 id="profile-dialog-title" className="text-lg font-bold text-ink">
                My profile & photo
              </h2>
              <p className="mt-1 text-sm text-muted">Update your avatar photo and account display details.</p>
            </div>
            <Button aria-label="Close dialog" size="icon" variant="ghost" onClick={onClose}>
              <X aria-hidden="true" size={18} />
            </Button>
          </div>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className={cn(sheetBodyClass, 'space-y-5')}>
              {/* Avatar Section */}
              <div className="flex flex-col items-center rounded-2xl border border-border bg-slate-50/70 p-5 text-center">
                <div className="relative mb-3">
                  <Avatar
                    className="h-20 w-20 text-2xl shadow-md ring-4 ring-white"
                    name={displayName}
                    size="lg"
                    src={avatarUrl}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
                      <Loader2 className="animate-spin text-brand-600" size={24} />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <input
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    type="file"
                    onChange={handleFileChange}
                  />

                  <Button
                    disabled={isUploading}
                    size="sm"
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload aria-hidden="true" size={14} />
                    {avatarUrl ? 'Change photo' : 'Upload photo'}
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

                  {avatarUrl && (
                    <Button
                      className="text-danger-text hover:bg-danger/10"
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={handleRemovePhoto}
                    >
                      <Trash2 aria-hidden="true" size={14} />
                      Remove
                    </Button>
                  )}
                </div>

                {showUrlInput && (
                  <div className="mt-3 w-full">
                    <input
                      className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                      placeholder="https://example.com/photo.jpg"
                      type="url"
                      value={avatarUrl ?? ''}
                      onChange={(e) => setAvatarUrl(e.target.value || null)}
                    />
                  </div>
                )}
              </div>

              {/* Name Fields */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink">
                  First name
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label className="text-sm font-semibold text-ink">
                  Last name
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>

              {/* Email (Read only) */}
              <label className="block text-sm font-semibold text-ink">
                Email address
                <input
                  readOnly
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-slate-100 px-3 text-sm text-muted cursor-not-allowed"
                  value={session.user.email}
                />
              </label>

              {error && <p className="text-xs font-medium text-danger-text">{error}</p>}
            </div>

            <div className={sheetFooterClass}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={isSaving || isUploading} type="submit">
                {isSaving ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </Portal>
  )
}
