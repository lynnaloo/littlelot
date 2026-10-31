// Landing page — server component, no client JS needed
import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'
import { ScorePill } from '@/components/ui/ScorePill'
import { SiteFooter } from '@/components/ui/SiteFooter'

export default function HomePage() {
  return (
    <main>
      {/* ── Brand hero ─────────────────────────────────────────────────── */}
      <section className="bg-white text-center py-14 px-6 flex flex-col items-center">
        <LogoMark size={200} />
        <h1 className="font-serif text-6xl text-ink tracking-tight mt-5 mb-2">
          the little lot
        </h1>
        <p className="text-ink-3 italic text-sm">
          Find land that actually works for your tiny home
        </p>
      </section>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-tan-lt px-[5%] py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent
                            bg-accent-lt px-3 py-1 rounded-full border border-accent/20 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Every county in the US. Zero lifestyle fluff.
            </div>
            <h2 className="font-serif text-5xl text-ink leading-tight tracking-tight mb-5">
              The hardest part of going tiny{' '}
              <em>isn&apos;t the build</em>
            </h2>
            <p className="text-ink-2 text-base leading-relaxed mb-8 max-w-md">
              It&apos;s finding land where your home is welcome, legal, and buildable.
              Zoning is hyper-local, HOAs ban tiny homes in the fine print, and most
              land listing sites don&apos;t even try to answer those questions. We start
              with zoning, flood risk, and lot size, score every lot for your build
              type, and tell you what to ask about the rest.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Link
                href="/search"
                className="h-11 px-7 bg-accent text-white text-sm font-medium
                           rounded flex items-center hover:bg-accent/90 transition-colors"
              >
                Search lots now
              </Link>
              <Link href="#how-it-works" className="text-sm text-ink-2 hover:text-accent">
                How the score works
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 pt-5 border-t border-border">
              {['Vacant land filter', 'Flood zone data', 'Zone type on every lot'].map(b => (
                <span key={b}
                  className="text-xs font-medium text-ink-2 bg-surface border border-border
                             px-2 py-1 rounded">
                  ✓ {b}
                </span>
              ))}
            </div>
          </div>

          {/* sample parcel card */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="h-44 bg-[#b2cca8] relative">
              <svg viewBox="0 0 420 180" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <rect width="420" height="180" fill="#b2cca8"/>
                <path d="M0 140 Q80 100 180 120 Q270 85 380 108 L420 115 L420 180 L0 180Z" fill="#8ab882" opacity=".6"/>
                <rect x="100" y="35" width="180" height="105" rx="4"
                      fill="none" stroke="#4A7C59" strokeWidth="2.5"/>
                <rect x="103" y="38" width="174" height="99" rx="3" fill="#4A7C5920"/>
                <circle cx="190" cy="87" r="6" fill="#4A7C59"/>
                <circle cx="190" cy="87" r="14" fill="#4A7C5930"/>
              </svg>
              <div className="absolute top-2.5 left-2.5">
                <ScorePill score={87} label="Strong match" />
              </div>
            </div>
            <div className="p-4">
              <div className="text-lg font-semibold text-ink mb-0.5">8.4 acres</div>
              <div className="text-xs text-ink-3 mb-3">Luray, Page County, VA · 5.1 mi from town</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Zoning',      'Agricultural, verify', 'warn'],
                  ['Flood zone',  'Zone X, clear',     'ok'],
                  ['Water / well', 'Room for a well',    'ok'],
                  ['Structures',  'None, vacant',        'ok'],
                ].map(([label, val, status]) => (
                  <div key={label} className="bg-surface rounded p-2">
                    <div className="text-[10px] text-ink-3 mb-0.5">{label}</div>
                    <div className={`text-xs font-semibold ${status === 'ok' ? 'text-accent' : 'text-amber'}`}>
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ────────────────────────────────────────────────── */}
      <section className="bg-ink px-[5%] py-14">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              q: '"I built it. Now where do I legally put it?"',
              a: 'The parking problem is the movement\'s hardest question. Zoning is hyper-local, changes constantly, and almost nobody explains it clearly.',
              link: { href: '/guides', label: 'Read our county guides' },
            },
            {
              q: '"Every lot I find has an HOA that bans tiny homes."',
              a: 'CC&Rs that prohibit structures under a certain square footage are a silent deal-breaker. County records don\'t show them, so we tell you to ask for the deed and any covenants on every lot.',
              link: { href: '/search', label: 'See what we check on each lot' },
            },
            {
              q: '"I don\'t know what questions to even ask about a parcel."',
              a: 'Road grade for trailer delivery. Flood zone. Well potential. Perc test eligibility.',
              link: { href: '#how-it-works', label: 'See how the readiness score works' },
            },
          ].map(item => (
            <div key={item.q}>
              <p className="font-serif italic text-tan-lt text-lg leading-snug mb-3">{item.q}</p>
              <p className="text-tan text-sm leading-relaxed mb-2">{item.a}</p>
              <Link href={item.link.href}
                className="text-[#A8D5B8] text-sm font-semibold underline
                           underline-offset-2 decoration-[#A8D5B8]/40
                           hover:text-tan-lt hover:decoration-tan-lt transition-colors">
                {item.link.label} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Score explainer ────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-surface px-[5%] py-20 border-y border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">
              Readiness score
            </p>
            <h2 className="font-serif text-4xl text-ink tracking-tight mb-4">
              Score, don&apos;t just filter
            </h2>
            <p className="text-ink-2 text-sm leading-relaxed mb-8 max-w-sm">
              Forty disconnected checkboxes don&apos;t tell you whether a lot works.
              The readiness score combines the factors that actually matter into one
              honest number, weighted for your build type.
            </p>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Zoning (zone type)', pts: 30, pct: 60 },
                { label: 'Water / well',        pts: 20, pct: 40 },
                { label: 'Flood zone clear',    pts: 15, pct: 30 },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className="text-sm text-ink-2 w-36 flex-shrink-0">{c.label}</span>
                  <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full"
                         style={{ width: `${c.pct}%` }} />
                  </div>
                  <span className={`text-xs font-semibold text-right ${
                    'soon' in c ? 'text-amber w-20' : 'text-ink w-10'
                  }`}>
                    {'soon' in c ? 'Coming soon' : `${c.pts} pts`}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-3 mt-6 leading-relaxed max-w-sm">
              <strong className="text-ink">A note on certainty:</strong>{' '}
              Zoning points come from the zone type (farm, rural, residential, commercial),
              and no lot gets full zoning points, because the same code means different
              things in different counties. Check what the code allows with county planning. We flag
              uncertain fields and always link to the county planning office. Never rely solely on this score to make a purchase decision.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { score: 91, label: 'Strong match', title: '14.7 acres, Shenandoah, VA',
                desc: 'Vacant, agricultural zoning, Zone X flood. Room for a well and septic. Strong match for off-grid homestead.' },
              { score: 63, label: 'Check details', title: '5.2 acres, Stanley, VA',
                desc: 'Residential zoning, so check the minimum home size. Tight for a well and septic.' },
              { score: 41, label: 'Ask hard questions', title: '2.8 acres, Luray, VA',
                desc: 'Zone AE flood risk and commercial zoning. Homes are unlikely to be allowed.' },
            ].map(ex => (
              <div key={ex.score}
                className="bg-white border border-border rounded-lg p-4 flex items-start gap-4">
                <ScorePill score={ex.score} size="lg" />
                <div>
                  <div className="text-sm font-semibold text-ink mb-0.5">{ex.title}</div>
                  <div className="text-xs text-ink-3 leading-relaxed">{ex.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA footer ─────────────────────────────────────────────────── */}
      <section className="bg-tan-lt px-[5%] py-16 text-center">
        <h2 className="font-serif text-3xl text-ink mb-4">Ready to find your lot?</h2>
        <p className="text-ink-2 text-sm mb-8 max-w-sm mx-auto">
          Tell us what you&apos;re building and we&apos;ll show you lots that actually fit.
        </p>
        <Link
          href="/search"
          className="inline-flex h-11 px-8 bg-accent text-white text-sm font-medium
                     rounded items-center hover:bg-accent/90 transition-colors"
        >
          Start searching
        </Link>
      </section>

      <SiteFooter />
    </main>
  )
}
