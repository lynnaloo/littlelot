import useSWR from 'swr'
import type { SearchFilters, Parcel } from '@/types/parcel'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error('Search failed')
    return r.json()
  })

function buildSearchUrl(filters: SearchFilters): string {
  const params = new URLSearchParams()

  params.set('tribe', filters.tribe)
  if (filters.geoid)        params.set('geoid', filters.geoid)
  if (filters.bbox)         params.set('bbox', filters.bbox.join(','))
  if (filters.minAcres)     params.set('minAcres', String(filters.minAcres))
  if (filters.maxAcres)     params.set('maxAcres', String(filters.maxAcres))
  if (filters.maxLandValue) params.set('maxLandValue', String(filters.maxLandValue))
  if (filters.accessTypes?.length)
                            params.set('accessTypes', filters.accessTypes.join(','))
  if (filters.noHoa)        params.set('noHoa', 'true')
  if (filters.noFloodRisk)  params.set('noFloodRisk', 'true')
  if (filters.noStructures) params.set('noStructures', 'true')
  if (filters.minScore)     params.set('minScore', String(filters.minScore))
  if (filters.sortBy)       params.set('sortBy', filters.sortBy)
  if (filters.page)         params.set('page', String(filters.page))
  if (filters.pageSize)     params.set('pageSize', String(filters.pageSize))

  return `/api/parcels?${params.toString()}`
}

interface UseParcelSearchResult {
  parcels: Parcel[]
  total: number
  isLoading: boolean
  error: string | null
  needsLocation: boolean   // no county or map area picked yet, so nothing to search
}

export function useParcelSearch(
  filters: SearchFilters | null
): UseParcelSearchResult {
  // The API needs a location anchor. Without one it returns a nationwide count
  // but no lots, so don't search until a county or map area is picked.
  const needsLocation = !filters?.geoid && !filters?.bbox
  const url = filters && !needsLocation ? buildSearchUrl(filters) : null

  const { data, error, isLoading } = useSWR(url, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  return {
    parcels:   data?.parcels ?? [],
    total:     data?.total   ?? 0,
    isLoading,
    needsLocation,
    error: error ? 'Could not load listings. Check your connection and try again.' : null,
  }
}
