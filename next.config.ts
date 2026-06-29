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
        pathname: "/activities/**",
      },
      {
        pathname: "/roles/**",
      },
      {
        pathname: "/classes/**",
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
      {
        protocol: "https",
        hostname: "render.worldofwarcraft.com",
      },
    ],
  },
};

export default nextConfig;
