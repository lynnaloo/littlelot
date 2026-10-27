/**
 * scoring.ts — Tiny Home Readiness Score
 *
 * Computes a 0–100 score for each parcel, weighted by build tribe.
 * The score is a composite of five dimensions:
 *   - Zoning legality  (30 pts for offgrid, 35 for foundation, etc.)
 *   - Road access      (20–30 pts depending on tribe)
 * Zoning and road access are left out until the data exists (see the flags
 * in types/parcel.ts), and the rest are scaled to 100.
 *   - Water/well potential (10–25 pts)
 *   - Flood zone clear (15 pts all tribes)
 *   - No HOA/CC&Rs     (10–15 pts)
 */

import type {
  Parcel,
  ParcelAttributes,
  BuildTribe,
  ScoreBreakdown,
  FloodZone,
  RoadAccess,
} from '@/types/parcel'
import {
  TRIBE_SCORE_WEIGHTS,
  ZONING_DETAILS_AVAILABLE,
  ROAD_ACCESS_AVAILABLE,
} from '@/types/parcel'

// ── Acreage ──────────────────────────────────────────────────────────────────
// calcarea is in square metres; taxacres is already in acres.

export const SQ_METRES_PER_ACRE = 4046.8564224

export function parcelAcres(attrs: Pick<ParcelAttributes, 'calcarea' | 'taxacres'>): number {
  if (attrs.calcarea != null) return attrs.calcarea / SQ_METRES_PER_ACRE
  return attrs.taxacres ?? 0
}

// Small lots matter to tiny home buyers, so show 0.25 rather than rounding to 0.3
export function formatAcres(acres: number): string {
  return acres < 1 ? acres.toFixed(2) : acres.toFixed(1)
}

// ── Zoning score ─────────────────────────────────────────────────────────────
// We do a best-effort classification from the zoning code string.
// Definitive zoning guidance lives in the county guides pages.

function zoningScore(attrs: ParcelAttributes, tribe: BuildTribe): number {
  const code = (attrs.zoningcode ?? '').toLowerCase()
  const desc = (attrs.zoningdesc ?? '').toLowerCase()
  const combined = `${code} ${desc}`
  const max = TRIBE_SCORE_WEIGHTS[tribe].zoning

  // Strong positive signals
  if (combined.includes('agricultural') || /^a-?\d/.test(code) || /^ag/.test(code)) {
    // Agricultural zones are generally permissive for tiny homes
    return tribe === 'thow' ? Math.round(max * 0.75) : Math.round(max * 0.90)
  }

  if (combined.includes('rural residential') || /^rr/.test(code)) {
    return Math.round(max * 0.70)
  }

  if (combined.includes('residential') || /^r-?\d/.test(code)) {
    // Standard residential — foundation builds may be ok, THOWs usually not
    return tribe === 'foundation' ? Math.round(max * 0.70)
         : tribe === 'thow'       ? Math.round(max * 0.35)
         : Math.round(max * 0.50)
  }

  if (combined.includes('recreational') || combined.includes('rv') || combined.includes('resort')) {
    return tribe === 'thow' ? Math.round(max * 0.90) : Math.round(max * 0.40)
  }

  // Unknown — can't assess
  return Math.round(max * 0.40)
}

// ── Access score ──────────────────────────────────────────────────────────────
// Ready for road data. Nothing feeds it until ROAD_ACCESS_AVAILABLE is true.

function accessScore(road: RoadAccess, tribe: BuildTribe): number {
  const max = TRIBE_SCORE_WEIGHTS[tribe].access
  switch (road) {
    case 'paved':       return max
    case 'gravel':      return tribe === 'thow' ? Math.round(max * 0.65) : Math.round(max * 0.80)
    case 'unimproved':  return tribe === 'thow' ? Math.round(max * 0.30) : Math.round(max * 0.55)
    case 'private':     return Math.round(max * 0.60)
    case 'none':        return tribe === 'offgrid' ? Math.round(max * 0.25) : 0
    default:            return Math.round(max * 0.35) // unknown
  }
}

