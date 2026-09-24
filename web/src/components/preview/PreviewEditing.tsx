import { useEffect } from "react";
import { enableVisualEditing } from "@sanity/visual-editing";
import { blockPalette, previewContentReplaced } from "./palette";

let refreshGeneration = 0;

/**
 * Presentation tells the iframe to refresh after a mutation. Swapping the
 * page landmark keeps the Visual Editing connection up. A full reload would
 * drop the document snapshot and make the next add or delete fail.
 */
async function replaceMain() {
  const generation = ++refreshGeneration;
  const response = await fetch(window.location.href, { cache: "no-store" });
  if (generation !== refreshGeneration) return;
  if (!response.ok) throw new Error(`Preview refresh failed (${response.status}).`);
  const nextMain = new DOMParser().parseFromString(await response.text(), "text/html").querySelector("#main");
  const currentMain = document.querySelector("#main");
  if (!nextMain || !currentMain) throw new Error("Preview refresh could not find the page.");
  currentMain.replaceWith(nextMain);
  window.dispatchEvent(new Event(previewContentReplaced));
}

/** Starts Presentation overlays. Mounted only on the dev server and the preview build. */
export default function PreviewEditing() {
  useEffect(() => {
    const disable = enableVisualEditing({
      plugins: [blockPalette()],
      refresh: (payload) => {
        if (payload.source === "mutation") {
          void replaceMain().catch((cause: unknown) => {
            console.error("Could not refresh the preview.", cause);
            window.location.reload();
          });
          return false;
        }
        return Promise.resolve();
      },
    });
    return () => {
      disable();
    };
  }, []);

  return null;
}
