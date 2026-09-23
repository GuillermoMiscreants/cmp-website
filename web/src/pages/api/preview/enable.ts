import type { APIRoute } from "astro";
import { validatePreviewUrl, urlSearchParamPreviewPathname } from "@sanity/preview-url-secret";
import { getClient } from "../../../lib/sanity/client";
import { expiredPartitionedPreviewCookie, previewCookieHeader, toPreviewPath } from "../../../lib/sanity/preview";

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
    headers.set("Location", toPreviewPath(pathname));
    return new Response(null, { status: 307, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview is not configured.";
    return new Response(message, { status: 500 });
  }
};
