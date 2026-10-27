'use client'

import Link from 'next/link'
import type { BuildTribe } from '@/types/parcel'
import { LogoMark } from './ui/LogoMark'

const TRIBES: { id: BuildTribe; icon: string; name: string; desc: string }[] = [
  {
    id:   'thow',
    icon: '🚌',
    name: 'THOW or park model',
    desc: 'On wheels, RVIA or NOAH certified. You need RV-tolerant zoning and delivery access.',
  },
  {
    id:   'foundation',
    icon: '🏠',
    name: 'Foundation tiny home',
    desc: 'Permanent build, Appendix Q or IRC. You need residential zoning, permits, and utilities.',
  },
  {
    id:   'offgrid',
    icon: '☀️',
    name: 'Off-grid homestead',
    desc: 'Land first. Solar, water, food systems. Acreage, privacy, and self-sufficiency matter most.',
  },
  {
    id:   'community',
    icon: '🤝',
    name: 'Tiny home community',
    desc: 'Shared infrastructure, legal village. Large parcels and permissive local governance.',
  },
]

interface TribeGateProps {
  onSelect: (tribe: BuildTribe) => void
}

export function TribeGate({ onSelect }: TribeGateProps) {
  return (
    <div className="min-h-screen bg-ink flex flex-col relative">
      <Link href="/"
            className="absolute top-3 left-4 z-10 text-xs text-tan hover:text-tan-lt transition-colors">
        ← Home
      </Link>
      {/* terrain illustration */}
      <div className="relative w-full flex-shrink-0" style={{ height: '52vh', minHeight: 260 }}>
        <svg
          viewBox="0 0 800 420"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full"
          aria-hidden
        >
          <rect width="800" height="420" fill="#1C2B1E"/>
          {/* stars */}
          {[
            [60,30],[140,18],[230,45],[320,22],[410,38],
            [500,14],[590,42],[680,25],[750,50],[90,70],[460,60],[720,70]
          ].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r={1} fill="#F0EDE6" opacity={.5}/>
          ))}
          <path d="M0 280 Q80 180 160 220 Q240 160 320 200 Q400 140 480 185 Q560 155 640 190 Q720 165 800 195 L800 420 L0 420Z" fill="#243828"/>
          <path d="M0 310 Q100 240 200 265 Q300 225 400 255 Q500 230 600 258 Q700 238 800 262 L800 420 L0 420Z" fill="#2d4a33"/>
          <path d="M0 345 Q120 295 250 320 Q380 300 500 325 Q620 308 750 330 L800 335 L800 420 L0 420Z" fill="#3a5e42"/>
          <path d="M0 345 Q15 320 30 345 Q40 310 55 342 Q68 315 82 340 Q92 318 106 340 Q118 322 130 342 L130 420 L0 420Z" fill="#263d2b"/>
          <path d="M670 338 Q685 315 698 338 Q710 318 724 340 Q736 320 750 342 Q762 322 775 340 Q788 325 800 342 L800 420 L670 420Z" fill="#263d2b"/>
          <path d="M0 390 Q200 370 400 380 Q600 368 800 385 L800 420 L0 420Z" fill="#4a7c59" opacity=".5"/>
          {/* moon */}
          <circle cx="680" cy="80" r="28" fill="#F0EDE6" opacity=".12"/>
          <circle cx="680" cy="80" r="14" fill="#F0EDE6" opacity=".15"/>
          {/* tiny home in meadow */}
          <g transform="translate(340,290) scale(3.5)">
            <path d="M14 68 L10 22 L52 8 L78 16 L80 72 L14 68Z"
                  fill="rgba(234,242,236,.08)" stroke="rgba(74,124,89,.4)"
                  strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M36 48 L44 38 L52 48Z" fill="#C8B89A"/>
            <rect x="37" y="47" width="14" height="12" rx="1" fill="#C8B89A"/>
            <rect x="38.5" y="49.5" width="3.5" height="3.5" rx=".5" fill="#E8C97A"/>
            <rect x="42" y="52" width="4" height="7" rx=".5" fill="#8aad7e"/>
            <rect x="49" y="42" width="2.5" height="6" rx=".5" fill="#C8B89A"/>
            <circle cx="26" cy="51" r="5" fill="rgba(74,124,89,.6)"/>
          </g>
        </svg>

        {/* logo + wordmark over the illustration */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-4 pointer-events-none">
          <LogoMark size={120} variant="reversed" className="drop-shadow-lg mb-4" />
          <h1 className="font-serif text-5xl md:text-6xl text-tan-lt tracking-tight leading-none mb-2">
            the little lot
          </h1>
          <p className="text-tan italic text-sm">Find land that actually works for your tiny home</p>
        </div>
      </div>

      {/* tribe cards on light surface */}
      <div className="flex-1 bg-tan-lt flex flex-col items-center px-4 py-6">
        <p className="text-sm font-medium text-ink-2 mb-4">What are you building?</p>
        <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
          {TRIBES.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="bg-white border border-border rounded-xl p-4 text-left
                         hover:border-accent hover:shadow-sm transition-all"
            >
              <span className="text-2xl block mb-2">{t.icon}</span>
              <div className="text-sm font-semibold text-ink mb-1">{t.name}</div>
              <div className="text-xs text-ink-3 leading-relaxed">{t.desc}</div>
            </button>
          ))}
        </div>
        <button
          onClick={() => onSelect('offgrid')}
          className="mt-4 text-xs text-ink-3 hover:text-accent transition-colors"
        >
          Not sure yet? Browse all lots →
        </button>
      </div>
    </div>
  )
}
