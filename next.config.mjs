// path: next.config.mjs
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
