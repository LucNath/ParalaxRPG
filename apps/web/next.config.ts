import type { NextConfig } from 'next';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../../.env'), quiet: true });
const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  transpilePackages: ['@paralax/contracts'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000'}/api/:path*` }];
  },
};
export default nextConfig;
