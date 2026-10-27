import { Metadata } from 'next'
import { SearchApp } from '@/components/SearchApp'

export const metadata: Metadata = {
  title: 'Find a lot',
}

type SearchParams = Promise<{ geoid?: string; place?: string }>

// County guide pages link here with ?geoid=&place= to open on that county
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { geoid, place } = await searchParams
  const initialPlace = geoid && /^\d{5}$/.test(geoid) && place
    ? { geoid, label: place }
    : null
  return <SearchApp initialPlace={initialPlace} />
}
