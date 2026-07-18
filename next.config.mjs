/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  webpack: (config) => {
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.fallback) config.resolve.fallback = {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@x402/core': false,
      '@x402/evm': false,
      '@x402/svm': false,
    };
    return config;
  },
};

export default nextConfig;
