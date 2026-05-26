import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    localPatterns: [
      {
        pathname: "/home/**",
      },
      {
        pathname: "/dungeons/**",
      },
      {
        pathname: "/raids/**",
      },
      {
        pathname: "/roles/**",
      },
      {
        pathname: "/banners/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.blzstatic.com",
      },
      {
        protocol: "https",
        hostname: "**.battle.net",
      },
    ],
  },
};

export default nextConfig;
