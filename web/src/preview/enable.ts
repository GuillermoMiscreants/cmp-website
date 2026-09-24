import type { APIRoute } from "astro";
import { validatePreviewUrl, urlSearchParamPreviewPathname } from "@sanity/preview-url-secret";
import { getClient } from "../lib/sanity/client";
import { expiredPartitionedPreviewCookie, previewCookieHeader, toPublicPath } from "../lib/sanity/preview";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const client = getClient({ preview: true });
    const result = await validatePreviewUrl(client, request.url);
    if (!result.isValid) {
      return new Response("Invalid preview URL", { status: 401 });
    }
    const url = new URL(request.url);
    const pathname = result.redirectTo || url.searchParams.get(urlSearchParamPreviewPathname) || "/";
    const headers = new Headers();
    headers.append("Set-Cookie", expiredPartitionedPreviewCookie());
    headers.append("Set-Cookie", previewCookieHeader(request.url, 60 * 60 * 24 * 7));
    headers.set("Location", toPublicPath(pathname));
    return new Response(null, { status: 307, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview is not configured.";
    // Sanity throws when the Worker read token is missing, revoked, or not a Viewer token.
    if (message.includes("Unauthorized") || message.includes("Session not found")) {
      return new Response(
        "SANITY_API_READ_TOKEN is invalid on this Worker. Add a Viewer token with wrangler secret put SANITY_API_READ_TOKEN -c dist/server/wrangler.json",
        { status: 503 },
      );
    }
    return new Response(message, { status: 500 });
  }
};
