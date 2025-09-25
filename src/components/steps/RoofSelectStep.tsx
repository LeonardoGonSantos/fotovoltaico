import { useMemo, useRef, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { MapCanvas } from '../maps/MapCanvas'
import { StaticThumbnails } from '../maps/StaticThumbnails'
import { buildRoofSelection } from '../../hooks/useRoofGeometry'
import type { LatLngPoint } from '../../types/domain'
import { formatNumber } from '../../utils/formatting'
import { SolarSegmentPicker } from '../segments/SolarSegmentPicker'

export function RoofSelectStep() {
  const {
    state: { roof, place, solarInsights, solarSelection, solarStatus, dataSource },
    setRoof,
    setSolarSelection,
    setAngles,
    nextStep,
    previousStep,
    clearResults,
  } = useAppState()
  const [path, setPath] = useState<LatLngPoint[]>(roof?.polygon ?? [])
  const mapHelpersRef = useRef<{
    setCenter: (position: LatLngPoint, zoom?: number) => void
    activatePolygonDrawing: () => void
  } | null>(null)

  const roofData = useMemo(() => buildRoofSelection(path), [path])

  const applyRoofSelection = (points: LatLngPoint[]) => {
    setPath(points)
    clearResults()
    if (points.length >= 3) {
      const selection = buildRoofSelection(points)
      setRoof(selection)
    } else {
      setRoof(null)
    }
  }

  const handleNext = () => {
    if (dataSource === 'MANUAL') {
      if (!roofData.hasPolygon) return
      nextStep()
      return
    }
    if (solarSelection.segmentId) {
      nextStep()
    }
  }

  const handleSegmentSelect = (segmentId: string) => {
    clearResults()
    setSolarSelection({ segmentId, source: 'SOLAR_API' })
    const segment = solarInsights?.segments.find((seg) => seg.segmentId === segmentId)
    if (segment) {
      setAngles({ betaDeg: segment.pitchDegrees, gammaDeg: segment.azimuthDegrees })
    }
  }

  const handlePolygonComplete = (points: LatLngPoint[]) => {
    applyRoofSelection(points)
  }

  const handlePathChanged = (points: LatLngPoint[]) => {
    applyRoofSelection(points)
  }

  const renderSolarContent = () => {
    const segments = solarInsights?.segments ?? []
    if (solarStatus === 'loading') {
      return <p className="input-helper">Buscando dados do telhado na Solar API…</p>
    }
    if (!segments.length) {
      return (
        <div className="summary-card">
          <p className="input-helper">Não encontramos segmentos disponíveis. Estamos migrando para o modo manual.</p>
        </div>
      )
    }
    return (
      <div className="form-grid">
        <SolarSegmentPicker
          segments={segments}
          selectedId={solarSelection.segmentId ?? null}
          onSelect={handleSegmentSelect}
        />
      </div>
    )
  }

  const renderManualContent = () => (
    <div className="form-grid">
      <MapCanvas
        center={roof?.centroid ?? place?.location ?? { lat: -14.235, lng: -51.9253 }}
        zoom={20}
        mode="polygon"
        polygonOptions={{
          path,
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

      <div className="summary-card" style={{ display: 'grid', gap: '0.5rem' }}>
        <div>
          <strong>{formatNumber(roofData.areaM2, 1)} m²</strong>
          <span>Área total do polígono</span>
        </div>
        <div>
          <strong>{formatNumber(roofData.usableAreaM2, 1)} m²</strong>
          <span>Área útil (fator 70%)</span>
        </div>
        <p className="input-helper">
          Ajuste os vértices para abranger apenas a área disponível para módulos fotovoltaicos.
        </p>
      </div>

      <div>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Explorar ao redor</h3>
        <p className="input-helper" style={{ marginBottom: '0.75rem' }}>
          Selecione uma miniatura para recentralizar o mapa em telhados próximos.
        </p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => mapHelpersRef.current?.activatePolygonDrawing()}
          style={{ marginBottom: '0.75rem' }}
        >
          Ativar desenho de polígono
        </button>
        {place?.location ? (
          <StaticThumbnails
            center={place.location}
            onSelect={(point) => mapHelpersRef.current?.setCenter(point)}
            distanceMeters={60}
          />
        ) : (
          <p className="input-helper">Defina o endereço para habilitar miniaturas ao redor.</p>
        )}
      </div>
    </div>
  )

  const isManual = dataSource === 'MANUAL'

  return (
    <section className="section-card" aria-labelledby="roof-step-title">
      <header>
        <h2 id="roof-step-title" className="section-title">
          2. {isManual ? 'Desenhe o telhado' : 'Selecione o segmento do telhado'}
        </h2>
        <p className="section-subtitle">
          {isManual
            ? 'Utilize a ferramenta de polígono para contornar o telhado. Edite os vértices conforme necessário.'
            : 'Escolha o segmento identificado automaticamente pela Solar API.'}
        </p>
      </header>

      {!isManual && solarStatus === 'error' && (
        <div className="alert error-alert" role="alert" style={{ marginBottom: '1rem' }}>
          Não foi possível obter dados da Solar API. O assistente retornou ao modo manual automaticamente.
        </div>
      )}

      {isManual ? renderManualContent() : renderSolarContent()}

      <div className="action-bar">
        <button type="button" className="secondary-button" onClick={previousStep}>
          Voltar
        </button>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isManual && !roofData.hasPolygon && <span className="input-helper">Desenhe o polígono para continuar.</span>}
          <button
            type="button"
            className="primary-button"
            onClick={handleNext}
            disabled={isManual ? !roofData.hasPolygon : !solarSelection.segmentId}
          >
            Prosseguir
          </button>
        </div>
      </div>
    </section>
  )
}
