'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogoMark } from './ui/LogoMark'
import type { BuildTribe } from '@/types/parcel'

interface SearchTopbarProps {
  tribe: BuildTribe
  tribeLabel: string
  onSwitchTribe: () => void
  onSearch: (query: string) => void
  initialQuery?: string
  autoFocus?: boolean
}

export function SearchTopbar({
  tribeLabel,
  onSwitchTribe,
  onSearch,
  initialQuery = '',
  autoFocus = false,
}: SearchTopbarProps) {
  const [query, setQuery] = useState(initialQuery)

  return (
    // On phones the search gets its own full-width row
    <header className="sm:h-14 bg-ink flex flex-wrap sm:flex-nowrap items-center px-3 py-2 sm:py-0 gap-x-3 gap-y-2
                       flex-shrink-0 border-b border-white/10">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <LogoMark size={22} variant="reversed" />
        <span className="font-serif text-tan-lt text-base hidden sm:block">the little lot</span>
      </Link>

      {/* tribe pill */}
      <button
        onClick={onSwitchTribe}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-full
                   bg-white/10 border border-white/15 text-xs text-tan-lt
                   hover:bg-white/15 transition-colors flex-shrink-0"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
        {tribeLabel}
      </button>

      {/* search */}
      <form
        onSubmit={e => { e.preventDefault(); onSearch(query) }}
        className="w-full sm:w-auto sm:flex-1 max-w-xl flex min-w-0"
      >
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus={autoFocus}
          aria-label="Search for lots by county, city, or zip"
          placeholder="Search a county, city, or zip"
          className="flex-1 min-w-0 h-10 bg-white border border-white rounded-l
                     px-3.5 text-sm text-ink placeholder:text-ink-3
                     focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="h-10 px-3 sm:px-4 rounded-r bg-accent text-white text-sm font-medium
                     hover:bg-accent/90 transition-colors flex-shrink-0"
        >
          Search
        </button>
      </form>

      {/* "Save search" returns once accounts exist (needs login) */}
    </header>
  )
}
