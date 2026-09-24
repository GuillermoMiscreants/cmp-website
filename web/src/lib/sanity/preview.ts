import { createDataAttribute } from "@sanity/visual-editing/create-data-attribute";

export const PREVIEW_COOKIE = "sanity-preview";

/**
 * Local Studio (localhost:3333) and the site (localhost:4321) are the same
 * site over HTTP. A Partitioned Secure cookie is dropped there, the preview
 * route bounces to the published page, and Presentation never sees
 * enableVisualEditing. HTTPS previews are cross-site, so they keep the
 * partitioned cookie.
 */
export function previewCookieHeader(requestUrl: string, maxAge: number) {
  const secure = new URL(requestUrl).protocol === "https:";
  const parts = [
    `${PREVIEW_COOKIE}=${maxAge > 0 ? "1" : ""}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAge}`,
    secure ? "SameSite=None" : "SameSite=Lax",
  ];
  if (secure) parts.push("Secure", "Partitioned");
  return parts.join("; ");
}

/** Expire the earlier Partitioned cookie so it cannot shadow the local one. */
export function expiredPartitionedPreviewCookie() {
  return [
    `${PREVIEW_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",
    "Max-Age=0",
  ].join("; ");
}

export function isPreview(cookies: { get(name: string): { value: string } | undefined }) {
  return cookies.get(PREVIEW_COOKIE)?.value === "1";
}

/** Keep preview navigations on the same paths the public site uses. */
export function toPublicPath(pathname: string) {
  const path = pathname && pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  if (path === "/preview") return "/";
  if (path.startsWith("/preview/")) {
    const rest = path.slice("/preview/".length);
    return !rest || rest === "home" ? "/" : `/${rest}`;
  }
  return path === "/home" ? "/" : path || "/";
}

export function dataSanity(preview: boolean, id: string, path: string, type = "page") {
  if (!preview) return undefined;
  return createDataAttribute({
    id,
    type,
    path,
    baseUrl: import.meta.env.PUBLIC_SANITY_STUDIO_URL,
  }).toString();
}
