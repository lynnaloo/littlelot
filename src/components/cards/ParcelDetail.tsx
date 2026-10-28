'use client'

import type { Parcel, BuildTribe, Nearby } from '@/types/parcel'
import {
  TRIBE_SCORE_WEIGHTS,
  ZONING_DETAILS_AVAILABLE,
  ROAD_ACCESS_AVAILABLE,
  HOA_DATA_AVAILABLE,
  NEARBY_MAX_MILES,
} from '@/types/parcel'
import { ScorePill } from '../ui/ScorePill'
import { formatAcres, WILDFIRE_LABELS } from '@/lib/scoring'
import { planningSearchUrl, findCountyByGeoid, landForSaleUrl, zillowLandUrl } from '@/lib/counties'
import { useBuildableGround, useNearby } from '@/lib/useLotSurroundings'
import { ZONE_TYPE_LABELS, UNLIKELY_ZONE_TYPES } from '@/lib/zoning'
import dynamic from 'next/dynamic'

// MapLibre needs the browser
const MapView = dynamic(() => import('../map/MapView').then(m => m.MapView), { ssr: false })

interface ParcelDetailProps {
  parcel: Parcel | null
  tribe: BuildTribe
  onBack?: () => void
}

type Status = 'ok' | 'warn' | 'bad'

const STATUS_TEXT: Record<Status, string> = { ok: 'text-accent', warn: 'text-amber', bad: 'text-danger' }
const STATUS_TILE: Record<Status, string> = {
  ok:   'bg-accent-lt border-accent/20',
  warn: 'bg-amber-lt border-amber/25',
  bad:  'bg-danger-lt border-danger/20',
}

function DetailRow({ label, value, status, detail }: {
  label: string
  value: string
  status?: Status
  detail?: string   // small line under the label, e.g. a place name
}) {
  return (
    <div className="flex justify-between items-start gap-3 py-1.5 border-b border-tan-lt last:border-none text-xs">
      <div className="min-w-0">
        <div className="text-ink-3">{label}</div>
        {detail && <div className="text-[11px] text-ink-2 leading-snug">{detail}</div>}
      </div>
      <span className={`font-medium text-right flex-shrink-0 max-w-[60%] ${status ? STATUS_TEXT[status] : 'text-ink'}`}>
        {value}
      </span>
    </div>
  )
}

// One fact, big enough to read at a glance
function Tile({ label, value, status }: { label: string; value: string; status?: Status }) {
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${status ? STATUS_TILE[status] : 'bg-white border-border'}`}>
      <div className="text-[10px] text-ink-3">{label}</div>
      <div className={`text-sm font-semibold leading-tight ${status ? STATUS_TEXT[status] : 'text-ink'}`}>
        {value}
      </div>
    </div>
  )
}

// A card per topic. Data notes fold away under "About this data".
function Section({ title, note, children }: {
  title: string
  note?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mx-3 mb-3 bg-white border border-border rounded-lg">
      <h3 className="px-3 pt-2.5 pb-1 text-xs font-semibold text-ink">{title}</h3>
      <div className="px-3 pb-2.5">{children}</div>
      {note && (
        <details className="group border-t border-tan-lt">
          <summary className="px-3 py-1.5 text-[10px] text-ink-3 cursor-pointer select-none
                              hover:text-accent list-none">
            <span className="group-open:hidden">About this data ▸</span>
            <span className="hidden group-open:inline">About this data ▾</span>
          </summary>
          <div className="px-3 pb-2.5 flex flex-col gap-1.5 text-[10px] text-ink-3 leading-relaxed">
            {note}
          </div>
        </details>
      )}
    </section>
  )
}

function LinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="flex justify-between items-center py-1.5 border-b border-tan-lt last:border-none
                  text-xs text-accent font-medium hover:underline">
      <span>{children}</span><span aria-hidden>→</span>
    </a>
  )
}

const FEET_PER_METRE = 3.28084

// A point inside the lot (the centroid can fall outside odd shapes)
function mapsUrl(parcel: Parcel): string {
  return `https://www.google.com/maps/search/?api=1&query=${parcel.surfpointy},${parcel.surfpointx}`
}

// Only for lots with a street address; Zillow can't match a parcel ID.
// Goes through our route, which adds the ZIP Zillow needs to find it.
function zillowUrl(address: string, parcel: Parcel): string {
  const params = new URLSearchParams({
    addr:  address,
    state: parcel.parcelstate ?? '',
    lat:   String(parcel.surfpointy),
    lng:   String(parcel.surfpointx),
  })
  if (parcel.countyname) params.set('county', parcel.countyname)
  return `/api/zillow?${params}`
}

