/**
 * GET /api/parcels
 *
 * Query params mirror SearchFilters:
 *   tribe, geoid, bbox, minAcres, maxAcres, maxLandValue,
 *   noHoa, noFloodRisk, noStructures,
 *   minScore, sortBy (score, acres_asc, acres_desc, value_asc, sold_desc), start
 *
 * Returns a SearchResult. Pass `next` back as `start` for more lots.
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchParcelBatch } from '@/lib/landrecords'
import { enrichParcel } from '@/lib/scoring'
import { wildfireHazards } from '@/lib/wildfire'
import type { SearchFilters, SearchResult, BuildTribe, Parcel } from '@/types/parcel'
import { HOA_DATA_AVAILABLE } from '@/types/parcel'

// Lots per batch (10 API requests in parallel, about a second)
const BATCH_SIZE = 100
// HOA and score checks run after the API, so a batch can come back thin.
// Keep fetching until we have this many, up to MAX_BATCHES per request.
const MIN_RESULTS = 20
const MAX_BATCHES = 3

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams

  const tribe = (p.get('tribe') ?? 'offgrid') as BuildTribe

  const filters: SearchFilters = {
    tribe,
    geoid:        p.get('geoid') ?? undefined,
    bbox:         p.get('bbox')
                    ? (p.get('bbox')!.split(',').map(Number) as [number,number,number,number])
                    : undefined,
    minAcres:     p.has('minAcres')     ? Number(p.get('minAcres'))     : undefined,
    maxAcres:     p.has('maxAcres')     ? Number(p.get('maxAcres'))     : undefined,
    maxLandValue: p.has('maxLandValue') ? Number(p.get('maxLandValue')) : undefined,
    noHoa:        p.get('noHoa') === 'true',
    noFloodRisk:  p.get('noFloodRisk') === 'true',
    noStructures: p.get('noStructures') === 'true',
    minScore:     p.has('minScore')  ? Number(p.get('minScore'))  : undefined,
    sortBy:       (p.get('sortBy') ?? 'score') as SearchFilters['sortBy'],
    start:        p.has('start')     ? Number(p.get('start'))     : 0,
  }

  if (!filters.geoid && !filters.bbox) {
    return NextResponse.json(
      { error: 'Pick a county or map area to search.' },
      { status: 400 }
    )
  }

  try {
    const parcels: Parcel[] = []
    let matched: number | null = null
    let next: number | null = filters.start ?? 0

    for (let i = 0; i < MAX_BATCHES && next != null && parcels.length < MIN_RESULTS; i++) {
      const batch = await fetchParcelBatch(filters, next, BATCH_SIZE)
      matched ??= batch.matched
      next      = batch.next
      const wildfire = await wildfireHazards(
        batch.features.map(f => ({ ...f.properties, geometry: f.geometry }))
      )
      parcels.push(...applyChecks(
        batch.features.map((f, i) => enrichParcel(f.properties, tribe, f.geometry, wildfire[i])),
        filters
      ))
    }

    // Sort within what we fetched. Lot size, and lowest value or latest sale
    // when the query has room for them, are already sorted by the API across
    // the county.
    switch (filters.sortBy) {
      case 'acres_desc':
        parcels.sort((a, b) => b.acreage - a.acreage)
        break
      case 'acres_asc':
        parcels.sort((a, b) => a.acreage - b.acreage)
        break
      case 'sold_desc':
        // ISO dates sort as text; lots with no sale on record go last
        parcels.sort((a, b) => (b.saledate ?? '').localeCompare(a.saledate ?? ''))
        break
      case 'value_asc':
        // Lots with no value on record go last
        parcels.sort((a, b) => (a.landvalue || Infinity) - (b.landvalue || Infinity))
        break
      default:
        parcels.sort((a, b) => b.readinessScore - a.readinessScore)
    }

    const result: SearchResult = { parcels, matched, next }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/parcels]', err)
    return NextResponse.json(
      { error: 'Failed to fetch listings. Please try again.' },
      { status: 500 }
    )
  }
}

// Backstops for filters the query may have dropped (3-predicate limit) or
// couldn't apply (lots with no calcarea fall back to taxacres), plus the
// checks only we can do (HOA, score)
function applyChecks(parcels: Parcel[], filters: SearchFilters): Parcel[] {
  return parcels.filter(p =>
    (!filters.minAcres     || p.acreage >= filters.minAcres) &&
    (!filters.maxAcres     || p.acreage <= filters.maxAcres) &&
    (!filters.maxLandValue || (p.landvalue != null && p.landvalue <= filters.maxLandValue)) &&
    // We can't confirm "no HOA" for most lots, so drop only lots known to
    // have CC&Rs. Unknown lots stay and are labeled "verify".
    (!HOA_DATA_AVAILABLE || !filters.noHoa || p.hoaStatus !== 'present') &&
    (!filters.minScore     || p.readinessScore >= filters.minScore)
  )
}
