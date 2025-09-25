import { useCallback, useState } from 'react'
import { useAppState } from '../context/AppStateContext'
import { fetchMonthlySolarData } from '../services/nasaPowerClient'
import { performManualComputation, performSolarSegmentComputation } from '../services/solarCalculations'
import type { NasaPowerMonthlyDataset } from '../types/domain'
import { isPositiveNumber } from '../utils/validations'

export function useSolarCalc() {
  const {
    state: { roof, angles, bill, place, dataSource, solarInsights, solarSelection },
    config,
    setResults,
    setCalculating,
    setNasaError,
    setDataSource,
    setSolarSelection,
  } = useAppState()
  const [dimensioningCapped, setDimensioningCapped] = useState(false)

  const runCalculation = useCallback(async () => {
    if (!place) {
      setNasaError('Confirme um endereço válido para continuar.')
      return
    }
    if (!isPositiveNumber(bill.monthlySpendBRL)) {
      setNasaError('Informe o gasto mensal obrigatório em R$.')
      return
    }

    try {
      setCalculating(true)
      setNasaError(null)
      let computation

      if (dataSource === 'SOLAR_API' && solarInsights && solarSelection.segmentId) {
        const segment = solarInsights.segments.find((item) => item.segmentId === solarSelection.segmentId)
        if (!segment) {
          setNasaError('Selecione um segmento válido ou use o modo manual.')
          return
        }
        const centroidLat = solarInsights.lat || place.location.lat
        const centroidLng = solarInsights.lng || place.location.lng
        let dataset: NasaPowerMonthlyDataset[] | null = null
        if (!segment.monthlyEnergyKwh && !segment.annualEnergyKwh) {
          dataset = await fetchMonthlySolarData(centroidLat, centroidLng)
        } else {
          // Ainda assim buscamos NASA para preencher tabela, mas tratamos falhas
          try {
            dataset = await fetchMonthlySolarData(centroidLat, centroidLng)
          } catch (error) {
            console.warn('Falha ao buscar NASA POWER para complemento, seguindo com dados da Solar API', error)
            dataset = null
          }
        }

        computation = performSolarSegmentComputation({
          segment,
          bill,
          solarParams: config.solar,
          dataset,
          latitude: centroidLat,
        })
      } else {
        if (!roof || !roof.hasPolygon) {
          setNasaError('Desenhe ou selecione um polígono para continuar.')
          setDataSource('MANUAL')
          return
        }
        const centroid = roof.centroid ?? place.location
        const dataset = await fetchMonthlySolarData(centroid.lat, centroid.lng)
        computation = performManualComputation({
          roof,
          angles,
          bill,
          solarParams: config.solar,
          dataset,
          latitude: centroid.lat,
        })
        setSolarSelection({ source: 'MANUAL', segmentId: null })
      }

      setDimensioningCapped(computation.dimensioningCapped)
      setResults(computation.summary, computation.monthly)
    } catch (error) {
      setNasaError(error instanceof Error ? error.message : 'Falha ao calcular resultados.')
    } finally {
      setCalculating(false)
    }
  }, [
    angles,
    bill,
    roof,
    place,
    config.solar,
    dataSource,
    solarInsights,
    solarSelection,
    setCalculating,
    setNasaError,
    setResults,
    setDataSource,
    setSolarSelection,
  ])

  return {
    runCalculation,
    dimensioningCapped,
  }
}
