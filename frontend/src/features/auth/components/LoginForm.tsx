import { type FormEvent, useState } from 'react'
import { AlertCircle, Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authQueryKeys, signIn } from '@/features/auth/api/authApi'
import type { LoginCredentials } from '@/features/auth/types/auth'
import { type ApiError } from '@/shared/api/client'

const initialCredentials: LoginCredentials = { email: '', password: '', remember: true }

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [credentials, setCredentials] = useState<LoginCredentials>(initialCredentials)
  const [showPassword, setShowPassword] = useState(false)

  const loginMutation = useMutation({
    mutationFn: signIn,
    onSuccess: (session) => {
      queryClient.setQueryData(authQueryKeys.session, session)
      const returnPath = typeof location.state === 'object'
        && location.state !== null
        && 'from' in location.state
        && typeof location.state.from === 'object'
        && location.state.from !== null
        && 'pathname' in location.state.from
        && typeof location.state.from.pathname === 'string'
        && location.state.from.pathname.startsWith('/')
        ? location.state.from.pathname
        : '/dashboard'

      navigate(returnPath, { replace: true })
    },
  })

  const error = loginMutation.error as ApiError | null
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loginMutation.mutate(credentials)
  }

  return (
    <form aria-label="Sign in" className="w-full" onSubmit={submit}>
      {error ? (
        <div className="mb-5 flex gap-3 rounded-lg border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger" role="alert">
          <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-medium">{error.message}</p>
            {error.requestId ? <p className="mt-1 text-xs text-danger/80">Request ID: {error.requestId}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-sm font-semibold text-[#071d49] mb-1.5" htmlFor="email-input">
            Email address
          </label>
          <input
            id="email-input"
            autoComplete="email"
            className="w-full h-11 rounded-lg border-2 border-[#19376d] bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            name="email"
            placeholder="name@stevenhydrotech.example"
            onChange={(event) => setCredentials((state) => ({ ...state, email: event.target.value }))}
            required
            type="email"
            value={credentials.email}
          />
        </div>

        {/* Password Field with Eye Visibility Toggle */}
        <div>
          <label className="block text-sm font-semibold text-[#071d49] mb-1.5" htmlFor="password-input">
            Password
          </label>
          <div className="relative">
            <input
              id="password-input"
              autoComplete="current-password"
              className="w-full h-11 rounded-lg border-2 border-[#19376d] bg-white pl-3.5 pr-11 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              name="password"
              placeholder="••••••••••••"
              onChange={(event) => setCredentials((state) => ({ ...state, password: event.target.value }))}
              required
              type={showPassword ? 'text' : 'password'}
              value={credentials.password}
            />
            <button
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#071d49] transition p-1 focus:outline-none"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="pt-1">
          <label className="inline-flex items-start gap-2.5 text-sm text-[#071d49] cursor-pointer select-none">
            <input
              checked={credentials.remember}
              className="mt-0.5 h-4 w-4 rounded border border-gray-400 text-[#07244a] focus:ring-[#07244a]"
              name="remember"
              onChange={(event) => setCredentials((state) => ({ ...state, remember: event.target.checked }))}
              type="checkbox"
            />
            <div>
              <span className="font-semibold text-xs sm:text-sm text-gray-900">Remember Me</span>
              <p className="text-xs text-gray-500 font-normal">Keep my session active on this device</p>
            </div>
          </label>
        </div>
      </div>

      {/* Primary Submit Button */}
      <button
        className="mt-6 w-full h-11 rounded-lg bg-[#07244a] hover:bg-[#0a3266] active:bg-[#051833] text-white font-semibold text-sm shadow transition duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        disabled={loginMutation.isPending}
        type="submit"
      >
        {loginMutation.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
        {loginMutation.isPending ? 'Signing in…' : 'Sign In to System'}
      </button>

      {/* Account Help & Support Link */}
      <div className="mt-8 text-center pt-2 border-t border-gray-200/80">
        <p className="text-xs sm:text-sm text-gray-700">
          Need account access or password reset?{' '}
          <a
            className="font-medium text-[#07244a] hover:underline block sm:inline mt-1 sm:mt-0"
            href="mailto:admin@stevenhydrotech.example?subject=Account%20Access%20Request"
          >
            Contact Store Administrator
          </a>
        </p>
      </div>
    </form>
  )
}
