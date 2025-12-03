/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the default output so that API routes and server features (like MongoDB)
  // work correctly. Static HTML export (`output: 'export'`) is not compatible
  // with dynamic route handlers such as /api/users.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
