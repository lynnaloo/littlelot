import useSWR from 'swr'
import type { BuildableGround, Nearby, Parcel } from '@/types/parcel'

type Lot = Pick<Parcel, 'lrid' | 'geometry' | 'acreage' | 'surfpointx' | 'surfpointy'>

// Hooks for the lot details panel. These lookups are too slow to run for every
// search result, so they load when a lot is opened.

const swrOptions = { revalidateOnFocus: false, shouldRetryOnError: false }

// undefined while loading, null when the lot can't be measured, 'error' on failure
export function useBuildableGround(lot: Lot | null): BuildableGround | null | undefined | 'error' {
  const { data, error } = useSWR(
    lot ? ['slope', lot.lrid] : null,
    async (): Promise<BuildableGround | null> => {
      const res = await fetch('/api/slope', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ geometry: lot!.geometry, acres: lot!.acreage }),
      })
      if (!res.ok) throw new Error('Slope lookup failed')
      const json: { ground: BuildableGround | null } = await res.json()
      return json.ground
    },
    swrOptions,
  )
  return error ? 'error' : data
}

// undefined while loading. A missing field means that lookup failed.
export function useNearby(lot: Lot | null): Partial<Nearby> | undefined {
  const { data, error } = useSWR(
    lot ? `/api/nearby?lat=${lot.surfpointy.toFixed(4)}&lng=${lot.surfpointx.toFixed(4)}` : null,
    async (url: string): Promise<Partial<Nearby>> => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Nearby lookup failed')
      return res.json()
    },
    swrOptions,
  )
  return error ? {} : data
}
