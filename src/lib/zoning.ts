/**
 * zoning.ts — sorts a county's zoning code into a broad zone type
 *
 * Codes mean different things in different counties, so this only reads the
 * common prefixes (A, RR, R-1, C, M, PD...). It never says a tiny home is
 * allowed. Unrecognized codes, including bare numbers, are 'unknown'.
 *
 * zoningdesc isn't used: it doesn't always match the code (Page, VA labels
 * "MDR" and "R-1" as "Agricultural Protection").
 */

import type { ZoneType } from '@/types/parcel'

// Checked in order: the first match wins, so specific patterns come first
// ("R-3-16(PD)" is a planned development, "RR" is rural, not residential)
const RULES: [ZoneType, RegExp][] = [
  ['unzoned',      /^(UNZ|UNZONED|NZ|NO ?ZONING|NONE)$/],
  ['planned',      /^(PD|PUD|PDH|PRC|PAD|PC|P-C|PR?D)\b|\(PD\)|^PD-/],
  ['manufactured', /^(MHP|MH|MHR|MHS|MHC|RMH|MH-\w+)\b/],
  ['public',       /^(OS|CON|ROW|UZROW|P|P\/I|PI|PF|PS|GU|PUB|PARK)\b|^OS-|^GU-/],
  ['agricultural', /^(AG|A|AR|AP|AF|EA|FA)(\b|-|\d)|^A-[A-Z]|^AG/],
  ['rural',        /^(RR|RA|R-A|RU|RE|ER|FR|FRR|RUR|RRD)(\b|-|\d)/],
  ['residential',  /^(R|RS|RN|RM|RL|LR|SF|SFR|MF|MR|DR|SR|TF|LDR|MDR|HDR|E-S|E-T|U-S|U-T)(\b|-|\d|[A-Z])|RES/],
  // Mixed-use codes like Denver's M-RX and E-MX, before M = manufacturing
  ['commercial',   /^[A-Z]-(MX|RX|CX)\b/],
  ['industrial',   /^(I|M|LI|HI|IND|IL|IH|IP)(\b|-|\d)/],
  ['commercial',   /^(C|B|CC|CG|GC|LC|NC|CN|CR|CM|CS|CH|GO|O|OI|D|CBD|MU|MX|DMU|MUCC)(\b|-|\d)/],
]

export function zoneType(zoningcode: string | null): ZoneType {
  const code = (zoningcode ?? '').trim().toUpperCase()
  if (!code || /^\d+$/.test(code)) return 'unknown'
  return RULES.find(([, re]) => re.test(code))?.[0] ?? 'unknown'
}

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  agricultural: 'Agricultural',
  rural:        'Rural',
  unzoned:      'Unzoned',
  manufactured: 'Manufactured home',
  residential:  'Residential',
  planned:      'Planned development',
  commercial:   'Commercial',
  industrial:   'Industrial',
  public:       'Public or open space',
  unknown:      'Zone type unclear',
}

// Homes are rarely allowed in these, so flag them rather than just "verify"
export const UNLIKELY_ZONE_TYPES: ZoneType[] = ['commercial', 'industrial', 'public']
