import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GuideShell, type Crumb } from '@/components/guides/GuideShell'
import { ParcelDetail } from '@/components/cards/ParcelDetail'
import { loadLot } from '@/lib/lot'
import { lotPath, parseTribe } from '@/lib/lotUrl'
import { formatAcres } from '@/lib/scoring'
import { findCountyByGeoid, countyPath, STATE_NAMES, stateSlug } from '@/lib/counties'
import { TRIBE_LABELS, type BuildTribe, type Parcel } from '@/types/parcel'

type Props = {
  params: Promise<{ lrid: string }>
  searchParams: Promise<{ tribe?: string }>
}

// Shared links without a build type get the most common one
const DEFAULT_TRIBE: BuildTribe = 'foundation'

async function load({ params, searchParams }: Props) {
  const { lrid } = await params
  const tribe = parseTribe((await searchParams).tribe, DEFAULT_TRIBE)
  return { lrid, tribe, parcel: await loadLot(lrid, tribe) }
}

function placeOf(parcel: Parcel): string {
  const county = findCountyByGeoid(parcel.geoid)
  return county ? `${county.name}, ${county.state}`
       : [parcel.countyname, parcel.parcelstate].filter(Boolean).join(', ')
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { lrid, tribe, parcel } = await load(props)
  if (!parcel) return { title: 'Lot not found' }
  const title = `${formatAcres(parcel.acreage)} acres in ${placeOf(parcel)}`
  return {
    title,
    description: `Readiness score ${parcel.readinessScore}/100 (${TRIBE_LABELS[tribe]}). `
               + `Zoning, flood zone, wildfire hazard, slope, and what to ask county planning.`,
    alternates: { canonical: lotPath(lrid, tribe) },
  }
}

export default async function LotPage(props: Props) {
  const { lrid, tribe, parcel } = await load(props)
  if (!parcel) notFound()

  const county = findCountyByGeoid(parcel.geoid)
  const crumbs: Crumb[] = [{ label: 'Guides', href: '/guides' }]
  if (county) {
    crumbs.push({ label: STATE_NAMES[county.state] ?? county.state, href: `/guides/${stateSlug(county.state)}` })
    crumbs.push({ label: county.name, href: countyPath(county) })
  }
  crumbs.push({ label: 'This lot' })

  return (
    <GuideShell crumbs={crumbs}>
      <h1 className="font-serif text-3xl sm:text-4xl text-ink tracking-tight mb-2">
        {formatAcres(parcel.acreage)} acres in {placeOf(parcel)}
      </h1>

      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        <span className="text-xs text-ink-3 mr-1">Score for:</span>
        {(Object.keys(TRIBE_LABELS) as BuildTribe[]).map(t => (
          <Link key={t} href={lotPath(lrid, t)} replace scroll={false}
                className={`h-7 px-2.5 rounded border text-xs font-medium flex items-center transition-colors
                  ${t === tribe
                    ? 'bg-accent border-accent text-white'
                    : 'bg-white border-border text-ink-2 hover:text-accent'}`}>
            {TRIBE_LABELS[t]}
          </Link>
        ))}
      </div>

      <div className="max-w-md h-[75vh] min-h-[560px] bg-surface border border-border rounded-lg overflow-hidden">
        <ParcelDetail parcel={parcel} tribe={tribe} />
      </div>

      <p className="text-xs text-ink-3 mt-4">
        <Link href="/search" className="text-accent font-medium hover:underline">Search for more lots</Link>
        {county && <>
          {' '}or read the{' '}
          <Link href={countyPath(county)} className="text-accent font-medium hover:underline">
            {county.name} guide
          </Link>
        </>}
        .
      </p>
    </GuideShell>
  )
}
