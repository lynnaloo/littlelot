import { NextRequest, NextResponse } from 'next/server'
import { loadLot } from '@/lib/lot'
import { parseTribe } from '@/lib/lotUrl'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lrid: string }> }
) {
  const tribe = parseTribe(req.nextUrl.searchParams.get('tribe'), 'offgrid')

  try {
    const { lrid } = await params
    const parcel = await loadLot(lrid, tribe)
    if (!parcel) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 })
    }
    return NextResponse.json(parcel)
  } catch (err) {
    console.error('[/api/parcel]', err)
    return NextResponse.json({ error: 'Failed to load lot detail.' }, { status: 500 })
  }
}
