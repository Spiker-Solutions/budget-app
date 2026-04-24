import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint to check which env vars are available in the Netlify function runtime.
 * Remove this before going to production with real users.
 */
export async function GET() {
  const safeValue = (key: string) => {
    const val = process.env[key];
    if (!val) return "(not set)";
    // Redact secrets but confirm they exist
    if (key.includes("SECRET") || key.includes("PASSWORD") || key === "DATABASE_URL" || key === "DIRECT_URL") {
      return `(set, length=${val.length})`;
    }
    return val;
  };

  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: safeValue("NEXTAUTH_URL"),
    NEXTAUTH_SECRET: safeValue("NEXTAUTH_SECRET"),
    AUTH_TRUST_HOST: safeValue("AUTH_TRUST_HOST"),
    DATABASE_URL: safeValue("DATABASE_URL"),
    DIRECT_URL: safeValue("DIRECT_URL"),
    GOOGLE_CLIENT_ID: safeValue("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: safeValue("GOOGLE_CLIENT_SECRET"),
    // Netlify-specific
    CONTEXT: process.env.CONTEXT ?? "(not set)",
    DEPLOY_URL: process.env.DEPLOY_URL ?? "(not set)",
    URL: process.env.URL ?? "(not set)",
  });
}
