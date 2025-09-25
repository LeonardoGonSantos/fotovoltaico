import type { LatLngPoint, PlaceSelection } from '../../types/domain'
import { MapCanvas } from '../maps/MapCanvas'

interface MapModalProps {
  open: boolean
  place: PlaceSelection | null
  onClose: () => void
  onUpdateLocation: (position: LatLngPoint) => void
  onConfirm: () => void
}

export function MapModal({ open, place, onClose, onUpdateLocation, onConfirm }: MapModalProps) {
  if (!open) return null

  const center = place?.location ?? { lat: -23.55052, lng: -46.633308 }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Ajuste o marcador no mapa</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body">
          <p className="input-helper">Arraste o marcador para posicionar exatamente o telhado desejado.</p>
          <MapCanvas
            center={center}
            zoom={20}
            mode="marker"
            markerOptions={{
              draggable: true,
              position: center,
              onPositionChanged: onUpdateLocation,
            }}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary-button" onClick={onConfirm}>
            Concluir ajuste
          </button>
        </div>
      </div>
    </div>
  )
}
