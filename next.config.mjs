/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy landrecords API calls through our server so the key never
  // reaches the browser. All tile and WFS requests go via /api/.
  async rewrites() {
    return []
  },
}

export default nextConfig
