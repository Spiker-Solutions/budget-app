import { NextResponse } from "next/server";

/** Must be dynamic: static generation would bake in build-time env, not Lambda runtime. */
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint to check which env vars are available in the Netlify function runtime
 * and whether Prisma can connect.
 * Remove this before going to production with real users.
 */
export async function GET() {
  const safeValue = (key: string) => {
    const val = process.env[key];
    if (!val) return "(not set)";
    if (key.includes("SECRET") || key.includes("PASSWORD")) {
      return `(set, length=${val.length})`;
    }
    // Show DB URLs unmasked (temporarily) to debug the truncation issue
    if (key === "DATABASE_URL" || key === "DIRECT_URL") {
      // Don't mask - we need to see the actual value to debug
      return `(length=${val.length}) ${val}`;
    }
    return val;
  };

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_URL: safeValue("NEXTAUTH_URL"),
    NEXTAUTH_SECRET: safeValue("NEXTAUTH_SECRET"),
    AUTH_TRUST_HOST: safeValue("AUTH_TRUST_HOST"),
    DATABASE_URL: safeValue("DATABASE_URL"),
    DIRECT_URL: safeValue("DIRECT_URL"),
    GOOGLE_CLIENT_ID: safeValue("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: safeValue("GOOGLE_CLIENT_SECRET"),
    CONTEXT: process.env.CONTEXT ?? "(not set)",
    DEPLOY_URL: process.env.DEPLOY_URL ?? "(not set)",
    URL: process.env.URL ?? "(not set)",
  };

  // Test Prisma connection
  let prismaStatus: string;
  let prismaError: string | null = null;
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    prismaStatus = "connected";
  } catch (err) {
    prismaStatus = "failed";
    prismaError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  // Test auth module import
  let authModuleStatus: string;
  let authModuleError: string | null = null;
  try {
    const { authOptions } = await import("@/lib/auth");
    authModuleStatus = authOptions ? "loaded" : "empty";
  } catch (err) {
    authModuleStatus = "failed";
    authModuleError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return NextResponse.json({
    envVars,
    prisma: { status: prismaStatus, error: prismaError },
    authModule: { status: authModuleStatus, error: authModuleError },
  });
}
