import type { NextConfig } from "next";

const repo = "Morning-Awakening-github.com";
const isProd = process.env.NODE_ENV === "production";

const basePath = isProd ? `/${repo}` : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  // Expose the basePath to client code so we can build correct URLs for
  // static assets fetched at runtime (e.g. pre-generated voice mp3s).
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
