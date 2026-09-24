import { useEffect } from "react";
import { enableVisualEditing } from "@sanity/visual-editing";
import { blockPalette } from "./palette";

/** Starts Presentation overlays. Mounted only on the dev server and the preview build. */
export default function PreviewEditing() {
  useEffect(() => {
    const disable = enableVisualEditing({
      plugins: [blockPalette()],
      refresh: (payload) => {
        if (payload.source === "mutation") {
          window.location.reload();
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
