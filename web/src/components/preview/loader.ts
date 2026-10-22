/** Fired on window once the preview swaps in the refreshed page content. */
export const previewContentReplaced = "preview-content-replaced";

const failsafeMs = 8000;

let overlay: HTMLElement | null = null;
let failsafe: number | undefined;

/**
 * Covers the page while a structural change (move, delete, add) waits for the
 * refreshed content. These round-trip through Sanity, so without this the
 * page looks unchanged for a couple of seconds. Hidden when the page content
 * is replaced.
 */
/** Hides the loader early, e.g. when the change it waited on failed. */
export function hideLoader() {
  window.clearTimeout(failsafe);
  overlay?.removeAttribute("data-visible");
}

export function showLoader(label: string) {
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.setAttribute("data-move-loader", "");
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML = '<span class="move-loader-spinner" aria-hidden="true"></span><span data-loader-label></span>';
    document.documentElement.appendChild(overlay);
  }
  const text = overlay.querySelector("[data-loader-label]");
  if (text) text.textContent = label;
  overlay.setAttribute("data-visible", "");

  const hide = () => {
    window.clearTimeout(failsafe);
    window.removeEventListener(previewContentReplaced, hide);
    overlay?.removeAttribute("data-visible");
  };
  window.clearTimeout(failsafe);
  failsafe = window.setTimeout(hide, failsafeMs);
  window.addEventListener(previewContentReplaced, hide, { once: true });
}
