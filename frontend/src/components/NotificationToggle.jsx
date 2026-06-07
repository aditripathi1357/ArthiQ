import { useState } from 'react'

/**
 * NotificationToggle — animated switch with label and description.
 * Props:
 *   id        (string)   – unique HTML id
 *   label     (string)   – main label text
 *   description (string) – optional subtitle
 *   checked   (bool)     – current state
 *   onChange  (fn)       – called with new bool value
 *   disabled  (bool)     – optional
 */
export default function NotificationToggle({ id, label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="text-sm font-semibold cursor-pointer select-none"
          style={{ color: 'var(--text-primary)' }}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>

      {/* Toggle switch */}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={[
          'relative shrink-0 w-11 h-6 rounded-full transition-all duration-300',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          checked ? 'bg-saffron shadow-[0_0_12px_rgba(255,153,51,0.4)]' : '',
        ].join(' ')}
        style={{
          backgroundColor: checked ? undefined : 'var(--border)',
        }}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md',
            'transition-transform duration-300',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
