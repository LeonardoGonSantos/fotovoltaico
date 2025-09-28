import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { LatLngPoint } from '../../types/domain'
import { useGoogleMapInstance } from '../../hooks/useMap'

interface MapCanvasProps {
  center: LatLngPoint
  zoom?: number
  mode?: 'marker' | 'polygon' | 'view'
  markerOptions?: {
    draggable?: boolean
    position?: LatLngPoint
    onPositionChanged?: (position: LatLngPoint) => void
  }
  polygonOptions?: {
    path: LatLngPoint[]
    editable?: boolean
    draggable?: boolean
    onPathChanged?: (path: LatLngPoint[]) => void
  }
  drawingOptions?: {
    enabled: boolean
    onPolygonComplete?: (path: LatLngPoint[]) => void
  }
  onReady?: (helpers: {
    map: google.maps.Map
    setCenter: (position: LatLngPoint, zoom?: number) => void
    activatePolygonDrawing: () => void
  }) => void
}

export function MapCanvas({
  center,
  zoom = 20,
  mode = 'view',
  markerOptions,
  polygonOptions,
  drawingOptions,
  onReady,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const pendingActivateRef = useRef(false)

  const defaultMapTypeId =
    typeof window !== 'undefined' ? window.google?.maps?.MapTypeId?.SATELLITE : undefined

  const { map, status, error, setCenter } = useGoogleMapInstance(containerRef, {
    center,
    zoom,
    mapTypeId: defaultMapTypeId,
    disableDefaultUI: false,
  })

  useEffect(() => {
    if (!map) return

    const activatePolygonDrawing = () => {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
        console.log('[MapCanvas] drawing mode ativado imediatamente')
        pendingActivateRef.current = false
      } else {
        console.log('[MapCanvas] DrawingManager ainda não disponível; ativação pendente')
        pendingActivateRef.current = true
      }
    }

    console.log('[MapCanvas] onReady chamado, mapa disponível')
    onReady?.({ map, setCenter, activatePolygonDrawing })
  }, [map, onReady, setCenter])

  useEffect(() => {
    if (!map) return
    map.setCenter(center)
    map.setZoom(zoom)
  }, [map, center, zoom])

  useEffect(() => {
    if (!map || mode === 'view') return

    if (markerOptions && mode === 'marker') {
      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({
          map,
          draggable: markerOptions.draggable ?? false,
          position: markerOptions.position ?? center,
        })

        if (markerOptions.onPositionChanged) {
          markerRef.current.addListener('dragend', () => {
            const pos = markerRef.current?.getPosition()
            if (!pos) return
            markerOptions.onPositionChanged?.({ lat: pos.lat(), lng: pos.lng() })
          })
        }
      } else if (markerOptions.position) {
        markerRef.current.setPosition(markerOptions.position)
      }
    } else if (markerRef.current) {
      markerRef.current.setMap(null)
      markerRef.current = null
    }
  }, [map, mode, markerOptions, center])

  const polygonPathToArray = useCallback((path: google.maps.MVCArray<google.maps.LatLng>) => {
    const points: LatLngPoint[] = []
    for (let i = 0; i < path.getLength(); i += 1) {
      const point = path.getAt(i)
      points.push({ lat: point.lat(), lng: point.lng() })
    }
    return points
  }, [])

  useEffect(() => {
    if (!map) return
    if (!polygonOptions) {
      polygonRef.current?.setMap(null)
      polygonRef.current = null
      return
    }

    const createPolygon = () => {
      const polygon = new google.maps.Polygon({
        map,
        paths: polygonOptions.path,
        strokeColor: '#1f2937',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#4b5563',
        fillOpacity: 0.18,
        draggable: polygonOptions.draggable ?? false,
        editable: polygonOptions.editable ?? false,
      })

      if (polygonOptions.onPathChanged) {
        const notify = () => {
          const path = polygon.getPath()
          polygonOptions.onPathChanged?.(polygonPathToArray(path))
        }
        polygon.getPath().addListener('set_at', () => notify())
        polygon.getPath().addListener('insert_at', () => notify())
        polygon.getPath().addListener('remove_at', () => notify())
        polygon.addListener('dragend', () => notify())
      }
      polygonRef.current = polygon
    }

    if (!polygonRef.current) {
      createPolygon()
    } else {
      polygonRef.current.setOptions({
        paths: polygonOptions.path,
        editable: polygonOptions.editable ?? false,
        draggable: polygonOptions.draggable ?? false,
      })
    }
  }, [map, polygonOptions, polygonPathToArray])

  useEffect(() => {
    const drawingLib = typeof window !== 'undefined' ? window.google?.maps?.drawing : undefined
    const drawingEnabled = drawingOptions?.enabled ?? mode === 'polygon'
    if (!map) {
      console.log('[MapCanvas] desenho: mapa ainda não disponível')
    }
    if (!drawingEnabled) {
      console.log('[MapCanvas] desenho: drawingOptions disabled', drawingOptions)
    }
    if (!drawingLib) {
      console.log('[MapCanvas] desenho: biblioteca drawing indisponível')
    }
    if (!map || !drawingEnabled || !drawingLib) {
      drawingManagerRef.current?.setMap(null)
      drawingManagerRef.current = null
      return
    }

    if (!drawingManagerRef.current) {
      const drawingManager = new drawingLib.DrawingManager({
        drawingMode: drawingLib.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [drawingLib.OverlayType.POLYGON],
        },
        polygonOptions: {
          strokeColor: '#1f2937',
          strokeWeight: 2,
          strokeOpacity: 0.9,
          fillColor: '#4b5563',
          fillOpacity: 0.18,
        },
      })

      drawingManager.setMap(map)
      drawingManager.setDrawingMode(drawingLib.OverlayType.POLYGON)
      console.log('[MapCanvas] DrawingManager inicializado e modo polígono ativado')

      drawingManager.addListener('polygoncomplete', (polygon: google.maps.Polygon) => {
        if (drawingOptions?.onPolygonComplete) {
          const path = polygon.getPath()
          drawingOptions.onPolygonComplete(polygonPathToArray(path))
        }
        polygon.setMap(null)
      })

      drawingManagerRef.current = drawingManager
      if (pendingActivateRef.current) {
        drawingManager.setDrawingMode(drawingLib.OverlayType.POLYGON)
        console.log('[MapCanvas] Drawing mode ativado após pendência')
        pendingActivateRef.current = false
      }
    }
  }, [map, drawingOptions, polygonPathToArray, mode])

  useEffect(() => {
    if (drawingOptions?.enabled && drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
    }
  }, [drawingOptions?.enabled])

  const renderStatus = useMemo(() => {
    if (status === 'loading') {
      return <div style={{ padding: '1rem' }}>Carregando mapa…</div>
    }
    if (status === 'error') {
      return <div style={{ padding: '1rem', color: '#b91c1c' }}>{error?.message ?? 'Erro ao carregar mapa.'}</div>
    }
    return null
  }, [status, error])

  return (
    <div className="map-container" role="presentation">
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 340 }} />
      {renderStatus}
    </div>
  )
}
