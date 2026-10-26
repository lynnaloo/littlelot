'use client'

import type { Parcel } from '@/types/parcel'
import { ParcelCard } from './ParcelCard'

interface ParcelGridProps {
  parcels: Parcel[]
  isLoading: boolean
  needsLocation: boolean
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

export function ParcelGrid({
  parcels,
  isLoading,
  needsLocation,
  selectedLrid,
  onSelect,
}: ParcelGridProps) {
  if (needsLocation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-ink-3">
        <span className="text-4xl mb-3">📍</span>
        <p className="text-sm font-medium text-ink mb-1">Where are you looking?</p>
        <p className="text-xs">Search for a county to see lots.</p>
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
              <p className="text-sm font-medium text-ink mb-1">No lots match your filters</p>
              <p className="text-xs">Try loosening the minimum score or acreage range.</p>
            </div>
          )
          : parcels.map(parcel => (
            <ParcelCard
              key={parcel.lrid}
              parcel={parcel}
              isSelected={parcel.lrid === selectedLrid}
              onSelect={onSelect}
            />
          ))
      }
    </div>
  )
}
