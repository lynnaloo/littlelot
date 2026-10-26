/**
 * Tile proxy — forwards MapLibre tile requests to landrecords.us
 * with the API key injected server-side as a Bearer token.
 *
 * Vector tiles:  /api/tiles/{z}/{x}/{y}.pbf
 * Raster tiles:  /api/tiles/raster/{z}/{x}/{y}.png
 */

import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.LANDRECORDS_API_BASE_URL ?? 'https://api.landrecords.us'
const API_KEY  = process.env.LANDRECORDS_API_KEY ?? ''

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const slug = params.slug

  let upstreamUrl: string

  if (slug[0] === 'raster') {
    // /api/tiles/raster/{z}/{x}/{y}.png
    const [, z, x, yPng] = slug
    const y = yPng.replace('.png', '')
    upstreamUrl = `${BASE_URL}/pro:parcel_us@EPSG:3857x2@png8/${z}/${x}/${y}.png8`
  } else {
    // /api/tiles/{z}/{x}/{y}.pbf
    const [z, x, yPbf] = slug
    const y = yPbf.replace('.pbf', '')
    upstreamUrl = `${BASE_URL}/pro:parcel_us@EPSG:3857x2@pbf/${z}/${x}/${y}.pbf`
  }

  const res = await fetch(upstreamUrl, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    next: { revalidate: 86400 }, // tiles are stable — cache for 24h
  })

  if (!res.ok) {
    return new NextResponse(null, { status: res.status })
  }

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const body = await res.arrayBuffer()

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
