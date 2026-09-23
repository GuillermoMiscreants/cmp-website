import type { Align } from "../variants";
import { clean } from "./clean";
import { getClient } from "./client";
import { resolveLink } from "./links";
import { dataSanity } from "./preview";
import { pageBySlugQuery, siteSettingsQuery } from "./queries";

export type SanityImage = {
  alt?: string | null;
  url?: string | null;
  lqip?: string | null;
  dimensions?: { width?: number; height?: number; aspectRatio?: number } | null;
  asset?: { _ref?: string } | null;
  crop?: unknown;
  hotspot?: unknown;
};

export type LinkField = {
  type?: string | null;
  openInNewTab?: boolean | null;
  anchor?: string | null;
  external?: string | null;
  internal?: { slug?: string | null } | null;
};

export type ButtonField = {
  _key: string;
  _type: "button";
  label?: string | null;
  variant?: string | null;
  withArrow?: boolean | null;
  link?: LinkField | null;
};

export type BlockBase = { _key: string; _type: string };

export type PageBlock = BlockBase & {
  text?: string | null;
  level?: string | null;
  size?: string | null;
  align?: string | null;
  tone?: string | null;
  body?: { _type: string; [key: string]: unknown }[] | null;
  buttons?: ButtonField[] | null;
  caption?: string | null;
  aspect?: string | null;
  radius?: string | null;
  image?: SanityImage | null;
  url?: string | null;
  mode?: string | null;
  poster?: SanityImage | null;
  columns?: string | PageBlock[] | null;
  cards?: CardField[] | null;
  layout?: string | null;
  gap?: string | null;
  verticalAlign?: string | null;
  content?: PageBlock[] | null;
  style?: string | null;
  eyebrow?: string | null;
  title?: string | null;
  description?: string | null;
  header?: string | null;
  icon?: string | null;
  border?: string | null;
  button?: ButtonField | null;
  variant?: string | null;
  background?: string | null;
  spacing?: string | null;
  borderTop?: boolean | null;
  label?: string | null;
  logos?: SanityImage[] | null;
  heading?: string | null;
  intro?: string | null;
  closePrevious?: boolean | null;
  openByDefault?: number | null;
  items?: { _key: string; question?: string | null; answer?: string | null }[] | null;
};

export type CardField = PageBlock;

export type PageDocument = {
  _id: string;
  title?: string | null;
  slug?: string | null;
  seo?: {
    title?: string | null;
    description?: string | null;
    ogImage?: SanityImage | null;
  } | null;
  sections?: PageBlock[] | null;
  /** Portable Text from pages created before sections existed. Rendered only when sections is empty. */
  legacyBody?: { _type: string; [key: string]: unknown }[] | null;
};

export type SiteSettings = {
  _id?: string | null;
  siteTitle?: string | null;
  footerTagline?: string | null;
  footerCopyright?: string | null;
  logo?: SanityImage | null;
  nav?: { _key: string; label?: string | null; link?: LinkField | null }[] | null;
};

export type SiteNavLink = {
  label: string;
  href: string;
  target?: string;
  rel?: string;
  sanity?: string;
};

export type BlockRenderProps = {
  block: PageBlock;
  preview: boolean;
  documentId: string;
  path: string;
  inheritedAlign?: Align;
  eager?: boolean;
};

export async function loadSiteSettings(preview: boolean) {
  const client = getClient({ preview });
  const settings = await client.fetch(siteSettingsQuery);
  return settings as SiteSettings | null;
}

/** Map Studio navigation to plain links. Empty when nothing usable is set. */
export function navLinksFromSettings(settings: SiteSettings | null, preview: boolean): SiteNavLink[] {
  const documentId = clean(settings?._id) || "siteSettings";
  return (settings?.nav ?? []).flatMap((item) => {
    const label = item.label ?? "";
    const resolved = resolveLink(item.link);
    if (!clean(label) || !resolved) return [];
    return [
      {
        label,
        href: resolved.href,
        target: resolved.target,
        rel: resolved.target === "_blank" ? "noopener noreferrer" : undefined,
        sanity: dataSanity(preview, documentId, `nav[_key=="${clean(item._key)}"]`, "siteSettings"),
      },
    ];
  });
}

export async function loadPage(slug: string, preview: boolean) {
  const client = getClient({ preview });
  const [page, settings] = await Promise.all([
    client.fetch(pageBySlugQuery, { slug }),
    client.fetch(siteSettingsQuery),
  ]);
  return {
    page: page as PageDocument | null,
    settings: settings as SiteSettings | null,
  };
}
