import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { stegaClean } from "@sanity/client/stega";
import { decodeSanityNodeData } from "@sanity/visual-editing-csm";
import {
  copyBlock,
  cutBlock,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  planMove,
  type DropZone,
  pasteBlock,
  planPaste,
  type ActionDocument,
  type PastePlan,
} from "./layerActions";
import { currentSelection, onSelectionChange } from "./reorder";

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

export type LayerDocument = ActionDocument & {
  getSnapshot: () => Promise<{ sections?: unknown } | null>;
};

export type LayerChrome = {
  getDocument: ((documentId: string) => LayerDocument) | null;
  presentation: boolean;
  subscribe: (listener: () => void) => () => void;
  snapshot: () => number;
};

type Level = "error" | "warning";

/**
 * Validation lives in the Studio. The preview names its page, and the Studio answers with the worst
 * level for every block path that has a problem in itself or in anything inside it.
 */
const validation = {
  levels: {} as Record<string, Level>,
  requested: "",
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },
  snapshot() {
    return this.levels;
  },
  request(id: string) {
    if (window.parent === window || this.requested === id) return;
    this.requested = id;
    window.parent.postMessage({ source: "cmp-preview", type: "request-validation", id }, "*");
  },
  receive(event: MessageEvent) {
    if (window.parent === window || event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.source !== "cmp-preview" || data.type !== "validation") return;
    if (!data.levels || typeof data.levels !== "object") return;
    this.levels = data.levels as Record<string, Level>;
    this.listeners.forEach((listener) => listener());
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => validation.receive(event));
}

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

