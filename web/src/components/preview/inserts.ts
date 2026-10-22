import { ctaBand, faqPlaceholder, featureGrid, heroCentered, heroSplit, iconStats, plainSection, textCta } from "../../lib/templates";

export type BlockStub = { _type: string; _key: string } & Record<string, unknown>;

function key() {
  return crypto.randomUUID();
}

const LOREM_PARAGRAPH =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

function heading(text = "Lorem ipsum"): BlockStub {
  return { _type: "heading", _key: key(), text, level: "2", size: "h2" };
}

function textBlock(text: string) {
  const blockKey = key();
  return {
    _type: "block",
    _key: blockKey,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `${blockKey}-span`, text, marks: [] }],
  };
}

function button(label: string): BlockStub {
  return {
    _type: "button",
    _key: key(),
    label,
    variant: "primary",
    withArrow: true,
    link: { _type: "link", type: "external", external: "/", openInNewTab: false },
  };
}

const LOREM_SHORT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.";

function richText(text = LOREM_PARAGRAPH): BlockStub {
  return {
    _type: "richText",
    _key: key(),
    size: "text-body-md",
    tone: "default",
    body: [textBlock(text)],
  };
}

function card(title: string): BlockStub {
  return {
    _type: "card",
    _key: key(),
    style: "featured",
    eyebrow: "Eyebrow",
    title,
    description: LOREM_SHORT,
    button: button("Learn more"),
    border: "none",
    align: "left",
  };
}

function contentWrapper(): BlockStub {
  return {
    _type: "contentWrapper",
    _key: key(),
    align: "left",
    paddingTop: "none",
    paddingBottom: "none",
    content: [heading(), richText(LOREM_SHORT)],
  };
}

const creators = {
  eyebrow: (): BlockStub => ({
    _type: "eyebrow",
    _key: key(),
    text: "Eyebrow",
    tone: "muted",
  }),
  heading: () => heading(),
  richText: () => richText(),
  buttonGroup: (): BlockStub => ({
    _type: "buttonGroup",
    _key: key(),
    buttons: [button("Learn more")],
  }),
  imageBlock: (): BlockStub => ({
    _type: "imageBlock",
    _key: key(),
    aspect: "auto",
    radius: "none",
  }),
  video: (): BlockStub => ({
    _type: "video",
    _key: key(),
    url: "https://example.com/video.mp4",
    mode: "click",
    aspect: "16/9",
  }),
  spacer: (): BlockStub => ({ _type: "spacer", _key: key(), size: "md" }),
  divider: (): BlockStub => ({ _type: "divider", _key: key(), tone: "default" }),
  cardGrid: (): BlockStub => ({
    _type: "cardGrid",
    _key: key(),
    columns: "2",
    cards: [card("Lorem ipsum"), card("Lorem ipsum")],
  }),
  columns: (): BlockStub => ({
    _type: "columns",
    _key: key(),
    layout: "1-1",
    gap: "md",
    rowGap: "md",
    verticalAlign: "top",
    columns: [
      { _type: "column", _key: key(), content: [contentWrapper()] },
      { _type: "column", _key: key(), content: [contentWrapper()] },
    ],
  }),
  contentWrapper: () => contentWrapper(),
  section: (): BlockStub => ({ _type: "section", _key: key(), ...plainSection }),
  heroCentered: (): BlockStub => ({ _type: "section", _key: key(), ...heroCentered }),
  heroSplit: (): BlockStub => ({ _type: "section", _key: key(), ...heroSplit }),
  textCta: (): BlockStub => ({ _type: "section", _key: key(), ...textCta }),
  featureGrid: (): BlockStub => ({ _type: "section", _key: key(), ...featureGrid }),
  iconStats: (): BlockStub => ({ _type: "section", _key: key(), ...iconStats }),
  ctaBand: (): BlockStub => ({ _type: "section", _key: key(), ...ctaBand }),
  faq: (): BlockStub => ({ _type: "faq", _key: key(), ...faqPlaceholder }),
  logoMarquee: (): BlockStub => ({
    _type: "logoMarquee",
    _key: key(),
    label: "Trusted by leading data companies",
    background: "none",
  }),
} as const;

export type PaletteType = keyof typeof creators;

export type PaletteItem = { type: PaletteType; label: string };

const flowPalette: PaletteItem[] = [
  { type: "eyebrow", label: "Eyebrow" },
  { type: "heading", label: "Heading" },
  { type: "richText", label: "Text" },
  { type: "buttonGroup", label: "Button group" },
  { type: "imageBlock", label: "Image" },
  { type: "video", label: "Video" },
  { type: "spacer", label: "Spacer" },
  { type: "divider", label: "Divider" },
  { type: "cardGrid", label: "Card grid" },
];

/** A wrapper accepts every block except columns and sections. */
export const wrapperPalette: PaletteItem[] = [
  ...flowPalette,
  { type: "contentWrapper", label: "Content wrapper" },
];

/** Blocks that can sit inside a column or a section. */
export const columnPalette: PaletteItem[] = [
  ...flowPalette,
  { type: "columns", label: "Columns" },
  { type: "contentWrapper", label: "Content wrapper" },
];

/** A section accepts the same blocks as a column. */
export const sectionPalette: PaletteItem[] = columnPalette;

/** A section is only added after another section. */
export const pagePalette: PaletteItem[] = [
  { type: "section", label: "Section" },
  { type: "heroCentered", label: "Hero – centered" },
  { type: "heroSplit", label: "Hero – split" },
  { type: "textCta", label: "Text + CTA" },
  { type: "featureGrid", label: "Feature grid" },
  { type: "iconStats", label: "Icon stats" },
  { type: "ctaBand", label: "CTA band" },
  { type: "logoMarquee", label: "Logo marquee" },
  { type: "faq", label: "FAQ" },
];

export function createBlock(type: PaletteType) {
  return creators[type]();
}

/**
 * The starter content for a block Studio's own insert menu left bare. That menu adds only a type and a
 * key, and ignores the schema's initial values, so a new FAQ or content wrapper would sit empty.
 */
export function placeholderFor(type: string): BlockStub | null {
  if (type === "faq" || type === "logoMarquee" || type === "cardGrid" || type === "columns" || type === "contentWrapper") return creators[type]();
  return null;
}
