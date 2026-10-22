import { stegaClean } from "@sanity/client/stega";
import { at, insert, remove, type NodePatchList } from "@sanity/mutate";
import { getAtPath, parse } from "@sanity/mutate/path";
import { decodeSanityNodeData } from "@sanity/visual-editing-csm";

import { afterPaint, showLoader } from "./loader";

type Flow = "horizontal" | "vertical";

export type Item = {
  element: HTMLElement;
  id: string;
  path: string;
  arrayPath: string;
  key: string;
};

const dragThreshold = 4;

/**
 * Presentation only starts a drag when the hovered node is the array item.
 * Stega in the text replaces that node with the field, so headings, buttons,
 * and column blocks never drag. This reorders those items inside their own list.
 */
export function installReorder(
  apply: (id: string, build: (snapshot: unknown) => NodePatchList) => void,
  remove?: (item: { id: string; arrayPath: string; key: string }) => void,
) {
  if (installed) return;
  installed = true;
  onRemove = remove
    ? (item) => {
        showLoader("Deleting section…");
        afterPaint(() => remove(item));
      }
    : null;

  // Presentation's own drag-and-drop reports its drop here. No insert position means the drop changed nothing.
  window.addEventListener("sanity/dragEnd", (event) => {
    if ((event as CustomEvent<{ insertPosition?: unknown }>).detail?.insertPosition) showLoader("Moving section…");
  });

  let cursorTarget: HTMLElement | null = null;
  const marker = document.createElement("div");
  marker.setAttribute("data-reorder-marker", "");
  marker.className = "preview-guide";
  marker.style.position = "fixed";
  marker.style.zIndex = "2147483646";
  marker.style.pointerEvents = "none";
  marker.style.display = "none";
  document.documentElement.appendChild(marker);

  const onHover = (event: PointerEvent) => {
    if (document.documentElement.hasAttribute("data-reordering")) return;
    const item = itemWeDrag(event.target);
    const next = item?.element ?? null;
    if (next !== cursorTarget) {
      if (cursorTarget) cursorTarget.style.cursor = "";
      cursorTarget = next;
      if (cursorTarget) cursorTarget.style.cursor = "move";
    }
  };

  const begin = (item: Item, event: MouseEvent) => {
    if (event.button !== 0) return;
    const group = siblings(item);
    if (group.length < 2) return;

    event.stopPropagation();
    const originX = event.clientX;
    const originY = event.clientY;
    let active = false;
    let previousOpacity = "";
    let previousUserSelect = "";
    const blockBrowserDrag = (drag: DragEvent) => {
      drag.preventDefault();
    };
    item.element.addEventListener("dragstart", blockBrowserDrag);

    const finish = (commit: boolean, clientX: number, clientY: number) => {
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      item.element.removeEventListener("dragstart", blockBrowserDrag);
      marker.style.display = "none";
      document.documentElement.removeAttribute("data-reordering");
      if (active) {
        document.body.style.cursor = "";
        document.body.style.userSelect = previousUserSelect;
        item.element.style.opacity = previousOpacity;
      }
      if (!active) return;
      lastDragEnd = performance.now();
      if (commit) moveItem(item, group, clientX, clientY, apply);
      const suppress = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
      };
      window.addEventListener("click", suppress, true);
      setTimeout(() => window.removeEventListener("click", suppress, true), 0);
    };

    const onMove = (move: MouseEvent) => {
      if (!active) {
        if (Math.hypot(move.clientX - originX, move.clientY - originY) < dragThreshold) return;
        active = true;
        previousOpacity = item.element.style.opacity;
        previousUserSelect = document.body.style.userSelect;
        item.element.style.opacity = "0.45";
        document.body.style.userSelect = "none";
        document.documentElement.setAttribute("data-reordering", "");
        document.body.style.cursor = "move";
      }
      move.preventDefault();
      placeMarker(marker, item, group, move.clientX, move.clientY);
    };

    const onUp = (up: MouseEvent) => {
      finish(true, up.clientX, up.clientY);
    };

    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
  };

  const onDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("sanity-visual-editing, [data-insert-anchor]")) return;
    const item = itemWeDrag(target);
    if (item) begin(item, event);
  };
  startDragFrom = begin;

  window.addEventListener("pointermove", onHover, true);
  window.addEventListener("mousedown", onDown, true);
  window.addEventListener("click", onSelect, true);
  window.addEventListener("keydown", onDeleteKey);
  window.addEventListener("message", onDeleteMessage);

  const watchOverlay = () => {
    const host = document.querySelector("sanity-visual-editing");
    if (!host) {
      requestAnimationFrame(watchOverlay);
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.documentElement.hasAttribute("data-reordering")) return;
      syncFocusedSelection();
    });
    observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-focused"] });
  };
  watchOverlay();
}

