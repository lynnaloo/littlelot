'use client'

import type { BuildTribe, SearchFilters, RoadAccess } from '@/types/parcel'
import {
  TRIBE_SCORE_WEIGHTS,
  ZONING_DETAILS_AVAILABLE,
  ROAD_ACCESS_AVAILABLE,
} from '@/types/parcel'

interface FilterSidebarProps {
  tribe: BuildTribe
  filters: Omit<SearchFilters, 'tribe'>
  onChange: (filters: Omit<SearchFilters, 'tribe'>) => void
}

const ROAD_ACCESS: { value: RoadAccess; label: string }[] = [
  { value: 'paved',      label: 'Paved' },
  { value: 'gravel',     label: 'Gravel' },
  { value: 'unimproved', label: 'Unimproved' },
  { value: 'none',       label: 'None' },
]

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-2.5"
           style={{ fontVariant: 'small-caps' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border mb-5" />
}

export function FilterSidebar({ tribe, filters, onChange }: FilterSidebarProps) {
  const weights = TRIBE_SCORE_WEIGHTS[tribe]

  function set<K extends keyof typeof filters>(key: K, value: typeof filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="p-3.5 flex flex-col">
      {/* Score explainer */}
      <Group title="Readiness score">
        <div className="bg-white border border-border rounded p-2.5 mb-3">
          <div className="text-xs font-semibold text-ink mb-2">Score weights</div>
          {!ZONING_DETAILS_AVAILABLE && (
            <div className="mb-1.5">
              <div className="flex justify-between text-[10px] text-ink-3">
                <span>Zoning legality</span>
                <span className="font-semibold text-amber">Coming soon</span>
              </div>
              <p className="text-[10px] text-ink-3 leading-snug mt-0.5">
                We show each lot's zoning code, but what it allows isn't scored yet. The score is based on the factors below, scaled to 100.
              </p>
            </div>
          )}
          {[
            ...(ZONING_DETAILS_AVAILABLE ? [['Zoning legality', weights.zoning]] : []),
            ...(ROAD_ACCESS_AVAILABLE    ? [['Road access',     weights.access]] : []),
            ['Water / well',    weights.water],
            ['Flood zone',      weights.flood],
            ['No HOA',          weights.hoa],
          ].map(([label, pts]) => (
            <div key={label as string} className="mb-1.5">
              <div className="flex justify-between text-[10px] text-ink-3 mb-0.5">
                <span>{label}</span><span>{pts} pts</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full"
                     style={{ width: `${(pts as number) * 2}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-ink-2 mb-1">
          <span>Minimum score</span>
          <span className="font-semibold text-ink">{filters.minScore ?? 0}</span>
        </div>
        <input type="range" min={0} max={100} step={5}
               value={filters.minScore ?? 0}
               onChange={e => set('minScore', Number(e.target.value))}
               className="w-full accent-accent" />
      </Group>

      <Divider />

      <Group title="Acreage">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-ink-3 block mb-1">Min</label>
            <input type="number" min={0} step={0.05} placeholder="0"
                   value={filters.minAcres ?? ''}
                   onChange={e => set('minAcres', e.target.value ? Number(e.target.value) : undefined)}
                   className="w-full h-7 border border-border rounded px-2 text-xs bg-white text-ink" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-ink-3 block mb-1">Max</label>
            <input type="number" min={0} step={0.05} placeholder="Any"
                   value={filters.maxAcres ?? ''}
                   onChange={e => set('maxAcres', e.target.value ? Number(e.target.value) : undefined)}
                   className="w-full h-7 border border-border rounded px-2 text-xs bg-white text-ink" />
          </div>
        </div>
      </Group>

      <Divider />

      <Group title="Must-haves">
        {[
          { key: 'noStructures', label: 'No existing structures' },
          { key: 'noFloodRisk',  label: 'Outside flood zone' },
          { key: 'noHoa',        label: 'No HOA / CC&Rs' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="checkbox"
                   checked={!!filters[key as keyof typeof filters]}
                   onChange={e => set(key as keyof typeof filters, e.target.checked as never)}
                   className="w-3.5 h-3.5 accent-accent flex-shrink-0" />
            <span className="text-xs text-ink-2">{label}</span>
          </label>
        ))}
      </Group>

      <Divider />

      {/* Hidden until road data exists. accesstype is public access, not roads.
          Wire roadAccess into the search query before turning this on. */}
      {ROAD_ACCESS_AVAILABLE && (
        <>
          <Group title="Road access">
            <div className="flex flex-wrap gap-1.5">
              {ROAD_ACCESS.map(({ value, label }) => {
                const selected = filters.roadAccess?.includes(value)
                return (
                  <button
                    key={value}
                    onClick={() => {
                      const current = filters.roadAccess ?? []
                      set('roadAccess', selected
                        ? current.filter(a => a !== value)
                        : [...current, value]
                      )
                    }}
                    className={`px-2.5 py-1 rounded-full border text-xs transition-all
                      ${selected
                        ? 'bg-accent-lt border-accent text-accent font-medium'
                        : 'bg-white border-border text-ink-2 hover:border-accent/50'
                      }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </Group>
          <Divider />
        </>
      )}

      <Group title="Assessed land value">
        <div className="flex justify-between text-xs text-ink-2 mb-1">
          <span>Up to</span>
          <span className="font-semibold text-ink">
            {filters.maxLandValue ? `$${filters.maxLandValue.toLocaleString()}` : 'Any'}
          </span>
        </div>
        <input type="range" min={5000} max={500000} step={5000}
               value={filters.maxLandValue ?? 500000}
               onChange={e => set('maxLandValue', Number(e.target.value) === 500000
                 ? undefined : Number(e.target.value))}
               className="w-full accent-accent" />
      </Group>
    </div>
  )
}
