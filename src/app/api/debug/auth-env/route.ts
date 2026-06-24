import { NextResponse } from "next/server";

/**
 * Opt-in diagnostics for preview / serverless debugging.
 * Set `NEXTAUTH_DEBUG=true` in the deploy environment, then open this route once and check the JSON
 * (no secrets are returned). Remove the flag afterward.
 */
export async function GET() {
  if (process.env.NEXTAUTH_DEBUG !== "true") {
    return new NextResponse(null, { status: 404 });
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL ?? "";

  return NextResponse.json({
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length ?? 0,
    nextAuthUrl,
    nextAuthUrlLooksAbsolute: /^https?:\/\//i.test(nextAuthUrl),
    authTrustHost: process.env.AUTH_TRUST_HOST ?? null,
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  });
}
