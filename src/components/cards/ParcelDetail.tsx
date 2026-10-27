'use client'

import type { Parcel, BuildTribe } from '@/types/parcel'
import {
  TRIBE_SCORE_WEIGHTS,
  ZONING_DETAILS_AVAILABLE,
  ROAD_ACCESS_AVAILABLE,
} from '@/types/parcel'
import { ScorePill } from '../ui/ScorePill'
import { formatAcres } from '@/lib/scoring'
import { planningSearchUrl } from '@/lib/counties'
import { ZONE_TYPE_LABELS, UNLIKELY_ZONE_TYPES } from '@/lib/zoning'
import dynamic from 'next/dynamic'

// MapLibre needs the browser
const MapView = dynamic(() => import('../map/MapView').then(m => m.MapView), { ssr: false })

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

const FEET_PER_METRE = 3.28084

// A point inside the lot (the centroid can fall outside odd shapes)
function mapsUrl(parcel: Parcel): string {
  return `https://www.google.com/maps/search/?api=1&query=${parcel.surfpointy},${parcel.surfpointx}`
}

// accesstype is set mostly on public land, which is rarely for sale
const PUBLIC_ACCESS_LABELS: Record<NonNullable<Parcel['accesstype']>, string> = {
  OPEN:       'Open to the public',
  RESTRICTED: 'Restricted public access',
  CLOSED:     'Closed to the public',
  UNKNOWN:    'Unknown, verify',
}

