// Links to a lot's own page. Safe for client code, unlike lib/lot.ts.

import type { BuildTribe } from '@/types/parcel'
import { TRIBE_LABELS } from '@/types/parcel'

export function lotPath(lrid: string, tribe: BuildTribe): string {
  return `/lot/${lrid}?tribe=${tribe}`
}

export function parseTribe(value: string | null | undefined, fallback: BuildTribe): BuildTribe {
  return value && value in TRIBE_LABELS ? value as BuildTribe : fallback
}
