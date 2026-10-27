import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GuideShell } from '@/components/guides/GuideShell'
import { STATE_NAMES, countiesInState, countyPath, stateSlug } from '@/lib/counties'

type Params = { state: string }

export function generateStaticParams(): Params[] {
  return Object.keys(STATE_NAMES).map(code => ({ state: stateSlug(code) }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const name = STATE_NAMES[(await params).state.toUpperCase()]
  return {
    title: `Tiny home land in ${name}`,
    description: `County-by-county guide to land for tiny homes in ${name}: zoning codes, flood zones, lot sizes, and what to ask county planning.`,
  }
}

export default async function StatePage({ params }: { params: Promise<Params> }) {
  const code = (await params).state.toUpperCase()
  const name = STATE_NAMES[code]
  if (!name) notFound()

  const counties = countiesInState(code).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <GuideShell crumbs={[{ label: 'Guides', href: '/guides' }, { label: name }]}>
      <h1 className="font-serif text-4xl text-ink tracking-tight mb-3">
        Tiny home land in {name}
      </h1>
      <p className="text-sm text-ink-2 leading-relaxed mb-8 max-w-xl">
        Zoning for tiny homes is set county by county, and sometimes town by town.
        Pick a county to see what its records say about the land.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
        {counties.map(c => (
          <Link key={c.geoid} href={countyPath(c)}
                className="text-sm text-accent hover:underline">
            {c.name}
          </Link>
        ))}
      </div>
    </GuideShell>
  )
}
