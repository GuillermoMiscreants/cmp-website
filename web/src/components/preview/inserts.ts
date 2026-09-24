export type BlockStub = { _type: string; _key: string } & Record<string, unknown>;

function key() {
  return crypto.randomUUID();
}

function heading(text = "Heading"): BlockStub {
  return { _type: "heading", _key: key(), text, level: "2", size: "h2", align: "left" };
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
    align: "left",
    tone: "muted",
  }),
  heading: () => heading(),
  richText: (): BlockStub => ({
    _type: "richText",
    _key: key(),
    size: "text-body-md",
    tone: "default",
    align: "left",
    body: [textBlock("Text")],
  }),
  buttonGroup: (): BlockStub => ({
    _type: "buttonGroup",
    _key: key(),
    align: "left",
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
} as const;

export type PaletteType = keyof typeof creators;

export const paletteItems: { type: PaletteType; label: string }[] = [
  { type: "eyebrow", label: "Eyebrow" },
  { type: "heading", label: "Heading" },
  { type: "richText", label: "Text" },
  { type: "buttonGroup", label: "Buttons" },
  { type: "imageBlock", label: "Image" },
  { type: "video", label: "Video" },
  { type: "spacer", label: "Spacer" },
  { type: "divider", label: "Divider" },
  { type: "cardGrid", label: "Card grid" },
  { type: "columns", label: "Columns" },
];

export function createBlock(type: PaletteType) {
  return creators[type]();
}
