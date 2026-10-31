'use client'

/**
 * MapView — lots on a MapLibre map.
 *
 * - Basemap: OpenFreeMap (free, no key), or USGS satellite imagery (public
 *   domain, no key) via the toggle. The lot detail map opens on satellite.
 * - Lot lines for the whole area, through our tile proxy: landrecords.us
 *   raster tiles out to zoom 15, then vector tiles, which stay sharp up close.
 * - Search results: drawn from our own results, colored by score.
 *   Dots when zoomed out, outlines when zoomed in.
 */

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Parcel } from '@/types/parcel'
import { SCORE_HEX, SCORE_THRESHOLDS } from '@/components/ui/ScorePill'
import tailwindConfig from '../../../tailwind.config'

const colors = tailwindConfig.theme?.extend?.colors as Record<string, string>

interface MapViewProps {
  parcels: Parcel[]
  selectedLrid?: string
  onSelect?: (parcel: Parcel) => void
  // Detail panel: one lot, zoomed in close
  compact?: boolean
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
// USDA NAIP aerial photos. Rural coverage stops at zoom 16; the map scales it up past that.
const SATELLITE_TILES = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_MAX_ZOOM = 16
const LINES_MIN_ZOOM = 13   // lot lines are unreadable further out
const VECTOR_ZOOM    = 15   // vector lot lines from here; tiles are too heavy further out (750 KB at 14)
const VECTOR_MAX_ZOOM = 16  // deepest vector tiles we fetch; the map scales them up past this
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
  const selectedRef  = useRef(selectedLrid)
  parcelsRef.current  = parcels
  onSelectRef.current = onSelect
  selectedRef.current = selectedLrid
  // The first fit after the map opens goes to the selected lot, if any, so a
  // lot picked in the list is in view when the buyer switches to the map
  const firstFitRef  = useRef(true)
  const [satellite, setSatellite] = useState(compact)
  const satelliteRef = useRef(satellite)
  satelliteRef.current = satellite

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
      // Under the basemap's labels, so road and town names still show
      map.addSource('satellite', {
        type: 'raster',
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        maxzoom: SATELLITE_MAX_ZOOM,
        attribution: 'Imagery <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map" target="_blank">USGS</a>',
      })
      map.addLayer({
        id: 'satellite', type: 'raster', source: 'satellite',
        layout: { visibility: satelliteRef.current ? 'visible' : 'none' },
      }, map.getStyle().layers.find(l => l.type === 'symbol')?.id)

      map.addSource('lot-lines', {
        type: 'raster',
        tiles: [`${window.location.origin}/api/tiles/raster/{z}/{x}/{y}.png`],
        tileSize: 512,
        minzoom: LINES_MIN_ZOOM,
        attribution: 'Lot data <a href="https://landrecords.us" target="_blank">landrecords.us</a>',
      })
      map.addLayer({ id: 'lot-lines', type: 'raster', source: 'lot-lines', maxzoom: VECTOR_ZOOM,
                     paint: { 'raster-opacity': 0.55 } })

      map.addSource('lot-lines-vector', {
        type: 'vector',
        tiles: [`${window.location.origin}/api/tiles/{z}/{x}/{y}.pbf`],
        minzoom: VECTOR_ZOOM,
        maxzoom: VECTOR_MAX_ZOOM,
        promoteId: 'lrid',
      })
      map.addLayer({
        id: 'lot-lines-vector', type: 'line', source: 'lot-lines-vector',
        'source-layer': 'parcels', minzoom: VECTOR_ZOOM,
        paint: {
          'line-color': colors.ink,
          'line-opacity': 0.6,
          'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.6, 18, 1.4],
        },
      })

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
          'line-width': ['interpolate', ['linear'], ['zoom'],
            OUTLINE_ZOOM, ['case', ['boolean', ['feature-state', 'selected'], false], 3, 1.5],
            18,           ['case', ['boolean', ['feature-state', 'selected'], false], 5, 3]],
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
      const selected = firstFitRef.current && !compact
        ? parcels.find(p => p.lrid === selectedRef.current)
        : undefined
      firstFitRef.current = false
      const bounds = boundsOf(selected ? [selected] : parcels)
      if (bounds) {
        map.fitBounds(bounds, {
          padding: compact ? 20 : selected ? 80 : 40,
          maxZoom: compact || selected ? 17 : 15,
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

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return   // the load handler reads satelliteRef
    map.setLayoutProperty('satellite', 'visibility', satellite ? 'visible' : 'none')
  }, [satellite])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <button onClick={() => setSatellite(s => !s)}
              className="absolute top-2 left-2 h-6 px-2 bg-white/90 border border-border rounded
                         text-[10px] font-semibold text-ink-2 hover:text-accent transition-colors">
        {satellite ? 'Map' : 'Satellite'}
      </button>
    </div>
  )
}
