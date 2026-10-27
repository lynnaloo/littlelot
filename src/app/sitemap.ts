import type { MetadataRoute } from 'next'
import { STATE_NAMES, allCounties, countyPath, stateSlug } from '@/lib/counties'

const SITE = 'https://findlittlelot.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE },
    { url: `${SITE}/search` },
    { url: `${SITE}/guides` },
    ...Object.keys(STATE_NAMES).map(code => ({ url: `${SITE}/guides/${stateSlug(code)}` })),
    ...allCounties().map(c => ({ url: `${SITE}${countyPath(c)}` })),
  ]
}