let onRemove: ((item: { id: string; arrayPath: string; key: string }) => void) | null = null;
let startDragFrom: ((item: Item, event: MouseEvent) => void) | null = null;
let selected: Item | null = null;
const selectionListeners = new Set<(item: Item | null) => void>();

function setSelected(item: Item | null) {
  selected = item;
  for (const listener of selectionListeners) listener(item);
}

/** The block last clicked on the page, or null. */
export function currentSelection() {
  return selected;
}

/** Called whenever the selected block changes, so the layers panel can follow. */
export function onSelectionChange(listener: (item: Item | null) => void) {
  selectionListeners.add(listener);
  return () => {
    selectionListeners.delete(listener);
  };
}
let focusedOverlay: Element | null = null;

function isTextField(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const editable = target.closest("[contenteditable]");
  if (editable && editable.getAttribute("contenteditable") !== "false") return true;
  const field = target.closest("textarea, select, [role='textbox'], input");
  if (field instanceof HTMLInputElement) {
    const type = field.type;
    return !["button", "checkbox", "radio", "submit", "reset", "file", "range", "color"].includes(type);
  }
  return !!field;
}

function deleteSelected() {
  if (!selected || document.documentElement.hasAttribute("data-reordering")) return;
  const item = selected;
  setSelected(null);
  onRemove?.({ id: item.id, arrayPath: item.arrayPath, key: item.key });
}

function onSelect(event: MouseEvent) {
  if (event.button !== 0) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("[data-insert-anchor]")) return;
  const overlay = target.closest("sanity-visual-editing [data-focused], sanity-visual-editing [data-hovered]");
  if (overlay) {
    const item = itemForOverlay(overlay) ?? removableItem(target);
    if (item) setSelected(item);
    return;
  }
  setSelected(removableItem(target));
}

/** Backspace belongs to text editing. Only Delete removes the selected block. */
function onDeleteKey(event: KeyboardEvent) {
  if (event.key !== "Delete") return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
  if (isTextField(event.target) || isTextField(document.activeElement)) return;
  if (!selected) return;
  event.preventDefault();
  deleteSelected();
}

function onDeleteMessage(event: MessageEvent) {
  if (window.parent === window || event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.source !== "cmp-preview" || data.type !== "delete-selected") return;
  deleteSelected();
}

/** The overlay box matches the clicked element, not a child stacked inside it. */
function itemForOverlay(overlay: Element): Item | null {
  const rect = overlay.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  let best: { item: Item; score: number } | null = null;
  for (const candidate of document.querySelectorAll("[data-sanity]")) {
    if (!(candidate instanceof HTMLElement)) continue;
    const info = readItem(candidate);
    if (!info?.path.startsWith("sections")) continue;
    const next = info.element.getBoundingClientRect();
    const score =
      Math.abs(next.top - rect.top) +
      Math.abs(next.left - rect.left) +
      Math.abs(next.width - rect.width) +
      Math.abs(next.height - rect.height);
    if (!best || score < best.score || (score === best.score && info.path.length > best.item.path.length)) {
      best = { item: info, score };
    }
  }
  return best && best.score <= 24 ? best.item : null;
}

function syncFocusedSelection() {
  const focused = document.querySelector("sanity-visual-editing [data-focused]");
  if (!(focused instanceof Element) || focused === focusedOverlay) return;
  focusedOverlay = focused;
  const item = itemForOverlay(focused);
  if (item) setSelected(item);
}

/** Drag a block from the tab handle. Needs two or more siblings. */
export function startDrag(item: Item, event: MouseEvent) {
  startDragFrom?.(item, event);
}

/** Remove a block from the tab's trash button. */
export function removeItem(item: Item) {
  onRemove?.({ id: item.id, arrayPath: item.arrayPath, key: item.key });
}

/** Make this the block the Delete key removes. */
export function selectItem(item: Item) {
  setSelected(item);
}

let installed = false;
let lastDragEnd = 0;

/** The click that ends a drag must not start text editing. */
export function recentlyDragged() {
  return performance.now() - lastDragEnd < 400;
}

/** The block the pointer is over, at any depth under a page section. */
export function removableItem(target: EventTarget | null): Item | null {
  const edited = deepestEdited(target);
  if (!edited) return null;
  let node: Element | null = edited;
  while (node && node !== document.body) {
    const info = readItem(node);
    if (info?.path.startsWith("sections")) return info;
    node = node.parentElement;
  }
  return null;
}

function itemWeDrag(target: EventTarget | null): Item | null {
  const edited = deepestEdited(target);
  if (!edited) return null;
  const direct = readItem(edited);
  if (direct && !hasDirectStega(edited)) return null;
  if (!direct && edited.hasAttribute("data-sanity") && !hasDirectStega(edited)) return null;

  let node: Element | null = edited;
  while (node && node !== document.body) {
    const info = readItem(node);
    if (info) return siblings(info).length >= 2 ? info : null;
    node = node.parentElement;
  }
  return null;
}

