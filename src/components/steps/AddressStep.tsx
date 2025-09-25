import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { useGoogleMapsApi } from '../../hooks/useMap'
import { useSolarData } from '../../hooks/useSolarData'
import { useLayout } from '../../context/LayoutContext'
import type { LatLngPoint, PlaceSelection } from '../../types/domain'
import { MapModal } from '../modals/MapModal'
import { ManualRoofModal } from '../modals/ManualRoofModal'
import { SolarSegmentPicker } from '../segments/SolarSegmentPicker'

const DEFAULT_CENTER: LatLngPoint = { lat: -23.55052, lng: -46.633308 }

export function AddressStep() {
  const {
    state: { place, solarStatus, solarInsights, solarSelection, dataSource, roof },
    setPlace,
    setRoof,
    setSolarSelection,
    setAngles,
    setDataSource,
    clearResults,
    nextStep,
    setNasaError,
  } = useAppState()
  const { loadSolarInsights, forceManual } = useSolarData()
  const { setLayout, resetLayout } = useLayout()

  const [inputValue, setInputValue] = useState(place?.formattedAddress ?? '')
  const [isMapModalOpen, setMapModalOpen] = useState(false)
  const [isManualModalOpen, setManualModalOpen] = useState(false)
  const [modalPosition, setModalPosition] = useState<LatLngPoint>(place?.location ?? DEFAULT_CENTER)
  const [selectionError, setSelectionError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const { status } = useGoogleMapsApi()

  useEffect(() => {
    if (status !== 'ready' || !inputRef.current || autocompleteRef.current) {
      return
    }

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'place_id'],
      componentRestrictions: { country: ['br'] },
    })

    autocompleteRef.current.addListener('place_changed', () => {
      const result = autocompleteRef.current?.getPlace()
      if (!result?.geometry?.location) {
        setNasaError('Não foi possível obter a localização do endereço selecionado.')
        return
      }
      setNasaError(null)
      const location = result.geometry.location
      const selectedPlace: PlaceSelection = {
        formattedAddress: result.formatted_address ?? 'Endereço selecionado',
        placeId: result.place_id ?? undefined,
        location: { lat: location.lat(), lng: location.lng() },
      }
      setPlace(selectedPlace)
      setRoof(null)
      setSolarSelection({ segmentId: null })
      clearResults()
      void loadSolarInsights(selectedPlace.location)
    })
  }, [status, setNasaError, setPlace, setRoof, setSolarSelection, clearResults, loadSolarInsights])

  useEffect(() => {
    if (place?.formattedAddress && place.formattedAddress !== inputValue) {
      setInputValue(place.formattedAddress)
    }
  }, [place, inputValue])

  const segments = solarInsights?.segments ?? []
  const hasManualPolygon = Boolean(roof?.polygon && roof.polygon.length >= 3)
  const hasSegmentSelection = Boolean(solarSelection.segmentId)
  const canContinue = Boolean(
    place &&
      ((dataSource === 'SOLAR_API' && (segments.length === 0 || hasSegmentSelection)) ||
        (dataSource === 'MANUAL' && hasManualPolygon))
  )

  const handleContinue = useCallback(() => {
    if (!place) {
      setSelectionError('Selecione um endereço válido para continuar.')
      setNasaError('Selecione um endereço válido para continuar.')
      return
    }
    if (dataSource === 'SOLAR_API' && segments.length > 0 && !hasSegmentSelection) {
      setSelectionError('Escolha um dos segmentos sugeridos pela Solar API.')
      setNasaError('Escolha um segmento para prosseguir.')
      return
    }
    if (dataSource === 'MANUAL' && !hasManualPolygon) {
      setSelectionError('Desenhe o polígono do telhado no modo manual.')
      setNasaError('Desenhe um polígono válido para continuar.')
      return
    }
    setSelectionError(null)
    setNasaError(null)
    nextStep()
  }, [dataSource, hasManualPolygon, hasSegmentSelection, nextStep, place, segments.length, setNasaError])

  useEffect(() => {
    setLayout({
      title: 'Endereço',
      subtitle: 'Informe o endereço onde os painéis serão instalados.',
      actions: [
        {
          label: solarStatus === 'loading' ? 'Carregando…' : 'Continuar',
          onClick: handleContinue,
          disabled: !canContinue || solarStatus === 'loading',
          variant: 'primary',
        },
      ],
    })
    return () => resetLayout()
  }, [canContinue, handleContinue, resetLayout, setLayout, solarStatus])

  const openMapModal = () => {
    if (!place) return
    setModalPosition(place.location)
    setMapModalOpen(true)
  }

  const handleModalUpdate = (position: LatLngPoint) => {
    setModalPosition(position)
  }

  const handleModalConfirm = () => {
    if (!place) {
      setMapModalOpen(false)
      return
    }
    const updatedPlace: PlaceSelection = {
      formattedAddress: place.formattedAddress ?? 'Local ajustado',
      placeId: place.placeId,
      location: modalPosition,
    }
    setPlace(updatedPlace)
    setRoof(null)
    setSolarSelection({ segmentId: null })
    clearResults()
    void loadSolarInsights(modalPosition)
    setMapModalOpen(false)
  }

  const handleSegmentSelect = (segmentId: string) => {
    setSelectionError(null)
    clearResults()
    setSolarSelection({ segmentId, source: 'SOLAR_API', manualOverride: false })
    const segment = segments.find((item) => item.segmentId === segmentId)
    if (segment) {
      setAngles({ betaDeg: segment.pitchDegrees, gammaDeg: segment.azimuthDegrees })
    }
    setDataSource('SOLAR_API')
  }

  const openManualModal = () => {
    setSelectionError(null)
    forceManual()
    setManualModalOpen(true)
  }

  return (
    <section className="card" aria-labelledby="address-step-title">
      <h2 id="address-step-title">Informe o endereço</h2>
      <p className="input-helper">Digite e selecione o endereço do imóvel.</p>

      <div className="form-grid">
        <div className="input-group">
          <label htmlFor="address-input">Endereço</label>
          <input
            id="address-input"
            ref={inputRef}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Rua, número, bairro, cidade"
          />
          <div className="input-helper">
            {place ? `Endereço selecionado: ${place.formattedAddress}` : 'Selecione uma opção sugerida para prosseguir.'}
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={openMapModal}
          disabled={!place}
        >
          Ajustar localização no mapa
        </button>

        {solarStatus === 'loading' ? (
          <span className="input-helper">Buscando dados do telhado…</span>
        ) : null}
      </div>

      {segments.length > 0 && dataSource === 'SOLAR_API' ? (
        <div className="segment-picker-wrapper">
          <h3>Segmentos identificados automaticamente</h3>
          <p className="input-helper">
            Escolha a cobertura que melhor representa o telhado desejado. Os dados de inclinação, orientação e área serão usados automaticamente.
          </p>
          <SolarSegmentPicker
            segments={segments}
            selectedId={solarSelection.segmentId ?? null}
            onSelect={handleSegmentSelect}
          />
        </div>
      ) : null}

      <div className="manual-mode-callout">
        <p className="input-helper">
          Não encontrou o telhado correto ou prefere desenhar manualmente?
        </p>
        <button type="button" className="link-button" onClick={openManualModal}>
          Abrir modo manual de desenho
        </button>
      </div>

      {dataSource === 'MANUAL' && !hasManualPolygon ? (
        <div className="alert" role="note">
          A Solar API não retornou dados para este endereço. Use o modo manual para desenhar o telhado e ajustar os ângulos.
        </div>
      ) : null}

      {selectionError ? <div className="alert error-alert">{selectionError}</div> : null}

      <MapModal
        open={isMapModalOpen}
        place={place}
        onClose={() => setMapModalOpen(false)}
        onUpdateLocation={handleModalUpdate}
        onConfirm={handleModalConfirm}
      />

      <ManualRoofModal open={isManualModalOpen} onClose={() => setManualModalOpen(false)} />
    </section>
  )
}
