'use client'

// The lot's outline over a USGS aerial photo, scaled to fit the card
// thumbnail. One small image per card, cheaper than a live map.

import { useState } from 'react'

// Wider than any card, and drawn with "slice": a phone card shows most of
// the width, a narrow desktop card crops the sides. The lot is fitted into
// the middle FIT_WIDTH, which every card shows.
const WIDTH     = 400
const HEIGHT    = 96
const FIT_WIDTH = 190
const PADDING   = 14
// Show at least this much ground across the middle, so a tiny lot has some context
// and the photo isn't scaled up past what it can show
const MIN_SPAN_METRES = 160
const METRES_PER_DEGREE = 111_320

// USGS aerial photos (public domain, no key), same source as the map's satellite view
const IMAGERY_EXPORT = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/export'

type Ring = number[][]

function ringsOf(geometry: GeoJSON.Geometry | null): Ring[] {
  if (geometry?.type === 'Polygon') return geometry.coordinates
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

// Longitude degrees shrink toward the poles, so scale them by cos(latitude)
// to keep the shape's proportions true. Over a lot this matches Web
// Mercator, which the photo is drawn in.
function frame(rings: Ring[]) {
  const points = rings.flat()
  if (points.length < 3) return null

  const lats = points.map(([, lat]) => lat)
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const kx = Math.cos(midLat * Math.PI / 180)
  const project = ([lng, lat]: number[]) => [lng * kx, -lat]

  const projected = points.map(project)
  const xs = projected.map(([x]) => x)
  const ys = projected.map(([, y]) => y)
  const minX = Math.min(...xs), minY = Math.min(...ys)
  const w = Math.max(...xs) - minX
  const h = Math.max(...ys) - minY
  if (w === 0 || h === 0) return null

  const minSpan = MIN_SPAN_METRES / METRES_PER_DEGREE
  const scale = Math.min(FIT_WIDTH / w, (HEIGHT - PADDING * 2) / h, FIT_WIDTH / minSpan)
  const offsetX = (WIDTH - w * scale) / 2
  const offsetY = (HEIGHT - h * scale) / 2

  const path = rings.map(ring => ring.map((pt, i) => {
    const [x, y] = project(pt)
    const px = (offsetX + (x - minX) * scale).toFixed(1)
    const py = (offsetY + (y - minY) * scale).toFixed(1)
    return `${i === 0 ? 'M' : 'L'}${px} ${py}`
  }).join('') + 'Z').join('')

  // The ground the whole thumbnail covers, back in longitude and latitude
  const west  = (minX - offsetX / scale) / kx
  const east  = (minX + (WIDTH - offsetX) / scale) / kx
  const north = -(minY - offsetY / scale)
  const south = -(minY + (HEIGHT - offsetY) / scale)
  const params = new URLSearchParams({
    bbox: [west, south, east, north].map(v => v.toFixed(6)).join(','),
    bboxSR: '4326',
    imageSR: '3857',
    size: `${WIDTH * 2},${HEIGHT * 2}`,   // sharp on high-density screens
    format: 'jpg',
    f: 'image',
  })

  return { path, imageUrl: `${IMAGERY_EXPORT}?${params}` }
}

export function LotShape({ geometry }: { geometry: GeoJSON.Geometry | null }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const shape = frame(ringsOf(geometry))

  const showPhoto = shape && !photoFailed

  // The photo is an <img> so it can load lazily as cards scroll into view.
  // object-cover crops it exactly like the SVG's "slice", so the outline
  // stays lined up.
  return (
    <div className="relative w-full h-full bg-[#b8ceac]">
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- a remote map export, not a static asset
        <img src={shape.imageUrl} alt="" loading="lazy" decoding="async"
             onError={() => setPhotoFailed(true)}
             className="absolute inset-0 w-full h-full object-cover" />
      )}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice"
           className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {!showPhoto && (
          <path d="M0 75 Q85 55 185 68 Q265 48 355 62 L400 66 L400 96 L0 96Z"
                fill="#8ab882" opacity=".6"/>
        )}
        {shape ? (
          // evenodd so holes in a lot stay empty
          <path d={shape.path} fillRule="evenodd" strokeLinejoin="round"
                className={photoFailed ? 'fill-accent/20 stroke-accent' : 'fill-white/15 stroke-white'}
                strokeWidth={2}/>
        ) : (
          <text x={WIDTH / 2} y={HEIGHT / 2 + 4} textAnchor="middle"
                className="fill-ink-3 text-[10px]">
            Lot outline not available
          </text>
        )}
      </svg>
    </div>
  )
}
