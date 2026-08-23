import { Outlet } from 'react-router-dom'
import logoIcon from '@/features/auth/assets/logo.png'

export function AuthenticationLayout() {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 overflow-x-hidden font-sans">
      {/* LEFT PANEL: 50% on desktop */}
      <aside
        className="relative hidden lg:flex flex-col justify-between p-8 xl:p-12 text-white bg-gradient-to-b from-[#8fa2b5] via-[#1a3f6a] to-[#041226] overflow-hidden"
        aria-label="Brand and features overview"
      >
        {/* Top Header: STEVEN HYDROTECH EXPONENT */}
        <div className="z-10 text-center pt-2">
          <h1 className="font-sans text-2xl xl:text-3xl font-extrabold tracking-wider text-[#0c2e56] drop-shadow-sm">
            STEVEN HYDROTECH
          </h1>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="h-[1.5px] w-6 bg-[#0c2e56]" />
            <p className="font-sans text-xs xl:text-sm font-bold tracking-[0.35em] text-[#0c2e56] uppercase">
              EXPONENT
            </p>
            <span className="h-[1.5px] w-6 bg-[#0c2e56]" />
          </div>
          <p className="font-sans text-[11px] xl:text-xs font-semibold tracking-wider text-[#2563eb] mt-1.5 uppercase">
            Water Treatment and Supply Services
          </p>
        </div>

        {/* Center: Rounded Square Logo Image */}
        <div className="flex-1 flex items-center justify-center my-auto z-10 px-4">
          <img
            src={logoIcon}
            alt="Steven Hydrotech Exponent Logo"
            className="w-40 h-40 xl:w-48 xl:h-48 object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] rounded-3xl"
          />
        </div>

        {/* Bottom: Stylized 4 Feature Card Module */}
        <div className="z-10 mt-auto">
          <div className="rounded-2xl bg-[#07244a]/85 border border-blue-400/25 p-4 shadow-xl backdrop-blur-md">
            <div className="grid grid-cols-4 divide-x divide-white/20">
              {/* Feature 1 */}
              <div className="px-2 text-center flex flex-col items-center">
                <div className="mb-2 text-cyan-400">
                  <svg className="w-7 h-7 xl:w-8 xl:h-8" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" />
                    <path d="M24 44V24" />
                    <path d="M42 14L24 24L6 14" />
                  </svg>
                </div>
                <h3 className="text-xs xl:text-sm font-bold text-white tracking-tight">Predict Demand</h3>
                <p className="mt-1 text-[10px] xl:text-[11px] text-blue-100/80 leading-snug">
                  Forecast future demand using Simple Moving Average (SMA).
                </p>
              </div>

              {/* Feature 2 */}
              <div className="px-2 text-center flex flex-col items-center">
                <div className="mb-2 text-cyan-400">
                  <svg className="w-7 h-7 xl:w-8 xl:h-8" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8H12L16.5 30H38L42 14H14" />
                    <circle cx="18" cy="38" r="3" fill="currentColor" />
                    <circle cx="36" cy="38" r="3" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="text-xs xl:text-sm font-bold text-white tracking-tight">Optimize Orders</h3>
                <p className="mt-1 text-[10px] xl:text-[11px] text-blue-100/80 leading-snug">
                  Determine the best order quantity using EOQ to minimize costs.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="px-2 text-center flex flex-col items-center">
                <div className="mb-2 text-cyan-400">
                  <svg className="w-7 h-7 xl:w-8 xl:h-8" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="10" y="10" width="28" height="34" rx="4" />
                    <path d="M18 10V6C18 4.89543 18.8954 4 20 4H28C29.1046 4 30 4.89543 30 6V10" />
                    <path d="M16 28L22 22L28 27L34 19" />
                    <path d="M16 36H32" />
                  </svg>
                </div>
                <h3 className="text-xs xl:text-sm font-bold text-white tracking-tight">Reduce Costs</h3>
                <p className="mt-1 text-[10px] xl:text-[11px] text-blue-100/80 leading-snug">
                  Lower holding costs and avoid overstock or stockouts.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="px-2 text-center flex flex-col items-center">
                <div className="mb-2 text-cyan-400">
                  <svg className="w-7 h-7 xl:w-8 xl:h-8" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M24 6C24 6 10 22 10 32C10 39.732 16.268 46 24 46C31.732 46 38 39.732 38 32C38 22 24 6 24 6Z" />
                  </svg>
                </div>
                <h3 className="text-xs xl:text-sm font-bold text-white tracking-tight">Better Decisions</h3>
                <p className="mt-1 text-[10px] xl:text-[11px] text-blue-100/80 leading-snug">
                  Real-time insights for smarter inventory management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL: 50% on desktop */}
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#f4f9ff] p-6 sm:p-10 lg:p-12 overflow-hidden">
        {/* Subtle Decorative Circle and Connecting Wave Pattern Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
          <svg className="absolute -bottom-16 -right-16 w-[480px] h-[480px] pointer-events-none opacity-70" viewBox="0 0 500 500" fill="none">
            <circle cx="350" cy="390" r="100" fill="#cde8fc" />
            <circle cx="420" cy="220" r="45" fill="#e2f1fe" />
            <circle cx="210" cy="310" r="30" fill="#e2f1fe" />
            <path d="M 100 460 C 180 430, 220 360, 280 340 S 400 300, 460 220" stroke="#cde4fc" strokeWidth="4" strokeLinecap="round" />
            <path d="M 140 490 C 220 450, 250 390, 310 370 S 430 320, 490 240" stroke="#cde4fc" strokeWidth="3" strokeLinecap="round" />
            <circle cx="350" cy="390" r="135" stroke="#cde4fc" strokeWidth="3" fill="none" />
            <circle cx="420" cy="220" r="75" stroke="#cde4fc" strokeWidth="3" fill="none" />
          </svg>
        </div>

        {/* Mobile Header (visible only on small screens < lg) */}
        <div className="lg:hidden flex flex-col items-center mb-6 z-10 text-center">
          <img src={logoIcon} alt="Steven Hydrotech Exponent" className="w-20 h-20 object-contain rounded-2xl mb-2 shadow-lg" />
          <h1 className="font-sans text-lg font-bold tracking-wider text-[#0c2e56]">STEVEN HYDROTECH</h1>
          <p className="font-sans text-[10px] font-semibold tracking-[0.3em] text-[#0c2e56] uppercase">EXPONENT</p>
          <p className="font-sans text-[9px] font-medium text-[#2563eb] uppercase mt-0.5">Water Treatment and Supply Services</p>
        </div>

        {/* Content Outlet */}
        <div className="relative z-10 w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
