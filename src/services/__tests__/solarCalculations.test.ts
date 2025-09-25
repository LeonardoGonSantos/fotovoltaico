import { describe, expect, it } from 'vitest'
import { performManualComputation, performSolarSegmentComputation } from '../solarCalculations'
import type { Angles, BillInput, RoofSelection, SolarParams, SolarSegment } from '../../types/domain'

const BASE_DATASET = Array.from({ length: 12 }, (_, index) => ({
  month: `M${index + 1}`,
  ghi: 5 + index * 0.1,
  dhi: 2.5,
  dni: 3,
}))

const ROOF: RoofSelection = {
  polygon: [
    { lat: -23.5, lng: -46.6 },
    { lat: -23.5005, lng: -46.6 },
    { lat: -23.5005, lng: -46.6005 },
    { lat: -23.5, lng: -46.6005 },
  ],
  areaM2: 120,
  usableAreaM2: 84,
  centroid: { lat: -23.50025, lng: -46.60025 },
  hasPolygon: true,
}

const ANGLES: Angles = { betaDeg: 18, gammaDeg: 0 }

const BILL: BillInput = {
  monthlySpendBRL: 500,
  tariffBRLkWh: 1.2,
  monthlyConsumptionKWh: null,
  compensationTargetPct: 90,
}

const SOLAR: SolarParams = {
  performanceRatio: 0.8,
  albedo: 0.2,
  kwpPerSquareMeter: 0.2,
  panelWp: 550,
  panelAreaM2: 2,
  defaultTariffBRLkWh: 1,
  compensationTargetDefaultPct: 90,
  tiltRangeDeg: { min: 14, max: 22 },
  azimuthRangeDeg: { min: 0, max: 360 },
  defaultTiltDeg: 18,
  defaultAzimuthDeg: 0,
  uncertaintyPct: 0.12,
}

describe('performManualComputation', () => {
  it('calculates summary and monthly results', () => {
    const result = performManualComputation({
      roof: ROOF,
      angles: ANGLES,
      bill: BILL,
      solarParams: SOLAR,
      dataset: BASE_DATASET,
      latitude: ROOF.centroid.lat,
    })

    expect(result.summary.kwp).toBeGreaterThan(0)
    expect(result.summary.annualGenerationKWh).toBeGreaterThan(0)
    expect(result.monthly).toHaveLength(12)
    expect(result.monthly[0].energyKWh).toBeGreaterThan(0)
  })

  it('caps kwp to maximum allowed by area', () => {
    const highBill: BillInput = { ...BILL, monthlySpendBRL: 2000, tariffBRLkWh: 1.2 }
    const result = performManualComputation({
      roof: ROOF,
      angles: ANGLES,
      bill: highBill,
      solarParams: SOLAR,
      dataset: BASE_DATASET,
      latitude: ROOF.centroid.lat,
    })

    expect(result.summary.kwp).toBeLessThanOrEqual(result.summary.kwpMax)
  })
})

describe('performSolarSegmentComputation', () => {
  const SEGMENT: SolarSegment = {
    segmentId: 'seg-1',
    pitchDegrees: 18,
    azimuthDegrees: 10,
    groundAreaMeters2: 100,
    maxArrayAreaMeters2: 80,
    monthlyEnergyKwh: Array.from({ length: 12 }, () => 500),
    annualEnergyKwh: 6000,
    recommendedSystemKw: 5,
  }

  it('returns solar-api source and energy values', () => {
    const bill: BillInput = { ...BILL, monthlyConsumptionKWh: 400 }
    const result = performSolarSegmentComputation({
      segment: SEGMENT,
      bill,
      solarParams: SOLAR,
      dataset: BASE_DATASET,
      latitude: ROOF.centroid.lat,
    })

    expect(result.source).toBe('SOLAR_API')
    expect(result.summary.annualGenerationKWh).toBeGreaterThan(0)
  })
})
