/** @type {import('next').NextConfig} */

// next-auth/react calls `parseUrl(process.env.NEXTAUTH_URL)` at module load without a fallback.
// An empty value from `.env` / Netlify (`NEXTAUTH_URL=`) becomes `new URL("")` → ERR_INVALID_URL.
// Unset so parseUrl receives undefined and uses its default (same as a missing variable).
for (const key of ["NEXTAUTH_URL", "NEXTAUTH_URL_INTERNAL"]) {
  const v = process.env[key];
  if (v !== undefined && v.trim() === "") {
    delete process.env[key];
  }
}

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
