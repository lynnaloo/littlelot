'use client'

import type { Parcel } from '@/types/parcel'
import { ScorePill } from '../ui/ScorePill'

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
  const acreage   = parcel.acreage.toFixed(1)
  const location  = [parcel.placename, parcel.countyfp].filter(Boolean).join(', ')

  const floodStatus = parcel.floodRisk === 'none' ? 'ok'
                    : parcel.floodRisk === 'moderate' ? 'warn'
                    : 'bad'

  const floodLabel = parcel.floodRisk === 'none' ? `Zone ${parcel.fldzone} — clear`
                   : parcel.fldzone === 'unknown' ? 'Zone unknown — verify'
                   : `Zone ${parcel.fldzone} — risk`

  const hoaStatus = parcel.hoaStatus === 'none' ? 'ok'
                  : parcel.hoaStatus === 'present' ? 'bad'
                  : 'warn'

  const hoaLabel = parcel.hoaStatus === 'none' ? 'None on record'
                 : parcel.hoaStatus === 'present' ? 'CC&Rs present'
                 : 'Unknown — verify'

  return (
    <button
      onClick={() => onSelect(parcel)}
      className={`bg-white rounded-xl border text-left overflow-hidden
                  transition-all hover:border-accent w-full
                  ${isSelected ? 'border-accent border-2 shadow-sm' : 'border-border'}`}
    >
      {/* map thumb placeholder -- replaced with real MapLibre snapshot later */}
      <div className="h-24 bg-[#b8ceac] relative overflow-hidden">
        <svg viewBox="0 0 280 96" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="96" fill="#b8ceac"/>
          <path d="M0 75 Q60 55 130 68 Q185 48 250 62 L280 66 L280 96 L0 96Z"
                fill="#8ab882" opacity=".6"/>
          <rect x="60" y="18" width="130" height="58" rx="3"
                fill="none" stroke="#4A7C59" strokeWidth="2"/>
          <rect x="62" y="20" width="126" height="54" rx="2" fill="#4A7C5920"/>
        </svg>
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
          <AttrRow label="Road access" value={parcel.accessLabel}
                   status={parcel.accesstype === 'paved' ? 'ok'
                         : parcel.accesstype === 'gravel' ? 'ok'
                         : parcel.accesstype === 'none' ? 'bad' : 'warn'} />
          <AttrRow label="Flood zone" value={floodLabel} status={floodStatus} />
          <AttrRow label="HOA / CC&Rs" value={hoaLabel} status={hoaStatus} />
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
