import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { stegaClean } from "@sanity/client/stega";
import { decodeSanityNodeData } from "@sanity/visual-editing-csm";

const typeLabel: Record<string, string> = {
  section: "Section",
  faq: "FAQ",
  logoMarquee: "Logo marquee",
  eyebrow: "Eyebrow",
  heading: "Heading",
  richText: "Text",
  buttonGroup: "Button group",
  button: "Button",
  imageBlock: "Image",
  video: "Video",
  spacer: "Spacer",
  divider: "Divider",
  cardGrid: "Card grid",
  card: "Card",
  columns: "Columns",
  column: "Column",
  contentWrapper: "Content wrapper",
};

const containers = new Set(["section", "columns", "column", "contentWrapper", "cardGrid", "buttonGroup"]);

type Item = { _key?: unknown; _type?: unknown; [key: string]: unknown };

export type LayerNode = {
  path: string;
  type: string;
  label: string;
  children: LayerNode[];
};

type LayerDocument = {
  getSnapshot: () => Promise<{ sections?: unknown } | null>;
};

export type LayerChrome = {
  getDocument: ((documentId: string) => LayerDocument) | null;
  presentation: boolean;
  subscribe: (listener: () => void) => () => void;
  snapshot: () => number;
};

function textOf(value: unknown) {
  return typeof value === "string" ? stegaClean(value).replace(/\s+/g, " ").trim() : "";
}

function asItems(value: unknown): Item[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Item => !!item && typeof item === "object");
}

function truncate(value: string) {
  if (value.length <= 42) return value;
  return `${value.slice(0, 41).trimEnd()}…`;
}

function firstSpan(body: unknown) {
  for (const block of asItems(body)) {
    for (const child of asItems(block.children)) {
      const text = textOf(child.text);
      if (text) return text;
    }
  }
  return "";
}

function firstHeading(value: unknown): string {
  for (const block of asItems(value)) {
    const type = textOf(block._type);
    if (type === "heading") {
      const text = textOf(block.text);
      if (text) return text;
    }
    if (type === "columns") {
      for (const column of asItems(block.columns)) {
        const text = firstHeading(column.content);
        if (text) return text;
      }
    }
    if (type === "contentWrapper") {
      const text = firstHeading(block.content);
      if (text) return text;
    }
  }
  return "";
}

function previewOf(item: Item) {
  const type = textOf(item._type);
  if (type === "heading" || type === "eyebrow") return textOf(item.text);
  if (type === "section") return firstHeading(item.content);
  if (type === "button") return textOf(item.label);
  if (type === "card") return textOf(item.title) || textOf(item.header);
  if (type === "imageBlock") {
    const image = item.image;
    const alt = image && typeof image === "object" ? textOf((image as Item).alt) : "";
    return textOf(item.caption) || alt;
  }
  if (type === "richText") return firstSpan(item.body);
  if (type === "logoMarquee") return textOf(item.label);
  if (type === "faq") return textOf(item.heading);
  return "";
}

function labelFor(item: Item, index?: number) {
  const type = textOf(item._type);
  const name = type === "column" && index !== undefined ? `Column ${index + 1}` : (typeLabel[type] ?? "Block");
  const preview = truncate(previewOf(item));
  if (!preview || preview === name) return name;
  return `${name} — ${preview}`;
}

function childItems(item: Item, path: string): LayerNode[] {
  const type = textOf(item._type);
  if (type === "section" || type === "contentWrapper" || type === "column") {
    return walkItems(asItems(item.content), `${path}.content`);
  }
  if (type === "columns") return walkItems(asItems(item.columns), `${path}.columns`);
  if (type === "cardGrid") return walkItems(asItems(item.cards), `${path}.cards`);
  if (type === "buttonGroup") return walkItems(asItems(item.buttons), `${path}.buttons`);
  return [];
}

function walkItems(items: Item[], base: string): LayerNode[] {
  const nodes: LayerNode[] = [];
  items.forEach((item, index) => {
    const key = textOf(item._key);
    if (!key) return;
    const path = `${base}[_key=="${key}"]`;
    const type = textOf(item._type) || "block";
    nodes.push({
      path,
      type,
      label: labelFor(item, type === "column" ? index : undefined),
      children: childItems(item, path),
    });
  });
  return nodes;
}

export function layerTree(snapshot: { sections?: unknown }) {
  return walkItems(asItems(snapshot.sections), "sections");
}

function pageDocumentId() {
  const node = document.querySelector("#main [data-sanity]");
  const raw = node?.getAttribute("data-sanity");
  if (!raw) return null;
  const decoded = decodeSanityNodeData(raw);
  return decoded && "id" in decoded && typeof decoded.id === "string" ? stegaClean(decoded.id) : null;
}

function elementForPath(path: string) {
  const wanted = stegaClean(path);
  const root = document.querySelector("#main") ?? document;
  for (const node of root.querySelectorAll("[data-sanity]")) {
    const raw = node.getAttribute("data-sanity");
    if (!raw) continue;
    const decoded = decodeSanityNodeData(raw);
    const decodedPath = decoded && "path" in decoded && typeof decoded.path === "string" ? decoded.path : null;
    if (decodedPath && stegaClean(decodedPath) === wanted) return node;
  }
  return null;
}

/**
 * The overlay click handler ignores the event unless that element is already
 * the hovered one. Hover it, then click. preventDefault keeps a button or
 * link from navigating.
 */
function hoverOverlay(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const init: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + Math.max(8, Math.min(24, rect.width / 2)),
    clientY: rect.top + Math.max(8, Math.min(24, rect.height / 2)),
  };
  element.dispatchEvent(new MouseEvent("mousemove", init));
  element.dispatchEvent(new MouseEvent("mouseenter", init));
  return init;
}

