import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { MapCanvas } from '../maps/MapCanvas'
import { StaticThumbnails } from '../maps/StaticThumbnails'
import { buildRoofSelection } from '../../hooks/useRoofGeometry'
import type { LatLngPoint } from '../../types/domain'
import { formatNumber } from '../../utils/formatting'
import { SolarSegmentPicker } from '../segments/SolarSegmentPicker'
import { useLayout } from '../../context/LayoutContext'

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
  const { setLayout, resetLayout } = useLayout()
  const [path, setPath] = useState<LatLngPoint[]>(roof?.polygon ?? [])
  const mapHelpersRef = useRef<{
    setCenter: (position: LatLngPoint, zoom?: number) => void
    activatePolygonDrawing: () => void
  } | null>(null)

  const roofData = useMemo(() => buildRoofSelection(path), [path])
  const isManual = dataSource === 'MANUAL'
  const canContinue = isManual ? roofData.hasPolygon : Boolean(solarSelection.segmentId)

  const handleNext = useCallback(() => {
    if (!canContinue) return
    nextStep()
  }, [canContinue, nextStep])

  useEffect(() => {
    setLayout({
      title: 'Seleção do telhado',
      subtitle: isManual
        ? 'Desenhe manualmente a área disponível para os módulos.'
        : 'Escolha o segmento identificado automaticamente pela Solar API.',
      actions: [
        { label: 'Voltar', onClick: previousStep, variant: 'secondary' },
        { label: 'Prosseguir', onClick: handleNext, disabled: !canContinue, variant: 'primary' },
      ],
    })
    return () => resetLayout()
  }, [canContinue, handleNext, isManual, previousStep, resetLayout, setLayout])

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
        <div className="alert" role="note">
          Não encontramos segmentos disponíveis para este endereço. Utilize o modo manual.
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
          <span>Área útil considerada (fator 70%)</span>
        </div>
        <p className="input-helper">
          Ajuste os vértices para abranger apenas a área disponível para módulos fotovoltaicos.
        </p>
      </div>

      <div>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Explorar ao redor</h3>
        <p className="input-helper" style={{ marginBottom: '0.75rem' }}>
          Toque em uma miniatura para reposicionar o mapa em telhados vizinhos.
        </p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => mapHelpersRef.current?.activatePolygonDrawing()}
          style={{ marginBottom: '0.75rem' }}
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
          <p className="input-helper">Defina o endereço para habilitar miniaturas ao redor.</p>
        )}
      </div>
    </div>
  )

  return (
    <section className="card" aria-labelledby="roof-step-title">
      <h2 id="roof-step-title">Selecione o telhado</h2>
      <p className="input-helper">
        {isManual
          ? 'Desenhe manualmente a área do telhado no mapa. O polígono precisa estar fechado para continuar.'
          : 'Escolha o segmento que melhor representa a área utilizável do seu telhado.'}
      </p>

      {isManual ? renderManualContent() : renderSolarContent()}

      {isManual && !roofData.hasPolygon ? (
        <span className="input-helper">Desenhe um polígono válido para liberar a continuação.</span>
      ) : null}
    </section>
  )
}
