import { defineMiddleware } from "astro:middleware";
import { getReadToken } from "./lib/sanity/client";
import { PREVIEW_COOKIE, verifyPreviewCookie } from "./lib/sanity/preview";

// Presentation iframes this host from the hosted Studio and from local Studio.
// frame-ancestors alone does not block the inline scripts this site ships.
const FRAME_ANCESTORS =
  "frame-ancestors 'self' https://www.sanity.io https://*.sanity.studio http://localhost:3333 http://127.0.0.1:3333";

// The only routes reachable without a preview cookie: the ones that issue it.
const OPEN_PATHS = new Set(["/api/preview/enable", "/api/preview/edit", "/api/preview/disable"]);

export const onRequest = defineMiddleware(async (context, next) => {
  const previewHost =
    import.meta.env.DEV || import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true";
  if (!previewHost) return next();

  const verified = await verifyPreviewCookie(
    getReadToken(),
    context.cookies.get(PREVIEW_COOKIE)?.value,
  );
  context.locals.preview = verified;

  // The deployed preview is not behind Cloudflare Access, so it only serves
  // visitors Sanity (or Access, for /api/preview/edit) has handed a cookie.
  if (!import.meta.env.DEV && !verified && !OPEN_PATHS.has(new URL(context.request.url).pathname)) {
    return new Response("Preview only. Open this site from Sanity Presentation.", {
      status: 403,
      headers: { "content-type": "text/plain", "x-robots-tag": "noindex, nofollow" },
    });
  }

  const response = await next();
  response.headers.delete("x-frame-options");
  if (!response.headers.has("content-security-policy")) {
    response.headers.set("content-security-policy", FRAME_ANCESTORS);
  }
  if (import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true") {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }
  return response;
});
