/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Netlify + Next serverless: ensure Prisma query engine files are traced into /api/* lambdas
  // (avoids runtime crash / "function has crashed" on auth routes).
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/.prisma/client/**/*",
        "./node_modules/@prisma/client/**/*",
      ],
    },
  },
};

module.exports = nextConfig;
