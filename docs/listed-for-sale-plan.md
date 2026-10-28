# Plan: "Listed for sale" marker and filter

Status: not started. Decided with Linda on 2026-10-27.

## Goal

Show buyers which lots are on the market, link them to the listing, and let
them filter to listed lots only. The Readiness Score stays the main thing on
every card; the listing is extra information, not a ranking factor.

## Decisions so far

- Label it **"Listed for sale"**, never "Available" or "For sale now".
- Tag **only lots with a confirmed listing match**. Unmarked lots show nothing,
  plus one line of fine print: "Not every listing is included."
- Always show **"Last checked {date}"**, since listings go stale.
- The tag **links out to the listing site**.
- The filter **"Only lots listed for sale"** is off by default.

## What buyers see

| Where | What |
|---|---|
| Lot card | Small "Listed for sale" tag beside the score. The score stays bigger. |
| Map | A ring or tag icon on listed lots. |
| Lot details | Asking price, days listed, "Last checked {date}", "View listing →" (opens in a new tab). |
| Filters | "Only lots listed for sale", off by default. |

## Data

The lot data has no listing fields, so this needs a listings vendor.

| Vendor | Price | Notes |
|---|---|---|
| RentCast | Free for 50 calls a month; $74, $199, or $449 a month for 1k, 5k, or 25k calls | Self-serve. Searches by city, zip, or point and radius. Vacant land coverage unconfirmed. |
| Land Portal | $83 or $167 a month, billed yearly | Land-focused MLS data. Display terms unclear. |
| ATTOM | From $500 a month, sales call | Enterprise. |
| Datafiniti | Sales call | Collects listings from many websites, so it may include listing page links. |

### Free and affiliate routes (try these first)

No licensed listing feed is free. Land.com, LandWatch, and Lands of America
(all CoStar) have no public feed or affiliate program we could find, and
scraping them breaks their terms. Two routes cost nothing:

1. **Link out (built).** Lot details show "Land for sale in {county} on
   LandWatch →", which opens LandWatch's county page (`landForSaleUrl()` in
   `src/lib/counties.ts`). No marker on the lot, but buyers get one click to
   real listings. Independent cities and Alaska boroughs go to a town page,
   which may not exist for every place.
2. **Partner with owner-financed land sellers.** These companies sell cheap
   rural land with monthly payments, a close fit for tiny home buyers, and
   they pay for buyer traffic. Ask for a free listing feed (coordinates,
   price, link) plus a fee per lead or sale. Their listings have coordinates,
   so matching to lots is easy. Candidates: LandCentury (had a $5 per lead
   program on FlexOffers, possibly closed), Compass Land, OnlineLandSale,
   Billy Land. Programs for the last three are unconfirmed. Outreach email:
   `docs/outreach-land-sellers.md`.

If partner listings come in, they use the same "Listed for sale" tag and
rules below, plus a referral disclosure under the listing.

**Two things to confirm before paying for any vendor:**
1. Does it give a **link to the listing page**? Many MLS feeds give only a price
   and an MLS number.
2. Are we **allowed to show listings on a public site**? MLS display rules (IDX)
   can restrict this.

## Matching listings to lots

Vacant land rarely has a street address, so match by location:
1. Take each listing's latitude and longitude.
2. Find the lot whose outline contains that point (we have lot outlines).
3. If no lot contains it, try the parcel number (APN) against `parcelid`.
4. If neither matches, skip the listing. Never guess.

## How it would work in the code

- A server-side route fetches listings for a county and caches them for about
  a day, so each county costs one vendor call per day, not one per search.
- The vendor key stays server-side only, same rules as `LANDRECORDS_API_KEY`.
- Listing fields go on `Parcel` in `src/types/parcel.ts`: `listing: { price,
  listedDate, url, checkedAt } | null`.
- A `LISTINGS_AVAILABLE` flag hides the tag, filter, and map icon until the
  data is live, like the road and HOA flags.

## Steps

0. **Partners (free).** Send the outreach email to 3 or 4 owner-financed
   land sellers. If one says yes, trial their feed in place of a vendor.
1. **Trial (free).** Sign up for RentCast's free plan and add
   `RENTCAST_API_KEY`. Pull for-sale listings in Page County, VA and
   Suffolk, VA. Check whether vacant land shows up, whether listings match
   lots, and whether they include a link.
2. **Decide.** If RentCast passes, pick a paid tier. If not, ask Datafiniti and
   Land Portal about listing links and display terms.
3. **Build.** Listing cache route, matching, card tag, details section, map
   icon, and filter, behind `LISTINGS_AVAILABLE`.
4. **Launch in one or two counties**, then widen.

## Bonus we can build now

**"Sold recently"** from the lot's own `saledate` and `saleamt`: "Sold Mar 2025
for $42,000". No vendor needed, and it shows buyers what land goes for nearby.
Show it only when both fields are present.

## Open questions

- Which counties do buyers search most? Start the trial there.
- Do we want the listing to affect sort order ("listed lots first"), or only
  the filter?