// ── Water score ───────────────────────────────────────────────────────────────
// We don't have direct well data from the parcel schema.
// Proxy: elevation + rural setting + parcel size.

function waterScore(attrs: ParcelAttributes, tribe: BuildTribe): number {
  const max = TRIBE_SCORE_WEIGHTS[tribe].water
  const acres = parcelAcres(attrs)

  // Off-grid tribe weights water heavily — penalise small parcels
  if (tribe === 'offgrid') {
    if (acres >= 10) return max
    if (acres >= 5)  return Math.round(max * 0.75)
    if (acres >= 2)  return Math.round(max * 0.50)
    return Math.round(max * 0.30)
  }

  // Other tribes: utility hookup is likelier with road access, but we have
  // no road data yet, so stay at the middle
  return Math.round(max * 0.50)
}

// ── Flood score ───────────────────────────────────────────────────────────────

function floodScore(fldzone: FloodZone, tribe: BuildTribe): number {
  const max = TRIBE_SCORE_WEIGHTS[tribe].flood
  switch (fldzone) {
    case 'X':       return max
    case 'X500':    return Math.round(max * 0.70)
    case 'AO':      return Math.round(max * 0.30)
    case 'A':       return Math.round(max * 0.20)
    case 'AE':      return Math.round(max * 0.15)
    case 'VE':      return 0
    default:        return Math.round(max * 0.50) // unknown
  }
}

// ── HOA score ─────────────────────────────────────────────────────────────────
// The parcel schema doesn't include CC&R data directly.
// We infer from owner type and parcel context.

function hoaScore(attrs: ParcelAttributes, tribe: BuildTribe): number {
  const max = TRIBE_SCORE_WEIGHTS[tribe].hoa
  // If owner is government or a person on a large lot, HOA unlikely
  if (attrs.ownertype === 'GOVERNMENT') return max
  if (attrs.ownertype === 'PERSON') {
    const acres = parcelAcres(attrs)
    // Large rural parcels very rarely have HOAs
    if (acres >= 5) return max
    if (acres >= 2) return Math.round(max * 0.75)
  }
  // Businesses (LLCs, developers) — more likely to have CC&Rs
  if (attrs.ownertype === 'BUSINESS') return Math.round(max * 0.50)
  // Unknown
  return Math.round(max * 0.55)
}

// ── Composite score ───────────────────────────────────────────────────────────

export function computeScore(attrs: ParcelAttributes, tribe: BuildTribe): ScoreBreakdown {
  const weights = TRIBE_SCORE_WEIGHTS[tribe]
  // Dimensions we can't assess yet score 0 and drop out of the maximum,
  // so the rest scale to 100 rather than guessing.
  const zoning = ZONING_DETAILS_AVAILABLE ? zoningScore(attrs, tribe) : 0
  const access = ROAD_ACCESS_AVAILABLE    ? accessScore('unknown', tribe) : 0
  const water  = waterScore(attrs, tribe)
  const flood  = floodScore(attrs.fldzone, tribe)
  const hoa    = hoaScore(attrs, tribe)

  const max = 100
    - (ZONING_DETAILS_AVAILABLE ? 0 : weights.zoning)
    - (ROAD_ACCESS_AVAILABLE    ? 0 : weights.access)
  const total = Math.round(((zoning + access + water + flood + hoa) / max) * 100)

  return { zoning, access, water, flood, hoa, total }
}

// ── Plain-text zoning summary ─────────────────────────────────────────────────

