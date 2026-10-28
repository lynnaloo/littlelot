/**
 * wildfire.ts — server-side wildfire hazard lookup
 *
 * Reads the Forest Service's 2023 Wildfire Hazard Potential map (270 m cells,
 * free, no key). It ranks how hard a fire would be to control, not how likely
 * one is. Classes: 1 very low to 5 very high, 6 non-burnable, 7 water.
 *
 * Each lot is sampled at its inside point and along its boundary, and gets the
 * highest class found. A whole search batch goes in one or two requests.
 * Call this from API routes.
 */

import type { ParcelAttributes, WildfireHazard } from '@/types/parcel'

const SAMPLES_URL = 'https://imagery.geoplatform.gov/iipp/rest/services/Fire_Aviation/'
                  + 'USFS_EDW_RMRS_WildfireHazardPotentialClassified/ImageServer/getSamples'

// The service returns at most 1,000 samples per request
const MAX_POINTS_PER_REQUEST = 1000
// Boundary points per lot, on top of the inside point. Cells are 270 m, so
// this covers most lots; very large ones may miss an interior pocket.
const BOUNDARY_POINTS = 8

const BURNABLE: WildfireHazard[] = ['very_low', 'low', 'moderate', 'high', 'very_high']

type Lot = { geometry: GeoJSON.Geometry | null }
         & Pick<ParcelAttributes, 'surfpointx' | 'surfpointy'>

function classToHazard(value: number): WildfireHazard {
  if (value >= 1 && value <= 5) return BURNABLE[value - 1]
  if (value === 6 || value === 7) return 'non_burnable'
  return 'unknown'
}

// Highest burnable class wins; non-burnable only when nothing on the lot burns
function worst(hazards: WildfireHazard[]): WildfireHazard {
  for (const hazard of [...BURNABLE].reverse()) {
    if (hazards.includes(hazard)) return hazard
  }
  return hazards.includes('non_burnable') ? 'non_burnable' : 'unknown'
}

function samplePoints(lot: Lot): GeoJSON.Position[] {
  const g = lot.geometry
  const outer = g?.type === 'Polygon'      ? g.coordinates[0]
              : g?.type === 'MultiPolygon' ? g.coordinates.flatMap(p => p[0])
              : []
  const step = Math.max(1, Math.ceil(outer.length / BOUNDARY_POINTS))
  const boundary = outer.filter((_, i) => i % step === 0).slice(0, BOUNDARY_POINTS)
  return [[lot.surfpointx, lot.surfpointy], ...boundary]
}

async function sample(points: GeoJSON.Position[]): Promise<WildfireHazard[]> {
  const res = await fetch(SAMPLES_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      geometry:             JSON.stringify({ points, spatialReference: { wkid: 4326 } }),
      geometryType:         'esriGeometryMultipoint',
      returnFirstValueOnly: 'true',
      f:                    'json',
    }),
    signal:  AbortSignal.timeout(10_000),
  })
  const json = res.ok
    ? await res.json().catch(() => null) as { samples?: { locationId: number; value: string }[] } | null
    : null
  if (!json?.samples) throw new Error(`Wildfire samples failed: ${res.status}`)

  const out: WildfireHazard[] = points.map(() => 'unknown')
  for (const s of json.samples) out[s.locationId] = classToHazard(Number(s.value))
  return out
}

// One hazard per lot, in order. A failed lookup gives 'unknown' rather than
// failing the search.
export async function wildfireHazards(lots: Lot[]): Promise<WildfireHazard[]> {
  const perLot = lots.map(samplePoints)

  // Pack whole lots into requests of up to 1,000 points
  const chunks: { lots: number[]; points: GeoJSON.Position[] }[] = []
  perLot.forEach((points, i) => {
    let chunk = chunks[chunks.length - 1]
    if (!chunk || chunk.points.length + points.length > MAX_POINTS_PER_REQUEST) {
      chunk = { lots: [], points: [] }
      chunks.push(chunk)
    }
    chunk.lots.push(i)
    chunk.points.push(...points)
  })

  const result: WildfireHazard[] = lots.map(() => 'unknown')
  await Promise.all(chunks.map(async chunk => {
    try {
      const samples = await sample(chunk.points)
      let offset = 0
      for (const i of chunk.lots) {
        result[i] = worst(samples.slice(offset, offset + perLot[i].length))
        offset += perLot[i].length
      }
    } catch (err) {
      console.error('[wildfire]', err)
    }
  }))
  return result
}
