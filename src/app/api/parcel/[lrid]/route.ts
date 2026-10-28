import { NextRequest, NextResponse } from 'next/server'
import { fetchParcelById } from '@/lib/landrecords'
import { enrichParcel } from '@/lib/scoring'
import { wildfireHazards } from '@/lib/wildfire'
import type { BuildTribe } from '@/types/parcel'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lrid: string }> }
) {
  const tribe = (req.nextUrl.searchParams.get('tribe') ?? 'offgrid') as BuildTribe

  try {
    const { lrid } = await params
    const feature = await fetchParcelById(lrid)
    if (!feature) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
    }
    const [wildfire] = await wildfireHazards([{ ...feature.properties, geometry: feature.geometry }])
    const parcel = enrichParcel(feature.properties, tribe, feature.geometry, wildfire)
    return NextResponse.json(parcel)
  } catch (err) {
    console.error('[/api/parcel]', err)
    return NextResponse.json({ error: 'Failed to load lot detail.' }, { status: 500 })
  }
}