export function zoningPlainText(attrs: ParcelAttributes, tribe: BuildTribe): string {
  if (!ZONING_DETAILS_AVAILABLE) {
    if (!attrs.zoningcode) {
      return 'No zoning code on record for this lot. Check with county planning before you buy.'
    }
    const zone = attrs.zoningdesc
      ? `${attrs.zoningcode} (${attrs.zoningdesc})`
      : attrs.zoningcode
    return `Zoned ${zone}. A plain-language summary of what this zone allows for tiny homes is coming soon. Until then, check with county planning before you buy.`
  }

  const code = attrs.zoningcode ?? 'Unknown'
  const desc = attrs.zoningdesc ?? ''
  const combined = `${code} ${desc}`.toLowerCase()

  if (combined.includes('agricultural') || /^a-?\d|^ag/.test(code.toLowerCase())) {
    if (tribe === 'thow') {
      return `${code}: Agricultural. THOWs are typically classified as RVs here and require a special exception or CUP. Verify with county planning before purchasing.`
    }
    return `${code}: Agricultural. Single-family dwellings are generally allowed; structures under 700 sq ft may require a conditional use permit. Verify with county planning.`
  }

  if (/^r-?\d/.test(code.toLowerCase())) {
    if (tribe === 'thow') {
      return `${code}: Residential. Most R-zones prohibit THOWs as permanent dwellings. This lot may work for a foundation build. Verify minimum square footage requirements.`
    }
    return `${code}: Residential zoning. Check the minimum square footage requirement. Many R-zones set a floor of 600–1,000 sq ft that can affect tiny home approval.`
  }

  if (combined.includes('rural residential') || /^rr/.test(code.toLowerCase())) {
    return `${code}: Rural Residential. Generally permissive for small dwellings. Verify tiny home or THOW rules with county planning.`
  }

  return `${code}${desc ? ': ' + desc : ''}. Zoning compatibility for tiny homes is unclear from code alone. Verify directly with county planning before purchasing.`
}

// ── Flood risk label ──────────────────────────────────────────────────────────

export function floodRiskLabel(fldzone: FloodZone): 'none' | 'moderate' | 'high' {
  switch (fldzone) {
    case 'X':    return 'none'
    case 'X500': return 'moderate'
    default:     return fldzone === 'unknown' ? 'moderate' : 'high'
  }
}

// ── Access type label ─────────────────────────────────────────────────────────

export function accessLabel(road: RoadAccess): string {
  const labels: Record<RoadAccess, string> = {
    paved:       'Paved, public road',
    gravel:      'Gravel road',
    unimproved:  'Unimproved road',
    private:     'Private road',
    none:        'No road access',
    unknown:     'Unknown, verify',
  }
  return labels[road] ?? 'Unknown, verify'
}

// ── HOA status label ──────────────────────────────────────────────────────────

export function hoaStatusLabel(
  attrs: ParcelAttributes
): 'none' | 'present' | 'unknown' {
  const acres = parcelAcres(attrs)
  if (attrs.ownertype === 'GOVERNMENT') return 'none'
  if (attrs.ownertype === 'PERSON' && acres >= 5) return 'none'
  return 'unknown'
}

// ── Enrich a raw parcel into a full Parcel object ────────────────────────────

export function enrichParcel(
  attrs: ParcelAttributes,
  tribe: BuildTribe,
  geometry: GeoJSON.Geometry | null = null,
  distanceToTown: number | null = null,
  nearestTown: string | null = null
): Parcel {
  const scoreBreakdown = computeScore(attrs, tribe)
  const acreage = parcelAcres(attrs)

  return {
    ...attrs,
    acreage,
    isVacant:       (attrs.numbldgs ?? 0) === 0,
    floodRisk:      floodRiskLabel(attrs.fldzone),
    accessLabel:    accessLabel('unknown'), // no road data yet
    distanceToTown,
    nearestTown,
    readinessScore: scoreBreakdown.total,
    scoreBreakdown,
    zoningPlainText: zoningPlainText(attrs, tribe),
    hoaStatus:      hoaStatusLabel(attrs),
    geometry,
  }
}
