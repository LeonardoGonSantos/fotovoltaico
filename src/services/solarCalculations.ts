import type {
  Angles,
  BillInput,
  DataSource,
  NasaPowerMonthlyDataset,
  ResultMonth,
  RoofSelection,
  SolarParams,
  SolarSegment,
  Summary,
} from '../types/domain'
import { azimuthNorthToSolar } from '../utils/coordinates'

const DEG2RAD = Math.PI / 180
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function degToRad(value: number) {
  return value * DEG2RAD
}

function calculateDeclination(monthIndex: number) {
  const dayOfYear = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344][monthIndex]
  return degToRad(23.45) * Math.sin(((360 / 365) * (dayOfYear - 81) * DEG2RAD))
}

function cosineIncidence(
  latitudeRad: number,
  declination: number,
  beta: number,
  gammaSolar: number,
  hourAngle: number
) {
  const cosLat = Math.cos(latitudeRad)
  const sinLat = Math.sin(latitudeRad)
  const cosDec = Math.cos(declination)
  const sinDec = Math.sin(declination)
  const cosBeta = Math.cos(beta)
  const sinBeta = Math.sin(beta)
  const cosGamma = Math.cos(gammaSolar)
  const sinGamma = Math.sin(gammaSolar)
  const cosHour = Math.cos(hourAngle)
  const sinHour = Math.sin(hourAngle)

  return (
    sinDec * sinLat * cosBeta -
    sinDec * cosLat * sinBeta * cosGamma +
    cosDec * cosLat * cosBeta * cosHour +
    cosDec * sinLat * sinBeta * cosGamma * cosHour +
    cosDec * sinBeta * sinGamma * sinHour
  )
}

function cosineZenith(latitudeRad: number, declination: number, hourAngle: number) {
  return Math.sin(latitudeRad) * Math.sin(declination) + Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle)
}

function computeRb(latitudeRad: number, declination: number, betaRad: number, gammaSolarRad: number) {
  const hourAngle = 0
  const cosTheta = cosineIncidence(latitudeRad, declination, betaRad, gammaSolarRad, hourAngle)
  const cosThetaZ = cosineZenith(latitudeRad, declination, hourAngle)
  if (cosThetaZ <= 0) {
    return 0
  }
  return Math.max(cosTheta / cosThetaZ, 0)
}

interface YieldComputation {
  monthlyYield: number[]
  hpoaMonthly: number[]
  ghiMonthly: number[]
  dhiMonthly: number[]
  dniMonthly: number[]
}

function computeMonthlyYieldFromDataset(
  dataset: NasaPowerMonthlyDataset[],
  latitude: number,
  angles: Angles,
  solarParams: SolarParams
): YieldComputation {
  const betaRad = degToRad(angles.betaDeg)
  const gammaSolarRad = degToRad(azimuthNorthToSolar(angles.gammaDeg))
  const latitudeRad = degToRad(latitude)
  const cosBeta = Math.cos(betaRad)

  const monthlyYield: number[] = []
  const hpoaMonthly: number[] = []
  const ghiMonthly: number[] = []
  const dhiMonthly: number[] = []
  const dniMonthly: number[] = []

  dataset.forEach((entry, index) => {
    const declination = calculateDeclination(index)
    const rb = computeRb(latitudeRad, declination, betaRad, gammaSolarRad)
    const days = DAYS_IN_MONTH[index]

    const ghiDaily = entry.ghi
    const dhiDaily = entry.dhi
    const dniDaily = entry.dni
    const beamDaily = Math.max(ghiDaily - dhiDaily, 0)

    const hpoaDaily =
      beamDaily * rb +
      dhiDaily * ((1 + cosBeta) / 2) +
      solarParams.albedo * ghiDaily * ((1 - cosBeta) / 2)

    const hpoaMonthlyValue = hpoaDaily * days
    const yfMonthly = hpoaMonthlyValue * solarParams.performanceRatio

    monthlyYield.push(yfMonthly)
    hpoaMonthly.push(hpoaMonthlyValue)
    ghiMonthly.push(ghiDaily * days)
    dhiMonthly.push(dhiDaily * days)
    dniMonthly.push(dniDaily * days)
  })

  return { monthlyYield, hpoaMonthly, ghiMonthly, dhiMonthly, dniMonthly }
}

interface ManualComputationInput {
  roof: RoofSelection
  angles: Angles
  bill: BillInput
  solarParams: SolarParams
  dataset: NasaPowerMonthlyDataset[]
  latitude: number
}

interface SolarComputationResult {
  summary: Summary
  monthly: ResultMonth[]
  dimensioningCapped: boolean
  source: DataSource
}

