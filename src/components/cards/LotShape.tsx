// The lot's outline as a small SVG, scaled to fit the card thumbnail.
// Cheap enough for every card, unlike a live map.

const WIDTH   = 280
const HEIGHT  = 96
const PADDING = 14

type Ring = number[][]

function ringsOf(geometry: GeoJSON.Geometry | null): Ring[] {
  if (geometry?.type === 'Polygon') return geometry.coordinates
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

// Longitude degrees shrink toward the poles, so scale them by cos(latitude)
// to keep the shape's proportions true
function toPath(rings: Ring[]): string | null {
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

  const scale = Math.min((WIDTH - PADDING * 2) / w, (HEIGHT - PADDING * 2) / h)
  const offsetX = (WIDTH - w * scale) / 2
  const offsetY = (HEIGHT - h * scale) / 2

  return rings.map(ring => ring.map((pt, i) => {
    const [x, y] = project(pt)
    const px = (offsetX + (x - minX) * scale).toFixed(1)
    const py = (offsetY + (y - minY) * scale).toFixed(1)
    return `${i === 0 ? 'M' : 'L'}${px} ${py}`
  }).join('') + 'Z').join('')
}

export function LotShape({ geometry }: { geometry: GeoJSON.Geometry | null }) {
  const path = toPath(ringsOf(geometry))

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width={WIDTH} height={HEIGHT} fill="#b8ceac"/>
      <path d="M0 75 Q60 55 130 68 Q185 48 250 62 L280 66 L280 96 L0 96Z"
            fill="#8ab882" opacity=".6"/>
      {path ? (
        // evenodd so holes in a lot stay empty
        <path d={path} fillRule="evenodd" strokeLinejoin="round"
              className="fill-accent/20 stroke-accent" strokeWidth={2}/>
      ) : (
        <text x={WIDTH / 2} y={HEIGHT / 2 + 4} textAnchor="middle"
              className="fill-ink-3 text-[10px]">
          Lot outline not available
        </text>
      )}
    </svg>
  )
}