// accesstype is set mostly on public land, which is rarely for sale
const PUBLIC_ACCESS_LABELS: Record<NonNullable<Parcel['accesstype']>, string> = {
  OPEN:       'Open to the public',
  RESTRICTED: 'Restricted public access',
  CLOSED:     'Closed to the public',
  UNKNOWN:    'Unknown, verify',
}

const MAX_FLAT_GRADE = 15   // percent, matches lib/terrain.ts

function groundStatus(acres: number): Status {
  // A tiny home pad and parking fit in about a tenth of an acre
  return acres >= 0.25 ? 'ok' : acres >= 0.1 ? 'warn' : 'bad'
}

function groundTile(ground: ReturnType<typeof useBuildableGround>): { value: string; status?: Status } {
  if (ground === undefined) return { value: 'Checking…' }
  if (ground === null || ground === 'error') return { value: 'Unknown', status: 'warn' }
  return { value: `${formatAcres(ground.flatAcres)} ac`, status: groundStatus(ground.flatAcres) }
}

const FLOOD_TILE: Record<Parcel['floodRisk'], { value: string; status: Status }> = {
  none:     { value: 'Low',      status: 'ok' },
  moderate: { value: 'Moderate', status: 'warn' },
  high:     { value: 'High',     status: 'bad' },
}

function groundRow(ground: ReturnType<typeof useBuildableGround>): {
  value: string
  status?: Status
} {
  if (ground === undefined) return { value: 'Checking…' }
  if (ground === null || ground === 'error') return { value: 'Unknown, verify', status: 'warn' }
  const acres = ground.flatAcres
  return {
    value: acres < 0.01
      ? 'Little or none under 15% grade'
      : `About ${formatAcres(acres)} ac (${Math.round(ground.flatShare * 100)}%) under 15% grade`,
    status: groundStatus(acres),
  }
}

