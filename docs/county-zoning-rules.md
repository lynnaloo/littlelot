# County zoning rules for tiny homes

Written for Travis at landrecords.us, 2026-10-30. Shared doc:
https://claude.ai/artifact/AfhqqQ9qiJf17BXfhkwacS

The Little Lot needs a handful of tiny-home rules for each zoning district, stored as fields beside the zoning code landrecords.us already has. This page lists those fields and some ways to collect them.

## Why it matters

A buyer's first question is "can I legally live in my tiny home on this lot?" The zoning code (say, `A-1`) can't answer that alone, because every county defines its zones differently.

Today we guess from the code's prefix and cap the zoning score below full points. With a few checked rules per district, we could give lots full zoning points and a plain answer, like "homes under 400 sq ft are not allowed in A-1." These are also the facts buyers search for, such as "tiny home laws Floyd County VA."

## Fields we need

Most rules are set per zoning district, keyed by jurisdiction plus `zoningcode`. A few apply to the whole county or town. Yes/no rules work best as one shared set of values:

- **Allowed:** by right, no special approval
- **With a permit:** conditional or special use permit
- **Not allowed**
- **Not addressed:** the code is silent, which is different from not allowed
- **Unknown:** not checked yet, stored as null

### Per zoning district

| Field | Type | Example | What it answers |
| --- | --- | --- | --- |
| `min_dwelling_sqft` | number or null | 400 | Smallest home allowed. The most common deal-breaker. |
| `min_dwelling_width_ft` | number or null | 20 | Width rules can rule out tiny homes and single-wides. |
| `thow_fulltime` | rule value | Not allowed | Can a tiny home on wheels be lived in year-round? |
| `rv_fulltime` | rule value | With a permit | Can an RV or park model be lived in year-round? |
| `temp_stay_days` | number or null | 30 | Days a camper may stay, per year or per visit |
| `manufactured_home` | rule value | Allowed | Many counties treat tiny homes like manufactured homes. |
| `adu_detached` | rule value | With a permit | Can a tiny home be a backyard cottage behind a main house? |
| `min_lot_acres` | number or null | 1 | Smallest lot you can build on in this district |
| `max_homes_per_lot` | number or null | 1 | Is a second home, or a small community, possible? |
| `tiny_community` | rule value | Not addressed | Tiny home villages, RV parks, pocket neighborhoods |
| `source_url` | text | link to the section | Where each answer came from |
| `source_section` | text | § 5-3.2 | Section number, so buyers can cite it to planners |

### Per county or town

| Field | Type | Example | What it answers |
| --- | --- | --- | --- |
| `zoning_jurisdiction` | text | Town of Floyd | Who zones this lot. Towns inside a county often have their own code. |
| `has_zoning` | yes / no | no | Some rural counties have no zoning at all. |
| `ordinance_url` | text | link | The full zoning ordinance |
| `ordinance_as_of` | date | 2026-03-01 | Code version the fields were read from |
| `appendix_q` | rule value | Allowed | Has the building code adopted the tiny house appendix? Often set statewide. |
| `alt_septic` | rule value | With a permit | Composting toilets or other non-septic systems. Usually the health department, not zoning. |
| `utility_hookup_required` | yes / no / null | yes | Must a home connect to power or water? Matters for off-grid buyers. |
| `checked_by`, `checked_on` | text, date | AI plus person, 2026-10-30 | How much to trust the row |

## Where to get it

Most county and town codes are on one of three hosting sites, so a scraper for each covers a large share. The rest are PDFs on county websites.

| Source | What it has | Notes |
| --- | --- | --- |
| [Municode Library](https://library.municode.com) | Full code text for many counties and towns, by section | Likely the largest. Check the terms of use before bulk scraping. |
| [American Legal Publishing](https://codelibrary.amlegal.com) | Full code text, by section | Same approach as Municode |
| [eCode360](https://ecode360.com) (General Code) | Full code text, by section | Strong in the Northeast |
| County planning websites | Ordinance PDFs and zoning maps | The long tail. PDFs need text extraction, and some are scans. |
| [National Zoning Atlas](https://www.zoningatlas.org) | Structured district data for some states: minimum lot size, ADU rules, housing types | Partial coverage, no tiny-home fields, but a good head start |
| `zoningurl` (already in the data) | Links to zoneoptics.us district pages | Worth checking whether its source has rule fields too |
| State building code offices | Whether Appendix Q has been adopted | Usually one answer per state, a small one-time job |
| County health departments | Composting toilet and alternative septic rules | Separate from zoning. Often a state rule with county permits. |

## How to extract it

An AI model can read an ordinance and fill these fields, as long as it quotes its source and a person checks the answer before it goes live.

1. **Link every county and town to its ordinance.** Store `ordinance_url` and `zoning_jurisdiction`. This is cheap and already useful: we can link buyers straight to the code.
2. **Pull the text by section.** The hosting sites break codes into sections, so the model only needs the definitions, the district use tables and the dimensional standards.
3. **Extract with quotes.** For each field, the model returns a value, the exact sentence it relied on and the section number. No quote means the value stays null.
4. **Have a person check it.** Check every field at first, then sample once the error rate is known. Record `checked_by` and `checked_on`.
5. **Re-check on a schedule.** The hosting sites show when a code was last amended. When the date changes, re-run that county.

The tricky cases are worth a rule of their own:

- **Definitions do the work.** Whether a THOW counts as a "dwelling", an "RV" or a "camper" usually decides the answer, so the definitions section needs to be read too.
- **Silence is not permission.** Many codes never mention tiny homes. That is "Not addressed", not "Allowed".
- **Towns inside counties.** A lot inside town limits follows the town's code, not the county's.

## Questions for Travis

- [ ] What is behind `zoningurl` and zoneoptics.us? Does that source have any rule fields, or only district names?
- [ ] Do lots record which jurisdiction (county or town) sets their zoning?
- [ ] Could you store `ordinance_url` per county and town as a first step?
- [ ] Would you add the district fields to the lot record, or keep a separate district table joined on jurisdiction plus `zoningcode`? A separate table seems easier to keep current.
- [ ] Should we pilot this on a few counties first? We can share the counties where our buyers search most.
