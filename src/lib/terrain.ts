/**
 * terrain.ts — server-side buildable ground estimate
 *
 * Asks the USGS 3DEP elevation service (free, no key) for a histogram of
 * slope across the lot outline, in whole degrees, then reports how much of
 * the lot is under a 15% grade. That's a common limit for a driveway, a
 * septic field, or setting a tiny home without heavy grading.
 *
 * A guide, not a site survey: a 10 m grid smooths out small banks and ditches.
 * Takes about 4–8 seconds, so it runs for the open lot only. Call from API routes.
 */

import type { BuildableGround } from '@/types/parcel'
import { SQ_METRES_PER_ACRE } from '@/lib/scoring'

const HISTOGRAM_URL = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/computeHistograms'

const MAX_GRADE = 15                                            // percent
const MAX_DEGREES = Math.atan(MAX_GRADE / 100) * 180 / Math.PI  // about 8.5°

// 10 m cells, coarser on big lots so a request stays around 100k cells
const MIN_CELL_METRES = 10
const MAX_CELLS = 100_000

interface Histogram { size: number; min: number; max: number; counts: number[] }

function toRings(geometry: GeoJSON.Geometry | null): GeoJSON.Position[][] | null {
  if (geometry?.type === 'Polygon')      return geometry.coordinates
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.flat()
  return null
}

// null when there's no outline or the lot is too small to measure
export async function buildableGround(
  geometry: GeoJSON.Geometry | null,
  acres: number,
): Promise<BuildableGround | null> {
  const rings = toRings(geometry)
  if (!rings || acres <= 0) return null

  const cell = Math.max(MIN_CELL_METRES, Math.ceil(Math.sqrt(acres * SQ_METRES_PER_ACRE / MAX_CELLS)))
  const res = await fetch(HISTOGRAM_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      geometry:      JSON.stringify({ rings, spatialReference: { wkid: 4326 } }),
      geometryType:  'esriGeometryPolygon',
      renderingRule: JSON.stringify({ rasterFunction: 'Slope Degrees' }),
      pixelSize:     JSON.stringify({ x: cell, y: cell, spatialReference: { wkid: 3857 } }),
      f:             'json',
    }),
    signal:  AbortSignal.timeout(25_000),
  })
  if (!res.ok) throw new Error(`USGS slope error: ${res.status}`)
  const json = await res.json() as { histograms?: Histogram[]; error?: unknown }
  if (json.error) throw new Error(`USGS slope error: ${JSON.stringify(json.error)}`)

  const h = json.histograms?.[0]
  const total = h?.counts.reduce((a, b) => a + b, 0) ?? 0
  if (!h || total === 0) return null

  const width = (h.max - h.min) / h.size
  let flat = 0
  let seen = 0
  let medianDegrees = 0
  h.counts.forEach((count, i) => {
    // Only bins entirely under the limit count as flat, so we never round up
    if (h.min + (i + 1) * width <= MAX_DEGREES) flat += count
    if (seen < total / 2 && seen + count >= total / 2) medianDegrees = h.min + (i + 0.5) * width
    seen += count
  })

  const flatShare = flat / total
  return {
    flatAcres:    flatShare * acres,
    flatShare,
    typicalGrade: Math.round(Math.tan(medianDegrees * Math.PI / 180) * 100),
  }
}