// Distance as the value, the place's name under the label
function nearbyRow(nearby: Partial<Nearby> | undefined, key: keyof Nearby): { value: string; detail?: string } {
  if (nearby === undefined) return { value: 'Checking…' }
  const place = nearby[key]
  if (place === undefined) return { value: 'Unknown, verify' }
  if (place === null) return { value: `None within ${NEARBY_MAX_MILES} mi` }
  return { value: `${place.miles.toFixed(1)} mi`, detail: place.name }
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
  const ground = useBuildableGround(parcel)
  const nearby = useNearby(parcel)

  if (!parcel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-ink-3">
        <span className="text-4xl mb-3">◉</span>
        <p className="text-sm font-medium text-ink mb-1">Select a lot to see details</p>
        <p className="text-xs">Click any lot card to see lot details, readiness score breakdown, and resources.</p>
      </div>
    )
  }

  const county  = findCountyByGeoid(parcel.geoid)
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
      <div className="flex-1 overflow-y-auto bg-surface">

        {/* at a glance */}
        <div className="grid grid-cols-2 gap-2 p-3">
          <Tile label="Lot size" value={`${acreage} ac`} />
          <Tile label="Flat ground" {...groundTile(ground)} />
          <Tile label="Flood risk" {...FLOOD_TILE[parcel.floodRisk]} />
          <Tile label="Wildfire hazard"
                value={WILDFIRE_LABELS[parcel.wildfireHazard].label}
                status={WILDFIRE_LABELS[parcel.wildfireHazard].status} />
        </div>

        <Section title="Zoning">
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
          {parcel.zoningurl && (
            <LinkRow href={parcel.zoningurl}>What {parcel.zoningcode ?? 'this zone'} allows</LinkRow>
          )}
          <LinkRow href={planningSearchUrl(
                     [parcel.countyname, parcel.parcelstate].filter(Boolean).join(', '))}>
            Verify with county planning
          </LinkRow>
        </Section>

        <Section title="The land"
                 note={<p>
                   Flat ground is land under a {MAX_FLAT_GRADE}% grade, a common limit for driveways
                   and septic fields. It comes from USGS elevation data on a 10 m grid, so treat it as
                   a guide, not a site survey.
                 </p>}>
          <DetailRow label="Flat ground" {...groundRow(ground)} />
          {ground && ground !== 'error' && (
            <DetailRow label="Typical slope" value={`${ground.typicalGrade}% grade`}
                       status={ground.typicalGrade <= MAX_FLAT_GRADE ? 'ok'
                             : ground.typicalGrade <= 30 ? 'warn' : 'bad'} />
          )}
          {parcel.elevavg != null && (
            <DetailRow label="Elevation (avg)"
                       value={`${Math.round(parcel.elevavg * FEET_PER_METRE).toLocaleString()} ft`} />
          )}
          <DetailRow label="Structures"
                     value={parcel.isVacant ? 'None' : `${parcel.numbldgs} building(s)`}
                     status={parcel.isVacant ? 'ok' : 'warn'} />
        </Section>

        <Section title="Natural hazards"
                 note={<>
                   <p>Flood zones are FEMA&apos;s. Small streams are often unmapped.</p>
                   <p>
                     Wildfire hazard is the highest level anywhere on the lot, from the Forest
                     Service&apos;s 2023 hazard map. It rates how hard a fire would be to control,
                     not how likely one is.
                   </p>
                 </>}>
          <DetailRow label="Flood zone"
                     value={parcel.floodLabel}
                     status={FLOOD_TILE[parcel.floodRisk].status} />
          <DetailRow label="Wildfire hazard"
                     value={WILDFIRE_LABELS[parcel.wildfireHazard].label}
                     status={WILDFIRE_LABELS[parcel.wildfireHazard].status} />
        </Section>

        <Section title="Access and restrictions">
          <DetailRow label="Road access"
                     value={ROAD_ACCESS_AVAILABLE ? parcel.accessLabel : 'Coming soon'}
                     status="warn" />
          {parcel.accesstype && (
            <DetailRow label="Public access" value={PUBLIC_ACCESS_LABELS[parcel.accesstype]}
                       status="warn" />
          )}
          <DetailRow label="HOA / CC&Rs"
                     value={parcel.hoaStatus === 'none' ? 'None on record'
                          : parcel.hoaStatus === 'present' ? 'CC&Rs present'
                          : HOA_DATA_AVAILABLE ? 'Unknown, verify' : 'Unknown, ask for the deed'}
                     status={parcel.hoaStatus === 'none' ? 'ok'
                           : parcel.hoaStatus === 'present' ? 'bad' : 'warn'} />
        </Section>

        <Section title="Nearby"
                 note={<>
                   <p>Straight-line distances, so the drive will be longer.</p>
                   <p>
                     The nearest public elementary school may not be the one this lot is zoned
                     for. Ask the school district.
                   </p>
                   <p>
                     Hospitals are general and critical access hospitals (FEMA), which almost
                     always have an emergency room.
                   </p>
                   <p>
                     Recreation areas are public parks, forests and wildlife areas open to
                     visitors (USGS), measured to the nearest edge.
                   </p>
                 </>}>
          <DetailRow label="Town"              {...nearbyRow(nearby, 'town')} />
          <DetailRow label="Elementary school" {...nearbyRow(nearby, 'school')} />
          <DetailRow label="Hospital"          {...nearbyRow(nearby, 'hospital')} />
          <DetailRow label="Recreation area"   {...nearbyRow(nearby, 'recArea')} />
        </Section>

        <Section title="Lot record"
                 note={<p>
                   Most vacant land has no street address. Use the parcel ID with the county
                   assessor or planning office to ask about this lot.
                 </p>}>
          <DetailRow label="Location"       value={location} />
          <DetailRow label="Parcel ID"      value={parcel.parcelid ?? 'Not on record'} />
          <DetailRow label="Last sold"
                     value={parcel.saledate
                       ? new Date(parcel.saledate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                       : 'Not on record'} />
          <DetailRow label="Assessed value"
                     value={parcel.landvalue ? `$${parcel.landvalue.toLocaleString()}` : 'Not available'} />
        </Section>

        <Section title="See it elsewhere">
          <LinkRow href={mapsUrl(parcel)}>Open in Google Maps</LinkRow>
          {address && (
            <LinkRow href={zillowUrl(address, parcel)}>Look up this address on Zillow</LinkRow>
          )}
          {!address && county && (
            <LinkRow href={zillowLandUrl(county)}>Land for sale in {county.name} on Zillow</LinkRow>
          )}
          {county && (
            <LinkRow href={landForSaleUrl(county)}>Land for sale in {county.name} on LandWatch</LinkRow>
          )}
        </Section>

        <Section title="Score breakdown">
          {!ZONING_DETAILS_AVAILABLE && (
            <div className="flex justify-between text-[10px] text-ink-3 mb-1.5">
              <span>Zoning</span>
              <span className="font-semibold text-amber">Coming soon</span>
            </div>
          )}
          {!ROAD_ACCESS_AVAILABLE && (
            <div className="flex justify-between text-[10px] text-ink-3 mb-1.5">
              <span>Road access</span>
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
            ['Wildfire',    parcel.scoreBreakdown.fire,    TRIBE_SCORE_WEIGHTS[tribe].fire],
            ...(HOA_DATA_AVAILABLE
              ? [['HOA', parcel.scoreBreakdown.hoa, TRIBE_SCORE_WEIGHTS[tribe].hoa]]
              : []),
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
                 className="flex items-center gap-2.5 bg-surface border border-border
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
