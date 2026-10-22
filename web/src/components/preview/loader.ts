/** Fired on window once the preview swaps in the refreshed page content. */
export const previewContentReplaced = "preview-content-replaced";

const failsafeMs = 8000;

let overlay: HTMLElement | null = null;
let failsafe: number | undefined;

/** Hides the loader early, e.g. when the change it waited on failed. */
export function hideLoader() {
  window.clearTimeout(failsafe);
  overlay?.removeAttribute("data-visible");
}

/** True while the loader is up, so a later change doesn't replace the label of the one already waiting. */
export function isLoaderVisible() {
  return overlay?.hasAttribute("data-visible") ?? false;
}

/**
 * Covers the page while a structural change (move, delete, add) waits for the
 * refreshed content. These round-trip through Sanity, so without this the
 * page looks unchanged for a couple of seconds. Hidden when the page content
 * is replaced.
 */
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

/**
 * Runs `work` once the browser has painted, so a loader shown in the same
 * click is on screen before a heavy patch occupies the main thread.
 */
export function afterPaint(work: () => void) {
  requestAnimationFrame(() => window.setTimeout(work, 0));
}
