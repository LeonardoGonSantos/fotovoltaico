import { useEffect, useRef, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { MapCanvas } from '../maps/MapCanvas'
import { useGoogleMapsApi } from '../../hooks/useMap'
import type { LatLngPoint } from '../../types/domain'
import { useSolarData } from '../../hooks/useSolarData'

const DEFAULT_CENTER: LatLngPoint = { lat: -23.55052, lng: -46.633308 }

export function AddressStep() {
  const {
    state: { place, solarStatus },
    setPlace,
    setRoof,
    clearResults,
    nextStep,
    setNasaError,
  } = useAppState()
  const { loadSolarInsights } = useSolarData()

  const [inputValue, setInputValue] = useState(place?.formattedAddress ?? '')
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
      const selectedPlace = {
        formattedAddress: result.formatted_address ?? 'Endereço selecionado',
        placeId: result.place_id ?? undefined,
        location: { lat: location.lat(), lng: location.lng() },
      }
      setPlace(selectedPlace)
      setRoof(null)
      clearResults()
      void loadSolarInsights(selectedPlace.location)
    })
  }, [status, setNasaError, setPlace, setRoof, clearResults, loadSolarInsights])

  useEffect(() => {
    if (place?.formattedAddress && place.formattedAddress !== inputValue) {
      setInputValue(place.formattedAddress)
    }
  }, [place, inputValue])

  const handleMarkerMoved = (position: LatLngPoint) => {
    const label = place?.formattedAddress ?? 'Ponto ajustado manualmente'
    setPlace({ formattedAddress: label, location: position, placeId: place?.placeId })
    setRoof(null)
    clearResults()
    void loadSolarInsights(position)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!place) {
      setNasaError('Selecione um endereço válido para continuar.')
      return
    }
    setNasaError(null)
    nextStep()
  }

  const center = place?.location ?? DEFAULT_CENTER

  return (
    <section className="section-card" aria-labelledby="address-step-title">
      <header>
        <h2 className="section-title" id="address-step-title">
          1. Localize o endereço
        </h2>
        <p className="section-subtitle">
          Use a busca com sugestão do Google Places e ajuste o marcador se necessário.
        </p>
      </header>

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="address-input">Endereço</label>
          <input
            id="address-input"
            ref={inputRef}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Digite o endereço e selecione na lista"
            aria-describedby="address-helper"
          />
          <span id="address-helper" className="input-helper">
            Para melhores resultados, informe endereço completo com número e cidade.
          </span>
        </div>

        <MapCanvas
          center={center}
          zoom={20}
          mode="marker"
          markerOptions={{
            draggable: true,
            position: center,
            onPositionChanged: handleMarkerMoved,
          }}
        />

        <div className="action-bar">
          <span className="input-helper">
            {solarStatus === 'loading'
              ? 'Buscando dados da Solar API…'
              : 'Marque o telhado desejado arrastando o marcador azul.'}
          </span>
          <button type="submit" className="primary-button" disabled={!place}>
            Continuar para o telhado
          </button>
        </div>
      </form>
    </section>
  )
}
