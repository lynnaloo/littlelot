'use client'

import { useState } from 'react'
import { LogoMark } from './ui/LogoMark'
import type { BuildTribe } from '@/types/parcel'

interface SearchTopbarProps {
  tribe: BuildTribe
  tribeLabel: string
  onSwitchTribe: () => void
  onSearch: (query: string) => void
}

export function SearchTopbar({
  tribeLabel,
  onSwitchTribe,
  onSearch,
}: SearchTopbarProps) {
  const [query, setQuery] = useState('Page County, VA')

  return (
    <header className="h-12 bg-ink flex items-center px-3 gap-3 flex-shrink-0 border-b border-white/10">
      <div className="flex items-center gap-2">
        <LogoMark size={22} variant="reversed" />
        <span className="font-serif text-tan-lt text-base hidden sm:block">the little lot</span>
      </div>

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
        className="flex-1 max-w-sm"
      >
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="County, city, or zip..."
          className="w-full h-8 bg-white/10 border border-white/15 rounded
                     px-3 text-xs text-tan-lt placeholder:text-tan/60
                     focus:outline-none focus:border-accent"
        />
      </form>

      <button
        className="ml-auto h-7 px-3 bg-accent text-white text-xs font-medium
                   rounded hover:bg-accent/90 transition-colors hidden sm:flex items-center"
      >
        Save search
      </button>
    </header>
  )
}
