import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["nonextrusive-hannah-unprodded.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:8000/api/:path*/", // Force trailing slash for Django
      },
    ];
  },
};

export default nextConfig;
