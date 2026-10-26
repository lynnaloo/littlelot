import { useState, useCallback } from 'react'

export interface Place {
  geoid: string
  label: string
}

interface UsePlaceSearchResult {
  place: Place | null
  isLocating: boolean
  locateError: string | null
  search: (query: string) => Promise<void>
}

// Resolves what the buyer typed into a county via /api/geocode
export function usePlaceSearch(): UsePlaceSearchResult {
  const [place, setPlace]             = useState<Place | null>(null)
  const [isLocating, setIsLocating]   = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const search = useCallback(async (query: string) => {
    setIsLocating(true)
    setLocateError(null)
    try {
      const res  = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok) {
        setLocateError(json.error ?? 'Search is having trouble right now. Please try again.')
        return
      }
      setPlace({ geoid: json.geoid, label: json.label })
    } catch {
      setLocateError('Could not reach search. Check your connection and try again.')
    } finally {
      setIsLocating(false)
    }
  }, [])

  return { place, isLocating, locateError, search }
}
