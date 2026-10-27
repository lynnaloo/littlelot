/**
 * landrecords.ts — server-side API client for landrecords.us
 *
 * All functions in this file run server-side only (API routes).
 * The LANDRECORDS_API_KEY env var is never exposed to the browser.
 *
 * API docs: https://landrecords.us/documentation/web-api
 */

import type { ParcelAttributes, SearchFilters } from '@/types/parcel'
import { SQ_METRES_PER_ACRE } from '@/lib/scoring'

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
//   - Max 3 additional predicates beyond the anchor (a 4th gets a 400)
//   - Indexed fields: geoid, lrid, ownername, accesstype, ownertype, placetype
//     or a spatial predicate

interface CqlQuery {
  cql: string
  // API-side sort, only when the whole query supports it so the order holds
  // across batches. Otherwise none: the API's own order pages stably, and
  // sorting by lrid times out (504) on big counties like Harris, TX.
  sortBy?: string
}

function buildCqlQuery(filters: SearchFilters): CqlQuery {
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

  // Additional predicates (max 3 beyond anchor). Order is priority: anything
  // past the third is dropped here, so the API route re-checks those itself.
  const extra: string[] = []

  if (filters.noStructures) {
    extra.push(`numbldgs=0`)
  }

  if (filters.noFloodRisk) {
    extra.push(`fldzone='X'`)
  }

  // calcarea is in square metres
  const minArea = filters.minAcres ? filters.minAcres * SQ_METRES_PER_ACRE : null
  const maxArea = filters.maxAcres ? filters.maxAcres * SQ_METRES_PER_ACRE : null
  if (minArea && maxArea) {
    extra.push(`calcarea BETWEEN ${minArea.toFixed(1)} AND ${maxArea.toFixed(1)}`)
  } else if (minArea) {
    extra.push(`calcarea>=${minArea.toFixed(1)}`)
  } else if (maxArea) {
    extra.push(`calcarea<=${maxArea.toFixed(1)}`)
  }

  // Sorting by value only makes sense without $0 lots (exempt land, common
  // areas), which would otherwise fill the first batches
  const byValue = filters.sortBy === 'value_asc'
  if (filters.maxLandValue) {
    extra.push(byValue
      ? `landvalue BETWEEN 1 AND ${filters.maxLandValue}`
      : `landvalue<=${filters.maxLandValue}`)
  } else if (byValue) {
    extra.push(`landvalue>0`)
  }

  const kept = extra.slice(0, 3)
  const valueKept = kept.some(c => c.startsWith('landvalue'))

  const sortBy = filters.sortBy === 'acres_desc' ? 'calcarea DESC'
               : byValue && valueKept            ? 'landvalue ASC'
               : undefined

  return { cql: [...clauses, ...kept].join(' AND '), sortBy }
}

// ── Fetch parcels matching search filters ────────────────────────────────────
// Fetches `size` lots starting at `start`, as parallel requests of 10.
// 10 requests take about a second; 30 at once still worked in testing.

// The API ignores propertyName and returns every field. pickAttributes() keeps
// only these so responses stay small.
const ATTRIBUTE_NAMES: (keyof ParcelAttributes)[] = [
  'lrid','parcelid','geoid','statefp','countyfp',
  'ownername','owneraddr','parceladdr','countyname','parcelstate',
  'usecode','usedesc','zoningcode','zoningdesc',
  'taxacres','calcarea','landvalue','imprvalue',
  'numbldgs','bldgsqft','yearbuilt','saleamt','saledate',
  'ownertype','accesstype','fldzone',
  'elevmin','elevavg','elevmax',
  'centroidx','centroidy','surfpointx','surfpointy',
  'placetype','placename',
]
const PROPERTY_NAMES = [...ATTRIBUTE_NAMES, 'geom'].join(',')

type Feature = GeoJSON.Feature<GeoJSON.Geometry, ParcelAttributes>

function pickAttributes(feature: Feature): Feature {
  const raw = feature.properties as unknown as Record<string, unknown>
  const picked = Object.fromEntries(ATTRIBUTE_NAMES.map(name => [name, raw[name] ?? null]))
  return { ...feature, properties: picked as unknown as ParcelAttributes }
}

export interface ParcelBatch {
  features: GeoJSON.Feature<GeoJSON.Geometry, ParcelAttributes>[]
  matched: number | null  // numberMatched, when the API reports it
  next: number | null     // start of the following batch, null at the end
}

export async function fetchParcelBatch(
  filters: SearchFilters,
  start: number,
  size: number
): Promise<ParcelBatch> {
  const { cql, sortBy } = buildCqlQuery(filters)
  const offsets = Array.from({ length: Math.ceil(size / MAX_COUNT) }, (_, i) => start + i * MAX_COUNT)

  const pages = await Promise.all(offsets.map(async offset => {
    const url = wfsUrl({
      request:      'GetFeature',
      cql_filter:   cql,
      ...(sortBy ? { sortBy } : {}),
      count:        String(MAX_COUNT),
      startIndex:   String(offset),
      // Request only the attributes we need to keep response size down
      propertyName: PROPERTY_NAMES,
    })

    const res = await fetch(url, {
      headers: AUTH_HEADERS,
      next: { revalidate: 300 }, // cache for 5 minutes
    })

    if (!res.ok) {
      throw new Error(`landrecords WFS error: ${res.status} ${res.statusText}`)
    }

    return res.json() as Promise<{
      features?: GeoJSON.Feature<GeoJSON.Geometry, ParcelAttributes>[]
      numberMatched?: number | null
    }>
  }))

  const features = pages.flatMap(p => p.features ?? []).map(pickAttributes)
  const matched  = pages[0]?.numberMatched ?? null
  // A short page means we reached the end
  const lastFull = (pages[pages.length - 1]?.features?.length ?? 0) === MAX_COUNT
  const end      = start + offsets.length * MAX_COUNT
  const more     = matched != null ? end < matched : lastFull

  return { features, matched, next: more ? end : null }
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

  const json: { features?: Feature[] } = await res.json()
  const feature = json.features?.[0]
  return feature ? pickAttributes(feature) : null
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

// ── Sample a county (for the /guides pages) ──────────────────────────────────
// Totals are unreliable (numberMatched is null for big counties and slow to
// compute), so county pages describe a sample instead. Offsets grow so the
// sample spreads across small and large counties; requests past the end of
// a small county just come back empty. Offsets past ~10,000 get slow.

const SAMPLE_OFFSETS = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]

export type SampleAttributes = Pick<ParcelAttributes,
  'zoningcode' | 'fldzone' | 'calcarea' | 'taxacres'>

export async function fetchCountySample(geoid: string): Promise<SampleAttributes[]> {
  const pages = await Promise.all(SAMPLE_OFFSETS.map(async offset => {
    const url = wfsUrl({
      request:      'GetFeature',
      cql_filter:   `geoid='${geoid}'`,
      startIndex:   String(offset),
      propertyName: 'zoningcode,fldzone,calcarea,taxacres',
    })
    const res = await fetch(url, { headers: AUTH_HEADERS, next: { revalidate: 604800 } })
    // A failed slice only shrinks the sample. If they all fail, throw so the
    // page isn't cached as "no lot records".
    if (!res.ok) return null
    const json: { features?: { properties: SampleAttributes }[] } = await res.json()
    return (json.features ?? []).map(f => f.properties)
  }))
  if (pages.every(p => p === null)) {
    throw new Error(`landrecords WFS error: county sample failed for ${geoid}`)
  }
  return pages.flatMap(p => p ?? [])
}
