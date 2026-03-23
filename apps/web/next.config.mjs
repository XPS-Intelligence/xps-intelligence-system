/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"]
  },
  images: {
    unoptimized: true
  },
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET;

    if (!apiTarget) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget.replace(/\/+$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