function determineTariff(bill: BillInput, params: SolarParams) {
  if (bill.tariffBRLkWh && bill.tariffBRLkWh > 0) {
    return bill.tariffBRLkWh
  }
  if (bill.monthlySpendBRL && bill.monthlyConsumptionKWh && bill.monthlyConsumptionKWh > 0) {
    return bill.monthlySpendBRL / bill.monthlyConsumptionKWh
  }
  return params.defaultTariffBRLkWh
}

function determineConsumption(bill: BillInput, tariff: number) {
  if (bill.monthlyConsumptionKWh && bill.monthlyConsumptionKWh > 0) {
    return bill.monthlyConsumptionKWh
  }
  if (bill.monthlySpendBRL && tariff > 0) {
    return bill.monthlySpendBRL / tariff
  }
  return 0
}

export function performManualComputation({
  roof,
  angles,
  bill,
  solarParams,
  dataset,
  latitude,
}: ManualComputationInput): SolarComputationResult {
  const tariff = determineTariff(bill, solarParams)
  const baseConsumption = determineConsumption(bill, tariff)
  const targetPct = bill.compensationTargetPct || solarParams.compensationTargetDefaultPct
  const consumptionTarget = baseConsumption * (targetPct / 100)

  const { monthlyYield, hpoaMonthly, ghiMonthly, dhiMonthly, dniMonthly } = computeMonthlyYieldFromDataset(
    dataset,
    latitude,
    angles,
    solarParams
  )

  const monthly: ResultMonth[] = monthlyYield.map((yfMonthly, index) => ({
    month: dataset[index]?.month ?? `M${index + 1}`,
    ghi: ghiMonthly[index],
    dhi: dhiMonthly[index],
    dni: dniMonthly[index],
    hpoa: hpoaMonthly[index],
    specificYield: yfMonthly,
    energyKWh: 0,
    savingsBRL: 0,
    uncertaintyLow: 0,
    uncertaintyHigh: 0,
  }))

  const yfTotal = monthlyYield.reduce((sum, value) => sum + value, 0)
  const avgYf = monthlyYield.length > 0 ? yfTotal / monthlyYield.length : 0
  const kwpTarget = avgYf > 0 ? consumptionTarget / avgYf : 0
  const kwpByArea = roof.usableAreaM2 * solarParams.kwpPerSquareMeter
  let kwpMax = kwpByArea

  if (solarParams.panelAreaM2 && solarParams.panelAreaM2 > 0 && solarParams.panelWp && solarParams.panelWp > 0) {
    const numPanels = Math.floor(roof.usableAreaM2 / solarParams.panelAreaM2)
    const kwpByPanels = (numPanels * solarParams.panelWp) / 1000
    if (kwpByPanels > 0) {
      kwpMax = Math.min(kwpMax, kwpByPanels)
    }
  }

  const capped = kwpTarget > kwpMax && kwpMax > 0
  const kwp = kwpMax > 0 ? Math.min(Math.max(kwpTarget, 0), kwpMax) : 0

  let annualGeneration = 0
  let annualSavings = 0

  monthly.forEach((entry) => {
    const energy = entry.specificYield * kwp
    const savings = energy * tariff
    const uncertaintyDelta = energy * solarParams.uncertaintyPct

    entry.energyKWh = energy
    entry.savingsBRL = savings
    entry.uncertaintyLow = Math.max(energy - uncertaintyDelta, 0)
    entry.uncertaintyHigh = energy + uncertaintyDelta

    annualGeneration += energy
    annualSavings += savings
  })

  const summary: Summary = {
    kwp,
    kwpMax,
    annualGenerationKWh: annualGeneration,
    avgMonthlyGenerationKWh: monthly.length > 0 ? annualGeneration / monthly.length : 0,
    monthlySavingsBRL: monthly.length > 0 ? annualSavings / monthly.length : 0,
    annualSavingsBRL: annualSavings,
    tariffApplied: tariff,
    compensationTargetPct: targetPct,
  }

  return {
    summary,
    monthly,
    dimensioningCapped: capped,
    source: 'MANUAL',
  }
}

interface SolarSegmentComputationInput {
  segment: SolarSegment
  bill: BillInput
  solarParams: SolarParams
  dataset: NasaPowerMonthlyDataset[] | null
  latitude: number
}

function computeAreaFromSegment(segment: SolarSegment) {
  if (segment.maxArrayAreaMeters2 && segment.maxArrayAreaMeters2 > 0) {
    return segment.maxArrayAreaMeters2
  }
  if (segment.groundAreaMeters2 && segment.groundAreaMeters2 > 0) {
    return segment.groundAreaMeters2 * 0.7
  }
  return 0
}

