/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.XPS_STANDALONE_OUTPUT === "1" ? "standalone" : undefined,
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
