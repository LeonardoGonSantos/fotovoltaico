import type { PointerEvent } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'

interface GoniometerOverlayProps {
  azimuthDeg: number
  onAzimuthChange: (value: number) => void
}

const SIZE = 220

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360
}

export function GoniometerOverlay({ azimuthDeg, onAzimuthChange }: GoniometerOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setDragging] = useState(false)

  const handlePointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = event.clientX - centerX
      const dy = centerY - event.clientY
      const angleRad = Math.atan2(dx, dy)
      const angleDeg = normalizeAngle((angleRad * 180) / Math.PI)
      onAzimuthChange(angleDeg)
    },
    [onAzimuthChange]
  )

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      (event.target as HTMLElement).setPointerCapture(event.pointerId)
      setDragging(true)
      handlePointer(event)
    },
    [handlePointer]
  )

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      handlePointer(event)
    },
    [handlePointer, isDragging]
  )

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    (event.target as HTMLElement).releasePointerCapture(event.pointerId)
    setDragging(false)
  }, [])

  const pointerStyle = useMemo(() => {
    const angle = normalizeAngle(azimuthDeg)
    return {
      transform: `rotate(${angle}deg)`
    }
  }, [azimuthDeg])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: SIZE,
        height: SIZE,
        margin: '0 auto',
        touchAction: 'none',
        userSelect: 'none',
      }}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(normalizeAngle(azimuthDeg))}
      aria-label="Ajustar azimute"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault()
          onAzimuthChange(normalizeAngle(azimuthDeg - 5))
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault()
          onAzimuthChange(normalizeAngle(azimuthDeg + 5))
        }
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <linearGradient id="goniometerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 8} fill="url(#goniometerGradient)" stroke="#0f172a" strokeOpacity="0.12" strokeWidth="2" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 36} fill="white" stroke="#cbd5f5" strokeWidth="1" />
        <text x={SIZE / 2} y={26} textAnchor="middle" fontSize="12" fill="#0f172a">N</text>
        <text x={SIZE - 24} y={SIZE / 2 + 4} textAnchor="middle" fontSize="12" fill="#0f172a">L</text>
        <text x={SIZE / 2} y={SIZE - 12} textAnchor="middle" fontSize="12" fill="#0f172a">S</text>
        <text x={24} y={SIZE / 2 + 4} textAnchor="middle" fontSize="12" fill="#0f172a">O</text>
      </svg>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 4,
          height: SIZE / 2 - 16,
          background: 'linear-gradient(180deg, #38bdf8, #2563eb)',
          transformOrigin: 'center bottom',
          borderRadius: 999,
          pointerEvents: 'none',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          ...pointerStyle,
        }}
      />
    </div>
  )
}