// Plain links for now. Swap in referral links once affiliate programs are set
// up, and bring back the referral disclosure below the list when they are.
const RESOURCES = [
  { icon: '🛡️', cat: 'Insurance', name: 'Foremost: tiny home insurance',
    href: 'https://www.foremost.com/',
    desc: 'Covers RVIA or NOAH certified THOWs and tiny homes on foundations. Ask an agent which program fits.' },
  { icon: '🏗️', cat: 'Financing', name: 'Tiny home financing options',
    href: 'https://lendedu.com/blog/tiny-home-financing-loans/',
    desc: 'Most tiny homes don\'t qualify for a mortgage. Personal, RV, and builder loans compared.' },
  { icon: '☀️', cat: 'Off-grid', name: 'Renogy: solar kits',
    href: 'https://www.renogy.com/',
    desc: 'Off-grid solar kits and batteries, from starter to whole-home sizes.' },
  { icon: '💧', cat: 'Water', name: 'Well drilling cost guide',
    href: 'https://www.bobvila.com/articles/well-drilling-cost/',
    desc: 'Typical cost per foot and by depth. Get local quotes before you buy.' },
  { icon: '⚖️', cat: 'Legal', name: 'Find a land use attorney',
    href: 'https://www.findlegalhelp.org/',
    desc: 'Lawyer referral services in your state. Before closing on uncertain zoning, a one-hour consult is cheap.' },
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

  const acreage = formatAcres(parcel.acreage)
  // Vacant land often has a placeholder like "NO ADDRESSED STRUCTURES"; keep only street addresses
  const address  = /^\d/.test(parcel.parceladdr ?? '') ? parcel.parceladdr : null
  const location = [address, parcel.countyname, parcel.parcelstate]
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

      {/* map of this lot */}
      <div className="h-36 flex-shrink-0 relative overflow-hidden bg-tan-lt">
        <MapView parcels={[parcel]} selectedLrid={parcel.lrid} compact />
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
          <DetailRow label="Parcel ID"     value={parcel.parcelid ?? 'Not on record'} />
          {parcel.nearestTown && parcel.distanceToTown && (
            <DetailRow label="Distance to town"
                       value={`${parcel.distanceToTown.toFixed(1)} mi to ${parcel.nearestTown}`} />
          )}
          {parcel.elevavg != null && (
            <DetailRow label="Elevation (avg)"
                       value={`${Math.round(parcel.elevavg * FEET_PER_METRE).toLocaleString()} ft`} />
          )}
          <DetailRow label="Last sold"
                     value={parcel.saledate
                       ? new Date(parcel.saledate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                       : 'Not on record'} />
          <DetailRow label="Assessed value"
                     value={parcel.landvalue ? `$${parcel.landvalue.toLocaleString()}` : 'Not available'} />
          <a href={mapsUrl(parcel)} target="_blank" rel="noopener noreferrer"
             className="inline-block mt-2 text-xs text-accent font-medium hover:underline">
            Open in Google Maps →
          </a>
          <p className="text-[10px] text-ink-3 mt-1 leading-relaxed">
            Most vacant land has no street address. Use the parcel ID with the county
            assessor or planning office to ask about this lot.
          </p>
        </Section>

        <Section title="Zoning and legality">
          <div className={`rounded p-2.5 mb-2 border ${UNLIKELY_ZONE_TYPES.includes(parcel.zoneType)
                            ? 'bg-danger-lt border-danger/20' : 'bg-amber-lt border-amber/25'}`}>
            <div className={`text-[10px] font-semibold mb-1 ${UNLIKELY_ZONE_TYPES.includes(parcel.zoneType)
                              ? 'text-danger' : 'text-amber'}`}>
              {parcel.zoningcode
                ? `${parcel.zoningcode} · ${ZONE_TYPE_LABELS[parcel.zoneType]}`
                : 'Unknown, verify'}
            </div>
            <div className="text-xs text-ink-2 leading-relaxed">{parcel.zoningPlainText}</div>
          </div>
          <div className="flex flex-col gap-1">
            {parcel.zoningurl && (
              <a href={parcel.zoningurl} target="_blank" rel="noopener noreferrer"
                 className="text-xs text-accent font-medium hover:underline">
                What {parcel.zoningcode ?? 'this zone'} allows →
              </a>
            )}
            <a href={planningSearchUrl(
                 [parcel.countyname, parcel.parcelstate].filter(Boolean).join(', '))} target="_blank" rel="noopener noreferrer"
               className="text-xs text-accent font-medium hover:underline">
              Verify with county planning →
            </a>
          </div>
        </Section>

        <Section title={ROAD_ACCESS_AVAILABLE ? 'Access and infrastructure' : 'Site conditions'}>
          {ROAD_ACCESS_AVAILABLE && (
            <DetailRow label="Road access" value={parcel.accessLabel} status="warn" />
          )}
          {parcel.accesstype && (
            <DetailRow label="Public access" value={PUBLIC_ACCESS_LABELS[parcel.accesstype]}
                       status="warn" />
          )}
          <DetailRow label="Flood zone"
                     value={parcel.fldzone === 'X' ? 'Zone X, minimal risk'
                          : parcel.fldzone === 'unknown' ? 'Unknown, verify'
                          : `Zone ${parcel.fldzone}`}
                     status={parcel.floodRisk === 'none' ? 'ok'
                           : parcel.floodRisk === 'moderate' ? 'warn' : 'bad'} />
          <DetailRow label="HOA / CC&Rs"
                     value={parcel.hoaStatus === 'none' ? 'None on record'
                          : parcel.hoaStatus === 'present' ? 'CC&Rs present'
                          : 'Unknown, verify'}
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
            ...(ROAD_ACCESS_AVAILABLE
              ? [['Road access', parcel.scoreBreakdown.access, TRIBE_SCORE_WEIGHTS[tribe].access]]
              : []),
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
            {RESOURCES.map(r => (
              <a key={r.name} href={r.href} target="_blank" rel="noopener noreferrer"
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
        </Section>

      </div>

      {/* CTAs */}
      <div className="px-3.5 py-3 border-t border-border bg-surface flex flex-col gap-2 flex-shrink-0"
           style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
        {/* Owner contact needs the paywall, and saving lots needs accounts. Neither exists yet. */}
        <button disabled
                className="h-9 w-full bg-accent/40 text-white text-sm font-medium rounded cursor-not-allowed">
          Get owner contact info
        </button>
      </div>
    </div>
  )
}
