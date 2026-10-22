import { createDataAttribute } from "@sanity/visual-editing/create-data-attribute";

export const PREVIEW_COOKIE = "sanity-preview";

/**
 * Local Studio (localhost:3333) and the site (localhost:4321) are the same
 * site over HTTP. A Partitioned Secure cookie is dropped there, the preview
 * route bounces to the published page, and Presentation never sees
 * enableVisualEditing. HTTPS previews are cross-site, so they keep the
 * partitioned cookie.
 */
export function previewCookieHeader(requestUrl: string, maxAge: number, value = "") {
  const secure = new URL(requestUrl).protocol === "https:";
  const parts = [
    `${PREVIEW_COOKIE}=${maxAge > 0 ? value : ""}`,
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

/**
 * The preview cookie is `<expiry>.<hmac>`, signed with the Worker's read token.
 * The preview host is not behind Cloudflare Access, so a bare flag cookie would
 * let anyone who sets it by hand see drafts. Only /api/preview/enable (after
 * Sanity validates the preview secret) and /api/preview/edit (behind Access)
 * issue a valid one.
 */
async function sign(expiry: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${PREVIEW_COOKIE}:${expiry}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signPreviewCookie(secret: string, maxAge: number) {
  const expiry = String(Math.floor(Date.now() / 1000) + maxAge);
  return `${expiry}.${await sign(expiry, secret)}`;
}

export async function verifyPreviewCookie(secret: string | undefined, value: string | undefined) {
  if (!secret || !value) return false;
  const [expiry, mac] = value.split(".");
  if (!expiry || !mac || Number(expiry) < Date.now() / 1000) return false;
  const expected = await sign(expiry, secret);
  if (expected.length !== mac.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ mac.charCodeAt(i);
  return diff === 0;
}

/** Set by the middleware once the cookie signature checks out. */
export function isPreview(locals: { preview?: boolean }) {
  return locals.preview === true;
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
