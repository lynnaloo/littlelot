/**
 * countyProfile.ts — summary facts for a county guide page, from a sample
 * of lots. Server-side only (uses the landrecords client).
 */

import { fetchCountySample, type SampleAttributes } from '@/lib/landrecords'
import { parcelAcres } from '@/lib/scoring'

export interface ZoningCount {
  code: string
  share: number         // 0–1 of sampled lots
}

export interface CountyProfile {
  sampleSize: number
  zoning: ZoningCount[]       // most common codes, up to 8
  zoningCoverage: number      // 0–1 of sampled lots with a zoning code
  outsideFloodZone: number    // 0–1 in Zone X
  medianAcres: number | null
  oneAcrePlus: number         // 0–1 of lots 1 acre or larger
}

export async function getCountyProfile(geoid: string): Promise<CountyProfile> {
  return summarize(await fetchCountySample(geoid))
}

function summarize(lots: SampleAttributes[]): CountyProfile {
  const n = lots.length
  const share = (count: number) => (n ? count / n : 0)

  // Codes only: zoningdesc doesn't always match the code (Page, VA labels
  // "MDR" and "R-1" as "Agricultural Protection"), so it isn't shown here
  const byCode = new Map<string, number>()
  for (const lot of lots) {
    const code = lot.zoningcode?.trim()
    if (code) byCode.set(code, (byCode.get(code) ?? 0) + 1)
  }
  const zoned = [...byCode.values()].reduce((sum, n) => sum + n, 0)

  const acres = lots
    .map(parcelAcres)
    .filter(a => a > 0)
    .sort((a, b) => a - b)

  return {
    sampleSize:       n,
    zoning:           [...byCode.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 8)
                        .map(([code, count]) => ({ code, share: share(count) })),
    zoningCoverage:   share(zoned),
    outsideFloodZone: share(lots.filter(l => l.fldzone === 'X').length),
    medianAcres:      acres.length ? acres[Math.floor(acres.length / 2)] : null,
    oneAcrePlus:      acres.length ? acres.filter(a => a >= 1).length / acres.length : 0,
  }
}
