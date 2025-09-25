import type { ChangeEvent } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { MapCanvas } from '../maps/MapCanvas'
import { GoniometerOverlay } from '../maps/GoniometerOverlay'
import { clamp, formatNumber } from '../../utils/formatting'

function buildSegmentStaticMap(segmentCenter?: { lat: number; lng: number }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey || !segmentCenter) return null
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
  url.searchParams.set('center', `${segmentCenter.lat.toFixed(6)},${segmentCenter.lng.toFixed(6)}`)
  url.searchParams.set('zoom', '20')
  url.searchParams.set('size', '640x360')
  url.searchParams.set('scale', '2')
  url.searchParams.set('maptype', 'satellite')
  url.searchParams.set('key', apiKey)
  url.searchParams.append('markers', `color:0x2563EB|label:T|${segmentCenter.lat.toFixed(6)},${segmentCenter.lng.toFixed(6)}`)
  url.searchParams.append('path', `color:0xFFFFFFFF|weight:2|${segmentCenter.lat.toFixed(6)},${segmentCenter.lng.toFixed(6)}`)
  return url.toString()
}

function cardinalDirectionFromAzimuth(azimuth: number) {
  const directions = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']
  const index = Math.round(((azimuth % 360) / 45)) % directions.length
  return directions[index]
}

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
  const segmentStaticMap = !isManual ? buildSegmentStaticMap(selectedSegment?.center) : null
  const azimuthCardinal = selectedSegment ? cardinalDirectionFromAzimuth(selectedSegment.azimuthDegrees) : null

  return (
    <section className="section-card" aria-labelledby="angles-step-title">
      <header>
        <h2 id="angles-step-title" className="section-title">
          3. {isManual ? 'Ajuste inclinação (β) e azimute (γ)' : 'Ângulos identificados pela Solar API'}
        </h2>
        <p className="section-subtitle">
          {isManual
            ? 'Utilize os controles abaixo para aproximar a inclinação do telhado e a orientação.'
            : 'Os valores abaixo foram estimados automaticamente a partir da Solar API e representam o segmento de telhado selecionado.'}
        </p>
      </header>

      <div className="form-grid">
        {isManual ? (
          <MapCanvas
            center={roof?.centroid ?? { lat: -14.235, lng: -51.9253 }}
            zoom={20}
            polygonOptions={roof?.polygon ? { path: roof.polygon, editable: false, draggable: false } : undefined}
          />
        ) : segmentStaticMap ? (
          <img
            src={segmentStaticMap}
            alt="Miniatura do telhado selecionado"
            style={{ width: '100%', borderRadius: 16, border: '1px solid rgba(148,163,184,0.35)' }}
          />
        ) : (
          <div className="summary-card" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="input-helper">Mapa estático indisponível. Verifique a chave do Google Maps.</p>
          </div>
        )}

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
          <div className="summary-card" style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem' }}>
            {selectedSegment ? (
              <>
                <span>
                  Segmento escolhido: <strong>{selectedSegment.segmentId}</strong>
                </span>
                <span>
                  Inclinação β estimada em <strong>{formatNumber(selectedSegment.pitchDegrees, 1)}°</strong>, representando o ângulo da água do telhado captado pela Solar API.
                </span>
                <span>
                  Azimute γ de <strong>{formatNumber(selectedSegment.azimuthDegrees, 0)}°</strong> ({azimuthCardinal ?? 'orientação'} aprox.), indicando para onde o telhado está voltado em relação ao Norte.
                </span>
                <span>
                  Área útil considerada: <strong>{formatNumber(selectedSegment.maxArrayAreaMeters2 ?? selectedSegment.groundAreaMeters2 ?? 0, 1)} m²</strong>, equivalente à faixa de cobertura onde a Solar API sugere a instalação dos módulos.
                </span>
                <p className="input-helper" style={{ margin: 0 }}>
                  Caso prefira revisar manualmente, volte à etapa anterior e selecione outro segmento disponível quando houver.
                </p>
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
