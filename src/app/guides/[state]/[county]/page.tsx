import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GuideShell } from '@/components/guides/GuideShell'
import {
  STATE_NAMES,
  findCounty,
  countyLabel,
  countySearchPath,
  planningSearchUrl,
  stateSlug,
} from '@/lib/counties'
import { getCountyProfile } from '@/lib/countyProfile'
import { formatAcres } from '@/lib/scoring'

type Params = { state: string; county: string }

// 3,200 counties: render each on first visit, then refresh weekly
export const revalidate = 604800
export function generateStaticParams(): Params[] {
  return []
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { state, county } = await params
  const c = findCounty(state, county)
  if (!c) return {}
  return {
    title: `Tiny home land in ${countyLabel(c)}`,
    description: `What county records say about land for tiny homes in ${c.name}, ${STATE_NAMES[c.state]}: zoning codes, flood zones, lot sizes, and what to ask county planning before you buy.`,
  }
}

const pct = (share: number) => `${Math.round(share * 100)}%`

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-lg p-5 mb-4">
      <h2 className="text-sm font-semibold text-ink mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-tan-lt last:border-none text-sm">
      <span className="text-ink-3">{label}</span>
      <span className="font-medium text-ink text-right">{value}</span>
    </div>
  )
}

const QUESTIONS = [
  'Is a tiny home on wheels (THOW) allowed as a full-time dwelling, or only as an RV for limited stays?',
  'What is the minimum dwelling size in this zone?',
  'Has the county adopted Appendix Q of the IRC for tiny houses?',
  'What does a septic permit need here: perc test, minimum lot size, setbacks?',
  'Does a well need a permit, and is there a minimum lot size for one?',
  'Does the lot have legal road access, and who maintains the road?',
]

export default async function CountyPage({ params }: { params: Promise<Params> }) {
  const { state, county } = await params
  const c = findCounty(state, county)
  if (!c) notFound()

  const profile   = await getCountyProfile(c.geoid)
  const label     = countyLabel(c)
  const stateName = STATE_NAMES[c.state]
  const hasData   = profile.sampleSize > 0

  return (
    <GuideShell crumbs={[
      { label: 'Guides', href: '/guides' },
      { label: stateName, href: `/guides/${stateSlug(c.state)}` },
      { label: c.name },
    ]}>
      <h1 className="font-serif text-4xl text-ink tracking-tight mb-3">
        Tiny home land in {label}
      </h1>
      <p className="text-sm text-ink-2 leading-relaxed mb-6 max-w-xl">
        What {c.name} records say about the land, and what you&apos;ll need to check
        with the county yourself.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link href={countySearchPath(c)}
              className="h-10 px-5 bg-accent text-white text-sm font-medium rounded
                         flex items-center hover:bg-accent/90 transition-colors">
          Search lots in {c.name}
        </Link>
        <a href={planningSearchUrl(label)} target="_blank" rel="noopener noreferrer"
           className="h-10 px-5 bg-white border border-border text-sm font-medium text-ink rounded
                      flex items-center hover:border-accent hover:text-accent transition-colors">
          Find county planning →
        </a>
      </div>

      {!hasData && (
        <Section title="Lot records">
          <p className="text-sm text-ink-2 leading-relaxed">
            We don&apos;t have lot records for {c.name} yet. Check with the county
            assessor and planning office directly.
          </p>
        </Section>
      )}

      {hasData && (
        <>
          <Section title="Zoning codes you'll see">
            {profile.zoning.length > 0 ? (
              <>
                <table className="w-full text-sm mb-3">
                  <thead>
                    <tr className="text-left text-[11px] text-ink-3 uppercase tracking-wider">
                      <th className="font-medium pb-1.5">Code</th>
                      <th className="font-medium pb-1.5 text-right">Share of lots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.zoning.map(z => (
                      <tr key={z.code} className="border-t border-tan-lt">
                        <td className="py-1.5 font-semibold text-ink">{z.code}</td>
                        <td className="py-1.5 text-right text-ink-2">{pct(z.share)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {profile.zoningCoverage < 0.95 && (
                  <p className="text-xs text-ink-3 mb-2">
                    {pct(1 - profile.zoningCoverage)} of lots we sampled have no zoning code on record.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-2 mb-2">
                The lots we sampled have no zoning code on record. Ask county planning
                which zone a lot is in before you make an offer.
              </p>
            )}
            <p className="text-xs text-ink-3 leading-relaxed">
              A plain-language summary of what each zone allows for tiny homes is coming
              soon. Until then, ask county planning what a code allows for your build type.
            </p>
          </Section>

          <Section title="The land">
            <Fact label="Land area" value={`${c.landSqMi.toLocaleString()} sq mi`} />
            {profile.medianAcres != null && (
              <Fact label="Typical lot size" value={`${formatAcres(profile.medianAcres)} acres`} />
            )}
            <Fact label="Lots 1 acre or larger" value={pct(profile.oneAcrePlus)} />
            <Fact label="Lots outside the flood zone" value={pct(profile.outsideFloodZone)} />
            <p className="text-xs text-ink-3 mt-3">
              Based on a sample of {profile.sampleSize} lots from county records. Typical
              lot size is the median.
            </p>
          </Section>
        </>
      )}

      <Section title="Ask county planning before you buy">
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-ink-2 leading-relaxed">
          {QUESTIONS.map(q => <li key={q}>{q}</li>)}
        </ul>
        <p className="text-xs text-ink-3 mt-3">
          Get answers in writing when you can. Rules change, and a phone answer
          won&apos;t help you at a permit hearing.
        </p>
      </Section>

      <p className="text-xs text-ink-3 leading-relaxed mt-6">
        This page summarizes county records and is not legal advice. Zoning is never a
        guarantee. Verify with {c.name} planning before you buy.
      </p>
    </GuideShell>
  )
}
