/**
 * counties.ts — the county list behind the /guides pages
 *
 * src/data/counties.json comes from the Census 2025 county gazetteer
 * (50 states, DC and Puerto Rico). Rows are tuples to keep the file small:
 *   [geoid, state postal code, Census name, url slug, land area in sq mi]
 */

import rows from '@/data/counties.json'

export interface County {
  geoid: string     // 5-digit FIPS, the anchor for parcel searches
  state: string     // postal code, e.g. "VA"
  name: string      // e.g. "Page County", "Suffolk City"
  slug: string      // e.g. "page-county"
  landSqMi: number
}

export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

const COUNTIES: County[] = (rows as [string, string, string, string, number][])
  .map(([geoid, state, name, slug, landSqMi]) => ({
    geoid,
    state,
    // Census writes independent cities as "Suffolk city"
    name: name.replace(/ city$/, ' City'),
    slug,
    landSqMi,
  }))

export function allCounties(): County[] {
  return COUNTIES
}

export function countiesInState(state: string): County[] {
  return COUNTIES.filter(c => c.state === state)
}

export function findCounty(stateSlug: string, countySlug: string): County | undefined {
  const state = stateSlug.toUpperCase()
  return COUNTIES.find(c => c.state === state && c.slug === countySlug)
}

export function stateSlug(state: string): string {
  return state.toLowerCase()
}

export function countyPath(c: County): string {
  return `/guides/${stateSlug(c.state)}/${c.slug}`
}

export function countyLabel(c: County): string {
  return `${c.name}, ${c.state}`
}

// Opens the search on this county without a geocode round trip
export function countySearchPath(c: County): string {
  const params = new URLSearchParams({ geoid: c.geoid, place: countyLabel(c) })
  return `/search?${params}`
}

// We don't have a directory of planning offices yet, so search for one.
// Leave "County" out of the place: independent cities like Suffolk, VA aren't counties.
export function planningSearchUrl(place: string): string {
  const query = `${place} planning and zoning office`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
