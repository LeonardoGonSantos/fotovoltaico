import type { LatLngPoint, SolarBuildingInsights, SolarSegment } from '../types/domain'

const cache = new Map<string, SolarBuildingInsights>()

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

interface ApiSegmentSummary {
  segmentId?: string
  pitchDegrees?: number
  azimuthDegrees?: number
  groundAreaMeters2?: number
  maxArrayAreaMeters2?: number
  stats?: {
    yearlyEnergyDcKwh?: number
    monthlyEnergyDcKwh?: number[]
    groundAreaMeters2?: number
    dcCapacityKw?: number
  }
  center?: ApiLatLng
}

interface ApiSegmentStats {
  pitchDegrees?: number
  azimuthDegrees?: number
  stats?: {
    areaMeters2?: number
    groundAreaMeters2?: number
    yearlyEnergyDcKwh?: number
    monthlyEnergyDcKwh?: number[]
    dcCapacityKw?: number
  }
  center?: ApiLatLng
}

interface ApiLatLng {
  latitude?: number
  longitude?: number
}

interface BuildingInsightsResponse {
  solarPotential?: {
    maxArrayAreaMeters2?: number
    roofSegmentSummaries?: ApiSegmentSummary[]
    roofSegmentStats?: ApiSegmentStats[]
    wholeRoofStats?: {
      areaMeters2?: number
      groundAreaMeters2?: number
    }
  }
  center?: ApiLatLng
  coverageQuality?: 'HIGH' | 'MEDIUM' | 'BASE' | 'LOW' | 'NONE' | 'UNKNOWN'
}

function assureSegmentId(segmentId: string | undefined, index: number) {
  if (segmentId && segmentId.length > 0) {
    return segmentId
  }
  return `segment-${index + 1}`
}

function toLatLng(point?: ApiLatLng): LatLngPoint | undefined {
  if (point?.latitude === undefined || point.longitude === undefined) {
    return undefined
  }
  return { lat: point.latitude, lng: point.longitude }
}

function mapSummarySegments(
  summaries: ApiSegmentSummary[] | undefined,
  totalMaxArray: number | undefined
): SolarSegment[] {
  if (!summaries?.length) return []
  return summaries.map((segment, index) => ({
    segmentId: assureSegmentId(segment.segmentId, index),
    pitchDegrees: segment.pitchDegrees ?? 18,
    azimuthDegrees: segment.azimuthDegrees ?? 0,
    groundAreaMeters2: segment.stats?.groundAreaMeters2 ?? segment.groundAreaMeters2,
    maxArrayAreaMeters2: segment.maxArrayAreaMeters2 ?? totalMaxArray,
    monthlyEnergyKwh: segment.stats?.monthlyEnergyDcKwh,
    annualEnergyKwh: segment.stats?.yearlyEnergyDcKwh,
    recommendedSystemKw: segment.stats?.dcCapacityKw,
    center: toLatLng(segment.center),
  }))
}

function mapStatsSegments(
  stats: ApiSegmentStats[] | undefined,
  totalMaxArray: number | undefined,
  totalArea: number | undefined
): SolarSegment[] {
  if (!stats?.length) return []
  return stats.map((segment, index) => {
    const areaMeters = segment.stats?.areaMeters2 ?? segment.stats?.groundAreaMeters2 ?? 0
    const ratio = totalArea && totalArea > 0 ? areaMeters / totalArea : undefined
    const maxArray = ratio && totalMaxArray ? totalMaxArray * ratio : undefined
    return {
      segmentId: `segment-${index + 1}`,
      pitchDegrees: segment.pitchDegrees ?? 18,
      azimuthDegrees: segment.azimuthDegrees ?? 0,
      groundAreaMeters2: segment.stats?.groundAreaMeters2 ?? areaMeters,
      maxArrayAreaMeters2: maxArray ?? areaMeters,
      monthlyEnergyKwh: segment.stats?.monthlyEnergyDcKwh,
      annualEnergyKwh: segment.stats?.yearlyEnergyDcKwh,
      recommendedSystemKw: segment.stats?.dcCapacityKw,
      center: toLatLng(segment.center),
    }
  })
}

function parseInsights(response: BuildingInsightsResponse): SolarBuildingInsights {
  const { center, solarPotential, coverageQuality } = response

  const totalArea =
    solarPotential?.wholeRoofStats?.areaMeters2 ?? solarPotential?.wholeRoofStats?.groundAreaMeters2

  const fromSummaries = mapSummarySegments(
    solarPotential?.roofSegmentSummaries,
    solarPotential?.maxArrayAreaMeters2
  )
  const fromStats = mapStatsSegments(
    solarPotential?.roofSegmentStats,
    solarPotential?.maxArrayAreaMeters2,
    totalArea
  )

  const segments = fromSummaries.length > 0 ? fromSummaries : fromStats

  return {
    lat: center?.latitude ?? 0,
    lng: center?.longitude ?? 0,
    coverageQuality: coverageQuality ?? 'UNKNOWN',
    segments,
  }
}

export async function fetchSolarBuildingInsights(lat: number, lng: number, apiKey: string) {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) as SolarBuildingInsights
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