export function performSolarSegmentComputation({
  segment,
  bill,
  solarParams,
  dataset,
  latitude,
}: SolarSegmentComputationInput): SolarComputationResult {
  const tariff = determineTariff(bill, solarParams)
  const baseConsumption = determineConsumption(bill, tariff)
  const targetPct = bill.compensationTargetPct || solarParams.compensationTargetDefaultPct
  const consumptionTarget = baseConsumption * (targetPct / 100)

  const usefulArea = computeAreaFromSegment(segment)
  const kwpByArea = usefulArea > 0 ? usefulArea * solarParams.kwpPerSquareMeter : Number.POSITIVE_INFINITY
  let kwpMax = kwpByArea

  if (
    usefulArea > 0 &&
    solarParams.panelAreaM2 &&
    solarParams.panelAreaM2 > 0 &&
    solarParams.panelWp &&
    solarParams.panelWp > 0
  ) {
    const numPanels = Math.floor(usefulArea / solarParams.panelAreaM2)
    const kwpByPanels = (numPanels * solarParams.panelWp) / 1000
    if (Number.isFinite(kwpByPanels) && kwpByPanels > 0) {
      kwpMax = Math.min(kwpMax, kwpByPanels)
    }
  }

  const baseKwp = segment.recommendedSystemKw && segment.recommendedSystemKw > 0 ? segment.recommendedSystemKw : kwpMax
  let baseMonthlyEnergy = segment.monthlyEnergyKwh ?? null

  if (!baseMonthlyEnergy && segment.annualEnergyKwh && segment.annualEnergyKwh > 0) {
    const avgMonthly = segment.annualEnergyKwh / 12
    baseMonthlyEnergy = Array.from({ length: 12 }, () => avgMonthly)
  }

  let monthlyYield: number[] = []
  let ghiMonthly: number[] = []
  let dhiMonthly: number[] = []
  let dniMonthly: number[] = []
  let hpoaMonthly: number[] = []

  if (baseMonthlyEnergy && baseKwp && baseKwp > 0) {
    monthlyYield = baseMonthlyEnergy.map((energy) => (energy > 0 ? energy / baseKwp : 0))
  } else if (dataset) {
    const yields = computeMonthlyYieldFromDataset(
      dataset,
      latitude,
      { betaDeg: segment.pitchDegrees, gammaDeg: segment.azimuthDegrees },
      solarParams
    )
    monthlyYield = yields.monthlyYield
    hpoaMonthly = yields.hpoaMonthly
    ghiMonthly = yields.ghiMonthly
    dhiMonthly = yields.dhiMonthly
    dniMonthly = yields.dniMonthly
  } else {
    monthlyYield = Array.from({ length: 12 }, () => 0)
  }

  const averageYield = monthlyYield.reduce((sum, value) => sum + value, 0) / (monthlyYield.length || 1)
  const kwpTarget = averageYield > 0 ? consumptionTarget / averageYield : 0
  const kwp = kwpMax > 0 ? Math.min(Math.max(kwpTarget, 0), kwpMax) : kwpTarget

  const monthly: ResultMonth[] = monthlyYield.map((yieldValue, index) => {
    const energy = yieldValue * kwp
    const savings = energy * tariff
    const uncertaintyDelta = energy * solarParams.uncertaintyPct
    return {
      month: dataset?.[index]?.month ?? `M${index + 1}`,
      ghi: ghiMonthly[index] ?? 0,
      dhi: dhiMonthly[index] ?? 0,
      dni: dniMonthly[index] ?? 0,
      hpoa: hpoaMonthly[index] ?? (yieldValue / (solarParams.performanceRatio || 1)),
      specificYield: yieldValue,
      energyKWh: energy,
      savingsBRL: savings,
      uncertaintyLow: Math.max(energy - uncertaintyDelta, 0),
      uncertaintyHigh: energy + uncertaintyDelta,
    }
  })

  const annualGeneration = monthly.reduce((sum, month) => sum + month.energyKWh, 0)
  const annualSavings = monthly.reduce((sum, month) => sum + month.savingsBRL, 0)
  const dimensioningCapped = kwpTarget > kwpMax && kwpMax > 0

  const summary: Summary = {
    kwp,
    kwpMax,
    annualGenerationKWh: annualGeneration,
    avgMonthlyGenerationKWh: monthly.length > 0 ? annualGeneration / monthly.length : 0,
    monthlySavingsBRL: monthly.length > 0 ? annualSavings / monthly.length : 0,
    annualSavingsBRL: annualSavings,
    tariffApplied: tariff,
    compensationTargetPct: targetPct,
  }

  return {
    summary,
    monthly,
    dimensioningCapped,
    source: 'SOLAR_API',
  }
}