export function pageDocumentId() {
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

/** Every container path above this one: each prefix that ends at a keyed item. */
function ancestorPaths(path: string) {
  const found: string[] = [];
  for (const match of path.matchAll(/\[_key=="[^"]+"\]/g)) {
    const end = (match.index ?? 0) + match[0].length;
    if (end < path.length) found.push(path.slice(0, end));
  }
  return found;
}

function keyOf(path: string) {
  return /\[_key=="([^"]+)"\]$/.exec(path)?.[1] ?? "";
}

const rowButton =
  "min-h-7 min-w-0 flex-1 truncate rounded-sm px-1.5 text-left text-body-xsm text-fg hover:bg-panel-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";

type Dnd = {
  dragging: string | null;
  drop: { path: string; zone: DropZone } | null;
  start: (node: LayerNode) => void;
  over: (event: React.DragEvent<HTMLElement>, node: LayerNode, parentType: string | null) => void;
  leave: (path: string) => void;
  end: () => void;
  commit: (event: React.DragEvent<HTMLElement>, node: LayerNode, parentType: string | null) => void;
};

function LayerBranch({
  node,
  depth,
  expanded,
  selected,
  levels,
  dnd,
  parentType,
  onToggle,
  onSelect,
  onMenu,
}: {
  node: LayerNode;
  depth: number;
  expanded: Set<string>;
  selected: string | null;
  levels: Record<string, Level>;
  dnd: Dnd;
  parentType: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onMenu: (event: React.MouseEvent, node: LayerNode, parentType: string | null) => void;
}) {
  const isContainer = containers.has(node.type);
  const isOpen = isContainer && expanded.has(node.path);
  const groupId = `layer-${encodeURIComponent(node.path)}`;
  const level = levels[node.path];
  const isSelected = selected === node.path;
  const rowClass = isSelected
    ? `${rowButton} bg-panel-muted font-semibold shadow-[inset_2px_0_0_#53924d]`
    : rowButton;
  const tint =
    level === "error"
      ? " !bg-[rgba(220,38,38,0.22)] hover:!bg-[rgba(220,38,38,0.32)]"
      : level === "warning"
        ? " !bg-[rgba(217,119,6,0.2)] hover:!bg-[rgba(217,119,6,0.3)]"
        : "";
  return (
    <div role="treeitem" aria-expanded={isContainer ? isOpen : undefined} aria-selected={selected === node.path} aria-level={depth + 1}>
      <div
        className="flex items-center gap-0.5"
        style={{
          paddingLeft: depth * 12,
          opacity: dnd.dragging === node.path ? 0.4 : 1,
          boxShadow:
            dnd.drop?.path !== node.path
              ? undefined
              : dnd.drop.zone === "before"
                ? "inset 0 2px 0 #53924d"
                : dnd.drop.zone === "after"
                  ? "inset 0 -2px 0 #53924d"
                  : "inset 0 0 0 2px #53924d",
        }}
        draggable
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", node.label);
          dnd.start(node);
        }}
        onDragOver={(event) => dnd.over(event, node, parentType)}
        onDragLeave={() => dnd.leave(node.path)}
        onDragEnd={dnd.end}
        onDrop={(event) => dnd.commit(event, node, parentType)}
      >
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
          data-layer-path={node.path}
          className={rowClass + tint}
          title={level === "error" ? "Has errors" : level === "warning" ? "Has warnings" : undefined}
          onClick={() => onSelect(node.path)}
          onContextMenu={(event) => onMenu(event, node, parentType)}
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
              levels={levels}
              dnd={dnd}
              parentType={node.type}
              onToggle={onToggle}
              onSelect={onSelect}
              onMenu={onMenu}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type MenuState = { x: number; y: number; node: LayerNode; plan: PastePlan | null };

const menuItem =
  "flex h-7 w-full items-center rounded-sm px-2 text-left text-body-xsm text-fg hover:bg-panel-muted focus-visible:bg-panel-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

function LayerMenu({
  menu,
  onClose,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
}: {
  menu: MenuState;
  onClose: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ left: menu.x, top: menu.y });

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    box.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    setPlace({
      left: Math.max(4, Math.min(menu.x, window.innerWidth - box.offsetWidth - 4)),
      top: Math.max(4, Math.min(menu.y, window.innerHeight - box.offsetHeight - 4)),
    });
  }, [menu.x, menu.y]);

  useEffect(() => {
    const onPointer = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const at = items.indexOf(document.activeElement as HTMLButtonElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(at + step + items.length) % items.length]?.focus();
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("contextmenu", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("contextmenu", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`${menu.node.label} actions`}
      className="layers-theme fixed z-20 w-44 rounded-sm border border-stroke bg-panel p-1"
      style={{ left: place.left, top: place.top, boxShadow: "var(--shadow-popover)" }}
    >
      <button type="button" role="menuitem" className={menuItem} onClick={onCut}>
        Cut
      </button>
      <button type="button" role="menuitem" className={menuItem} onClick={onCopy}>
        Copy
      </button>
      <button type="button" role="menuitem" className={menuItem} disabled={!menu.plan} onClick={onPaste}>
        Paste
      </button>
      <button type="button" role="menuitem" className={menuItem} onClick={onDuplicate}>
        Duplicate
      </button>
      <div role="separator" className="my-1 h-px bg-stroke" />
      <button type="button" role="menuitem" className={menuItem} onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

export function LayersPanel({ chrome, contentReplacedEvent }: { chrome: LayerChrome; contentReplacedEvent: string }) {
  const version = useSyncExternalStore(
    (listener) => chrome.subscribe(listener),
    () => chrome.snapshot(),
    () => 0,
  );
  const levels = useSyncExternalStore(
    (listener) => validation.subscribe(listener),
    () => validation.snapshot(),
    () => validation.snapshot(),
  );
  const [open, setOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [ready, setReady] = useState(false);
  const [nodes, setNodes] = useState<LayerNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const selectGeneration = useRef(0);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const dragRef = useRef<LayerNode | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ path: string; zone: DropZone } | null>(null);

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
      if (id) validation.request(id);
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

  // Clicking a block on the page marks its row active and opens the rows above it and the block itself.
  useEffect(() => {
    const follow = (item: { path: string } | null) => {
      const path = item ? stegaClean(item.path) : null;
      setSelected(path);
      if (!path) return;
      setExpanded((current) => {
        const next = new Set(current);
        for (const ancestor of ancestorPaths(path)) next.add(ancestor);
        next.add(path);
        return next;
      });
    };
    follow(currentSelection());
    return onSelectionChange(follow);
  }, []);

  // The document handle is only published once Presentation renders the block plugin, which
  // it does for a hovered block. Hover one for the editor so the layers load without a mouse move first.
  useEffect(() => {
    if (!open || chrome.getDocument) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const target = document.querySelector("#main [data-sanity]");
      if (!(target instanceof HTMLElement) || ++tries > 20) {
        window.clearInterval(timer);
        return;
      }
      hoverOverlay(target);
    }, 150);
    return () => window.clearInterval(timer);
  }, [open, chrome, version]);

  useEffect(() => {
    if (!open || !selected) return;
    for (const row of panelRef.current?.querySelectorAll("[data-layer-path]") ?? []) {
      if (row.getAttribute("data-layer-path") === selected) row.scrollIntoView({ block: "nearest" });
    }
  }, [open, selected, expanded, nodes]);

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

  const getDocument = chrome.getDocument;
  const documentId = pageDocumentId();

  const zoneFor = (event: React.DragEvent<HTMLElement>, node: LayerNode, parentType: string | null) => {
    const dragged = dragRef.current;
    if (!dragged) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
    const target = { path: node.path, type: node.type, childKeys: node.children.map((child) => keyOf(child.path)) };
    const order: DropZone[] = ratio < 0.25 ? ["before", "inside"] : ratio > 0.75 ? ["after", "inside"] : ["inside", ratio < 0.5 ? "before" : "after"];
    for (const zone of order) {
      const plan = planMove({ path: dragged.path, type: dragged.type }, target, parentType, zone);
      if (plan) return { zone, plan };
    }
    return null;
  };
  const dnd: Dnd = {
    dragging,
    drop,
    start: (node) => {
      dragRef.current = node;
      setDragging(node.path);
      setMenu(null);
    },
    over: (event, node, parentType) => {
      if (!dragRef.current) return;
      const found = zoneFor(event, node, parentType);
      if (!found) {
        setDrop(null);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      setDrop((current) => (current?.path === node.path && current.zone === found.zone ? current : { path: node.path, zone: found.zone }));
    },
    leave: (path) => setDrop((current) => (current?.path === path ? null : current)),
    end: () => {
      dragRef.current = null;
      setDragging(null);
      setDrop(null);
    },
    commit: (event, node, parentType) => {
      const dragged = dragRef.current;
      const found = zoneFor(event, node, parentType);
      dnd.end();
      if (!dragged || !found || !getDocument || !documentId) return;
      event.preventDefault();
      event.stopPropagation();
      void moveBlock(getDocument, documentId, dragged.path, found.plan);
    },
  };

  const openMenu = (event: React.MouseEvent, node: LayerNode, parentType: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(node.path);
    setMenu({
      x: event.clientX,
      y: event.clientY,
      node,
      plan: planPaste({ path: node.path, type: node.type, childKeys: node.children.map((child) => keyOf(child.path)) }, parentType),
    });
  };
  const closeMenu = () => setMenu(null);
  const run = (action: (getDocument: NonNullable<typeof chrome.getDocument>, id: string, node: LayerNode) => void) => {
    const current = menu;
    setMenu(null);
    if (!current || !getDocument || !documentId) return;
    action(getDocument, documentId, current.node);
  };

  return (
    <div data-insert-anchor="" className="fixed top-3 left-3 z-10 w-64" style={{ pointerEvents: "auto" }}>
      <button
        ref={toggleRef}
        type="button"
        className="layers-theme flex h-10 items-center rounded-sm border border-stroke bg-panel px-5 text-body-sm font-medium shadow-md hover:bg-panel-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        aria-expanded={open}
        aria-controls="layer-panel"
        style={{ color: "#fff" }}
        onClick={() => setOpen((current) => !current)}
      >
        Layers
      </button>
      {open ? (
        <div className="layers-theme mt-1 overflow-hidden rounded-sm border border-stroke bg-panel">
          <div className="flex justify-end border-b border-stroke p-1">
            <button
              type="button"
              className="rounded-sm px-2 py-1 text-body-xsm text-fg hover:bg-panel-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
              disabled={expanded.size === 0}
              onClick={() => setExpanded(new Set())}
            >
              Collapse all
            </button>
          </div>
          <div id="layer-panel" ref={panelRef} role="tree" aria-label="Layers" className="max-h-[70vh] overflow-auto p-1">
            {!ready ? <p className="px-2 py-1 text-body-xsm text-fg">Loading layers…</p> : null}
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
                  levels={levels}
                  dnd={dnd}
                  parentType={null}
                  onToggle={toggle}
                  onSelect={select}
                  onMenu={openMenu}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
      {menu ? (
        <LayerMenu
          menu={menu}
          onClose={closeMenu}
          onCut={() => run((get, id, node) => void cutBlock(get, id, node.path))}
          onCopy={() => run((get, id, node) => void copyBlock(get, id, node.path))}
          onPaste={() => {
            const plan = menu.plan;
            run((get, id) => {
              if (plan) pasteBlock(get, id, plan);
            });
          }}
          onDuplicate={() => run((get, id, node) => void duplicateBlock(get, id, node.path))}
          onDelete={() => run((get, id, node) => deleteBlock(get, id, node.path))}
        />
      ) : null}
    </div>
  );
}
