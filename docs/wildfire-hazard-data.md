# Wildfire hazard data for landrecords.us

A note for Travis on the wildfire dataset The Little Lot uses, where to get it,
and what we'd need as a field on each lot.

## The dataset

**Wildfire Hazard Potential for the United States (270-m), version 2023, 4th Edition**
USDA Forest Service, Rocky Mountain Research Station (Gregory K. Dillon).

- Download page: https://www.fs.usda.gov/rds/archive/catalog/RDS-2015-0047-4
- Metadata: https://www.fs.usda.gov/rds/archive/products/RDS-2015-0047-4/_metadata_RDS-2015-0047-4.html
- DOI: 10.2737/RDS-2015-0047-4
- Published December 2023, data package updated 17 July 2024. Reflects
  landscape conditions as of the end of 2020 (LANDFIRE 2020 fuels).

WHP ranks how hard a wildfire would be to control if one started there. It is
not the chance that a fire happens.

## What's in the download

Two formats, the same six rasters in each:

- Esri file geodatabase: `whp2023.gdb`
- GeoTIFF: `whp2023_GeoTIF/`, e.g. `whp2023_cls_conus.tif`

| Raster | Coverage | Type |
|---|---|---|
| `whp2023_cls_conus` | Lower 48 | Classified (use this one) |
| `whp2023_cls_ak` | Alaska | Classified |
| `whp2023_cls_hi` | Hawaii | Classified |
| `whp2023_cnt_conus`, `_ak`, `_hi` | Same | Continuous index |

Classified values:

| Value | Meaning |
|---|---|
| 1 | Very low |
| 2 | Low |
| 3 | Moderate |
| 4 | High |
| 5 | Very high |
| 6 | Non-burnable |
| 7 | Open water |

Cells are 270 m. The July 2024 update fixed some classified cells that had
been left as NoData and should have been very high, so use the 2024 package.

License: funded by the U.S. Government, free to use without permission or
fees. Cite it as: Dillon, Gregory K. 2023. Wildfire Hazard Potential for the
United States (270-m), version 2023. 4th Edition. Fort Collins, CO: Forest
Service Research Data Archive. https://doi.org/10.2737/RDS-2015-0047-4

## What we'd like as a lot field

1. **The worst class that touches the lot**, not the most common one. A big lot
   that's mostly low with a very high corner should read very high. Many lots
   are smaller than one 270 m cell, so for those it's simply the cell they
   sit in.
2. **The raw class number, 1 to 7**, keeping 6 (non-burnable) and 7 (water)
   apart from the 1 to 5 scale. Only count 6 or 7 when nothing on the lot is
   burnable.
3. **Null when there's no value.** Don't default to 0 or 1. We show
   "Unknown, verify".
4. **The dataset version** (`2023`) recorded somewhere, so we can tell when the
   Forest Service releases a new one.

## How The Little Lot uses it today

Until the field exists, `src/lib/wildfire.ts` samples the Forest Service's
classified map service per search batch (the lot's inside point plus 8 points
on its boundary, worst class wins):
https://imagery.geoplatform.gov/iipp/rest/services/Fire_Aviation/USFS_EDW_RMRS_WildfireHazardPotentialClassified/ImageServer

That service returns at most 1,000 samples per request, so it's fine for a
search page but not for loading every lot. Once the field is in the lot data,
`wildfire.ts` will read it instead.
