import { clean } from "./clean";

type LinkValue = {
  type?: string | null;
  openInNewTab?: boolean | null;
  anchor?: string | null;
  external?: string | null;
  internal?: { slug?: string | null } | null;
};

export function resolveLink(link: LinkValue | null | undefined) {
  if (!link) return undefined;
  const type = clean(link.type);
  let href = "";
  if (type === "external") {
    href = clean(link.external);
  } else {
    const slug = clean(link.internal?.slug);
    if (!slug) return undefined;
    href = slug === "home" ? "/" : `/${slug}`;
    const anchor = clean(link.anchor).replace(/^#/, "");
    if (anchor) href += `#${anchor}`;
  }
  if (!href) return undefined;
  return {
    href,
    target: link.openInNewTab ? "_blank" : undefined,
  };
}
