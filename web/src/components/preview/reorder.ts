import { stegaClean } from "@sanity/client/stega";
import { at, insert, remove, type NodePatchList } from "@sanity/mutate";
import { getAtPath, parse } from "@sanity/mutate/path";
import { decodeSanityNodeData } from "@sanity/visual-editing-csm";

type Flow = "horizontal" | "vertical";

type Item = {
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
  onRemove = remove ?? null;

  let cursorTarget: HTMLElement | null = null;
  let hoveredTarget: EventTarget | null = null;
  let handleFrame = 0;
  const marker = document.createElement("div");
  marker.setAttribute("data-reorder-marker", "");
  marker.className = "preview-guide";
  marker.style.position = "fixed";
  marker.style.zIndex = "2147483646";
  marker.style.pointerEvents = "none";
  marker.style.display = "none";
  document.documentElement.appendChild(marker);

  const scheduleHandle = () => {
    cancelAnimationFrame(handleFrame);
    handleFrame = requestAnimationFrame(() => {
      syncDragHandle(hoveredTarget);
      syncRemoveButton(hoveredTarget);
    });
  };

  const onHover = (event: PointerEvent) => {
    if (document.documentElement.hasAttribute("data-reordering")) return;
    hoveredTarget = event.target;
    const item = itemWeDrag(event.target);
    const next = item?.element ?? null;
    if (next !== cursorTarget) {
      if (cursorTarget) cursorTarget.style.cursor = "";
      cursorTarget = next;
      if (cursorTarget) cursorTarget.style.cursor = "move";
    }
    scheduleHandle();
  };

  const onDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("sanity-visual-editing, [data-insert-anchor]")) return;
    const item = itemWeDrag(target);
    if (!item) return;

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
        document.querySelectorAll("[data-remove-block]").forEach((node) => node.remove());
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
      scheduleHandle();
    });
    observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-focused"] });
  };
  watchOverlay();
}

const dragHandle = `<svg data-sanity-icon="drag-handle" width="17" height="17" viewBox="0 0 25 25" fill="none" aria-hidden="true"><path d="M9.5 8C10.3284 8 11 7.32843 11 6.5C11 5.67157 10.3284 5 9.5 5C8.67157 5 8 5.67157 8 6.5C8 7.32843 8.67157 8 9.5 8Z" fill="currentColor"/><path d="M9.5 14C10.3284 14 11 13.3284 11 12.5C11 11.6716 10.3284 11 9.5 11C8.67157 11 8 11.6716 8 12.5C8 13.3284 8.67157 14 9.5 14Z" fill="currentColor"/><path d="M11 18.5C11 19.3284 10.3284 20 9.5 20C8.67157 20 8 19.3284 8 18.5C8 17.6716 8.67157 17 9.5 17C10.3284 17 11 17.6716 11 18.5Z" fill="currentColor"/><path d="M15.5 8C16.3284 8 17 7.32843 17 6.5C17 5.67157 16.3284 5 15.5 5C14.6716 5 14 5.67157 14 6.5C14 7.32843 14.6716 8 15.5 8Z" fill="currentColor"/><path d="M17 12.5C17 13.3284 16.3284 14 15.5 14C14.6716 14 14 13.3284 14 12.5C14 11.6716 14.6716 11 15.5 11C16.3284 11 17 11.6716 17 12.5Z" fill="currentColor"/><path d="M15.5 20C16.3284 20 17 19.3284 17 18.5C17 17.6716 16.3284 17 15.5 17C14.6716 17 14 17.6716 14 18.5C14 19.3284 14.6716 20 15.5 20Z" fill="currentColor"/></svg>`;

const trashIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;

let onRemove: ((item: { id: string; arrayPath: string; key: string }) => void) | null = null;
let removal: Item | null = null;
let selected: Item | null = null;
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
  selected = null;
  onRemove?.({ id: item.id, arrayPath: item.arrayPath, key: item.key });
}

function onSelect(event: MouseEvent) {
  if (event.button !== 0) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("[data-remove-block], [data-insert-anchor]")) return;
  const overlay = target.closest("sanity-visual-editing [data-focused], sanity-visual-editing [data-hovered]");
  if (overlay) {
    const item = itemForOverlay(overlay) ?? removal;
    if (item) selected = item;
    return;
  }
  selected = removableItem(target);
}

