import { Metadata } from 'next'
import { SearchApp } from '@/components/SearchApp'

export const metadata: Metadata = {
  title: 'Find a lot',
}

export default function SearchPage() {
  return <SearchApp />
}
