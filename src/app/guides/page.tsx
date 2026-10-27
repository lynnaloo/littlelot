import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideShell } from '@/components/guides/GuideShell'
import { STATE_NAMES, stateSlug } from '@/lib/counties'

export const metadata: Metadata = {
  title: 'Tiny home land by state and county',
  description: 'What county records say about land for tiny homes in every US county: zoning codes in use, flood zones, and typical lot sizes.',
}

export default function GuidesPage() {
  const states = Object.entries(STATE_NAMES).sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <GuideShell crumbs={[{ label: 'Guides' }]}>
      <h1 className="font-serif text-4xl text-ink tracking-tight mb-3">
        Tiny home land by state and county
      </h1>
      <p className="text-sm text-ink-2 leading-relaxed mb-8 max-w-xl">
        Pick a state, then a county. Each county page shows what its records say about
        the land: the zoning codes in use, flood zones, and typical lot sizes. It also
        lists what to ask county planning before you buy.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
        {states.map(([code, name]) => (
          <Link key={code} href={`/guides/${stateSlug(code)}`}
                className="text-sm text-accent hover:underline">
            {name}
          </Link>
        ))}
      </div>
    </GuideShell>
  )
}
