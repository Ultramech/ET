import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false, // ✅ Removes the red tab indicator
  poweredByHeader: false, // ✅ Removes "Powered by Next.js"
  allowedDevOrigins: ["192.168.1.16", "localhost"], // ✅ Allows phone to load JS

  // Optional: Improve build speed & memory usage
  
};

export default nextConfig;
