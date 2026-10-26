import { NextRequest, NextResponse } from 'next/server'
import { fetchParcelById } from '@/lib/landrecords'
import { enrichParcel } from '@/lib/scoring'
import type { BuildTribe } from '@/types/parcel'

export async function GET(
  req: NextRequest,
  { params }: { params: { lrid: string } }
) {
  const tribe = (req.nextUrl.searchParams.get('tribe') ?? 'offgrid') as BuildTribe

  try {
    const feature = await fetchParcelById(params.lrid)
    if (!feature) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
    }
    const parcel = enrichParcel(feature.properties, tribe)
    return NextResponse.json(parcel)
  } catch (err) {
    console.error('[/api/parcel]', err)
    return NextResponse.json({ error: 'Failed to load lot detail.' }, { status: 500 })
  }
}
