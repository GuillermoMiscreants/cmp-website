/**
 * Variant vocabulary shared by the Sanity schema and the Astro block renderers.
 * Values are the ones the starter components already render. Do not add a value
 * that has no class or prop on those components.
 */

export const sectionVariant = [
  { title: "Default", value: "default" },
  { title: "Narrow", value: "narrow" },
  { title: "Wide", value: "wide" },
] as const;

export const background = [
  { title: "None", value: "none" },
  { title: "Muted", value: "muted" },
  { title: "Dark", value: "dark" },
  { title: "Brand", value: "brand" },
] as const;

export const spacing = [
  { title: "None", value: "none" },
  { title: "XS", value: "xs" },
  { title: "SM", value: "sm" },
  { title: "MD", value: "md" },
  { title: "LG", value: "lg" },
  { title: "XL", value: "xl" },
] as const;

export const headingLevel = [
  { title: "H1", value: "1" },
  { title: "H2", value: "2" },
  { title: "H3", value: "3" },
  { title: "H4", value: "4" },
] as const;

export const headingSize = [
  { title: "Display", value: "h1" },
  { title: "XL", value: "h2" },
  { title: "LG", value: "h3" },
  { title: "MD", value: "h4" },
  { title: "SM", value: "h5" },
  { title: "XS", value: "h6" },
] as const;

export const textSize = [
  { title: "XL", value: "text-body-xl" },
  { title: "LG", value: "text-body-lg" },
  { title: "MD", value: "text-body-md" },
  { title: "SM", value: "text-body-sm" },
  { title: "XS", value: "text-body-xsm" },
] as const;

export const tone = [
  { title: "Default", value: "default" },
  { title: "Muted", value: "muted" },
  { title: "Inverse", value: "inverse" },
] as const;

export const align = [
  { title: "Left", value: "left" },
  { title: "Center", value: "center" },
  { title: "Right", value: "right" },
] as const;

export const buttonVariant = [
  { title: "Primary", value: "primary" },
  { title: "Secondary", value: "secondary" },
  { title: "Tertiary", value: "tertiary" },
] as const;

export const columnsLayout = [
  { title: "1 / 1", value: "1-1" },
  { title: "1 / 1 / 1", value: "1-1-1" },
  { title: "2 / 1", value: "2-1" },
  { title: "1 / 2", value: "1-2" },
  { title: "1 / 1 / 1 / 1", value: "1-1-1-1" },
] as const;

export const columnsGap = [
  { title: "SM", value: "sm" },
  { title: "MD", value: "md" },
  { title: "LG", value: "lg" },
] as const;

export const verticalAlign = [
  { title: "Top", value: "top" },
  { title: "Center", value: "center" },
  { title: "Bottom", value: "bottom" },
] as const;

export const imageAspect = [
  { title: "Auto", value: "auto" },
  { title: "16:9", value: "16/9" },
  { title: "4:3", value: "4/3" },
  { title: "1:1", value: "1/1" },
  { title: "3:4", value: "3/4" },
] as const;

export const imageRadius = [
  { title: "None", value: "none" },
  { title: "Card", value: "card" },
  { title: "Pill", value: "pill" },
] as const;

export const videoMode = [
  { title: "Autoplay", value: "autoplay" },
  { title: "Hover", value: "hover" },
  { title: "Click", value: "click" },
] as const;

export const cardStyle = [
  { title: "Featured", value: "featured" },
  { title: "Icon", value: "icon" },
] as const;

export const cardBorder = [
  { title: "All", value: "all" },
  { title: "Horizontal", value: "y" },
  { title: "Vertical", value: "x" },
  { title: "None", value: "none" },
] as const;

/** Desktop column counts Grid already renders. 5 matches the homepage icon row. */
export const cardColumns = [
  { title: "2", value: "2" },
  { title: "3", value: "3" },
  { title: "4", value: "4" },
  { title: "5", value: "5" },
] as const;

