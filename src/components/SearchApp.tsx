'use client'

import { useState, useCallback } from 'react'
import type { BuildTribe, SearchFilters, Parcel } from '@/types/parcel'
import { TRIBE_LABELS } from '@/types/parcel'
import { TribeGate } from './TribeGate'
import { SearchTopbar } from './SearchTopbar'
import { FilterSidebar } from './filters/FilterSidebar'
import { ParcelGrid } from './cards/ParcelGrid'
import { ParcelDetail } from './cards/ParcelDetail'
import { useParcelSearch } from '@/lib/useParcelSearch'

type MobileTab = 'filters' | 'results' | 'detail'

export function SearchApp() {
  const [tribe, setTribe]               = useState<BuildTribe | null>(null)
  const [filters, setFilters]           = useState<Omit<SearchFilters, 'tribe'>>({})
  const [selectedParcel, setSelected]   = useState<Parcel | null>(null)
  const [mobileTab, setMobileTab]       = useState<MobileTab>('results')

  const fullFilters: SearchFilters | null = tribe ? { tribe, ...filters } : null
  const { parcels, total, isLoading, error } = useParcelSearch(fullFilters)

  const handleSelectParcel = useCallback((parcel: Parcel) => {
    setSelected(parcel)
    setMobileTab('detail')
  }, [])

  const handleTribeSelect = useCallback((t: BuildTribe) => {
    setTribe(t)
    setMobileTab('results')
  }, [])

  const handleSwitchTribe = useCallback(() => {
    setTribe(null)
    setSelected(null)
  }, [])

  // Show tribe gate until a tribe is selected
  if (!tribe) {
    return <TribeGate onSelect={handleTribeSelect} />
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Topbar */}
      <SearchTopbar
        tribe={tribe}
        tribeLabel={TRIBE_LABELS[tribe]}
        onSwitchTribe={handleSwitchTribe}
        onSearch={(query) => setFilters(f => ({ ...f, placeName: query }))}
      />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Filter sidebar -- hidden on mobile unless tab active */}
        <aside className={`
          w-60 flex-shrink-0 bg-surface border-r border-border overflow-y-auto
          md:flex flex-col
          ${mobileTab === 'filters' ? 'flex' : 'hidden'}
        `}>
          <FilterSidebar
            tribe={tribe}
            filters={filters}
            onChange={setFilters}
          />
        </aside>

        {/* Results grid */}
        <div className={`
          flex-1 flex flex-col overflow-hidden min-w-0
          md:flex
          ${mobileTab === 'results' ? 'flex' : 'hidden'}
        `}>
          {/* Results bar */}
          <div className="flex items-center gap-3 px-3.5 h-10 bg-white border-b border-border flex-shrink-0">
            <span className="text-sm text-ink-2">
              {isLoading ? 'Searching...' : (
                <><strong className="text-ink font-semibold">{total}</strong> lots match</>
              )}
            </span>
            <select
              className="ml-auto h-7 text-xs border border-border rounded px-2 bg-white text-ink"
              onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as SearchFilters['sortBy'] }))}
            >
              <option value="score">Best match first</option>
              <option value="acres_desc">Largest lot</option>
              <option value="value_asc">Lowest assessed value</option>
              <option value="town_dist">Closest to town</option>
            </select>
          </div>

          {error && (
            <div className="m-4 p-3 bg-danger-lt border border-danger/20 rounded text-sm text-danger">
              {error}
            </div>
          )}

          <ParcelGrid
            parcels={parcels}
            isLoading={isLoading}
            selectedLrid={selectedParcel?.lrid}
            onSelect={handleSelectParcel}
          />
        </div>

        {/* Detail panel */}
        <aside className={`
          w-72 flex-shrink-0 bg-surface border-l border-border flex flex-col overflow-hidden
          md:flex
          ${mobileTab === 'detail' ? 'flex w-full' : 'hidden'}
        `}>
          <ParcelDetail
            parcel={selectedParcel}
            tribe={tribe}
            onBack={() => setMobileTab('results')}
          />
        </aside>
      </div>

      {/* Mobile tab bar */}
      <nav className="md:hidden flex border-t border-border bg-white flex-shrink-0"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {([
          { tab: 'filters', icon: '⚙', label: 'Filters' },
          { tab: 'results', icon: '◫', label: 'Results' },
          { tab: 'detail',  icon: '◉', label: 'Lot detail' },
        ] as const).map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2
                        text-[10px] font-medium border-none
                        ${mobileTab === tab ? 'text-accent' : 'text-ink-3'}`}
          >
            <span className="text-lg leading-none">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
