export type BlockStub = { _type: string; _key: string } & Record<string, unknown>;

function key() {
  return crypto.randomUUID();
}

function heading(text = "Heading"): BlockStub {
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

function card(title: string): BlockStub {
  return {
    _type: "card",
    _key: key(),
    style: "featured",
    title,
    border: "none",
    align: "left",
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
  richText: (): BlockStub => ({
    _type: "richText",
    _key: key(),
    size: "text-body-md",
    tone: "default",
    body: [textBlock("Text")],
  }),
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
    cards: [card("Card"), card("Card")],
  }),
  columns: (): BlockStub => ({
    _type: "columns",
    _key: key(),
    layout: "1-1",
    gap: "md",
    verticalAlign: "top",
    columns: [
      { _type: "column", _key: key(), content: [heading("Heading")] },
      { _type: "column", _key: key(), content: [heading("Heading")] },
    ],
  }),
  contentWrapper: (): BlockStub => ({
    _type: "contentWrapper",
    _key: key(),
    align: "left",
    paddingTop: "none",
    paddingBottom: "none",
    content: [heading("Heading")],
  }),
  section: (): BlockStub => ({
    _type: "section",
    _key: key(),
    variant: "default",
    background: "none",
    paddingTop: "md",
    paddingBottom: "md",
    align: "left",
    borderTop: false,
    content: [],
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
export const pagePalette: PaletteItem[] = [{ type: "section", label: "Section" }];

export function createBlock(type: PaletteType) {
  return creators[type]();
}
