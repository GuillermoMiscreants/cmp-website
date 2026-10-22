import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { blockLabelForPath, onBlockLabelsChange, refreshBlockLabels } from "./blockLabels";
import { removableItem, removeItem, selectItem, siblings, startDrag, type Item } from "./reorder";

type Chrome = {
  presentation: boolean;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
};

/** How long a neighbor can take the hover before the tab follows it. Long enough to cross a gap on the way to the tab. */
const handoffMs = 140;

function sameItem(a: Item | null, b: Item | null) {
  return a?.id === b?.id && a?.path === b?.path;
}

function suspended() {
  const root = document.documentElement;
  return root.hasAttribute("data-reordering") || root.hasAttribute("data-text-editing");
}

/**
 * The one tab above the block under the pointer: drag handle, name, remove.
 * Presentation's own tab is hidden (see PreviewBridge). This one stays mounted
 * while the pointer travels onto it, so a block under another block can still
 * be reached.
 */
export function BlockTab({ chrome, contentReplacedEvent }: { chrome: Chrome; contentReplacedEvent: string }) {
  const version = useSyncExternalStore(
    (listener) => chrome.subscribe(listener),
    () => chrome.snapshot(),
    () => 0,
  );
  const [item, setItem] = useState<Item | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [hidden, setHidden] = useState(false);
  const [, setLabelVersion] = useState(0);

  useEffect(() => onBlockLabelsChange(() => setLabelVersion((value) => value + 1)), []);

  useEffect(() => {
    const sync = () => setHidden(suspended());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reordering", "data-text-editing"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!chrome.presentation) {
      setItem(null);
      return;
    }
    let timer = 0;
    let shown: Item | null = null;
    const follow = (next: Item | null) => {
      shown = next;
      setItem((current) => (sameItem(current, next) ? current : next));
    };
    const onMove = (event: PointerEvent) => {
      const target = event.target;
      if (suspended()) return;
      window.clearTimeout(timer);
      timer = 0;
      if (target instanceof Element && target.closest("[data-block-tab], [data-insert-anchor], sanity-visual-editing")) {
        return;
      }
      const next = removableItem(target);
      if (sameItem(shown, next)) return;
      // Nothing showing yet: appear at once. Otherwise wait, so crossing a neighbor on the way to the tab does not swap it.
      if (!shown && next) follow(next);
      else timer = window.setTimeout(() => follow(next), handoffMs);
    };
    const reset = () => {
      window.clearTimeout(timer);
      follow(null);
    };
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener(contentReplacedEvent, reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener(contentReplacedEvent, reset);
    };
  }, [version, chrome, contentReplacedEvent]);

  // The name table loads once the document snapshot arrives. Ask again if this block is not in it yet.
  useEffect(() => {
    if (item && !blockLabelForPath(item.path)) void refreshBlockLabels();
  }, [item]);

  useLayoutEffect(() => {
    if (!item) {
      setRect(null);
      return;
    }
    const update = () => {
      if (!item.element.isConnected) {
        setItem(null);
        return;
      }
      setRect(item.element.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [item]);

  if (!chrome.presentation || !item || !rect || hidden) return null;
  if (rect.width < 1 || rect.bottom < 0 || rect.top > window.innerHeight) return null;

  const name = blockLabelForPath(item.path) ?? "Block";
  const canDrag = siblings(item).length >= 2;
  const tabHeight = 28;
  // Flush above the block so the pointer never crosses a gap. Flip inside when there is no room.
  const above = rect.top >= tabHeight;
  const top = above ? rect.top - tabHeight : Math.max(rect.top, 0);
  const left = Math.min(Math.max(rect.left, 0), Math.max(window.innerWidth - 160, 0));

  const hold = (event: { stopPropagation(): void }) => event.stopPropagation();

  return (
    <div
      data-block-tab=""
      data-insert-anchor=""
      className="block-tab"
      style={{ top, left, height: tabHeight, borderRadius: above ? "4px 4px 0 0" : "0 0 4px 0" }}
    >
      {canDrag ? (
        <span
          data-block-tab-drag=""
          role="button"
          aria-label="Drag to reorder"
          onMouseDown={(event) => {
            event.preventDefault();
            hold(event);
            selectItem(item);
            startDrag(item, event.nativeEvent);
          }}
        >
          <svg width="17" height="17" viewBox="0 0 25 25" fill="currentColor" aria-hidden="true">
            <circle cx="9.5" cy="6.5" r="1.5" />
            <circle cx="9.5" cy="12.5" r="1.5" />
            <circle cx="9.5" cy="18.5" r="1.5" />
            <circle cx="15.5" cy="6.5" r="1.5" />
            <circle cx="15.5" cy="12.5" r="1.5" />
            <circle cx="15.5" cy="18.5" r="1.5" />
          </svg>
        </span>
      ) : null}
      <span className="block-tab-name" onClick={() => selectItem(item)}>
        {name}
      </span>
      <button
        type="button"
        aria-label="Remove"
        onPointerDown={hold}
        onMouseDown={hold}
        onClick={(event) => {
          event.preventDefault();
          hold(event);
          removeItem(item);
          setItem(null);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
