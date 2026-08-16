/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone is for Docker; omit on Vercel so the platform bundler works.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

module.exports = nextConfig;
