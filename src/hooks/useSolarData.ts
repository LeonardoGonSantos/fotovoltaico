import { useCallback } from 'react'
import { useAppState } from '../context/AppStateContext'
import { fetchSolarBuildingInsights, isSolarApiNotFoundError } from '../services/solarApiClient'
import type { LatLngPoint, SolarSegment } from '../types/domain'

function selectDefaultSegment(segments: SolarSegment[] | undefined) {
  if (!segments || segments.length === 0) return null
  return segments.reduce((best, current) => {
    if (!best) return current
    const bestArea = best.maxArrayAreaMeters2 ?? best.groundAreaMeters2 ?? 0
    const currentArea = current.maxArrayAreaMeters2 ?? current.groundAreaMeters2 ?? 0
    return currentArea > bestArea ? current : best
  }, segments[0])
}

export function useSolarData() {
  const {
    state: { solarStatus, solarInsights, solarSelection, dataSource },
    config,
    setSolarStatus,
    setSolarInsights,
    setSolarSelection,
    setAngles,
    setDataSource,
    clearResults,
  } = useAppState()

  const loadSolarInsights = useCallback(
    async (location: LatLngPoint) => {
      clearResults()
      const apiKey = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY
      if (!apiKey) {
        setSolarStatus('error', 'Defina VITE_GOOGLE_SOLAR_API_KEY para usar a Solar API.')
        setDataSource('MANUAL')
        return null
      }
      try {
        setSolarStatus('loading')
        const insights = await fetchSolarBuildingInsights(location.lat, location.lng, apiKey)
        setSolarInsights(insights)
        setSolarStatus('success')
        if (insights.segments.length > 0) {
          const defaultSegment = selectDefaultSegment(insights.segments)
          if (defaultSegment) {
            setSolarSelection({ source: 'SOLAR_API', segmentId: defaultSegment.segmentId, manualOverride: false })
            setDataSource('SOLAR_API')
            setAngles({ betaDeg: defaultSegment.pitchDegrees, gammaDeg: defaultSegment.azimuthDegrees })
          }
        } else {
          setSolarSelection({ source: 'MANUAL', segmentId: null })
          setDataSource('MANUAL')
        }
        return insights
      } catch (error) {
        if (isSolarApiNotFoundError(error)) {
          setSolarStatus('error', 'Não encontramos dados de telhado na Solar API para esta localização. Use o modo manual.')
        } else {
          setSolarStatus('error', error instanceof Error ? error.message : 'Falha ao carregar dados da Solar API.')
        }
        setSolarInsights(null)
        setSolarSelection({ source: 'MANUAL', segmentId: null })
        setDataSource('MANUAL')
        return null
      }
    },
    [clearResults, setAngles, setDataSource, setSolarInsights, setSolarSelection, setSolarStatus]
  )

  const forceManual = useCallback(() => {
    setDataSource('MANUAL')
    setSolarSelection({ source: 'MANUAL', manualOverride: true, segmentId: null })
    setAngles({
      betaDeg: config.solar.defaultTiltDeg,
      gammaDeg: config.solar.defaultAzimuthDeg,
    })
  }, [config.solar.defaultAzimuthDeg, config.solar.defaultTiltDeg, setAngles, setDataSource, setSolarSelection])

  return {
    solarStatus,
    solarInsights,
    solarSelection,
    dataSource,
    loadSolarInsights,
    forceManual,
  }
}