function openOverlay(element: HTMLElement, stillCurrent: () => boolean) {
  const hover = () => {
    if (!stillCurrent()) return null;
    return hoverOverlay(element);
  };
  hover();
  window.setTimeout(() => hover(), 80);
  window.setTimeout(() => {
    const init = hover();
    if (!init) return;
    const guard = (event: Event) => {
      event.preventDefault();
    };
    window.addEventListener("click", guard, true);
    element.dispatchEvent(new MouseEvent("click", init));
    window.removeEventListener("click", guard, true);
  }, 160);
}

function containerPaths(nodes: LayerNode[], into: string[]) {
  for (const node of nodes) {
    if (containers.has(node.type)) into.push(node.path);
    containerPaths(node.children, into);
  }
}

const rowButton =
  "min-h-7 min-w-0 flex-1 truncate rounded-sm px-1.5 text-left text-body-xsm text-fg hover:bg-panel-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";

function LayerBranch({
  node,
  depth,
  expanded,
  selected,
  onToggle,
  onSelect,
}: {
  node: LayerNode;
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const isContainer = containers.has(node.type);
  const isOpen = isContainer && expanded.has(node.path);
  const groupId = `layer-${encodeURIComponent(node.path)}`;
  return (
    <div role="treeitem" aria-expanded={isContainer ? isOpen : undefined} aria-selected={selected === node.path} aria-level={depth + 1}>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: depth * 12 }}>
        {isContainer ? (
          <button
            type="button"
            className="grid size-6 shrink-0 place-items-center rounded-sm text-body-xsm text-fg hover:bg-panel-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-expanded={isOpen}
            aria-controls={groupId}
            aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.label}`}
            onClick={() => onToggle(node.path)}
          >
            <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
          </button>
        ) : (
          <span className="inline-block size-6 shrink-0" aria-hidden="true" />
        )}
        <button
          type="button"
          className={selected === node.path ? `${rowButton} bg-panel-muted` : rowButton}
          onClick={() => onSelect(node.path)}
        >
          {node.label}
        </button>
      </div>
      {isOpen ? (
        <div id={groupId} role="group">
          {node.children.map((child) => (
            <LayerBranch
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LayersPanel({ chrome, contentReplacedEvent }: { chrome: LayerChrome; contentReplacedEvent: string }) {
  const version = useSyncExternalStore(
    (listener) => chrome.subscribe(listener),
    () => chrome.snapshot(),
    () => 0,
  );
  const [open, setOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [ready, setReady] = useState(false);
  const [nodes, setNodes] = useState<LayerNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const seen = useRef(new Set<string>());
  const selectGeneration = useRef(0);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => setReordering(document.documentElement.hasAttribute("data-reordering"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reordering"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let generation = 0;
    const load = () => {
      const current = ++generation;
      const getDocument = chrome.getDocument;
      const id = pageDocumentId();
      if (!getDocument || !id) {
        if (current !== generation) return;
        setNodes([]);
        setReady(Boolean(getDocument));
        return;
      }
      void getDocument(id)
        .getSnapshot()
        .then((snapshot) => {
          if (current !== generation) return;
          setNodes(snapshot ? layerTree(snapshot) : []);
          setReady(true);
        })
        .catch((cause: unknown) => {
          if (current !== generation) return;
          console.error("Could not read the page layers.", cause);
          setReady(true);
        });
    };
    load();
    window.addEventListener(contentReplacedEvent, load);
    return () => {
      generation += 1;
      window.removeEventListener(contentReplacedEvent, load);
    };
  }, [chrome, contentReplacedEvent, version]);

  useEffect(() => {
    const fresh: string[] = [];
    containerPaths(nodes, fresh);
    const unseen = fresh.filter((path) => !seen.current.has(path));
    if (unseen.length === 0) return;
    for (const path of unseen) seen.current.add(path);
    setExpanded((current) => {
      const next = new Set(current);
      for (const path of unseen) next.add(path);
      return next;
    });
  }, [nodes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!chrome.presentation || reordering) return null;

  const toggle = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const select = (path: string) => {
    const generation = ++selectGeneration.current;
    setSelected(path);
    const element = elementForPath(path);
    if (!(element instanceof HTMLElement)) return;
    element.scrollIntoView({ block: "center", inline: "nearest" });
    window.setTimeout(() => {
      openOverlay(element, () => generation === selectGeneration.current);
    }, 100);
  };

  return (
    <div data-insert-anchor="" className="fixed top-3 left-3 z-10 w-64" style={{ pointerEvents: "auto" }}>
      <button
        ref={toggleRef}
        type="button"
        className="flex h-7 items-center rounded-full border border-stroke bg-panel px-2.5 text-body-xsm text-fg hover:bg-panel-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        aria-expanded={open}
        aria-controls="layer-panel"
        onClick={() => setOpen((current) => !current)}
      >
        Layers
      </button>
      {open ? (
        <div
          id="layer-panel"
          role="tree"
          aria-label="Layers"
          className="mt-1 max-h-[70vh] overflow-auto rounded-sm border border-stroke bg-panel p-1"
        >
          {ready && nodes.length === 0 ? (
            <p className="px-2 py-1 text-body-xsm text-fg">This page has no sections.</p>
          ) : (
            nodes.map((node) => (
              <LayerBranch
                key={node.path}
                node={node}
                depth={0}
                expanded={expanded}
                selected={selected}
                onToggle={toggle}
                onSelect={select}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
