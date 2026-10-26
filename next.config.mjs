import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy landrecords API calls through our server so the key never
  // reaches the browser. All tile and WFS requests go via /api/.
  async rewrites() {
    return []
  },
}

export default nextConfig

// Lets `next dev` use Cloudflare bindings (R2 cache etc.) locally
initOpenNextCloudflareForDev()
