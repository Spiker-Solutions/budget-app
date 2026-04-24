/**
 * Netlify CLI `deploy --alias pr-N` often does not inject site env into Functions
 * (no DATABASE_URL at runtime). The preview workflow writes
 * `src/generated/netlify-preview-env.json` before build so values are bundled.
 * @see https://github.com/netlify/cli/issues/6898
 */
import preview from "../generated/netlify-preview-env.json";

type PreviewEnvFile = {
  mode?: string;
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  NEXTAUTH_URL?: string;
  NEXTAUTH_SECRET?: string;
  AUTH_TRUST_HOST?: string;
};

const f = preview as PreviewEnvFile;

if (f.mode === "netlify-cli-alias-preview") {
  if (f.DATABASE_URL && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = f.DATABASE_URL;
  }
  if (f.DIRECT_URL && !process.env.DIRECT_URL) {
    process.env.DIRECT_URL = f.DIRECT_URL;
  }
  if (f.NEXTAUTH_URL && !process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = f.NEXTAUTH_URL;
  }
  if (f.NEXTAUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = f.NEXTAUTH_SECRET;
    process.env.AUTH_SECRET = f.NEXTAUTH_SECRET;
  }
  if (f.AUTH_TRUST_HOST && !process.env.AUTH_TRUST_HOST) {
    process.env.AUTH_TRUST_HOST = f.AUTH_TRUST_HOST;
  }
}
