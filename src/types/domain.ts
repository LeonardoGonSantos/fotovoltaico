export interface LatLngPoint {
  lat: number
  lng: number
}

export interface PlaceSelection {
  formattedAddress: string
  location: LatLngPoint
  placeId?: string
}

export interface RoofSelection {
  polygon: LatLngPoint[]
  areaM2: number
  usableAreaM2: number
  centroid: LatLngPoint
  hasPolygon: boolean
}

export type DataSource = 'SOLAR_API' | 'MANUAL'

export interface SolarSegment {
  segmentId: string
  pitchDegrees: number
  azimuthDegrees: number
  groundAreaMeters2?: number
  maxArrayAreaMeters2?: number
  monthlyEnergyKwh?: number[]
  annualEnergyKwh?: number
  recommendedSystemKw?: number
}

export interface SolarBuildingInsights {
  lat: number
  lng: number
  coverageQuality: 'HIGH' | 'MEDIUM' | 'BASE' | 'LOW' | 'NONE' | 'UNKNOWN'
  segments: SolarSegment[]
}

export interface Angles {
  betaDeg: number
  gammaDeg: number
}

export interface BillInput {
  monthlySpendBRL: number | null
  tariffBRLkWh: number | null
  monthlyConsumptionKWh: number | null
  compensationTargetPct: number
}

export interface SolarParams {
  performanceRatio: number
  albedo: number
  kwpPerSquareMeter: number
  panelWp?: number
  panelAreaM2?: number
  defaultTariffBRLkWh: number
  compensationTargetDefaultPct: number
  tiltRangeDeg: { min: number; max: number }
  azimuthRangeDeg: { min: number; max: number }
  defaultTiltDeg: number
  defaultAzimuthDeg: number
  uncertaintyPct: number
}

export interface NasaPowerMonthlyDataset {
  month: string
  ghi: number
  dhi: number
  dni: number
}

export interface ResultMonth {
  month: string
  ghi: number
  dhi: number
  dni: number
  hpoa: number
  specificYield: number
  energyKWh: number
  savingsBRL: number
  uncertaintyLow: number
  uncertaintyHigh: number
}

export interface Summary {
  kwp: number
  kwpMax: number
  annualGenerationKWh: number
  avgMonthlyGenerationKWh: number
  monthlySavingsBRL: number
  annualSavingsBRL: number
  tariffApplied: number
  compensationTargetPct: number
}

export type StepKey =
  | 'address'
  | 'roof'
  | 'angles'
  | 'bill'
  | 'results'

export interface StepDefinition {
  key: StepKey
  title: string
  description: string
}

export interface AppConfig {
  steps: StepDefinition[]
  solar: SolarParams
}

export interface SolarSelection {
  source: DataSource
  segmentId?: string | null
  manualOverride?: boolean
}
