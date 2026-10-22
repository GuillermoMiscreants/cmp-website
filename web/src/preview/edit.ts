import type { APIRoute } from "astro";
import { getReadToken } from "../lib/sanity/client";
import { expiredPartitionedPreviewCookie, previewCookieHeader, signPreviewCookie, toPublicPath } from "../lib/sanity/preview";

export const prerender = false;

/**
 * Standalone editing without Presentation. The staging Worker sits behind
 * Cloudflare Access on this one path (the rest of the host is gated by the
 * signed preview cookie), which authenticates the visitor before this runs, so
 * no preview-url-secret is needed. The cookie switches the pages to drafts with
 * stega, which is what the green "Open in Studio" overlays are built from.
 */
export const GET: APIRoute = async ({ request }) => {
  // Access adds this header to every request it lets through. Without it (and
  // outside `astro dev`) the Worker is not behind Access, so refuse to hand out drafts.
  if (!import.meta.env.DEV && !request.headers.has("cf-access-jwt-assertion")) {
    return new Response("Editing mode requires Cloudflare Access.", { status: 401 });
  }
  const token = getReadToken();
  if (!token) return new Response("SANITY_API_READ_TOKEN is not set on this Worker.", { status: 503 });
  const pathname = new URL(request.url).searchParams.get("path") || "/";
  const maxAge = 60 * 60 * 24 * 7;
  const headers = new Headers();
  headers.append("Set-Cookie", expiredPartitionedPreviewCookie());
  headers.append("Set-Cookie", previewCookieHeader(request.url, maxAge, await signPreviewCookie(token, maxAge)));
  headers.set("Location", toPublicPath(pathname));
  return new Response(null, { status: 307, headers });
};
