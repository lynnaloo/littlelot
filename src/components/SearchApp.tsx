'use client'

import { useState, useCallback } from 'react'
import type { BuildTribe, SearchFilters, Parcel } from '@/types/parcel'
import { TRIBE_LABELS, TRIBE_MIN_ACRES } from '@/types/parcel'
import { TribeGate } from './TribeGate'
import { SearchTopbar } from './SearchTopbar'
import { FilterSidebar } from './filters/FilterSidebar'
import dynamic from 'next/dynamic'
import { ParcelGrid } from './cards/ParcelGrid'
import { ParcelDetail } from './cards/ParcelDetail'
import { useParcelSearch } from '@/lib/useParcelSearch'
import { usePlaceSearch, type Place } from '@/lib/usePlaceSearch'

type MobileTab = 'filters' | 'results' | 'detail'
type ResultsView = 'list' | 'map'

// MapLibre needs the browser
const MapView = dynamic(() => import('./map/MapView').then(m => m.MapView), { ssr: false })

// Most buyers want vacant, dry land without an HOA, so start with these on
const DEFAULT_FILTERS: Omit<SearchFilters, 'tribe'> = {
  noStructures: true,
  noFloodRisk:  true,
  noHoa:        true,
}

export function SearchApp({ initialPlace = null }: { initialPlace?: Place | null }) {
  const [tribe, setTribe]               = useState<BuildTribe | null>(null)
  const [filters, setFilters]           = useState<Omit<SearchFilters, 'tribe'>>(DEFAULT_FILTERS)
  const [selectedParcel, setSelected]   = useState<Parcel | null>(null)
  const [mobileTab, setMobileTab]       = useState<MobileTab>('results')
  const [view, setView]                 = useState<ResultsView>('list')

  const { place, isLocating, locateError, search } = usePlaceSearch(initialPlace)

  const fullFilters: SearchFilters | null = tribe
    ? { tribe, ...filters, geoid: place?.geoid }
    : null
  const {
    parcels, hasMore, isLoading, isLoadingMore, loadMore, error, needsLocation,
  } = useParcelSearch(fullFilters)

  const handleSelectParcel = useCallback((parcel: Parcel) => {
    setSelected(parcel)
    setMobileTab('detail')
  }, [])

  const handleTribeSelect = useCallback((t: BuildTribe) => {
    setTribe(t)
    setFilters(f => ({ ...f, minAcres: TRIBE_MIN_ACRES[t] }))
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
        initialQuery={initialPlace?.label}
        onSwitchTribe={handleSwitchTribe}
        onSearch={(query) => { setSelected(null); search(query) }}
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
              {isLocating ? 'Finding that place...'
                : needsLocation ? 'Search for a county to see lots'
                : isLoading ? 'Searching...'
                : (
                  // Count what's loaded. The API's total is before our HOA and
                  // score checks, so it would overstate what buyers can see.
                  <>
                    Showing <strong className="text-ink font-semibold">{parcels.length}</strong>
                    {hasMore ? '' : ' matching'} lots in {place?.label}
                  </>
                )}
            </span>
            <div className="ml-auto flex border border-border rounded overflow-hidden text-xs">
              {(['list', 'map'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                        className={`h-7 px-2.5 capitalize ${view === v
                          ? 'bg-accent text-white font-medium'
                          : 'bg-white text-ink-2 hover:text-accent'}`}>
                  {v}
                </button>
              ))}
            </div>
            <select
              className="h-7 text-xs border border-border rounded px-2 bg-white text-ink"
              onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as SearchFilters['sortBy'] }))}
            >
              <option value="score">Best match first</option>
              <option value="acres_desc">Largest lot</option>
              <option value="value_asc">Lowest assessed value</option>
            </select>
          </div>

          {locateError && (
            <div className="m-4 p-3 bg-amber-lt border border-amber/25 rounded text-sm text-ink-2">
              {locateError}
            </div>
          )}

          {error && (
            <div className="m-4 p-3 bg-danger-lt border border-danger/20 rounded text-sm text-danger">
              {error}
            </div>
          )}

          {view === 'map' && !needsLocation ? (
            <div className="flex-1 relative">
              <MapView
                parcels={parcels}
                selectedLrid={selectedParcel?.lrid}
                onSelect={handleSelectParcel}
              />
              {hasMore && (
                <button onClick={loadMore} disabled={isLoadingMore}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 h-9 px-4 bg-white
                                   border border-border rounded shadow text-sm font-medium text-ink
                                   hover:text-accent disabled:opacity-60 disabled:cursor-wait">
                  {isLoadingMore ? 'Loading more lots...' : 'Show more lots'}
                </button>
              )}
            </div>
          ) : (
            <ParcelGrid
              parcels={parcels}
              isLoading={isLoading}
              needsLocation={needsLocation}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
              selectedLrid={selectedParcel?.lrid}
              onSelect={handleSelectParcel}
            />
          )}
        </div>

        {/* Detail panel */}
        <aside className={`
          w-full md:w-72 flex-shrink-0 bg-surface border-l border-border flex-col overflow-hidden
          md:flex
          ${mobileTab === 'detail' ? 'flex' : 'hidden'}
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
