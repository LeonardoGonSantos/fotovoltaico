export function isPositiveNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function isNonNegativeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}
