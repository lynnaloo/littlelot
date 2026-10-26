/**
 * landrecords.ts — server-side API client for landrecords.us
 *
 * All functions in this file run server-side only (API routes).
 * The LANDRECORDS_API_KEY env var is never exposed to the browser.
 *
 * API docs: https://landrecords.us/documentation/web-api
 */

import type { ParcelAttributes, SearchFilters, AccessType } from '@/types/parcel'

const BASE_URL = process.env.LANDRECORDS_API_BASE_URL ?? 'https://api.landrecords.us'
const API_KEY  = process.env.LANDRECORDS_API_KEY

if (!API_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('LANDRECORDS_API_KEY is not set')
}

// ── WFS endpoint ─────────────────────────────────────────────────────────────

const WFS_BASE = `${BASE_URL}/pro/wfs`

// The API takes the key as a Bearer token. Max 10 features per request.
const AUTH_HEADERS = { Authorization: `Bearer ${API_KEY ?? ''}` }
const MAX_COUNT = 10

function wfsUrl(params: Record<string, string>): string {
  const base: Record<string, string> = {
    service:     'WFS',
    version:     '2.0.0',
    outputFormat:'application/json',
    typeNames:   'pro:parcel_us',
    count:       String(MAX_COUNT),
    startIndex:  '0',
  }
  const merged = { ...base, ...params }
  return `${WFS_BASE}?${new URLSearchParams(merged).toString()}`
}

// ── Build a CQL filter from SearchFilters ────────────────────────────────────
// Rules from the API docs (LIKE on geoid is refused, use = instead):
//   - Must include at least one indexed field as an anchor
//   - Max 3 additional predicates beyond the anchor
//   - Indexed fields: geoid, lrid, ownername, accesstype, ownertype, placetype
//     or a spatial predicate

function buildCqlFilter(filters: SearchFilters): string {
  const clauses: string[] = []

  // Anchor: county geoid (5-digit statefp + countyfp)
  if (filters.geoid) {
    clauses.push(`geoid='${filters.geoid}'`)
  } else if (filters.bbox) {
    const [minLng, minLat, maxLng, maxLat] = filters.bbox
    clauses.push(
      `BBOX(geom,${minLng},${minLat},${maxLng},${maxLat})`
    )
  }

  // Additional predicates (max 3 beyond anchor)
  const extra: string[] = []

  if (filters.noStructures) {
    extra.push(`numbldgs=0`)
  }

  if (filters.accessTypes && filters.accessTypes.length > 0) {
    const vals = filters.accessTypes.map(a => `'${a}'`).join(',')
    extra.push(`accesstype IN (${vals})`)
  }

  if (filters.noFloodRisk) {
    extra.push(`fldzone='X'`)
  }

  if (filters.maxLandValue) {
    extra.push(`landvalue<=${filters.maxLandValue}`)
  }

  // Combine — anchor + up to 3 extras
  const allClauses = [...clauses, ...extra.slice(0, 3)]
  return allClauses.join(' AND ')
}

// ── Fetch parcels matching search filters ────────────────────────────────────

export async function fetchParcels(
  filters: SearchFilters
): Promise<{ features: GeoJSON.Feature<GeoJSON.Geometry, ParcelAttributes>[]; total: number }> {
  const cql = buildCqlFilter(filters)
  const page     = filters.page ?? 0
  const pageSize = Math.min(filters.pageSize ?? MAX_COUNT, MAX_COUNT)

  const url = wfsUrl({
    request:    'GetFeature',
    cql_filter: cql,
    count:      String(pageSize),
    startIndex: String(page * pageSize),
    // Request only the attributes we need to keep response size down
    propertyName: [
      'lrid','geoid','statefp','countyfp',
      'ownername','owneraddr','parceladdr',
      'usecode','usedesc','zoningcode','zoningdesc',
      'taxacres','calcarea','landvalue','imprvalue',
      'numbldgs','yearbuilt','saleamt','saledate',
      'ownertype','accesstype','fldzone',
      'elevmin','elevavg','elevmax',
      'centroidx','centroidy','surfpointx','surfpointy',
      'placetype','placename',
      'geom',
    ].join(','),
  })

  const res = await fetch(url, {
    headers: AUTH_HEADERS,
    next: { revalidate: 300 }, // cache for 5 minutes
  })

  if (!res.ok) {
    throw new Error(`landrecords WFS error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  return {
    features: json.features ?? [],
    total:    json.numberMatched ?? json.numberReturned ?? 0,
  }
}

// ── Fetch a single parcel by lrid ─────────────────────────────────────────────

export async function fetchParcelById(
  lrid: string
): Promise<GeoJSON.Feature<GeoJSON.Geometry, ParcelAttributes> | null> {
  const url = wfsUrl({
    request:    'GetFeature',
    cql_filter: `lrid='${lrid}'`,
    count:      '1',
  })

  const res = await fetch(url, { headers: AUTH_HEADERS, next: { revalidate: 60 } })

  if (!res.ok) return null

  const json = await res.json()
  return json.features?.[0] ?? null
}

// ── Vector tile URL (for MapLibre) ────────────────────────────────────────────
// We proxy through our own API route so the key stays server-side.

export function getTileUrl(): string {
  return `/api/tiles/{z}/{x}/{y}.pbf`
}

// ── Raster tile URL (fallback for low zoom) ───────────────────────────────────

export function getRasterTileUrl(): string {
  return `/api/tiles/raster/{z}/{x}/{y}.png`
}
