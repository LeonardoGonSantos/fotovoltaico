import type { NasaPowerMonthlyDataset } from '../types/domain'

const cache = new Map<string, NasaPowerMonthlyDataset[]>()
const MONTH_KEYS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      ALLSKY_SFC_SW_DWN?: Record<string, number>
      ALLSKY_SFC_SW_DNI?: Record<string, number>
      ALLSKY_SFC_SW_DIFF?: Record<string, number>
    }
  }
}

async function requestNasaPower(lat: number, lng: number) {
  const params = new URLSearchParams({
    parameters: 'ALLSKY_SFC_SW_DWN,ALLSKY_SFC_SW_DNI,ALLSKY_SFC_SW_DIFF',
    community: 'RE',
    longitude: lng.toFixed(4),
    latitude: lat.toFixed(4),
    start: '199101',
    end: '202412',
    format: 'JSON',
  })
  const endpoint = `https://power.larc.nasa.gov/api/temporal/monthly/point?${params.toString()}`
  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`NASA POWER respondeu ${response.status}`)
  }
  const json = (await response.json()) as NasaPowerResponse
  return json
}

function parseResponse(data: NasaPowerResponse) {
  const parameters = data.properties?.parameter
  if (!parameters) {
    throw new Error('Resposta da NASA POWER sem parâmetros')
  }

  const ghi = parameters.ALLSKY_SFC_SW_DWN ?? {}
  const dni = parameters.ALLSKY_SFC_SW_DNI ?? {}
  const dhi = parameters.ALLSKY_SFC_SW_DIFF ?? {}

  return MONTH_KEYS.map((key, index) => {
    const ghiValue = Number(ghi[key] ?? 0)
    const dniValue = Number(dni[key] ?? 0)
    const dhiValue = Number(dhi[key] ?? 0)
    return {
      month: MONTH_LABELS[index],
      ghi: ghiValue,
      dni: dniValue,
      dhi: dhiValue,
    }
  })
}

async function loadMockDataset() {
  const mock = await import('../mock/nasaPowerResponse.json')
  const data = mock.default as NasaPowerResponse
  return parseResponse(data)
}

export async function fetchMonthlySolarData(lat: number, lng: number) {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as NasaPowerMonthlyDataset[]
  }

  try {
    const response = await requestNasaPower(lat, lng)
    const dataset = parseResponse(response)
    cache.set(cacheKey, dataset)
    return dataset
  } catch (error) {
    console.warn('Falha NASA POWER, utilizando mock:', error)
    const dataset = await loadMockDataset()
    cache.set(cacheKey, dataset)
    return dataset
  }
}
