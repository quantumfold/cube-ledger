/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/deck-images/[id]/extract": ["./data/LucasVintageCube.txt"]
  }
};

export default nextConfig;
