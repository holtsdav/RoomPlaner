import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: process.env.APP_BASE_PATH ?? '',
};

export default nextConfig;
