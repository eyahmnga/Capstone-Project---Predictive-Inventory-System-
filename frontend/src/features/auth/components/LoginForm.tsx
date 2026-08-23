import { type FormEvent, useState } from 'react'
import { AlertCircle, Eye, EyeOff, LoaderCircle } from 'lucide-react'
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

  const handleGoogleLogin = () => {
    alert('Google authentication is managed via single sign-on. Please contact your system administrator to enable Google SSO for your account.')
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
            Email
          </label>
          <input
            id="email-input"
            autoComplete="email"
            className="w-full h-11 rounded-lg border-2 border-[#19376d] bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            name="email"
            placeholder="example.email@gmail.com"
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
              <p className="text-xs text-gray-500 font-normal">Keeps you signed-in in this device</p>
            </div>
          </label>
        </div>
      </div>

      {/* Primary Submit Button */}
      <button
        className="mt-6 w-full h-11 rounded-lg bg-[#07244a] hover:bg-[#0a3266] active:bg-[#051833] text-white font-semibold text-sm shadow transition duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        disabled={loginMutation.isPending}
        type="submit"
      >
        {loginMutation.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : null}
        {loginMutation.isPending ? 'Signing in…' : 'Sign In'}
      </button>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative bg-[#f4f9ff] px-4 text-xs font-medium uppercase text-gray-500">
          or
        </div>
      </div>

      {/* Google Login Button */}
      <button
        className="w-full h-11 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-medium text-sm shadow-sm transition duration-150 flex items-center justify-center gap-3"
        type="button"
        onClick={handleGoogleLogin}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Account Link - Centered */}
      <div className="mt-8 text-center">
        <p className="text-xs sm:text-sm text-gray-700">
          Don't have an account?{' '}
          <a
            className="font-medium text-[#4f46e5] hover:underline"
            href="mailto:admin@stevenhydrotech.example?subject=Account%20Access%20Request"
          >
            Contact Administrator Now!
          </a>
        </p>
      </div>
    </form>
  )
}
