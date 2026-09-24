import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { stegaClean } from "@sanity/client/stega";
import { at, insert as insertAt, remove } from "@sanity/mutate";
import { decodeSanityNodeData } from "@sanity/visual-editing-csm";
import { useDocuments, useIsPresentationTool } from "@sanity/visual-editing/react";
import { defineOverlayPlugin } from "@sanity/visual-editing/unstable_overlay-components";
import {
  columnPalette,
  createBlock,
  pagePalette,
  sectionPalette,
  wrapperPalette,
  type PaletteItem,
  type PaletteType,
} from "./inserts";
import { LayersPanel } from "./layers";
import { installReorder } from "./reorder";

/** PreviewEditing dispatches this after swapping the page landmark. */
export const previewContentReplaced = "preview-content-replaced";

type InsertScope = "page" | "section" | "column" | "wrapper";

type InsertTarget = {
  arrayPath: string;
  afterKey: string | null;
  scope: InsertScope;
};

const menus: Record<InsertScope, PaletteItem[]> = {
  page: pagePalette,
  section: sectionPalette,
  column: columnPalette,
  wrapper: wrapperPalette,
};

function scopeFor(arrayPath: string): InsertScope {
  if (arrayPath === "sections") return "page";
  if (/\.content\[_key=="[^"]+"\]\.content$/.test(arrayPath)) return "wrapper";
  if (/\.columns\[_key==/.test(arrayPath)) return "column";
  return "section";
}

/** The innermost content-wrapper list on this path, when the path is inside one. */
function wrapperTarget(path: string): InsertTarget | null {
  const matches = [...path.matchAll(/\.content\[_key=="[^"]+"\]\.content/g)];
  const last = matches.at(-1);
  if (!last || last.index === undefined) return null;
  const arrayPath = path.slice(0, last.index + last[0].length);
  const rest = path.slice(arrayPath.length);
  if (rest === "") return { arrayPath, afterKey: null, scope: "wrapper" };
  const item = /^\[_key=="([^"]+)"\]/.exec(rest);
  if (!item) return null;
  return { arrayPath, afterKey: item[1], scope: "wrapper" };
}

/**
 * Where a plus under this overlay should insert.
 * A section goes after another section. Inside a section or a column, the
 * same blocks can be inserted after the hovered item.
 */
function insertTarget(path: string): InsertTarget | null {
  if (!path.startsWith("sections")) return null;

  const wrapped = wrapperTarget(path);
  if (wrapped) return wrapped;

  const contentItems = [...path.matchAll(/\.content\[_key=="([^"]+)"\]/g)];
  const last = contentItems.at(-1);
  const itemTarget = () => {
    if (last?.index === undefined) return null;
    const key = last[1];
    const marker = `[_key=="${key}"]`;
    const arrayPath = path.slice(0, last.index + last[0].length - marker.length);
    return { arrayPath, afterKey: key, scope: scopeFor(arrayPath) };
  };

  const insideContent = itemTarget();
  if (insideContent?.scope === "column") return insideContent;

  const column = /^(.*\.columns\[_key=="[^"]+"\])/.exec(path);
  if (column) return { arrayPath: `${column[1]}.content`, afterKey: null, scope: "column" };

  if (insideContent) return insideContent;

  if (path.endsWith(".content")) return { arrayPath: path, afterKey: null, scope: scopeFor(path) };

  const section = /^sections\[_key=="([^"]+)"\]/.exec(path);
  if (section && !path.includes(".content")) {
    return { arrayPath: "sections", afterKey: section[1], scope: "page" };
  }
  return null;
}

const pointer = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
}

function pathFromElement(element: Element) {
  const raw = element.getAttribute("data-sanity");
  if (!raw) return null;
  const decoded = decodeSanityNodeData(raw);
  return decoded && "path" in decoded && typeof decoded.path === "string" ? decoded.path : null;
}

type Anchor = { element: Element; target: InsertTarget; id: string };

function resolveAnchor(start: Element): Anchor | null {
  let current: Element | null = start;
  while (current && current !== document.body && current !== document.documentElement) {
    const path = pathFromElement(current);
    const target = path ? insertTarget(path) : null;
    if (target) {
      const itemPath = target.afterKey ? `${target.arrayPath}[_key=="${target.afterKey}"]` : target.arrayPath;
      let host: Element | null = current;
      while (host) {
        if (pathFromElement(host) === itemPath) {
          const id = documentIdFrom(host);
          return id ? { element: host, target, id } : null;
        }
        host = host.parentElement;
      }
      const id = documentIdFrom(current);
      return id ? { element: current, target, id } : null;
    }
    current = current.parentElement;
  }
  return null;
}

function documentIdFrom(element: Element) {
  const raw = element.getAttribute("data-sanity");
  if (!raw) return null;
  const decoded = decodeSanityNodeData(raw);
  return decoded && "id" in decoded && typeof decoded.id === "string" ? decoded.id : null;
}

/** The block just above the pointer, when the hit is the list wrapped around the blocks. */
function blockAbove(container: Element, y: number): Anchor | null {
  let chosen: Element | null = null;
  for (const child of container.children) {
    if (!(child instanceof HTMLElement) || !child.hasAttribute("data-sanity")) continue;
    if (child.getBoundingClientRect().top <= y + 1) chosen = child;
  }
  return chosen ? resolveAnchor(chosen) : null;
}

function anchorAt(x: number, y: number): Anchor | "keep" | null {
  const hits = document.elementsFromPoint(x, y);
  if (hits.some((hit) => hit instanceof Element && hit.closest("[data-insert-anchor]"))) return "keep";
  for (const hit of hits) {
    if (!(hit instanceof Element) || hit.closest("sanity-visual-editing")) continue;
    const anchor = resolveAnchor(hit);
    if (!anchor) continue;
    if (!anchor.target.afterKey) {
      const closer = blockAbove(anchor.element, y);
      if (closer) return closer;
    }
    return anchor;
  }
  return null;
}

function sameAnchor(a: Anchor | null, b: Anchor | null) {
  return a?.element === b?.element && a?.target.arrayPath === b?.target.arrayPath && a?.target.afterKey === b?.target.afterKey;
}

function elementWithPath(root: Element, path: string) {
  const wanted = stegaClean(path);
  for (const node of root.querySelectorAll("[data-sanity]")) {
    const decoded = pathFromElement(node);
    if (decoded && stegaClean(decoded) === wanted) return node;
  }
  return null;
}

/** A section with no blocks yet. Sealed sections have no content list. */
function sectionInterior(anchor: Anchor): Anchor | null {
  if (anchor.target.scope !== "page" || anchor.target.arrayPath !== "sections" || !anchor.target.afterKey) {
    return null;
  }
  const arrayPath = `sections[_key=="${stegaClean(anchor.target.afterKey)}"].content`;
  const element = elementWithPath(anchor.element, arrayPath);
  if (!element || element.querySelector("[data-sanity]")) return null;
  const decoded = pathFromElement(element);
  const contentPath = stegaClean(decoded || arrayPath);
  if (!contentPath.endsWith(".content")) return null;
  const id = documentIdFrom(element) ?? anchor.id;
  return { element, id, target: { arrayPath: contentPath, afterKey: null, scope: "section" } };
}

/** Keep the in-section plus off the plus that adds the next section. */
function insidePlacement(section: DOMRect, contentEl: Element) {
  const content = contentEl.getBoundingClientRect();
  const band = content.height < 8 ? (contentEl.parentElement?.getBoundingClientRect() ?? section) : content;
  let top = content.height < 8 ? band.top + band.height / 2 : content.bottom;
  if (section.bottom - top < 48) top = Math.max(section.top + 24, section.bottom - 48);
  const width = content.width > 1 ? content.width : section.width;
  const left = content.width > 1 ? content.left : section.left;
  if (width < 1) return null;
  return { top, left, width };
}

type GetDocument = ReturnType<typeof useDocuments>["getDocument"];

/**
 * The hover HUD unmounts as soon as the pointer leaves the block. A plus on
 * that HUD disappears under the cursor. This control stays mounted and only
 * follows the block under the pointer.
 */
const insertApi = {
  getDocument: null as GetDocument | null,
  presentation: typeof window !== "undefined" && window.parent !== window,
  version: 0,
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  snapshot() {
    return this.version;
  },
  publish(getDocument: GetDocument, presentation: boolean) {
    const sameDocument = this.getDocument === getDocument;
    this.getDocument = getDocument;
    if (sameDocument && this.presentation === presentation) return;
    this.presentation = presentation;
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  },
};

type PlusPlace = { top: number; left: number; width: number };

function InsertControl({
  anchor,
  plus,
  label,
  caption,
  onEngage,
  onMenuChange,
}: {
  anchor: Anchor;
  plus: PlusPlace;
  label: string;
  caption?: string;
  onEngage: (active: boolean) => void;
  onMenuChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openRef = useRef(false);
  const closeTimer = useRef(0);
  const items = menus[anchor.target.scope];

  useEffect(() => {
    return () => {
      window.clearTimeout(closeTimer.current);
      if (!openRef.current) return;
      openRef.current = false;
      onEngage(false);
      onMenuChange?.(false);
    };
  }, [onEngage, onMenuChange]);

  const setMenu = (next: boolean) => {
    window.clearTimeout(closeTimer.current);
    if (openRef.current === next) return;
    openRef.current = next;
    setOpen(next);
    onEngage(next);
    onMenuChange?.(next);
  };

  const hold = (event: { stopPropagation(): void }) => {
    event.stopPropagation();
  };

  const choose = (type: PaletteType, event: { preventDefault(): void; stopPropagation(): void }) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu(false);
    insert(type);
  };

  const insert = (type: PaletteType) => {
    setError(null);
    const getDocument = insertApi.getDocument;
    if (!getDocument) {
      setError("Couldn't add that block.");
      return;
    }
    const documentId = stegaClean(anchor.id);
    const arrayPath = stegaClean(anchor.target.arrayPath);
    const afterKey = anchor.target.afterKey ? stegaClean(anchor.target.afterKey) : null;
    const intoSection = Boolean(caption);
    if (intoSection && (arrayPath === "sections" || type === "section" || !arrayPath.endsWith(".content"))) {
      setError("Couldn't add that block.");
      return;
    }
    try {
      const doc = getDocument(documentId);
      const block = createBlock(type);
      const placed = afterKey ? insertAt(block, "after", { _key: afterKey }) : insertAt(block, "after", -1);
      void Promise.resolve(doc.patch(() => [at(arrayPath, placed)])).catch((cause: unknown) => {
        console.error("Could not insert block.", cause);
        setError("Couldn't add that block.");
      });
    } catch (cause) {
      console.error("Could not insert block.", cause);
      setError("Couldn't add that block.");
    }
  };

  return (
    <div
      data-insert-anchor=""
      className="flex justify-center"
      style={{
        position: "fixed",
        left: plus.left,
        top: plus.top,
        width: plus.width,
        transform: "translateY(-50%)",
        zIndex: caption ? 2147483647 : 2147483646,
        pointerEvents: "none",
      }}
    >
        <div aria-hidden="true" className="preview-guide absolute inset-x-0 top-1/2 h-px -translate-y-1/2" />
        <div
          className="relative flex flex-col items-center"
          style={{ pointerEvents: "auto" }}
          onPointerEnter={() => window.clearTimeout(closeTimer.current)}
          onPointerLeave={() => {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = window.setTimeout(() => setMenu(false), 200);
          }}
        >
          <button
            type="button"
            aria-expanded={open}
            aria-label={label}
            className={
              caption
                ? "flex h-7 items-center gap-1 rounded-full border border-stroke bg-panel px-2.5 text-body-xsm text-fg hover:bg-panel-muted"
                : "flex size-7 items-center justify-center rounded-full border border-stroke bg-panel text-fg hover:bg-panel-muted"
            }
            onPointerDown={hold}
            onClick={(event) => {
              hold(event);
              setMenu(!openRef.current);
              setError(null);
            }}
          >
            <span aria-hidden="true">+</span>
            {caption}
          </button>
          {open ? (
            <div className="absolute bottom-full left-1/2 z-10 -translate-x-1/2 pb-1">
              <div
                role="menu"
                aria-label={label}
                className="flex max-w-xs flex-wrap justify-center gap-1 rounded-sm border border-stroke bg-panel p-1"
              >
                {items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    role="menuitem"
                    className="rounded-sm px-2 py-1 text-body-xsm text-fg hover:bg-panel-muted"
                    onPointerDown={(event) => choose(item.type, event)}
                    onClick={hold}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {error ? <span className="absolute top-full mt-1 px-2 py-1 text-body-xsm text-fg">{error}</span> : null}
        </div>
      </div>
  );
}

function InsertHandle() {
  const version = useSyncExternalStore(
    (listener) => insertApi.subscribe(listener),
    () => insertApi.snapshot(),
    () => 0,
  );
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [insidePlace, setInsidePlace] = useState<PlusPlace | null>(null);
  const [contentMenu, setContentMenu] = useState(false);
  const engaged = useRef(0);
  const onEngage = useRef((active: boolean) => {
    engaged.current = Math.max(0, engaged.current + (active ? 1 : -1));
  }).current;

  useLayoutEffect(() => {
    const apply = (next: Anchor | "keep" | null) => {
      if (next === "keep" || engaged.current > 0) return;
      setAnchor((current) => (sameAnchor(current, next) ? current : next));
    };
    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!insertApi.presentation || document.documentElement.hasAttribute("data-reordering")) {
        apply(null);
        return;
      }
      apply(anchorAt(event.clientX, event.clientY));
    };
    const retarget = () => {
      if (!insertApi.presentation || document.documentElement.hasAttribute("data-reordering")) {
        apply(null);
        return;
      }
      apply(anchorAt(pointer.x, pointer.y));
    };
    if (insertApi.presentation) retarget();
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener(previewContentReplaced, retarget);
    return () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener(previewContentReplaced, retarget);
    };
  }, [version]);

  useLayoutEffect(() => {
    if (!anchor) return;
    const update = () => {
      const next = anchor.element.getBoundingClientRect();
      setRect(next);
      const content = sectionInterior(anchor);
      setInsidePlace(content ? insidePlacement(next, content.element) : null);
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor]);

  if (!insertApi.presentation || !anchor || !rect || rect.width < 1) return null;

  const inside = sectionInterior(anchor);
  const addLabel =
    anchor.target.scope === "page"
      ? "Add section below"
      : !anchor.target.afterKey && anchor.target.scope === "wrapper"
        ? "Add inside wrapper"
        : "Add below";

  return (
    <>
      {contentMenu ? null : (
        <InsertControl
          key={`${anchor.target.scope}:${anchor.target.arrayPath}:${anchor.target.afterKey ?? ""}`}
          anchor={anchor}
          plus={{ top: rect.bottom, left: rect.left, width: rect.width }}
          label={addLabel}
          onEngage={onEngage}
        />
      )}
      {inside && insidePlace ? (
        <InsertControl
          key={inside.target.arrayPath}
          anchor={inside}
          plus={insidePlace}
          label="Add inside section"
          caption="Add content"
          onEngage={onEngage}
          onMenuChange={setContentMenu}
        />
      ) : null}
    </>
  );
}

let insertRoot: ReturnType<typeof createRoot> | null = null;

function ensureInsertUI() {
  installReorder(
    (id, build) => {
      const getDocument = insertApi.getDocument;
      if (!getDocument) {
        console.error("Could not reorder block.", new Error("Document is not ready."));
        return;
      }
      const doc = getDocument(stegaClean(id));
      void Promise.resolve(
        doc.patch(async ({ getSnapshot }) => {
          const snapshot = await getSnapshot();
          if (!snapshot) throw new Error("Document is not ready.");
          return build(snapshot);
        }),
      ).catch((cause: unknown) => {
        console.error("Could not reorder block.", cause);
      });
    },
    (item) => {
      const getDocument = insertApi.getDocument;
      if (!getDocument) {
        console.error("Could not remove block.", new Error("Document is not ready."));
        return;
      }
      try {
        const doc = getDocument(stegaClean(item.id));
        void Promise.resolve(
          doc.patch(async () => [at(item.arrayPath, remove({ _key: stegaClean(item.key) }))]),
        ).catch((cause: unknown) => {
          console.error("Could not remove block.", cause);
        });
      } catch (cause) {
        console.error("Could not remove block.", cause);
      }
    },
  );
  if (insertRoot) return;
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483646";
  host.style.pointerEvents = "none";
  document.documentElement.appendChild(host);
  insertRoot = createRoot(host);
  insertRoot.render(<InsertHandle />);

  const layerHost = document.createElement("div");
  layerHost.style.position = "fixed";
  layerHost.style.inset = "0";
  layerHost.style.zIndex = "2147483645";
  layerHost.style.pointerEvents = "none";
  document.documentElement.appendChild(layerHost);
  createRoot(layerHost).render(
    <LayersPanel chrome={insertApi} contentReplacedEvent={previewContentReplaced} />,
  );
}

export const blockPalette = defineOverlayPlugin(() => {
  ensureInsertUI();
  return {
    type: "hud",
    name: "block-palette",
    title: "Add below",
    guard: ({ node }) => "path" in node && typeof node.path === "string",
    component: function BlockPalettePlugin() {
      const { getDocument } = useDocuments();
      const inPresentation = useIsPresentationTool();
      useLayoutEffect(() => {
        if (inPresentation === null) return;
        insertApi.publish(getDocument, inPresentation);
      }, [getDocument, inPresentation]);
      return null;
    },
  };
});
