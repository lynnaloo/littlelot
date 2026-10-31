'use client'

import type { Parcel } from '@/types/parcel'
import { ROAD_ACCESS_AVAILABLE, HOA_DATA_AVAILABLE } from '@/types/parcel'
import { ScorePill } from '../ui/ScorePill'
import { LotShape } from './LotShape'
import { formatAcres, streetAddress, WILDFIRE_LABELS } from '@/lib/scoring'
import { findCountyByGeoid } from '@/lib/counties'
import { ZONE_TYPE_LABELS, UNLIKELY_ZONE_TYPES } from '@/lib/zoning'

interface ParcelCardProps {
  parcel: Parcel
  isSelected?: boolean
  onSelect: (parcel: Parcel) => void
}

function AttrRow({
  label, value, status,
}: {
  label: string
  value: string
  status: 'ok' | 'warn' | 'bad' | 'neutral'
}) {
  const color = {
    ok:      'text-accent',
    warn:    'text-amber',
    bad:     'text-danger',
    neutral: 'text-ink',
  }[status]

  return (
    <div className="flex justify-between text-xs">
      <span className="text-ink-3">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  )
}

export function ParcelCard({ parcel, isSelected, onSelect }: ParcelCardProps) {
  const acreage   = formatAcres(parcel.acreage)
  // Not placename: it holds property names ("Smith Farm"), not towns
  const county    = findCountyByGeoid(parcel.geoid)
  const location  = [
    streetAddress(parcel),
    county ? `${county.name}, ${county.state}`
           : [parcel.countyname, parcel.parcelstate].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ')

  const floodStatus = parcel.floodRisk === 'none' ? 'ok'
                    : parcel.floodRisk === 'moderate' ? 'warn'
                    : 'bad'

  const hoaStatus = parcel.hoaStatus === 'none' ? 'ok'
                  : parcel.hoaStatus === 'present' ? 'bad'
                  : 'warn'

  const hoaLabel = parcel.hoaStatus === 'none' ? 'None on record'
                 : parcel.hoaStatus === 'present' ? 'CC&Rs present'
                 : 'Unknown, verify'

  return (
    <button
      onClick={() => onSelect(parcel)}
      className={`bg-white rounded-xl border text-left overflow-hidden
                  transition-all hover:border-accent w-full
                  ${isSelected ? 'border-accent border-2 shadow-sm' : 'border-border'}`}
    >
      <div className="h-24 bg-[#b8ceac] relative overflow-hidden">
        <LotShape geometry={parcel.geometry} />
        <div className="absolute top-2 left-2">
          <ScorePill score={parcel.readinessScore} />
        </div>
        <div className="absolute top-2 right-2 h-5 px-2 bg-white/90 border border-black/8
                        rounded text-[10px] font-semibold text-ink-2 flex items-center">
          {parcel.zoningcode ?? 'Zoning unknown'}
        </div>
      </div>

      <div className="p-3">
        <div className="text-base font-semibold text-ink mb-0.5">{acreage} acres</div>
        <div className="text-[11px] text-ink-3 mb-2.5">{location}</div>

        <div className="flex flex-col gap-1 mb-3">
          {ROAD_ACCESS_AVAILABLE && (
            <AttrRow label="Road access" value={parcel.accessLabel} status="warn" />
          )}
          <AttrRow label="Zoning"
                   value={parcel.zoningcode ? `${ZONE_TYPE_LABELS[parcel.zoneType]}, verify` : 'Unknown, verify'}
                   status={UNLIKELY_ZONE_TYPES.includes(parcel.zoneType) ? 'bad' : 'warn'} />
          <AttrRow label="Flood zone" value={parcel.floodLabel} status={floodStatus} />
          <AttrRow label="Wildfire hazard"
                   value={WILDFIRE_LABELS[parcel.wildfireHazard].label}
                   status={WILDFIRE_LABELS[parcel.wildfireHazard].status} />
          {HOA_DATA_AVAILABLE && (
            <AttrRow label="HOA / CC&Rs" value={hoaLabel} status={hoaStatus} />
          )}
          <AttrRow label="Structures"
                   value={parcel.isVacant ? 'None' : `${parcel.numbldgs} on parcel`}
                   status={parcel.isVacant ? 'ok' : 'warn'} />
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <span className="text-xs text-ink-2">
            Assessed{' '}
            <strong className="text-ink font-semibold">
              {parcel.landvalue
                ? `$${parcel.landvalue.toLocaleString()}`
                : 'Not available'}
            </strong>
          </span>
        </div>
      </div>
    </button>
  )
}
