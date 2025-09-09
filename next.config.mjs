/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Enable React Server Components
    serverComponentsExternalPackages: ['pg', 'ioredis'],
  },
  
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Optimize images
  // formats: ['image/webp', 'image/avif'],
  // minimumCacheTTL: 60,
  
  // Enable compression
  compress: true,
  
  // Configure headers for better caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
    ]
  },
  
  // Configure redirects if needed
  async redirects() {
    return []
  },
  
  // Configure rewrites for API optimization
  async rewrites() {
    return []
  },
  
  // Webpack configuration for better bundling
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      }
    }
    
    return config
  },
  
  // Output configuration for Docker
  output: 'standalone',
}

export default nextConfig
