import { append, at } from "@sanity/mutate";
import { useDocuments, useIsPresentationTool } from "@sanity/visual-editing/react";
import { PointerEvents, defineOverlayPlugin } from "@sanity/visual-editing/unstable_overlay-components";
import { createBlock, paletteItems, type PaletteType } from "./inserts";

function isContentArray(type: string, path: string) {
  return type === "array" && (path === "content" || path.endsWith(".content"));
}

function BlockPalette({ id, path }: { id: string; path: string }) {
  const inPresentation = useIsPresentationTool();
  const { getDocument } = useDocuments();

  if (inPresentation !== true) return null;

  const insert = (type: PaletteType) => {
    try {
      const doc = getDocument(id);
      doc.patch(() => [at(path, append(createBlock(type)))]);
    } catch (error) {
      console.error("Could not insert block.", error);
    }
  };

  return (
    <PointerEvents>
      <div
        role="toolbar"
        aria-label="Add a block"
        className="flex max-w-full flex-wrap gap-1 rounded-sm border border-stroke bg-panel p-1"
      >
        {paletteItems.map((item) => (
          <button
            key={item.type}
            type="button"
            className="rounded-sm px-2 py-1 text-body-xsm text-fg hover:bg-panel-muted"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              insert(item.type);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </PointerEvents>
  );
}

export const blockPalette = defineOverlayPlugin(() => ({
  type: "hud",
  name: "block-palette",
  title: "Add a block",
  guard: ({ type, node }) => isContentArray(type, node.path),
  component: function BlockPalettePlugin({ node }) {
    return <BlockPalette id={node.id} path={node.path} />;
  },
}));
