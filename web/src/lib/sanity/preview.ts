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

/** Map a public or preview pathname onto the on-demand preview route. */
export function toPreviewPath(pathname: string | undefined) {
  const path = pathname && pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
  if (path === "/preview" || path.startsWith("/preview/")) return path;
  if (path === "/") return "/preview";
  return `/preview${path}`;
}

/** Map a preview pathname back to the published URL. */
export function toPublicPath(pathname: string) {
  if (pathname === "/preview") return "/";
  if (pathname.startsWith("/preview/")) {
    const rest = pathname.slice("/preview/".length);
    return !rest || rest === "home" ? "/" : `/${rest}`;
  }
  return pathname === "/home" ? "/" : pathname || "/";
}

export function slugFromParam(param: string | undefined) {
  const value = param?.split("/")[0];
  if (!value || value === "home") return "home";
  return value;
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
