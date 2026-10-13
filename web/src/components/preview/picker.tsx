import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PaletteItem, PaletteType } from "./inserts";

type Group = "elements" | "components" | "layouts";

type Meta = { group: Group; hint: string; keywords: string; icon: ReactNode };

const svg = (children: ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const meta: Record<PaletteType, Meta> = {
  eyebrow: {
    group: "elements",
    hint: "Small label above a heading",
    keywords: "label kicker tag overline",
    icon: svg(
      <>
        <path d="M3 6h6" />
        <path d="M3 11h14M3 15h10" />
      </>,
    ),
  },
  heading: {
    group: "elements",
    hint: "Title text, H1 to H6",
    keywords: "title h1 h2 h3 headline",
    icon: svg(<path d="M5 4v12M15 4v12M5 10h10" />),
  },
  richText: {
    group: "elements",
    hint: "Paragraphs, lists and links",
    keywords: "paragraph body copy rich text",
    icon: svg(<path d="M3 5h14M3 9h14M3 13h14M3 17h8" />),
  },
  buttonGroup: {
    group: "elements",
    hint: "One or more buttons",
    keywords: "cta link action",
    icon: svg(
      <>
        <rect x="2.5" y="6.5" width="15" height="7" rx="3.5" />
        <path d="M7 10h6" />
      </>,
    ),
  },
  imageBlock: {
    group: "elements",
    hint: "Photo or illustration",
    keywords: "picture photo media",
    icon: svg(
      <>
        <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
        <circle cx="7" cy="8" r="1.25" />
        <path d="m3 15 4.5-4.5 3.5 3.5 2-2 4 3" />
      </>,
    ),
  },
  video: {
    group: "elements",
    hint: "Embedded or hosted video",
    keywords: "movie youtube vimeo media player",
    icon: svg(
      <>
        <rect x="2.5" y="4" width="15" height="12" rx="2" />
        <path d="m8.5 7.5 4 2.5-4 2.5z" />
      </>,
    ),
  },
  spacer: {
    group: "elements",
    hint: "Empty vertical space",
    keywords: "gap margin padding space",
    icon: svg(<path d="M10 3v14M7 5.5l3-2.5 3 2.5M7 14.5l3 2.5 3-2.5" />),
  },
  divider: {
    group: "elements",
    hint: "Horizontal rule",
    keywords: "line separator rule hr",
    icon: svg(<path d="M3 10h14" />),
  },
  cardGrid: {
    group: "components",
    hint: "A grid of cards",
    keywords: "cards grid features tiles",
    icon: svg(
      <>
        <rect x="3" y="3" width="6" height="6" rx="1.25" />
        <rect x="11" y="3" width="6" height="6" rx="1.25" />
        <rect x="3" y="11" width="6" height="6" rx="1.25" />
        <rect x="11" y="11" width="6" height="6" rx="1.25" />
      </>,
    ),
  },
  columns: {
    group: "layouts",
    hint: "Side-by-side columns",
    keywords: "grid split layout two three",
    icon: svg(
      <>
        <rect x="3" y="3.5" width="6" height="13" rx="1.25" />
        <rect x="11" y="3.5" width="6" height="13" rx="1.25" />
      </>,
    ),
  },
  contentWrapper: {
    group: "layouts",
    hint: "Group blocks with shared alignment and padding",
    keywords: "container group wrapper box",
    icon: svg(
      <>
        <rect x="2.5" y="3.5" width="15" height="13" rx="2" strokeDasharray="2.5 2" />
        <rect x="6" y="7" width="8" height="6" rx="1" />
      </>,
    ),
  },
  section: {
    group: "layouts",
    hint: "A full-width page section",
    keywords: "band row page",
    icon: svg(
      <>
        <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
        <path d="M2.5 8h15" />
      </>,
    ),
  },
};

const tabs: { id: "all" | Group; label: string }[] = [
  { id: "all", label: "All results" },
  { id: "elements", label: "Elements" },
  { id: "components", label: "Components" },
  { id: "layouts", label: "Layouts" },
];

export type PickerProps = {
  items: PaletteItem[];
  title: string;
  error: string | null;
  onChoose: (type: PaletteType) => void;
  onClose: () => void;
};

/** Centered, searchable block picker. Arrow keys move, Enter inserts, Esc closes. */
export function BlockPicker({ items, title, error, onChoose, onClose }: PickerProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | Group>("all");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const available = tabs.filter((entry) => entry.id === "all" || items.some((item) => meta[item.type].group === entry.id));

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const info = meta[item.type];
      if (tab !== "all" && info.group !== tab) return false;
      if (!needle) return true;
      return `${item.label} ${info.hint} ${info.keywords}`.toLowerCase().includes(needle);
    });
  }, [items, query, tab]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query, tab]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length) setActive((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length) setActive((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = results[active];
      if (item) onChoose(item.type);
    } else if (event.key === "Tab") {
      event.preventDefault();
      const ids = available.map((entry) => entry.id);
      const step = event.shiftKey ? -1 : 1;
      setTab((current) => ids[(ids.indexOf(current) + step + ids.length) % ids.length]);
    }
  };

  return (
    <div
      className="bp-backdrop"
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className="bp-modal">
        <div className="bp-search">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3.5 3.5" />
          </svg>
          <input
            ref={input}
            type="text"
            value={query}
            placeholder="Search blocks…"
            aria-label="Search blocks"
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>esc</kbd>
        </div>

        <div role="tablist" className="bp-tabs">
          {available.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              className="bp-tab"
              onClick={() => {
                setTab(entry.id);
                input.current?.focus();
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div ref={list} role="listbox" aria-label={title} className="bp-list">
          {results.length === 0 ? <p className="bp-empty">No blocks match “{query}”.</p> : null}
          {results.map((item, index) => (
            <button
              key={item.type}
              type="button"
              role="option"
              aria-selected={index === active}
              data-index={index}
              className="bp-item"
              onPointerMove={() => setActive(index)}
              onClick={() => onChoose(item.type)}
            >
              <span className="bp-icon">{meta[item.type].icon}</span>
              <span className="bp-text">
                <span className="bp-label">{item.label}</span>
                <span className="bp-hint">{meta[item.type].hint}</span>
              </span>
              <span className="bp-group">{tabs.find((entry) => entry.id === meta[item.type].group)?.label}</span>
            </button>
          ))}
        </div>

        <div className="bp-footer">
          {error ? (
            <span className="bp-error">{error}</span>
          ) : (
            <>
              <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> insert</span>
              <span><kbd>tab</kbd> switch category</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
