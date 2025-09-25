import type { SolarSegment } from '../../types/domain'
import { formatNumber } from '../../utils/formatting'

function buildStaticMapUrl(segment: SolarSegment) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey || !segment.center) return null
  const { lat, lng } = segment.center
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
  url.searchParams.set('center', `${lat.toFixed(6)},${lng.toFixed(6)}`)
  url.searchParams.set('zoom', '20')
  url.searchParams.set('size', '200x200')
  url.searchParams.set('scale', '2')
  url.searchParams.set('maptype', 'satellite')
  url.searchParams.set('key', apiKey)
  url.searchParams.append('markers', `color:0x2563EB|${lat.toFixed(6)},${lng.toFixed(6)}`)
  return url.toString()
}

interface SolarSegmentPickerProps {
  segments: SolarSegment[]
  selectedId: string | null
  onSelect: (segmentId: string) => void
}

function formatArea(segment: SolarSegment) {
  const area = segment.maxArrayAreaMeters2 ?? segment.groundAreaMeters2
  if (!area) return '—'
  return `${formatNumber(area, 1)} m²`
}

function formatEnergy(segment: SolarSegment) {
  if (segment.annualEnergyKwh) {
    return `${formatNumber(segment.annualEnergyKwh, 0)} kWh/ano`
  }
  if (segment.monthlyEnergyKwh) {
    const annual = segment.monthlyEnergyKwh.reduce((sum, value) => sum + value, 0)
    return `${formatNumber(annual, 0)} kWh/ano`
  }
  return 'Estimativa via cálculo manual'
}

export function SolarSegmentPicker({ segments, selectedId, onSelect }: SolarSegmentPickerProps) {
  if (!segments.length) {
    return <p className="input-helper">Nenhum segmento disponível para este telhado.</p>
  }

  return (
    <div className="form-grid" style={{ gap: '1rem' }}>
      {segments.map((segment) => {
        const isSelected = segment.segmentId === selectedId
        const thumbnail = buildStaticMapUrl(segment)
        return (
          <label
            key={segment.segmentId}
            htmlFor={`segment-${segment.segmentId}`}
            className="summary-card"
            style={{
              borderColor: isSelected ? '#2563eb' : undefined,
              boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.25)' : undefined,
              cursor: 'pointer',
              display: 'grid',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div>
                <strong style={{ fontSize: '1.05rem' }}>Segmento {segment.segmentId}</strong>
                <div className="input-helper">{formatArea(segment)}</div>
              </div>
              <input
                type="radio"
                id={`segment-${segment.segmentId}`}
                name="segment"
                checked={isSelected}
                onChange={() => onSelect(segment.segmentId)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt={`Miniatura do segmento ${segment.segmentId}`}
                  style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(148,163,184,0.3)' }}
                />
              )}
              <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.9rem' }}>
                <span>Inclinação β: {formatNumber(segment.pitchDegrees, 1)}°</span>
                <span>Azimute γ: {formatNumber(segment.azimuthDegrees, 0)}°</span>
                <span>Energia: {formatEnergy(segment)}</span>
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )
}
