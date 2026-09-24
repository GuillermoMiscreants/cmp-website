import { defineMiddleware } from "astro:middleware";

// Presentation iframes this host from the hosted Studio and from local Studio.
// frame-ancestors alone does not block the inline scripts this site ships.
const FRAME_ANCESTORS =
  "frame-ancestors 'self' https://www.sanity.io https://*.sanity.studio http://localhost:3333 http://127.0.0.1:3333";

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const previewHost =
    import.meta.env.DEV || import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true";
  if (!previewHost) return response;

  response.headers.delete("x-frame-options");
  if (!response.headers.has("content-security-policy")) {
    response.headers.set("content-security-policy", FRAME_ANCESTORS);
  }
  if (import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true") {
    response.headers.set("x-robots-tag", "noindex, nofollow");
  }
  return response;
});
