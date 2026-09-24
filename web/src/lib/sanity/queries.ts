import { defineQuery } from "groq";

const linkProjection = `{
  type,
  openInNewTab,
  anchor,
  external,
  internal->{ "slug": slug.current }
}`;

const imageProjection = `{
  ...,
  alt,
  "dimensions": asset->metadata.dimensions
}`;

const buttonProjection = `{
  _key,
  _type,
  label,
  variant,
  withArrow,
  link${linkProjection}
}`;

const leafProjection = `
  _key,
  _type,
  _type == "heading" => { text, level, size, align },
  _type == "eyebrow" => { text, align, tone },
  _type == "richText" => { body, size, tone, align },
  _type == "buttonGroup" => { align, buttons[]${buttonProjection} },
  _type == "imageBlock" => { caption, aspect, radius, image${imageProjection} },
  _type == "video" => { url, aspect, mode, poster${imageProjection} },
  _type == "spacer" => { size },
  _type == "divider" => { tone },
  _type == "cardGrid" => {
    columns,
    cards[]{
      _key,
      _type,
      style,
      eyebrow,
      title,
      description,
      header,
      body,
      icon,
      border,
      align,
      image${imageProjection},
      button${buttonProjection}
    }
  }
`;

/**
 * Columns can sit inside a column, and a content wrapper can sit inside either.
 * Three levels covers a wrapper inside a column, including one wrapper nested in that wrapper.
 */
function contentProjection(depth: number): string {
  if (depth <= 0) return leafProjection;
  return `
    ${leafProjection},
    _type == "columns" => {
      layout,
      gap,
      verticalAlign,
      columns[]{
        _key,
        _type,
        content[]{ ${contentProjection(depth - 1)} }
      }
    },
    _type == "contentWrapper" => {
      align,
      paddingTop,
      paddingBottom,
      content[]{ ${contentProjection(depth - 1)} }
    }
  `;
}

export const pageBySlugQuery = defineQuery(`
  *[_type == "page" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    seo{
      title,
      description,
      ogImage${imageProjection}
    },
    "legacyBody": body,
    sections[]{
      _key,
      _type,
      _type == "section" => {
        variant,
        background,
        paddingTop,
        paddingBottom,
        spacing,
        align,
        borderTop,
        content[]{
          ${contentProjection(3)}
        }
      },
      _type == "logoMarquee" => {
        label,
        background,
        logos[]${imageProjection}
      },
      _type == "faq" => {
        heading,
        intro,
        closePrevious,
        openByDefault,
        background,
        items[]{ _key, question, answer }
      }
    }
  }
`);

export const siteSettingsQuery = defineQuery(`
  *[_id == "siteSettings"][0]{
    _id,
    siteTitle,
    footerTagline,
    footerCopyright,
    logo${imageProjection},
    nav[]{
      _key,
      label,
      link${linkProjection}
    }
  }
`);

export const PAGES_QUERY = defineQuery(
  `*[_type == "page" && defined(slug.current)] | order(_createdAt desc){ _id, title, "slug": slug.current }`,
);

export const PAGE_SLUGS_QUERY = defineQuery(
  `*[_type == "page" && defined(slug.current) && slug.current != "home"]{ "params": { "slug": slug.current } }`,
);
