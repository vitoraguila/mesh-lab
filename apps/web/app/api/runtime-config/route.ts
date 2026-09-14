// Explicit public allowlist. Never return process.env or server-only settings.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({
    environment: process.env.APP_ENV ?? "local",
    title: process.env.SITE_TITLE ?? "Mesh Lab",
  }, { headers: { "Cache-Control": "no-store" } });
}
