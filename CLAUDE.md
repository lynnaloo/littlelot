# CLAUDE.md — The Little Lot

This file gives Claude the context needed to work effectively in this codebase.
Read it before making any changes.

---

## Research

The `research/` folder contains the product research brief that drives all
product and copy decisions. Read `01-market-and-culture.md` before touching
any user-facing copy or filter design. It defines the four buyer tribes,
the community's shared vocabulary (THOW, boondocking, Appendix Q, etc.),
the tensions buyers bring to the site, and the voice guidelines.

Files `02-personas.md`, `03-parcel-data-taxonomy.md`, and
`04-site-copy-deck.md` are in progress. Check them before assuming a
decision hasn't been made yet.

---

## What this project is

The Little Lot is a parcel search tool for tiny home buyers. The product's single
job is answering "can I legally and physically put my home here?" as fast as possible.

The data comes from landrecords.us.

The search experience is tribe-first: buyers pick their build type (THOW, foundation
tiny home, off-grid homestead, or tiny home community) before searching. Every filter,
score weight, and zoning label adapts to that selection.

---

## Product principles (apply these to every change)

These come from the product research brief and must be respected in all UI copy,
component design, and feature decisions.

**Voice:** "A knowledgeable neighbor who has read the county code and will tell you
the truth." Plain, specific, grounded. Never Instagram-lifestyle-blog hype.

**No em dashes** in any user-facing copy. Use commas or restructure the sentence.

**Honest uncertainty is a feature.** When data is missing or ambiguous, label it
"Unknown — verify" rather than hiding it or defaulting to a positive value. The
community this product serves has been burned by sites that oversimplified.

**Zoning is never a guarantee.** Every zoning summary ends with a "verify with
county planning" note. This is not negotiable and is not legal advice.

**Buyer language, not data language.** Users don't know what "parcel data" means.
They're looking for a lot for their tiny home. Avoid:
- "parcel data" → use "lot information" or "lot details"
- "157M+ parcels" → use "lots across every county in the US"
- "WFS query" / "CQL filter" → internal only, never user-facing

**Score, don't just filter.** The Readiness Score (0-100) is the product's
differentiator. It should be the most prominent element on every lot card, not
buried. Never remove or de-emphasize it.

---

## Codebase conventions

### TypeScript
Strict mode is on. No `any` types. All parcel attributes are typed in
`src/types/parcel.ts` — extend that file rather than defining local types.

### Styling
Tailwind utility classes only. The design token system is in `tailwind.config.ts`.
Use the named colors (`text-accent`, `bg-tan-lt`, `border-border`, etc.) rather
than raw hex values. Never add inline styles unless absolutely necessary for
dynamic values (e.g. score bar widths as percentages).

### API key
`LANDRECORDS_API_KEY` is server-side only. It must never appear in:
- Any file under `src/app/` that doesn't end in `/route.ts`
- Any component file
- Any client-side hook or utility

If you need parcel data in a client component, add a server-side API route and
fetch from it. The tile proxy at `/api/tiles/` is the established pattern.

### WFS query limits
The landrecords.us WFS endpoint enforces: one indexed field anchor + max 3
additional predicates. The `buildCqlFilter()` function in `src/lib/landrecords.ts`
enforces this. When adding new filters, check you haven't exceeded 3 predicates.
Indexed fields: `geoid`, `lrid`, `ownername`, `accesstype`, `ownertype`, `placetype`.

### Components
- `LogoMark` has `color` (green on light) and `reversed` (sage on dark) variants.
  Use the right one for the background. Never hardcode the SVG colors elsewhere.
- `ScorePill` handles all score coloring: green ≥75, amber ≥55, red below.
  Don't add score coloring logic in other components.
- Never put API calls directly in component files. Hooks go in `src/lib/`.

---

## Scoring system

The Readiness Score is computed in `src/lib/scoring.ts`. It has five dimensions:

| Dimension | Function | Notes |
|---|---|---|
| Zoning | `zoningScore()` | Best-effort from zoning code string. Most uncertain. |
| Access | `accessScore()` | From `accesstype` field — reliable. |
| Water | `waterScore()` | Proxied from acreage + access type. No direct well data. |
| Flood | `floodScore()` | From `fldzone` field — reliable. |
| HOA | `hoaScore()` | Inferred from owner type + acreage. Uncertain. |

When iterating on scoring weights, edit `TRIBE_SCORE_WEIGHTS` in `src/types/parcel.ts`.
When improving classification logic, edit the individual `*Score()` functions.
Always keep scores conservative — it is better to underrate a good lot than to
overrate a bad one.

---

## Data schema

The full parcel schema is at https://github.com/land-record/parcel-standard.
Key fields and their reliability:

| Field | Reliability | Notes |
|---|---|---|
| `calcarea` | High | Use this for acreage. Prefer over `taxacres`. |
| `accesstype` | High | Indexed field. Always present. |
| `fldzone` | High | FEMA flood zone. Always present. |
| `zoningcode` | Medium | Present in most counties. Codes vary. |
| `zoningdesc` | Low | Often missing or abbreviated. |
| `numbldgs` | Medium | Use to determine vacancy. |
| `landvalue` | Medium | Assessed value. Not market value. |
| `ownertype` | Medium | Individual / LLC / trust / government. |
| `taxacres` | Low | Use only as fallback when `calcarea` is null. |

---

## What's not built yet

These are the known gaps. Pick up any of these without asking:

1. **Geocoding:** `onSearch()` in `SearchApp.tsx` receives a place name string
   but the API call needs a county `geoid` (FIPS code). Wire up a call to
   Travis's Pelias geocoder (`https://api.landrecords.us/pelias` or similar —
   confirm the endpoint) to resolve the string to a geoid before passing to
   `/api/parcels`.

2. **MapLibre map view:** The card thumbnails are SVG placeholders. Build a
   `MapView` component using MapLibre GL JS that renders parcel polygons from
   the vector tile proxy at `/api/tiles/{z}/{x}/{y}.pbf`. Use `lrid` as the
   `promoteId`. Switch to raster tiles below zoom 14.

3. **County guide pages:** Static pages at `/guides/[state]/[county]` with
   plain-language zoning summaries for specific counties. These are the primary
   SEO surface. Start with the counties that appear in sample listings.

4. **Owner contact paywall:** The "Get owner contact info" button in `ParcelDetail`
   needs to surface `ownername` and `owneraddr`. Gate it behind a credit or
   subscription system. No auth system exists yet.

5. **Saved searches:** Persist search filters and allow email alerts when lots
   matching those filters change ownership. Requires auth.

---

## Running the project

```bash
npm install
cp .env.local.sample .env.local   # add LANDRECORDS_API_KEY
npm run dev                        # http://localhost:3000
npm run type-check                 # verify types before committing
npm run build                      # full build check
```