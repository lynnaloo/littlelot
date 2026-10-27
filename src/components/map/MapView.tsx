'use client'

/**
 * MapView — lots on a MapLibre map.
 *
 * - Basemap: OpenFreeMap (free, no key).
 * - Lot lines for the whole area: landrecords.us raster tiles through our proxy.
 * - Search results: drawn from our own results, colored by score.
 *   Dots when zoomed out, outlines when zoomed in.
 */

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Parcel } from '@/types/parcel'
import { SCORE_HEX, SCORE_THRESHOLDS } from '@/components/ui/ScorePill'

interface MapViewProps {
  parcels: Parcel[]
  selectedLrid?: string
  onSelect?: (parcel: Parcel) => void
  // Detail panel: one lot, zoomed in close
  compact?: boolean
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const LINES_MIN_ZOOM = 13   // lot lines are unreadable further out
const OUTLINE_ZOOM   = 14   // switch result dots to outlines

const scoreColor: maplibregl.ExpressionSpecification = [
  'step', ['get', 'score'],
  SCORE_HEX.poor,
  SCORE_THRESHOLDS.fair, SCORE_HEX.fair,
  SCORE_THRESHOLDS.good, SCORE_HEX.good,
]

function toGeoJSON(parcels: Parcel[]) {
  const shapes: GeoJSON.Feature[] = []
  const points: GeoJSON.Feature[] = []
  for (const p of parcels) {
    const properties = { lrid: p.lrid, score: p.readinessScore }
    if (p.geometry) shapes.push({ type: 'Feature', geometry: p.geometry, properties })
    // surfpoint is guaranteed inside the lot, unlike the centroid
    points.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.surfpointx, p.surfpointy] },
      properties,
    })
  }
  return {
    shapes: { type: 'FeatureCollection', features: shapes } as GeoJSON.FeatureCollection,
    points: { type: 'FeatureCollection', features: points } as GeoJSON.FeatureCollection,
  }
}

// Frame whole outlines, not just one point per lot, so a big lot isn't cropped
function boundsOf(parcels: Parcel[]): maplibregl.LngLatBounds | null {
  if (parcels.length === 0) return null
  const bounds = new maplibregl.LngLatBounds()
  for (const p of parcels) {
    bounds.extend([p.surfpointx, p.surfpointy])
    const g = p.geometry
    const rings = g?.type === 'Polygon' ? g.coordinates
                : g?.type === 'MultiPolygon' ? g.coordinates.flat()
                : []
    for (const ring of rings) for (const [lng, lat] of ring) bounds.extend([lng, lat])
  }
  return bounds
}

export function MapView({ parcels, selectedLrid, onSelect, compact = false }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const loadedRef    = useRef(false)
  // Latest props for map event handlers, which are bound once
  const parcelsRef   = useRef(parcels)
  const onSelectRef  = useRef(onSelect)
  parcelsRef.current  = parcels
  onSelectRef.current = onSelect

  // Create the map once
  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [-98.5, 39.8],
      zoom: 3,
      attributionControl: { compact: true },
    })
    // Compact attribution starts expanded, which covers the small detail map
    map.once('load', () => {
      containerRef.current?.querySelector('.maplibregl-ctrl-attrib')
        ?.classList.remove('maplibregl-compact-show')
    })
    mapRef.current = map
    if (!compact) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.addSource('lot-lines', {
        type: 'raster',
        tiles: [`${window.location.origin}/api/tiles/raster/{z}/{x}/{y}.png`],
        tileSize: 512,
        minzoom: LINES_MIN_ZOOM,
        attribution: 'Lot data <a href="https://landrecords.us" target="_blank">landrecords.us</a>',
      })
      map.addLayer({ id: 'lot-lines', type: 'raster', source: 'lot-lines',
                     paint: { 'raster-opacity': 0.55 } })

      const { shapes, points } = toGeoJSON(parcelsRef.current)
      map.addSource('lots', { type: 'geojson', data: shapes, promoteId: 'lrid' })
      map.addSource('lot-points', { type: 'geojson', data: points, promoteId: 'lrid' })

      map.addLayer({
        id: 'lots-fill', type: 'fill', source: 'lots', minzoom: OUTLINE_ZOOM,
        paint: {
          'fill-color': scoreColor,
          'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.35, 0.15],
        },
      })
      map.addLayer({
        id: 'lots-line', type: 'line', source: 'lots', minzoom: OUTLINE_ZOOM,
        paint: {
          'line-color': scoreColor,
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3.5, 1.5],
        },
      })
      map.addLayer({
        id: 'lots-dot', type: 'circle', source: 'lot-points', maxzoom: OUTLINE_ZOOM,
        paint: {
          'circle-color': scoreColor,
          'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 8, 5],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1.5,
        },
      })

      for (const layer of ['lots-fill', 'lots-dot']) {
        map.on('click', layer, e => {
          const lrid = e.features?.[0]?.properties?.lrid
          const parcel = parcelsRef.current.find(p => p.lrid === lrid)
          if (parcel) onSelectRef.current?.(parcel)
        })
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = onSelectRef.current ? 'pointer' : '' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      }

      loadedRef.current = true
      map.fire('lots-ready')
    })

    return () => {
      loadedRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [compact])

  // Update lots and fit the view when the set of lots changes (not on every
  // render, so a buyer's panning isn't undone)
  const lotKey = parcels.map(p => p.lrid).join(',')
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const parcels = parcelsRef.current
      const { shapes, points } = toGeoJSON(parcels)
      ;(map.getSource('lots') as maplibregl.GeoJSONSource | undefined)?.setData(shapes)
      ;(map.getSource('lot-points') as maplibregl.GeoJSONSource | undefined)?.setData(points)
      const bounds = boundsOf(parcels)
      if (bounds) {
        map.fitBounds(bounds, {
          padding: compact ? 20 : 40,
          maxZoom: compact ? 17 : 15,
          duration: 0,
        })
      }
    }
    if (loadedRef.current) apply()
    else map.once('lots-ready', apply)
  }, [lotKey, compact])

  // Highlight the selected lot
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedLrid) return
    const apply = () => {
      for (const source of ['lots', 'lot-points']) {
        map.removeFeatureState({ source })
        map.setFeatureState({ source, id: selectedLrid }, { selected: true })
      }
    }
    if (loadedRef.current) apply()
    else map.once('lots-ready', apply)
  }, [selectedLrid])

  return <div ref={containerRef} className="w-full h-full" />
}
