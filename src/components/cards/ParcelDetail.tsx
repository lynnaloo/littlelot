'use client'

import type { Parcel, BuildTribe } from '@/types/parcel'
import { TRIBE_SCORE_WEIGHTS, ZONING_DETAILS_AVAILABLE } from '@/types/parcel'
import { ScorePill } from '../ui/ScorePill'

interface ParcelDetailProps {
  parcel: Parcel | null
  tribe: BuildTribe
  onBack?: () => void
}

function DetailRow({ label, value, status }: {
  label: string
  value: string
  status?: 'ok' | 'warn' | 'bad'
}) {
  const color = status === 'ok' ? 'text-accent'
              : status === 'warn' ? 'text-amber'
              : status === 'bad' ? 'text-danger'
              : 'text-ink'
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-tan-lt last:border-none text-xs">
      <span className="text-ink-3 flex-shrink-0">{label}</span>
      <span className={`font-medium text-right max-w-[55%] ${color}`}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3.5 py-3 border-b border-border">
      <div className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-2"
           style={{ fontVariant: 'small-caps' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

const AFFILIATE_RESOURCES = [
  { icon: '🛡️', cat: 'Insurance',    name: 'Foremost — THOW and park model',
    desc: 'One of few carriers covering THOWs as personal property.' },
  { icon: '🏗️', cat: 'Financing',    name: 'Hearth — tiny home loans',
    desc: 'No land required as collateral. Understands non-traditional builds.' },
  { icon: '☀️', cat: 'Off-grid',     name: 'Renogy — solar starter kits',
    desc: 'Kits sized for tiny homes. Sizing calculator included.' },
  { icon: '💧', cat: 'Water',        name: 'Well drilling estimator',
    desc: 'National average cost by region and depth.' },
  { icon: '⚖️', cat: 'Legal',        name: 'Find a land use attorney',
    desc: 'Before closing on uncertain zoning, a one-hour consult is cheap.' },
]

export function ParcelDetail({ parcel, tribe, onBack }: ParcelDetailProps) {
  if (!parcel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-ink-3">
        <span className="text-4xl mb-3">◉</span>
        <p className="text-sm font-medium text-ink mb-1">Select a lot to see details</p>
        <p className="text-xs">Click any lot card to see lot details, readiness score breakdown, and resources.</p>
      </div>
    )
  }

  const acreage = parcel.acreage.toFixed(1)
  const location = [parcel.placename, parcel.countyfp, parcel.statefp]
    .filter(Boolean).join(', ')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* mobile back button */}
      {onBack && (
        <button onClick={onBack}
          className="md:hidden flex items-center gap-1.5 text-xs text-ink-2 px-3.5 py-2
                     border-b border-border bg-white hover:text-accent transition-colors">
          ← Back to results
        </button>
      )}

      {/* map thumb */}
      <div className="h-36 bg-[#a8c89a] flex-shrink-0 relative overflow-hidden">
        <svg viewBox="0 0 310 144" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="310" height="144" fill="#a8c89a"/>
          <path d="M0 110 Q60 80 130 96 Q190 68 260 84 L310 90 L310 144 L0 144Z"
                fill="#7da870" opacity=".5"/>
          <rect x="70" y="28" width="140" height="80" rx="4"
                fill="none" stroke="#4A7C59" strokeWidth="2.5"/>
          <rect x="72" y="30" width="136" height="76" rx="3" fill="#4A7C5928"/>
          <circle cx="140" cy="68" r="5" fill="#4A7C59"/>
          <circle cx="140" cy="68" r="12" fill="#4A7C5928"/>
        </svg>
      </div>

      {/* score strip */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-border flex-shrink-0">
        <div>
          <div className="text-[10px] text-ink-3">Readiness score</div>
          <div className="text-[10px] text-ink-3">for your build type</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${
            parcel.readinessScore >= 75 ? 'text-accent'
            : parcel.readinessScore >= 55 ? 'text-amber'
            : 'text-danger'
          }`}>
            {parcel.readinessScore} / 100
          </div>
          <div className="text-[10px] text-ink-3">
            {parcel.readinessScore >= 75 ? 'Strong match'
             : parcel.readinessScore >= 55 ? 'Check details'
             : 'Ask hard questions first'}
          </div>
        </div>
      </div>

      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto">

        <Section title="Lot basics">
          <DetailRow label="Acreage"       value={`${acreage} ac`} />
          <DetailRow label="Location"      value={location} />
          {parcel.nearestTown && parcel.distanceToTown && (
            <DetailRow label="Distance to town"
                       value={`${parcel.distanceToTown.toFixed(1)} mi to ${parcel.nearestTown}`} />
          )}
          {parcel.elevavg && (
            <DetailRow label="Elevation (avg)" value={`${Math.round(parcel.elevavg).toLocaleString()} ft`} />
          )}
          <DetailRow label="Last sold"
                     value={parcel.saledate
                       ? new Date(parcel.saledate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                       : 'Not on record'} />
          <DetailRow label="Assessed value"
                     value={parcel.landvalue ? `$${parcel.landvalue.toLocaleString()}` : 'Not available'} />
        </Section>

        <Section title="Zoning and legality">
          <div className="bg-amber-lt border border-amber/25 rounded p-2.5 mb-2">
            <div className="text-[10px] font-semibold text-amber mb-1">
              {parcel.zoningcode ?? 'Unknown, verify'}
            </div>
            <div className="text-xs text-ink-2 leading-relaxed">{parcel.zoningPlainText}</div>
          </div>
          <a href="#" className="text-xs text-accent font-medium hover:underline">
            Verify with county planning →
          </a>
        </Section>

        <Section title="Access and infrastructure">
          <DetailRow label="Road access" value={parcel.accessLabel}
                     status={parcel.accesstype === 'paved' ? 'ok'
                           : parcel.accesstype === 'none' ? 'bad' : 'warn'} />
          <DetailRow label="Flood zone"
                     value={parcel.fldzone === 'X' ? 'Zone X — minimal risk'
                          : parcel.fldzone === 'unknown' ? 'Unknown — verify'
                          : `Zone ${parcel.fldzone}`}
                     status={parcel.floodRisk === 'none' ? 'ok'
                           : parcel.floodRisk === 'moderate' ? 'warn' : 'bad'} />
          <DetailRow label="HOA / CC&Rs"
                     value={parcel.hoaStatus === 'none' ? 'None on record'
                          : parcel.hoaStatus === 'present' ? 'CC&Rs present'
                          : 'Unknown — verify'}
                     status={parcel.hoaStatus === 'none' ? 'ok'
                           : parcel.hoaStatus === 'present' ? 'bad' : 'warn'} />
          <DetailRow label="Structures"
                     value={parcel.isVacant ? 'None' : `${parcel.numbldgs} building(s)`}
                     status={parcel.isVacant ? 'ok' : 'warn'} />
        </Section>

        <Section title="Score breakdown">
          {!ZONING_DETAILS_AVAILABLE && (
            <div className="flex justify-between text-[10px] text-ink-3 mb-1.5">
              <span>Zoning</span>
              <span className="font-semibold text-amber">Coming soon</span>
            </div>
          )}
          {[
            ...(ZONING_DETAILS_AVAILABLE
              ? [['Zoning', parcel.scoreBreakdown.zoning, TRIBE_SCORE_WEIGHTS[tribe].zoning]]
              : []),
            ['Road access', parcel.scoreBreakdown.access,  TRIBE_SCORE_WEIGHTS[tribe].access],
            ['Water',       parcel.scoreBreakdown.water,   TRIBE_SCORE_WEIGHTS[tribe].water],
            ['Flood zone',  parcel.scoreBreakdown.flood,   TRIBE_SCORE_WEIGHTS[tribe].flood],
            ['HOA',         parcel.scoreBreakdown.hoa,     TRIBE_SCORE_WEIGHTS[tribe].hoa],
          ].map(([label, pts, max]) => (
            <div key={label as string} className="mb-1.5">
              <div className="flex justify-between text-[10px] text-ink-3 mb-0.5">
                <span>{label}</span>
                <span>{pts} / {max}</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full"
                     style={{ width: `${((pts as number) / (max as number)) * 100}%` }} />
              </div>
            </div>
          ))}
        </Section>

        <Section title="Resources for this lot">
          <div className="flex flex-col gap-1.5">
            {AFFILIATE_RESOURCES.map(r => (
              <a key={r.name} href="#"
                 className="flex items-center gap-2.5 bg-white border border-border
                            rounded p-2 hover:border-tan transition-colors text-left">
                <span className="text-lg flex-shrink-0">{r.icon}</span>
                <div>
                  <div className="text-[10px] font-semibold text-accent mb-0.5">{r.cat}</div>
                  <div className="text-xs font-medium text-ink leading-tight">{r.name}</div>
                  <div className="text-[10px] text-ink-3">{r.desc}</div>
                </div>
              </a>
            ))}
          </div>
          <p className="text-[9px] text-ink-3 mt-2 leading-relaxed">
            Some links above include referral arrangements. We only list what we would recommend regardless.
          </p>
        </Section>

      </div>

      {/* CTAs */}
      <div className="px-3.5 py-3 border-t border-border bg-surface flex flex-col gap-2 flex-shrink-0"
           style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        <button className="h-9 w-full bg-accent text-white text-sm font-medium rounded
                           hover:bg-accent/90 transition-colors">
          Get owner contact info
        </button>
        <button className="h-9 w-full border border-border bg-transparent text-ink text-sm rounded
                           hover:border-accent transition-colors">
          Save this lot ♡
        </button>
      </div>
    </div>
  )
}
