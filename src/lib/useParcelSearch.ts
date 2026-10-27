import useSWRInfinite from 'swr/infinite'
import type { SearchFilters, SearchResult, Parcel } from '@/types/parcel'

const fetcher = (url: string): Promise<SearchResult> =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error('Search failed')
    return r.json()
  })

function buildSearchUrl(filters: SearchFilters, start: number): string {
  const params = new URLSearchParams()

  params.set('tribe', filters.tribe)
  if (filters.geoid)        params.set('geoid', filters.geoid)
  if (filters.bbox)         params.set('bbox', filters.bbox.join(','))
  if (filters.minAcres)     params.set('minAcres', String(filters.minAcres))
  if (filters.maxAcres)     params.set('maxAcres', String(filters.maxAcres))
  if (filters.maxLandValue) params.set('maxLandValue', String(filters.maxLandValue))
  if (filters.noHoa)        params.set('noHoa', 'true')
  if (filters.noFloodRisk)  params.set('noFloodRisk', 'true')
  if (filters.noStructures) params.set('noStructures', 'true')
  if (filters.minScore)     params.set('minScore', String(filters.minScore))
  if (filters.sortBy)       params.set('sortBy', filters.sortBy)
  if (start)                params.set('start', String(start))

  return `/api/parcels?${params.toString()}`
}

interface UseParcelSearchResult {
  parcels: Parcel[]
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  loadMore: () => void
  error: string | null
  needsLocation: boolean   // no county or map area picked yet, so nothing to search
}

export function useParcelSearch(
  filters: SearchFilters | null
): UseParcelSearchResult {
  // The API needs a location anchor. Without one it returns a nationwide count
  // but no lots, so don't search until a county or map area is picked.
  const needsLocation = !filters?.geoid && !filters?.bbox

  // Each page picks up where the previous one stopped (its `next`)
  const getKey = (index: number, previous: SearchResult | null) => {
    if (!filters || needsLocation) return null
    if (index === 0) return buildSearchUrl(filters, 0)
    if (!previous || previous.next == null) return null
    return buildSearchUrl(filters, previous.next)
  }

  const { data, error, isLoading, isValidating, size, setSize } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
  })

  // Pages shouldn't overlap, but keep each lot once just in case
  const seen = new Set<string>()
  const parcels = (data ?? []).flatMap(page => page.parcels).filter(p => {
    if (seen.has(p.lrid)) return false
    seen.add(p.lrid)
    return true
  })

  const last          = data?.[data.length - 1]
  const isLoadingMore = isValidating && !!data && size > data.length

  return {
    parcels,
    hasMore:   last?.next != null,
    isLoading,
    isLoadingMore,
    loadMore:  () => setSize(size + 1),
    needsLocation,
    error: error ? 'Could not load listings. Check your connection and try again.' : null,
  }
}
