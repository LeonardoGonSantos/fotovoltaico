import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { buildRoofSelection } from '../../hooks/useRoofGeometry'
import type { LatLngPoint } from '../../types/domain'
import { clamp, formatNumber } from '../../utils/formatting'
import { MapCanvas } from '../maps/MapCanvas'
import { StaticThumbnails } from '../maps/StaticThumbnails'
import { GoniometerOverlay } from '../maps/GoniometerOverlay'

interface ManualRoofModalProps {
  open: boolean
  onClose: () => void
}

export function ManualRoofModal({ open, onClose }: ManualRoofModalProps) {
  const {
    state: { place, roof, angles },
    config: { solar },
    setRoof,
    setAngles,
    setDataSource,
    setSolarSelection,
    clearResults,
  } = useAppState()

  const [localPath, setLocalPath] = useState<LatLngPoint[]>(roof?.polygon ?? [])
  const [betaDeg, setBetaDeg] = useState(angles.betaDeg)
  const [gammaDeg, setGammaDeg] = useState(angles.gammaDeg)
  const [error, setError] = useState<string | null>(null)

  const mapHelpersRef = useRef<{
    setCenter: (position: LatLngPoint, zoom?: number) => void
    activatePolygonDrawing: () => void
  } | null>(null)

  useEffect(() => {
    if (!open) return
    setLocalPath(roof?.polygon ?? [])
    setBetaDeg(angles.betaDeg)
    setGammaDeg(angles.gammaDeg)
    setError(null)
  }, [angles.betaDeg, angles.gammaDeg, open, roof?.polygon])

  useEffect(() => {
    if (!open) return
    setDataSource('MANUAL')
    setSolarSelection({ source: 'MANUAL', segmentId: null, manualOverride: true })
  }, [open, setDataSource, setSolarSelection])

  const roofSelection = useMemo(() => buildRoofSelection(localPath), [localPath])

  const handlePolygonComplete = (points: LatLngPoint[]) => {
    setLocalPath(points)
    setError(null)
  }

  const handlePathChanged = (points: LatLngPoint[]) => {
    setLocalPath(points)
    setError(null)
  }

  const handleTiltChange = (value: number) => {
    const clampedValue = clamp(value, solar.tiltRangeDeg.min, solar.tiltRangeDeg.max)
    setBetaDeg(clampedValue)
  }

  const handleAzimuthChange = (value: number) => {
    setGammaDeg(value % 360)
  }

  const handleConfirm = () => {
    if (!roofSelection.hasPolygon) {
      setError('Desenhe um polígono válido para definir a área do telhado.')
      return
    }
    setRoof(roofSelection)
    setAngles({ betaDeg, gammaDeg })
    clearResults()
    onClose()
  }

  if (!open) return null

  const center = roofSelection.centroid ?? place?.location ?? { lat: -14.235, lng: -51.9253 }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container large-modal">
        <div className="modal-header">
          <h2>Defina manualmente o telhado</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="modal-body manual-roof-body">
          <div className="manual-roof-map">
            <MapCanvas
              center={center}
              zoom={20}
              mode="polygon"
              polygonOptions={{
                path: localPath,
                editable: true,
                draggable: true,
                onPathChanged: handlePathChanged,
              }}
              drawingOptions={{
                enabled: true,
                onPolygonComplete: handlePolygonComplete,
              }}
              onReady={(helpers) => {
                mapHelpersRef.current = helpers
              }}
            />
            <div className="manual-roof-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => mapHelpersRef.current?.activatePolygonDrawing()}
              >
                Redesenhar polígono
              </button>
              {place?.location ? (
                <StaticThumbnails
                  center={place.location}
                  onSelect={(point) => mapHelpersRef.current?.setCenter(point)}
                  distanceMeters={60}
                />
              ) : (
                <p className="input-helper">Selecione um endereço para explorar telhados próximos.</p>
              )}
            </div>
          </div>

          <aside className="manual-roof-sidebar">
            <section className="summary-card">
              <h3>Área estimada</h3>
              <p>
                Área total: <strong>{formatNumber(roofSelection.areaM2, 1)} m²</strong>
              </p>
              <p>
                Área útil (70%): <strong>{formatNumber(roofSelection.usableAreaM2, 1)} m²</strong>
              </p>
              <p className="input-helper">
                Ajuste os vértices para cobrir apenas a parte do telhado disponível para instalação.
              </p>
            </section>

            <section className="summary-card angle-card">
              <div className="input-group">
                <label htmlFor="manual-tilt-slider">Inclinação β (graus)</label>
                <input
                  id="manual-tilt-slider"
                  type="range"
                  min={solar.tiltRangeDeg.min}
                  max={solar.tiltRangeDeg.max}
                  step={0.5}
                  value={betaDeg}
                  onChange={(event) => handleTiltChange(Number(event.target.value))}
                />
                <input
                  type="number"
                  min={solar.tiltRangeDeg.min}
                  max={solar.tiltRangeDeg.max}
                  step={0.5}
                  value={betaDeg}
                  onChange={(event) => handleTiltChange(Number(event.target.value))}
                  style={{ maxWidth: 120 }}
                />
                <span className="input-helper">Faixa recomendada: {solar.tiltRangeDeg.min}° a {solar.tiltRangeDeg.max}°.</span>
              </div>

              <div className="input-group">
                <label htmlFor="manual-azimuth-slider">Azimute γ (graus a partir do Norte)</label>
                <input
                  id="manual-azimuth-slider"
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={gammaDeg}
                  onChange={(event) => handleAzimuthChange(Number(event.target.value))}
                />
                <GoniometerOverlay azimuthDeg={gammaDeg} onAzimuthChange={handleAzimuthChange} />
                <span className="input-helper">Arraste o marcador azul para alinhar com a orientação real.</span>
              </div>
            </section>

            {error ? <div className="alert error-alert">{error}</div> : null}
            <div className="alert" role="note">
              Este modo usa apenas dados manuais. Ajuste com calma para obter uma estimativa mais precisa.
            </div>
          </aside>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleConfirm}
            disabled={!roofSelection.hasPolygon}
          >
            Aplicar telhado manual
          </button>
        </div>
      </div>
    </div>
  )
}
