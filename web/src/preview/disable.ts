import type { APIRoute } from "astro";
import { urlSearchParamPreviewPathname } from "@sanity/preview-url-secret";
import { expiredPartitionedPreviewCookie, previewCookieHeader, toPublicPath } from "../lib/sanity/preview";

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  const pathname = url.searchParams.get(urlSearchParamPreviewPathname) || "/";
  const headers = new Headers();
  headers.append("Set-Cookie", expiredPartitionedPreviewCookie());
  headers.append("Set-Cookie", previewCookieHeader(request.url, 0));
  headers.set("Location", toPublicPath(pathname));
  return new Response(null, { status: 307, headers });
};
