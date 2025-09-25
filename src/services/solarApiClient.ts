const cache = new Map<string, ParsedSolarInsights>()

interface ParsedSolarSegment {
  segmentId: string
  pitchDegrees: number
  azimuthDegrees: number
  groundAreaMeters2?: number
  maxArrayAreaMeters2?: number
  monthlyEnergyKwh?: number[]
  annualEnergyKwh?: number
  recommendedSystemKw?: number
}

interface ParsedSolarInsights {
  lat: number
  lng: number
  coverageQuality: 'HIGH' | 'MEDIUM' | 'BASE' | 'LOW' | 'NONE' | 'UNKNOWN'
  segments: ParsedSolarSegment[]
}

export class SolarApiError extends Error {
  public status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'SolarApiError'
    this.status = status
  }
}

export function isSolarApiNotFoundError(error: unknown) {
  return error instanceof SolarApiError && error.status === 404
}

interface BuildingInsightsResponse {
  solarPotential?: {
    roofSegmentSummaries?: Array<{
      segmentId?: string
      pitchDegrees?: number
      azimuthDegrees?: number
      groundAreaMeters2?: number
      maxArrayAreaMeters2?: number
      stats?: {
        yearlyEnergyDcKwh?: number
        monthlyEnergyDcKwh?: number[]
        dcCapacityKw?: number
      }
    }>
  }
  center?: {
    latitude?: number
    longitude?: number
  }
}

function assureSegmentId(segmentId: string | undefined, index: number) {
  if (segmentId && segmentId.length > 0) {
    return segmentId
  }
  return `segment-${index + 1}`
}

function parseInsights(response: BuildingInsightsResponse): ParsedSolarInsights {
  const { center, solarPotential } = response
  const segments: ParsedSolarSegment[] = (solarPotential?.roofSegmentSummaries ?? []).map((segment, index) => ({
    segmentId: assureSegmentId(segment.segmentId, index),
    pitchDegrees: segment.pitchDegrees ?? 18,
    azimuthDegrees: segment.azimuthDegrees ?? 0,
    groundAreaMeters2: segment.groundAreaMeters2,
    maxArrayAreaMeters2: segment.maxArrayAreaMeters2,
    monthlyEnergyKwh: segment.stats?.monthlyEnergyDcKwh,
    annualEnergyKwh: segment.stats?.yearlyEnergyDcKwh,
    recommendedSystemKw: segment.stats?.dcCapacityKw,
  }))

  return {
    lat: center?.latitude ?? 0,
    lng: center?.longitude ?? 0,
    coverageQuality: 'UNKNOWN',
    segments,
  }
}

export async function fetchSolarBuildingInsights(lat: number, lng: number, apiKey: string) {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as ParsedSolarInsights
  }

  const params = new URLSearchParams({
    'location.latitude': lat.toString(),
    'location.longitude': lng.toString(),
    requiredQuality: 'BASE',
    key: apiKey,
  })

  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params.toString()}`
  const response = await fetch(url)
  if (!response.ok) {
    const message = await response.text()
    throw new SolarApiError(response.status, message || `Solar API respondeu ${response.status}`)
  }

  const json = (await response.json()) as BuildingInsightsResponse
  const parsed = parseInsights(json)
  cache.set(cacheKey, parsed)
  return parsed
}
