import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Two dev servers in one checkout overwrite each other's .next folder.
  // Give a second one its own, somewhere git and tsc already ignore:
  // NEXT_DIST_DIR=node_modules/.cache/next-alt npx next dev -p 3100
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Proxy landrecords API calls through our server so the key never
  // reaches the browser. All tile and WFS requests go via /api/.
  async rewrites() {
    return []
  },
}

export default nextConfig

// Lets `next dev` use Cloudflare bindings (R2 cache etc.) locally
initOpenNextCloudflareForDev()
