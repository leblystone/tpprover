import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Theme-tinted confetti burst at a screen position.
 * Uses CSS keyframes (no canvas). Colors derived from theme.primary + accents.
 */

function buildConfigs(theme) {
  const primary = theme?.primary || '#7F9E95'
  const accent = theme?.accent || theme?.primaryLight || primary
  const colors = [
    primary,
    accent,
    theme?.success || primary,
    theme?.info || primary,
    theme?.warning || accent,
    theme?.primaryDark || primary,
    accent,
    primary,
  ]
  return Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 2 * Math.PI + (i % 2) * 0.12
    const dist = 36 + (i % 4) * 12
    return {
      cx: Math.round(Math.cos(angle) * dist),
      cy: Math.round(Math.sin(angle) * dist - 8),
      color: colors[i % colors.length],
      rot: Math.round(angle * (180 / Math.PI) * 2),
      delay: i * 0.025,
      duration: 0.55 + (i % 3) * 0.08,
      size: 5 + (i % 3),
    }
  })
}

let burstId = 0

/**
 * Imperative helper — spawn a burst at (x, y) client coords.
 * Mounts via a lightweight event so Goals.jsx can fire without local state.
 */
export function fireGoalConfetti(x, y, theme) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('tpp:goal-confetti', {
      detail: { x, y, theme, id: `gc-${++burstId}-${Date.now()}` },
    })
  )
}

/**
 * Mount once (e.g. on Goals page). Listens for `tpp:goal-confetti`.
 */
export default function GoalConfettiHost() {
  const [bursts, setBursts] = useState([])

  useEffect(() => {
    const onBurst = (e) => {
      const item = e.detail
      if (!item?.id) return
      setBursts((prev) => [...prev, item])
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== item.id))
      }, 1100)
    }
    window.addEventListener('tpp:goal-confetti', onBurst)
    return () => window.removeEventListener('tpp:goal-confetti', onBurst)
  }, [])

  if (!bursts.length) return null

  return createPortal(
    <>
      {bursts.map(({ id, x, y, theme }) => {
        const configs = buildConfigs(theme)
        return configs.map((cfg, i) => (
          <span
            key={`${id}-${i}`}
            className="tpp-goal-confetti-dot"
            style={{
              left: x,
              top: y,
              width: cfg.size,
              height: cfg.size,
              backgroundColor: cfg.color,
              '--cx': `${cfg.cx}px`,
              '--cy': `${cfg.cy}px`,
              '--crot': `${cfg.rot}deg`,
              '--cd': `${cfg.duration}s`,
              animationDelay: `${cfg.delay}s`,
            }}
          />
        ))
      })}
      <style>{`
        @keyframes tppGoalConfettiFly {
          0%   { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          80%  { opacity: 0.75; }
          100% { transform: translate(calc(-50% + var(--cx, 0px)), calc(-50% + var(--cy, 0px))) scale(0.35) rotate(var(--crot, 180deg)); opacity: 0; }
        }
        .tpp-goal-confetti-dot {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 99999;
          animation: tppGoalConfettiFly var(--cd, 0.65s) ease-out forwards;
        }
      `}</style>
    </>,
    document.body
  )
}
