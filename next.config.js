/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ]
  },
  webpack: (config) => {
    // @xenova/transformers uses onnxruntime-node for Node.js — browser uses onnxruntime-web
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': false,
      'sharp': false,
    }
    // Ignore .node binary files
    config.module.rules.push({
      test: /\.node$/,
      use: 'null-loader',
    })
    return config
  },
}

module.exports = nextConfig
