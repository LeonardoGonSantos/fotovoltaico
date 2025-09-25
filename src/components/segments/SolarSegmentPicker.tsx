import type { SolarSegment } from '../../types/domain'
import { formatNumber } from '../../utils/formatting'

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
        return (
          <label
            key={segment.segmentId}
            htmlFor={`segment-${segment.segmentId}`}
            className="summary-card"
            style={{
              borderColor: isSelected ? '#2563eb' : undefined,
              boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.25)' : undefined,
              cursor: 'pointer',
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
            <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.9rem' }}>
              <span>Inclinação β: {formatNumber(segment.pitchDegrees, 1)}°</span>
              <span>Azimute γ: {formatNumber(segment.azimuthDegrees, 0)}°</span>
              <span>Energia: {formatEnergy(segment)}</span>
            </div>
          </label>
        )
      })}
    </div>
  )
}
