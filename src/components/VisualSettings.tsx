import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { effectsQuality } from '../scene/effects'
import type { EffectsQuality } from '../scene/effects'
import './visual-settings.css'
const key = 'strata-visual-effects-v1',
  event = 'strata-visual-effects-change'
let memoryQuality: EffectsQuality | null = null
function snapshot(): EffectsQuality {
  if (memoryQuality) return memoryQuality
  try {
    return effectsQuality(localStorage.getItem(key))
  } catch {
    return memoryQuality || 'balanced'
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener(event, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(event, onChange)
    window.removeEventListener('storage', onChange)
  }
}
export const useEffectsQuality = () =>
  useSyncExternalStore(subscribe, snapshot, () => 'balanced' as EffectsQuality)
export function VisualSettings() {
  const value = useEffectsQuality(),
    menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node))
        menu.current?.removeAttribute('open')
    }
    window.addEventListener('pointerdown', outside)
    return () => window.removeEventListener('pointerdown', outside)
  }, [])
  return (
    <details
      className="visual-settings"
      ref={menu}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          menu.current?.removeAttribute('open')
          menu.current?.querySelector('summary')?.focus()
        }
      }}
    >
      <summary aria-label="Visual effects settings" title="Visual effects">
        <Sparkles size={17} />
      </summary>
      <div role="group" aria-label="Visual effects quality">
        <span>SIGNAL & EVENT EFFECTS</span>
        {(['calm', 'balanced', 'cinematic'] as const).map((q) => (
          <button
            key={q}
            aria-pressed={value === q}
            onClick={(e) => {
              memoryQuality = q
              try {
                localStorage.setItem(key, q)
                memoryQuality = null
              } catch {
                /* The current scene remains usable without storage. */
              }
              window.dispatchEvent(new Event(event))
              e.currentTarget.closest('details')?.removeAttribute('open')
            }}
          >
            {q === 'calm'
              ? 'Calm'
              : q === 'balanced'
                ? 'Balanced'
                : 'Cinematic'}
            {value === q && <Check size={13} />}
            <small>
              {q === 'calm'
                ? 'Clean paths and essential state'
                : q === 'balanced'
                  ? 'Soft wakes and event pulses'
                  : 'Brighter signals and richer wakes'}
            </small>
          </button>
        ))}
        <p>
          Reduced motion is respected. Gameplay and data calculations stay the
          same.
        </p>
      </div>
    </details>
  )
}