function onDeleteKey(event: KeyboardEvent) {
  if (event.key !== "Delete" && event.key !== "Backspace") return;
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
  if (item) selected = item;
}

function clearRemoveButtons() {
  document.querySelectorAll("[data-remove-block]").forEach((node) => node.remove());
}

/** Green hover tag: the chip that holds the type name. */
function overlayChip(hovered: Element): { label: Element; title: Element | null } | null {
  for (const text of hovered.querySelectorAll("[data-ui='Text']")) {
    if (!(text instanceof HTMLElement) || text.classList.contains("drag-handle")) continue;
    const value = text.textContent?.trim();
    if (!value || value === "Open in Studio" || text.querySelector("svg")) continue;
    const parent = text.parentElement;
    if (!parent) continue;
    return { label: parent, title: text };
  }
  const icon = hovered.querySelector("[data-ui='Text']:not(.drag-handle)");
  const parent = icon?.parentElement;
  if (!parent || parent.closest("a")) return null;
  return { label: parent, title: null };
}

/**
 * The label sits above the block and takes the pointer once you reach for it.
 * Keep the block we already resolved so the icon does not vanish under the cursor.
 */
function syncRemoveButton(target: EventTarget | null) {
  if (document.documentElement.hasAttribute("data-reordering")) {
    removal = null;
    clearRemoveButtons();
    return;
  }
  const overLabel = target instanceof Element && !!target.closest("sanity-visual-editing [data-hovered]");
  if (!overLabel) removal = removableItem(target);

  const hovered = document.querySelector("sanity-visual-editing [data-hovered]");
  const spot = hovered ? overlayChip(hovered) : null;
  if (!removal || !spot) {
    clearRemoveButtons();
    return;
  }

  const { label, title } = spot;
  const existing = label.querySelector(":scope > [data-remove-block]");
  if (
    existing instanceof HTMLButtonElement &&
    existing.dataset.removeId === removal.id &&
    existing.dataset.removePath === removal.arrayPath &&
    existing.dataset.removeKey === removal.key
  ) {
    return;
  }

  clearRemoveButtons();
  const item = removal;
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("data-remove-block", "");
  button.setAttribute("data-insert-anchor", "");
  button.dataset.removeId = item.id;
  button.dataset.removePath = item.arrayPath;
  button.dataset.removeKey = item.key;
  button.setAttribute("aria-label", "Remove");
  button.innerHTML = trashIcon;
  const activate = (event: Event) => {
    event.stopPropagation();
  };
  button.addEventListener("pointerdown", activate);
  button.addEventListener("mousedown", activate);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onRemove?.({ id: item.id, arrayPath: item.arrayPath, key: item.key });
  });
  if (title) title.insertAdjacentElement("afterend", button);
  else label.append(button);
}

function syncDragHandle(target: EventTarget | null) {
  const item = target && !document.documentElement.hasAttribute("data-reordering") ? itemWeDrag(target) : null;
  const hovered = document.querySelector("sanity-visual-editing [data-hovered]");
  const text = hovered?.querySelector("[data-ui='Text']");
  const label = text?.parentElement ?? null;
  const nativeHandle = [...(label?.querySelectorAll("[data-sanity-icon='drag-handle']") ?? [])].some(
    (icon) => !icon.closest("[data-reorder-handle]"),
  );
  if (!item || !label || nativeHandle) {
    document.querySelectorAll("[data-reorder-handle]").forEach((node) => node.remove());
    return;
  }
  if (label.querySelector(":scope > [data-reorder-handle]")) return;
  document.querySelectorAll("[data-reorder-handle]").forEach((node) => node.remove());
  const handle = document.createElement("span");
  handle.setAttribute("data-reorder-handle", "");
  handle.style.display = "inline-flex";
  handle.style.marginRight = "4px";
  handle.style.color = "#fff";
  handle.style.lineHeight = "0";
  handle.innerHTML = dragHandle;
  label.prepend(handle);
}

let installed = false;

function removableItem(target: EventTarget | null): Item | null {
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

function siblings(item: Item) {
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

  apply(dragged.id, (snapshot: unknown) => {
    const value = getAtPath(parse(dragged.path), snapshot);
    if (!value || typeof value !== "object") throw new Error("Block is not ready.");
    return [
      at(dragged.arrayPath, remove({ _key: dragged.key })),
      at(dragged.arrayPath, insert(value, position, { _key: reference.key })),
    ];
  });
}
