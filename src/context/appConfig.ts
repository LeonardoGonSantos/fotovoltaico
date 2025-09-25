import type { AppConfig, SolarParams, StepDefinition } from '../types/domain'

export const STEP_DEFINITIONS: StepDefinition[] = [
  { key: 'address', title: 'Endereço', description: 'Confirme a localização do imóvel.' },
  { key: 'bill', title: 'Conta de luz', description: 'Informe gastos e parâmetros opcionais.' },
  { key: 'results', title: 'Resultados', description: 'Analise geração e exporte o PDF.' },
]

const parseEnvNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const defaultTariff = parseEnvNumber(import.meta.env.VITE_DEFAULT_TARIFF, 1.0)
const defaultKwpPerM2 = parseEnvNumber(import.meta.env.VITE_SPECIFIC_KWP_PER_M2, 0.2)

export const DEFAULT_SOLAR_PARAMS: SolarParams = {
  performanceRatio: 0.8,
  albedo: 0.2,
  kwpPerSquareMeter: defaultKwpPerM2,
  panelWp: 550,
  panelAreaM2: 2.0,
  defaultTariffBRLkWh: defaultTariff,
  compensationTargetDefaultPct: 90,
  tiltRangeDeg: { min: 14, max: 22 },
  azimuthRangeDeg: { min: 0, max: 360 },
  defaultTiltDeg: 18,
  defaultAzimuthDeg: 0,
  uncertaintyPct: 0.12,
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  steps: STEP_DEFINITIONS,
  solar: DEFAULT_SOLAR_PARAMS,
}
