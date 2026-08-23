import { useEffect, useRef } from 'react'

type BarcodeScannerOptions = {
  onScan: (barcode: string) => void
  enabled?: boolean
  minChars?: number
  maxIntervalMs?: number
}

/**
 * Play a crisp, gentle POS scanner beep using Web Audio API (zero external assets needed).
 */
export function playScanBeep(type: 'success' | 'error' = 'success') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'success') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1760, ctx.currentTime) // High A note (crisp POS chime)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.09)
    } else {
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(320, ctx.currentTime) // Low buzzer for error
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.18)
    }
  } catch {
    // AudioContext blocked or not allowed until user interaction
  }
}

/**
 * Global background scanner listener that captures rapid hardware barcode gun keystrokes
 * even when the search input is not currently focused.
 */
export function useBarcodeScanner({
  onScan,
  enabled = true,
  minChars = 3,
  maxIntervalMs = 65,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      // Ignore functional modifier keys
      if (event.ctrlKey || event.altKey || event.metaKey) return

      const target = event.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      // If user is focused on the search input itself, let the native search input handle it
      if (isInput && target.id === 'pos-search') {
        return
      }

      const currentTime = performance.now()
      const interval = currentTime - lastKeyTimeRef.current

      // Enter key marks end of barcode sequence from scanner
      if (event.key === 'Enter') {
        if (bufferRef.current.length >= minChars && interval <= maxIntervalMs * 3) {
          event.preventDefault()
          const scannedCode = bufferRef.current.trim()
          bufferRef.current = ''
          lastKeyTimeRef.current = 0
          if (scannedCode) {
            onScan(scannedCode)
          }
        } else {
          bufferRef.current = ''
        }
        return
      }

      // Check single printable character
      if (event.key.length === 1) {
        // If elapsed time since last key is too large, reset buffer (it was human typing)
        if (bufferRef.current.length > 0 && interval > maxIntervalMs) {
          bufferRef.current = ''
        }

        bufferRef.current += event.key
        lastKeyTimeRef.current = currentTime
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [enabled, minChars, maxIntervalMs, onScan])
}