export const iconName = [
  { title: "Activity", value: "lucide:activity" },
  { title: "Shield", value: "lucide:shield-check" },
  { title: "Server", value: "lucide:server" },
  { title: "Headphones", value: "lucide:headphones" },
  { title: "Life buoy", value: "lucide:life-buoy" },
  { title: "Layers", value: "lucide:layers" },
  { title: "Database", value: "lucide:database" },
  { title: "Zap", value: "lucide:zap" },
  { title: "Settings", value: "lucide:settings-2" },
] as const;

type ValueOf<T extends readonly { value: string }[]> = T[number]["value"];

export type SectionVariant = ValueOf<typeof sectionVariant>;
export type Background = ValueOf<typeof background>;
export type Spacing = ValueOf<typeof spacing>;
export type HeadingLevel = ValueOf<typeof headingLevel>;
export type HeadingSize = ValueOf<typeof headingSize>;
export type TextSize = ValueOf<typeof textSize>;
export type Tone = ValueOf<typeof tone>;
export type Align = ValueOf<typeof align>;
export type ButtonVariant = ValueOf<typeof buttonVariant>;
export type ColumnsLayout = ValueOf<typeof columnsLayout>;
export type ColumnsGap = ValueOf<typeof columnsGap>;
export type VerticalAlign = ValueOf<typeof verticalAlign>;
export type ImageAspect = ValueOf<typeof imageAspect>;
export type ImageRadius = ValueOf<typeof imageRadius>;
export type VideoMode = ValueOf<typeof videoMode>;
export type CardStyle = ValueOf<typeof cardStyle>;
export type CardBorder = ValueOf<typeof cardBorder>;
export type CardColumns = ValueOf<typeof cardColumns>;
export type IconName = ValueOf<typeof iconName>;

export const headingSizeClass: Record<HeadingSize, string> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
};

export const textSizeClass: Record<TextSize, string> = {
  "text-body-xl": "text-body-xl",
  "text-body-lg": "text-body-lg",
  "text-body-md": "text-body-md",
  "text-body-sm": "text-body-sm",
  "text-body-xsm": "text-body-xsm",
};

export const toneClass: Record<Tone, string> = {
  default: "text-fg",
  muted: "text-fg-muted",
  inverse: "text-fg-on-intent",
};

export const alignClass: Record<Align, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

export const justifyClass: Record<Align, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export const textAlignClass: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/** Spacer uses the SectionMain padding scale as empty padding, not a new size ramp. */
export const spacingClass: Record<Spacing, string> = {
  none: "",
  xs: "section-pt-xs",
  sm: "section-pt-sm",
  md: "section-pt-md",
  lg: "section-pt-lg",
  xl: "section-pt-xl",
};

export const dividerClass: Record<Tone, string> = {
  default: "border-stroke",
  muted: "border-stroke-strong",
  inverse: "border-fg-on-intent",
};

export const imageAspectClass: Record<ImageAspect, string> = {
  auto: "",
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
};

export const imageRadiusClass: Record<ImageRadius, string> = {
  none: "rounded-none",
  card: "rounded-card",
  pill: "rounded-pill",
};

export const gapClass: Record<ColumnsGap, string> = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

export const verticalAlignClass: Record<VerticalAlign, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
};

export const headingTag: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4"> = {
  "1": "h1",
  "2": "h2",
  "3": "h3",
  "4": "h4",
};

export const columnsLayoutSpec: Record<
  ColumnsLayout,
  { desktop: 1 | 2 | 3 | 4; tablet?: 1 | 2 | 3 | 4; spans?: number[] }
> = {
  "1-1": { desktop: 2 },
  "1-1-1": { desktop: 3, tablet: 3 },
  "1-1-1-1": { desktop: 4, tablet: 2 },
  "2-1": { desktop: 3, spans: [2, 1] },
  "1-2": { desktop: 3, spans: [1, 2] },
};

export const sectionVariantProps: Record<
  SectionVariant,
  { contentPadding: "default" | "none"; contentClass: string }
> = {
  default: { contentPadding: "default", contentClass: "" },
  narrow: { contentPadding: "default", contentClass: "max-w-3xl mx-auto w-full" },
  wide: { contentPadding: "none", contentClass: "" },
};
