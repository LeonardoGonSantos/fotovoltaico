import { useMemo } from 'react'
import type { LatLngPoint, RoofSelection } from '../types/domain'

const AREA_USAGE_FACTOR = 0.7

function computeAreaSpherical(path: LatLngPoint[]) {
  if (typeof window !== 'undefined' && window.google?.maps?.geometry?.spherical) {
    const polygonPath = path.map((point) => new google.maps.LatLng(point.lat, point.lng))
    return google.maps.geometry.spherical.computeArea(polygonPath)
  }
  return computeAreaPlanar(path)
}

function computeAreaPlanar(path: LatLngPoint[]) {
  if (path.length < 3) return 0
  let area = 0
  for (let i = 0; i < path.length; i += 1) {
    const { lat: lat1, lng: lng1 } = path[i]
    const { lat: lat2, lng: lng2 } = path[(i + 1) % path.length]
    area += (lng2 - lng1) * (lat2 + lat1)
  }
  return Math.abs(area * 111139 * 111139 * 0.5)
}

function computeCentroid(path: LatLngPoint[]) {
  if (!path.length) {
    return { lat: 0, lng: 0 }
  }
  const sum = path.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 }
  )
  return {
    lat: sum.lat / path.length,
    lng: sum.lng / path.length,
  }
}

export function buildRoofSelection(path: LatLngPoint[]): RoofSelection {
  const area = path.length >= 3 ? computeAreaSpherical(path) : 0
  const usableArea = area * AREA_USAGE_FACTOR
  const centroid = computeCentroid(path)
  return {
    polygon: path,
    areaM2: area,
    usableAreaM2: usableArea,
    centroid,
    hasPolygon: path.length >= 3,
  }
}

export function useRoofSelection(path: LatLngPoint[]) {
  return useMemo(() => buildRoofSelection(path), [path])
}
