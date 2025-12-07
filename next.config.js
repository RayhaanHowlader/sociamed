/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the default output so that API routes and server features (like MongoDB)
  // work correctly. Static HTML export (`output: 'export'`) is not compatible
  // with dynamic route handlers such as /api/users.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies of ws (WebSocket) library
    // These are Node.js native modules that don't work in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
