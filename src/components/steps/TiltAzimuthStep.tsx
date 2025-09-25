import type { ChangeEvent } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { MapCanvas } from '../maps/MapCanvas'
import { GoniometerOverlay } from '../maps/GoniometerOverlay'
import { clamp, formatNumber } from '../../utils/formatting'

export function TiltAzimuthStep() {
  const {
    state: { roof, angles, dataSource, solarInsights, solarSelection },
    config: { solar },
    setAngles,
    previousStep,
    nextStep,
    clearResults,
  } = useAppState()

  const handleTiltChange = (value: number) => {
    const clamped = clamp(value, solar.tiltRangeDeg.min, solar.tiltRangeDeg.max)
    setAngles({ betaDeg: clamped })
    clearResults()
  }

  const handleAzimuthChange = (value: number) => {
    setAngles({ gammaDeg: value })
    clearResults()
  }

  const onTiltSlider = (event: ChangeEvent<HTMLInputElement>) => {
    handleTiltChange(Number(event.target.value))
  }

  const onTiltInput = (event: ChangeEvent<HTMLInputElement>) => {
    handleTiltChange(Number(event.target.value))
  }

  const isManual = dataSource === 'MANUAL'
  const selectedSegment = solarInsights?.segments.find((segment) => segment.segmentId === solarSelection.segmentId)

  return (
    <section className="section-card" aria-labelledby="angles-step-title">
      <header>
        <h2 id="angles-step-title" className="section-title">
          3. {isManual ? 'Ajuste inclinação (β) e azimute (γ)' : 'Ângulos identificados pela Solar API'}
        </h2>
        <p className="section-subtitle">
          {isManual
            ? 'Utilize os controles abaixo para aproximar a inclinação do telhado e a orientação.'
            : 'Os valores abaixo foram estimados automaticamente a partir da Solar API. Se desejar ajustes manuais, volte à etapa anterior e escolha “Ajustar manualmente”.'}
        </p>
      </header>

      <div className="form-grid">
        <MapCanvas
          center={roof?.centroid ?? { lat: -14.235, lng: -51.9253 }}
          zoom={20}
          polygonOptions={isManual && roof?.polygon ? { path: roof.polygon, editable: false, draggable: false } : undefined}
        />

        {isManual ? (
          <div className="summary-card" style={{ display: 'grid', gap: '1.25rem' }}>
            <div className="input-group">
              <label htmlFor="tilt-slider">Inclinação β (graus)</label>
              <input
                type="range"
                id="tilt-slider"
                min={solar.tiltRangeDeg.min}
                max={solar.tiltRangeDeg.max}
                step={0.5}
                value={angles.betaDeg}
                onChange={onTiltSlider}
              />
              <input
                type="number"
                min={solar.tiltRangeDeg.min}
                max={solar.tiltRangeDeg.max}
                step={0.5}
                value={angles.betaDeg}
                onChange={onTiltInput}
                style={{ maxWidth: 120 }}
              />
              <span className="input-helper">Faixa permitida: {solar.tiltRangeDeg.min}° a {solar.tiltRangeDeg.max}°.</span>
            </div>

            <div>
              <label htmlFor="azimuth-slider" style={{ fontWeight: 600 }}>
                Azimute γ (graus a partir do Norte)
              </label>
              <input
                id="azimuth-slider"
                type="range"
                min={solar.azimuthRangeDeg.min}
                max={solar.azimuthRangeDeg.max}
                step={1}
                value={angles.gammaDeg}
                onChange={(event) => handleAzimuthChange(Number(event.target.value))}
              />
              <GoniometerOverlay azimuthDeg={angles.gammaDeg} onAzimuthChange={handleAzimuthChange} />
              <p className="input-helper" style={{ textAlign: 'center' }}>
                Arraste o marcador azul para alinhar com a orientação do telhado. 0° = Norte, 90° = Leste.
              </p>
            </div>
          </div>
        ) : (
          <div className="summary-card" style={{ display: 'grid', gap: '0.75rem' }}>
            {selectedSegment ? (
              <>
                <span>Segmento selecionado: {selectedSegment.segmentId}</span>
                <span>Inclinação β: {formatNumber(selectedSegment.pitchDegrees, 1)}°</span>
                <span>Azimute γ: {formatNumber(selectedSegment.azimuthDegrees, 0)}°</span>
                <span>
                  Área útil considerada: {formatNumber(selectedSegment.maxArrayAreaMeters2 ?? selectedSegment.groundAreaMeters2 ?? 0, 1)} m²
                </span>
              </>
            ) : (
              <p className="input-helper">Selecione um segmento na etapa anterior para visualizar os ângulos.</p>
            )}
          </div>
        )}
      </div>

      <div className="action-bar">
        <button type="button" className="secondary-button" onClick={previousStep}>
          Voltar
        </button>
        <button type="button" className="primary-button" onClick={nextStep}>
          Preencher conta de luz
        </button>
      </div>
    </section>
  )
}
