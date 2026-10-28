# How The Little Lot queries landrecords.us

For Travis at landrecords.us: what we send to the WFS (`pro:parcel_us`), and
where we'd like help. Code lives in `src/lib/landrecords.ts` and
`src/app/api/parcels/route.ts`.

## 1. Lot search (most of our traffic)

- **Anchor:** `geoid='{5-digit county}'`. A `BBOX(geom,...)` variant exists in
  the code but the UI doesn't use it.
- **Up to 3 extra predicates**, depending on the buyer's filters:
  - `numbldgs=0` (vacant land). On by default.
  - `fldzone='X'` (outside the flood zone). On by default.
  - `calcarea>=N`, `calcarea<=N`, or `calcarea BETWEEN a AND b`, with acres
    converted to square metres. The minimum is on by default (0.1 or 1 acre).
  - `landvalue<=N`, `landvalue>0`, or `landvalue BETWEEN 1 AND N`. Dropped if
    it would be a 4th predicate.
- **Sort:** none by default. `calcarea DESC` for "largest lot", `landvalue ASC`
  for "lowest value".
- **Paging:** `count=10`, so we fire 10 requests in parallel to get 100 lots.
  If too few survive our own scoring, we fetch up to 3 batches, so one search
  is 10 to 30 requests. "Show more" repeats this.
- **Fields we use:** lrid, parcelid, geoid, statefp, countyfp, ownername,
  owneraddr, parceladdr, countyname, parcelstate, usecode, usedesc, zoningcode,
  zoningdesc, zoningurl, taxacres, calcarea, landvalue, imprvalue, numbldgs,
  bldgsqft, yearbuilt, saleamt, saledate, ownertype, accesstype, fldzone,
  elevmin, elevavg, elevmax, centroidx/y, surfpointx/y, placetype, placename,
  geom.

## 2. One lot

`lrid='{lrid}'`, `count=1`.

## 3. County guide pages

`geoid='{county}'` at 10 offsets (0, 100, 250, 500, 1000, 2000, 3500, 5000,
7500, 10000), 10 lots each. Cached for a week.

## 4. Map tiles

- Raster `pro:parcel_us@EPSG:3857x2@png8`, zoom 13 to 15.
- Vector `pro:parcel_us@EPSG:3857x2@pbf`, zoom 15 and up (we fetch up to 16
  and let the map scale past that).

## Where we'd like help

- **Bigger pages.** More than 10 features per request would cut our call count
  by about 10x.
- **Fewer fields.** `propertyName` seems to be ignored. Limiting fields would
  shrink responses, especially vector tiles (about 750 KB at zoom 14).
- **Faster sorts.** `calcarea` and `landvalue` sorts take 6 to 9 seconds in big
  counties (Harris, TX). `lrid` sorts return 504.
- **`numberMatched`** comes back null in big counties, so we can't show buyers
  a total.
- **Data quality.** `numbldgs` is 1 for nearly every lot in Page County, VA
  (51139) and Anchorage (02020), so our vacant filter hides almost all land
  there. `zoningdesc` doesn't match `zoningcode` in Page County.
- **Zoning details.** Is there a way to get what a zone allows (minimum home
  size, RV or THOW rules) behind the `zoningurl` links? zoneoptics.us blocks
  automated requests.
