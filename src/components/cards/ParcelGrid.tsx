'use client'

import type { Parcel } from '@/types/parcel'
import { ParcelCard } from './ParcelCard'

interface ParcelGridProps {
  parcels: Parcel[]
  isLoading: boolean
  needsLocation: boolean
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  selectedLrid?: string
  onSelect: (parcel: Parcel) => void
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="h-24 bg-border/60" />
      <div className="p-3">
        <div className="h-5 bg-border/60 rounded w-24 mb-1.5" />
        <div className="h-3 bg-border/40 rounded w-36 mb-3" />
        <div className="space-y-1.5">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-3 bg-border/40 rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

function LoadMoreButton({ isLoading, onClick }: { isLoading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={isLoading}
            className="h-9 px-4 bg-white border border-border rounded text-sm font-medium text-ink
                       hover:border-accent hover:text-accent transition-colors
                       disabled:opacity-60 disabled:cursor-wait">
      {isLoading ? 'Loading more lots...' : 'Show more lots'}
    </button>
  )
}

export function ParcelGrid({
  parcels,
  isLoading,
  needsLocation,
  hasMore,
  isLoadingMore,
  onLoadMore,
  selectedLrid,
  onSelect,
}: ParcelGridProps) {
  if (needsLocation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-ink-3">
        <span className="text-4xl mb-3">📍</span>
        <p className="text-sm font-medium text-ink mb-1">Where are you looking?</p>
        <p className="text-xs">Type a county, city, or zip in the search bar at the top.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3
                    grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3
                    gap-2.5 auto-rows-min">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        : parcels.length === 0
          ? (
            <div className="col-span-full flex flex-col items-center justify-center
                            py-20 text-center text-ink-3">
              <span className="text-4xl mb-3">🌾</span>
              <p className="text-sm font-medium text-ink mb-1">No lots match your filters yet</p>
              <p className="text-xs mb-3">Try loosening the minimum score or acreage range.</p>
              {hasMore && <LoadMoreButton isLoading={isLoadingMore} onClick={onLoadMore} />}
            </div>
          )
          : (
            <>
              {parcels.map(parcel => (
                <ParcelCard
                  key={parcel.lrid}
                  parcel={parcel}
                  isSelected={parcel.lrid === selectedLrid}
                  onSelect={onSelect}
                />
              ))}
              {hasMore && (
                <div className="col-span-full flex justify-center py-3">
                  <LoadMoreButton isLoading={isLoadingMore} onClick={onLoadMore} />
                </div>
              )}
            </>
          )
      }
    </div>
  )
}
