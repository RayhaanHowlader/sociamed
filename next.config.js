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
    // Handle WebSocket dependencies for both client and server
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bufferutil: false,
        'utf-8-validate': false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Ignore optional dependencies that cause build issues
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    
    return config;
  },
};

module.exports = nextConfig;
