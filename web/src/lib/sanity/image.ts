import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";

const builder = createImageUrlBuilder({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
});

export function urlFor(source: SanityImageSource | { asset?: { _ref?: string } | null }) {
  return builder.image(source as SanityImageSource);
}
