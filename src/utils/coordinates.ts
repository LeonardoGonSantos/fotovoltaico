import type { LatLngPoint } from '../types/domain'

const EARTH_RADIUS_M = 6378137

export function offsetLatLng(origin: LatLngPoint, metersNorth: number, metersEast: number): LatLngPoint {
  const dLat = metersNorth / EARTH_RADIUS_M
  const dLng = metersEast / (EARTH_RADIUS_M * Math.cos((origin.lat * Math.PI) / 180))

  return {
    lat: origin.lat + (dLat * 180) / Math.PI,
    lng: origin.lng + (dLng * 180) / Math.PI,
  }
}

export function normalizeAzimuth(azimuth: number) {
  const normalized = ((azimuth % 360) + 360) % 360
  return normalized
}

export function azimuthNorthToSolar(azimuthNorth: number) {
  // Convertendo de 0°=Norte (sentido horário) para 0°=Sul (positivo oeste)
  const normalized = normalizeAzimuth(azimuthNorth)
  const solarAzimuth = normalizeAzimuth(normalized - 180)
  return solarAzimuth
}

export function solarAzimuthToNorth(solarAzimuth: number) {
  const normalized = normalizeAzimuth(solarAzimuth)
  return normalizeAzimuth(normalized + 180)
}
