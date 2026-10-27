/**
 * scoring.ts — Tiny Home Readiness Score
 *
 * Computes a 0–100 score for each parcel, weighted by build tribe.
 * The score is a composite of five dimensions:
 *   - Zoning legality  (25–35 pts), from the zone type only, never full points
 *   - Road access      (20–30 pts depending on tribe)
 * Road access is left out until the data exists (see the flags in
 * types/parcel.ts), and the rest are scaled to 100.
 *   - Water/well potential (10–25 pts)
 *   - Flood zone clear (15 pts all tribes)
 *   - No HOA/CC&Rs     (10–15 pts)
 */

import type {
  ZoneType,
  Parcel,
  ParcelAttributes,
  BuildTribe,
  ScoreBreakdown,
  FloodZone,
  RoadAccess,
} from '@/types/parcel'
import { zoneType, ZONE_TYPE_LABELS } from '@/lib/zoning'
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
// From the zone type only (lib/zoning.ts). Share of the zoning points by tribe.
// Nothing gets full points: the code alone never confirms a tiny home is
// allowed. Full points are for zones checked by hand for a county, later.

const ZONE_TYPE_SCORES: Record<ZoneType, Record<BuildTribe, number>> = {
  //               THOWs are often treated as RVs, so they score lower in most zones
  agricultural: { thow: 0.70, foundation: 0.80, offgrid: 0.80, community: 0.70 },
  rural:        { thow: 0.70, foundation: 0.80, offgrid: 0.75, community: 0.70 },
  unzoned:      { thow: 0.80, foundation: 0.75, offgrid: 0.80, community: 0.70 },
  manufactured: { thow: 0.75, foundation: 0.60, offgrid: 0.40, community: 0.75 },
  // Minimum home sizes of 600 to 1,000 sq ft are common here
  residential:  { thow: 0.30, foundation: 0.55, offgrid: 0.30, community: 0.35 },
  planned:      { thow: 0.20, foundation: 0.20, offgrid: 0.20, community: 0.20 },
  commercial:   { thow: 0.10, foundation: 0.10, offgrid: 0.10, community: 0.10 },
  industrial:   { thow: 0,    foundation: 0,    offgrid: 0,    community: 0    },
  public:       { thow: 0,    foundation: 0,    offgrid: 0,    community: 0    },
  unknown:      { thow: 0.40, foundation: 0.40, offgrid: 0.40, community: 0.40 },
}

function zoningScore(attrs: ParcelAttributes, tribe: BuildTribe): number {
  const max = TRIBE_SCORE_WEIGHTS[tribe].zoning
  return Math.round(max * ZONE_TYPE_SCORES[zoneType(attrs.zoningcode)][tribe])
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

  const code = attrs.zoningcode
  if (!code) {
    return 'No zoning code on record for this lot. Ask county planning what zone it is in and whether a tiny home is allowed.'
  }
  const type = zoneType(code)
  const zoned = type === 'unknown' ? `Zoned ${code}.` : `Zoned ${code}, which looks like ${ZONE_TYPE_LABELS[type].toLowerCase()} zoning.`
  const thow = tribe === 'thow'

  const detail: Record<ZoneType, string> = {
    agricultural: thow
      ? 'Farm zones are often the most open to small homes, but many counties treat a THOW as an RV and limit how long you can live in one. Ask about full-time RV or THOW occupancy.'
      : 'Farm zones are often the most open to small homes. Ask about the minimum home size and whether a house is allowed without a farm use.',
    rural: thow
      ? 'Rural zones are often open to small homes, but many counties treat a THOW as an RV. Ask about full-time RV or THOW occupancy.'
      : 'Rural zones are often open to small homes. Ask about the minimum home size and the minimum lot size for a well and septic.',
    unzoned: 'Unzoned land has no zoning rules, but the county may still require building permits, septic approval, and an address. Ask what permits a home needs here.',
    manufactured: thow
      ? 'Manufactured home zones are often friendly to homes on wheels, but some only allow HUD-code homes. Ask whether a THOW or park model counts.'
      : 'Manufactured home zones may only allow HUD-code homes. Ask whether a site-built tiny home is allowed.',
    residential: thow
      ? 'Most residential zones don\'t allow living full time in a THOW. A foundation build may work. Ask about the minimum home size and ADU rules.'
      : 'Many residential zones set a minimum home size of 600 to 1,000 sq ft. Ask about the minimum and whether a backyard cottage (ADU) is allowed.',
    planned:      'Planned developments set their own rules, usually with HOA-style covenants. Ask for the development\'s rules before you buy.',
    commercial:   'Homes usually aren\'t allowed in commercial zones, or only above a business. Unlikely to work for a tiny home.',
    industrial:   'Homes are almost never allowed in industrial zones. Unlikely to work for a tiny home.',
    public:       'This looks like public land, open space, or a right of way. Homes usually aren\'t allowed.',
    unknown:      'We can\'t tell the zone type from this code. Ask county planning what it allows.',
  }
  return `${zoned} ${detail[type]} Codes vary by county, so verify with county planning before you buy.`
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
    zoneType:       zoneType(attrs.zoningcode),
    hoaStatus:      hoaStatusLabel(attrs),
    geometry,
  }
}
