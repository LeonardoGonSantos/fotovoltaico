import type { LatLngPoint } from '../../types/domain'
import { offsetLatLng } from '../../utils/coordinates'

const DIRECTIONS = [
  { label: 'N', angle: 0 },
  { label: 'NE', angle: 45 },
  { label: 'E', angle: 90 },
  { label: 'SE', angle: 135 },
  { label: 'S', angle: 180 },
  { label: 'SW', angle: 225 },
  { label: 'W', angle: 270 },
  { label: 'NW', angle: 315 },
]

interface StaticThumbnailsProps {
  center: LatLngPoint
  onSelect: (point: LatLngPoint) => void
  distanceMeters?: number
}

function computeOffset(origin: LatLngPoint, angleDeg: number, distance: number) {
  const radians = (angleDeg * Math.PI) / 180
  const north = Math.cos(radians) * distance
  const east = Math.sin(radians) * distance
  return offsetLatLng(origin, north, east)
}

export function StaticThumbnails({ center, onSelect, distanceMeters = 60 }: StaticThumbnailsProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return <p className="input-helper">Defina VITE_GOOGLE_MAPS_API_KEY para visualizar miniaturas ao redor.</p>
  }

  return (
    <div className="thumbnail-grid" role="list">
      {DIRECTIONS.map((direction) => {
        const point = computeOffset(center, direction.angle, distanceMeters)
        const url = new URL('https://maps.googleapis.com/maps/api/staticmap')
        url.searchParams.set('center', `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`)
        url.searchParams.set('zoom', '20')
        url.searchParams.set('size', '160x160')
        url.searchParams.set('scale', '2')
        url.searchParams.set('maptype', 'satellite')
        url.searchParams.set('key', apiKey)
        url.searchParams.append('markers', `color:0x2563EB|${point.lat},${point.lng}`)

        return (
          <button
            type="button"
            key={direction.label}
            className="thumbnail-card"
            onClick={() => onSelect(point)}
            aria-label={`Recentralizar mapa para ${direction.label}`}
          >
            <img src={url.toString()} alt={`Miniatura direção ${direction.label}`} loading="lazy" />
            <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}>{direction.label}</div>
          </button>
        )
      })}
      <span style={{ fontSize: '0.7rem', color: '#6c7280', gridColumn: '1/-1' }}>Map data © Google</span>
    </div>
  )
}
