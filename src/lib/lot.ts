/**
 * lot.ts — load one lot, scored for a build type
 *
 * Shared by /api/parcel/[lrid] and the lot page. Server-side only.
 */

import { cache } from 'react'
import { fetchParcelById } from '@/lib/landrecords'
import { enrichParcel } from '@/lib/scoring'
import { wildfireHazards } from '@/lib/wildfire'
import type { BuildTribe, Parcel } from '@/types/parcel'

// Lot IDs look like UUIDs. Check before the ID goes into a query filter.
const LRID_PATTERN = /^[A-Za-z0-9-]{1,64}$/

// cache(): the lot page loads the same lot for its metadata and its body
export const loadLot = cache(async (lrid: string, tribe: BuildTribe): Promise<Parcel | null> => {
  if (!LRID_PATTERN.test(lrid)) return null
  const feature = await fetchParcelById(lrid)
  if (!feature) return null
  const [wildfire] = await wildfireHazards([{ ...feature.properties, geometry: feature.geometry }])
  return enrichParcel(feature.properties, tribe, feature.geometry, wildfire)
})