function deepestEdited(target: EventTarget | null) {
  let node = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  while (node && node !== document.documentElement) {
    if (node.hasAttribute("data-sanity") || hasDirectStega(node)) return node;
    node = node.parentElement;
  }
  return null;
}

function hasDirectStega(element: Element) {
  for (const child of element.childNodes) {
    if (child.nodeType !== Node.TEXT_NODE || !child.textContent) continue;
    if (stegaClean(child.textContent) !== child.textContent) return true;
  }
  return false;
}

function readItem(element: Element): Item | null {
  if (!(element instanceof HTMLElement)) return null;
  const raw = element.getAttribute("data-sanity");
  if (!raw) return null;
  const decoded = decodeSanityNodeData(raw);
  if (!decoded || !("path" in decoded) || typeof decoded.path !== "string") return null;
  if (!("id" in decoded) || typeof decoded.id !== "string") return null;
  const match = /^(.*)\[_key=="([^"]+)"\]$/.exec(decoded.path);
  if (!match) return null;
  return { element, id: decoded.id, path: decoded.path, arrayPath: match[1], key: match[2] };
}

export function siblings(item: Item) {
  const found: Item[] = [];
  for (const candidate of document.querySelectorAll("[data-sanity]")) {
    if (!(candidate instanceof Element)) continue;
    const info = readItem(candidate);
    if (info && info.arrayPath === item.arrayPath && info.id === item.id) found.push(info);
  }
  return found;
}

function flowFor(items: Item[]): Flow {
  const rects = items.map((item) => item.element.getBoundingClientRect());
  const sideBySide = rects.some((rect, index) =>
    rects.some((other, otherIndex) => {
      if (index === otherIndex) return false;
      const overlaps = rect.top < other.bottom && other.top < rect.bottom;
      return overlaps && Math.abs(rect.left - other.left) > 8;
    }),
  );
  return sideBySide ? "horizontal" : "vertical";
}

function ordered(items: Item[], flow: Flow) {
  return [...items].sort((a, b) => {
    const ra = a.element.getBoundingClientRect();
    const rb = b.element.getBoundingClientRect();
    if (flow === "horizontal") return ra.left - rb.left || ra.top - rb.top;
    return ra.top - rb.top || ra.left - rb.left;
  });
}

/** Index in the list after the dragged item is removed. Matching the current index means it stayed put. */
function destinationIndex(items: Item[], dragged: Item, clientX: number, clientY: number) {
  const flow = flowFor(items);
  const list = ordered(items, flow);
  const currentIndex = list.findIndex((item) => item.key === dragged.key);
  const others = list.filter((item) => item.key !== dragged.key);
  const pointer = flow === "horizontal" ? clientX : clientY;
  let insertAt = others.findIndex((item) => {
    const rect = item.element.getBoundingClientRect();
    const mid = flow === "horizontal" ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    return pointer < mid;
  });
  if (insertAt < 0) insertAt = others.length;
  return { flow, list, others, currentIndex, insertAt };
}

function placeMarker(marker: HTMLElement, dragged: Item, group: Item[], clientX: number, clientY: number) {
  const { flow, others, insertAt } = destinationIndex(group, dragged, clientX, clientY);
  const before = others[insertAt];
  const anchor = before ?? others[others.length - 1];
  if (!anchor) return;
  const rect = anchor.element.getBoundingClientRect();
  marker.style.display = "block";
  if (flow === "horizontal") {
    const x = before ? rect.left : rect.right;
    marker.style.left = `${x}px`;
    marker.style.top = `${rect.top}px`;
    marker.style.width = "2px";
    marker.style.height = `${rect.height}px`;
  } else {
    const y = before ? rect.top : rect.bottom;
    marker.style.left = `${rect.left}px`;
    marker.style.top = `${y}px`;
    marker.style.width = `${rect.width}px`;
    marker.style.height = "2px";
  }
}

function moveItem(
  dragged: Item,
  group: Item[],
  clientX: number,
  clientY: number,
  apply: (id: string, build: (snapshot: unknown) => NodePatchList) => void,
) {
  const { others, currentIndex, insertAt } = destinationIndex(group, dragged, clientX, clientY);
  if (currentIndex < 0 || insertAt === currentIndex) return;
  const reference = insertAt >= others.length ? others[others.length - 1] : others[insertAt];
  if (!reference || reference.key === dragged.key) return;
  const position = insertAt >= others.length ? "after" : "before";

  showLoader("Moving section…");
  afterPaint(() =>
    apply(dragged.id, (snapshot: unknown) => {
      const value = getAtPath(parse(dragged.path), snapshot);
      if (!value || typeof value !== "object") throw new Error("Block is not ready.");
      return [
        at(dragged.arrayPath, remove({ _key: dragged.key })),
        at(dragged.arrayPath, insert(value, position, { _key: reference.key })),
      ];
    }),
  );
}
