import { LoginForm } from '@/features/auth/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#07244a]">Welcome!</h1>
      </div>
      <LoginForm />
    </div>
  )
}
