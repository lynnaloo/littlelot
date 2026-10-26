/**
 * GET /api/parcels
 *
 * Query params mirror SearchFilters:
 *   tribe, geoid, bbox, minAcres, maxAcres, maxLandValue,
 *   accessTypes, noHoa, noFloodRisk, noStructures,
 *   minScore, sortBy, page, pageSize
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchParcels } from '@/lib/landrecords'
import { enrichParcel } from '@/lib/scoring'
import type { SearchFilters, BuildTribe, AccessType } from '@/types/parcel'

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
    accessTypes:  p.has('accessTypes')
                    ? (p.get('accessTypes')!.split(',') as AccessType[])
                    : undefined,
    noHoa:        p.get('noHoa') === 'true',
    noFloodRisk:  p.get('noFloodRisk') === 'true',
    noStructures: p.get('noStructures') === 'true',
    minScore:     p.has('minScore')  ? Number(p.get('minScore'))  : undefined,
    sortBy:       (p.get('sortBy') ?? 'score') as SearchFilters['sortBy'],
    page:         p.has('page')      ? Number(p.get('page'))      : 0,
    pageSize:     p.has('pageSize')  ? Number(p.get('pageSize'))  : 10,
  }

  if (!filters.geoid && !filters.bbox) {
    return NextResponse.json(
      { error: 'Pick a county or map area to search.' },
      { status: 400 }
    )
  }

  try {
    const { features, total } = await fetchParcels(filters)

    // Enrich each parcel with score, plain-text zoning, etc.
    let parcels = features.map(f => enrichParcel(f.properties, tribe))

    // Client-side acreage filter (WFS calcarea filter is expensive)
    if (filters.minAcres) {
      parcels = parcels.filter(p => p.acreage >= filters.minAcres!)
    }
    if (filters.maxAcres) {
      parcels = parcels.filter(p => p.acreage <= filters.maxAcres!)
    }

    // Score filter
    if (filters.minScore) {
      parcels = parcels.filter(p => p.readinessScore >= filters.minScore!)
    }

    // Sort
    switch (filters.sortBy) {
      case 'score':
        parcels.sort((a, b) => b.readinessScore - a.readinessScore)
        break
      case 'acres_desc':
        parcels.sort((a, b) => b.acreage - a.acreage)
        break
      case 'value_asc':
        parcels.sort((a, b) => (a.landvalue ?? 0) - (b.landvalue ?? 0))
        break
      case 'town_dist':
        parcels.sort((a, b) => (a.distanceToTown ?? 999) - (b.distanceToTown ?? 999))
        break
    }

    return NextResponse.json({
      parcels,
      total,
      page:     filters.page,
      pageSize: filters.pageSize,
    })
  } catch (err) {
    console.error('[/api/parcels]', err)
    return NextResponse.json(
      { error: 'Failed to fetch listings. Please try again.' },
      { status: 500 }
    )
  }
}
