// Types derived from the landrecords.us parcel-standard schema
// https://github.com/land-record/parcel-standard

// How you reach the lot by road. Not in the API yet (see ROAD_ACCESS_AVAILABLE).
export type RoadAccess =
  | 'paved'
  | 'gravel'
  | 'unimproved'
  | 'private'
  | 'none'
  | 'unknown'

// accesstype: whether the public may enter the land (parks, wildlife areas).
// Not road access. null for most private land.
export type PublicAccess =
  | 'OPEN'
  | 'RESTRICTED'
  | 'CLOSED'
  | 'UNKNOWN'

export type FloodZone =
  | 'X'       // minimal risk
  | 'AE'      // high risk, base flood elevation determined
  | 'A'       // high risk, no base flood elevation
  | 'AO'      // high risk, sheet flow
  | 'VE'      // coastal high risk
  | 'X500'    // moderate risk (0.2% annual chance)
  | 'unknown'

// Values as returned by the API (uppercase). null when the county doesn't report it.
export type OwnerType =
  | 'PERSON'
  | 'BUSINESS'
  | 'TRUST'
  | 'ESTATE'
  | 'NONPROFIT'
  | 'GOVERNMENT'

export type BuildTribe = 'thow' | 'foundation' | 'offgrid' | 'community'

// Raw parcel attributes as returned by the landrecords.us WFS / tile API
export interface ParcelAttributes {
  lrid: string              // unique parcel ID
  geoid: string             // county FIPS + parcel id
  parcelid: string | null   // the county's own parcel number, used by assessors and planning
  statefp: string           // state FIPS
  countyfp: string          // county FIPS
  // Public record, but not shown in the UI yet: owner contact may become a paid feature
  ownername: string | null
  owneraddr: string | null
  parceladdr: string
  countyname: string | null
  parcelstate: string | null
  usecode: string           // land use code (varies by county)
  usedesc: string           // human-readable use description
  zoningcode: string | null
  zoningdesc: string | null // partial coverage, missing in some counties
  taxacres: number | null   // acreage from tax records (less reliable)
  calcarea: number | null   // square metres, calculated from geometry (preferred)
  landvalue: number | null  // assessed land value
  imprvalue: number | null  // assessed improvement value
  numbldgs: number | null   // number of buildings on parcel
  bldgsqft: number | null
  yearbuilt: number | null
  saleamt: number | null
  saledate: string | null
  ownertype: OwnerType | null
  accesstype: PublicAccess | null
  fldzone: FloodZone
  elevmin: number | null    // metres
  elevavg: number | null    // metres
  elevmax: number | null    // metres
  centroidx: number         // longitude of centroid
  centroidy: number         // latitude of centroid
  surfpointx: number        // longitude of a point guaranteed inside parcel
  surfpointy: number        // latitude of a point guaranteed inside parcel
  placetype: string | null
  placename: string | null
}

// Enriched parcel — raw attributes plus computed fields
export interface Parcel extends ParcelAttributes {
  // computed
  acreage: number           // parcelAcres(): calcarea in acres ?? taxacres ?? 0
  isVacant: boolean         // numbldgs === 0 || imprvalue === 0
  floodRisk: 'none' | 'moderate' | 'high'
  accessLabel: string       // human-readable road access
  distanceToTown: number | null   // miles, from Pelias geocoder
  nearestTown: string | null
  readinessScore: number    // 0–100, tribe-weighted composite
  scoreBreakdown: ScoreBreakdown
  zoningPlainText: string   // plain-English zoning summary
  hoaStatus: 'none' | 'present' | 'unknown'
  geometry: GeoJSON.Geometry | null   // lot outline, longitude/latitude
}

export interface ScoreBreakdown {
  zoning: number    // 0–30
  access: number    // 0–20
  water: number     // 0–20
  flood: number     // 0–15
  hoa: number       // 0–15
  total: number     // 0–100
}

// Search filters coming from the UI
export interface SearchFilters {
  tribe: BuildTribe
  geoid?: string          // county-level anchor (statefp + countyfp)
  bbox?: [number, number, number, number]  // [minLng, minLat, maxLng, maxLat]
  minAcres?: number
  maxAcres?: number
  maxLandValue?: number
  roadAccess?: RoadAccess[]   // UI only until road data exists
  noHoa?: boolean
  noFloodRisk?: boolean
  noStructures?: boolean
  minScore?: number
  maxElevation?: number
  sortBy?: 'score' | 'acres_desc' | 'value_asc'
  start?: number          // where to resume in the API's results (SearchResult.next)
}

export interface SearchResult {
  parcels: Parcel[]
  matched: number | null  // lots the query matched, before score and HOA checks; null if the API doesn't say
  next: number | null     // pass as SearchFilters.start for more lots; null when there are no more
}

// The API has zoning codes and, in some counties, the county's name for the
// code (zoningdesc), but nothing about what a zone allows for tiny homes.
// While false, we show the code and description as-is, mark the plain-language
// summary "coming soon", leave zoning out of the score, and scale the remaining
// dimensions up to 100.
export const ZONING_DETAILS_AVAILABLE = false

// The API has no road data (accesstype is public access to the land, not roads).
// While false, road access shows "Unknown, verify", is left out of the score,
// and the remaining dimensions are scaled up to 100, same as zoning above.
export const ROAD_ACCESS_AVAILABLE = false

// Score weights differ by tribe
export const TRIBE_SCORE_WEIGHTS: Record<BuildTribe, ScoreBreakdown> = {
  thow:       { zoning: 30, access: 30, water: 10, flood: 15, hoa: 15, total: 0 },
  foundation: { zoning: 35, access: 20, water: 20, flood: 15, hoa: 10, total: 0 },
  offgrid:    { zoning: 25, access: 20, water: 25, flood: 15, hoa: 15, total: 0 },
  community:  { zoning: 30, access: 25, water: 15, flood: 15, hoa: 15, total: 0 },
}

// Starting minimum lot size by tribe. Under 0.1 ac is mostly slivers and
// common areas. Off-grid needs room for a well and septic, which many counties
// require about an acre for. Buyers can change it in the filters.
export const TRIBE_MIN_ACRES: Record<BuildTribe, number> = {
  thow:       0.1,
  foundation: 0.1,
  offgrid:    1,
  community:  0.1,
}

export const TRIBE_LABELS: Record<BuildTribe, string> = {
  thow:       'THOW or park model',
  foundation: 'Foundation tiny home',
  offgrid:    'Off-grid homestead',
  community:  'Tiny home community',
}
