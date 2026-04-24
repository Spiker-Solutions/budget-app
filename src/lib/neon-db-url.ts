/**
 * Neon pooled URLs should use Prisma-friendly pooler settings on serverless (Netlify).
 * @see https://neon.com/docs/guides/prisma
 */
export function prismaDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  if (!raw.includes("-pooler.")) {
    return raw;
  }

  try {
    const u = new URL(raw);
    if (!u.searchParams.has("pgbouncer")) {
      u.searchParams.set("pgbouncer", "true");
    }
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "15");
    }
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "1");
    }
    return u.toString();
  } catch {
    return raw;
  }
}
