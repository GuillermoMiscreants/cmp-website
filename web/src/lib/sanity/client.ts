import { createClient, type SanityClient } from "@sanity/client";
import { SANITY_API_READ_TOKEN } from "astro:env/server";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
const studioUrl = import.meta.env.PUBLIC_SANITY_STUDIO_URL;
const apiVersion = "2026-09-22";

export function getReadToken() {
  const token = SANITY_API_READ_TOKEN || process.env.SANITY_API_READ_TOKEN;
  return token || undefined;
}

export function getClient({ preview }: { preview: boolean }): SanityClient {
  const token = preview ? getReadToken() : undefined;
  if (preview && !token) {
    throw new Error(
      "Missing SANITY_API_READ_TOKEN. Create a Viewer token in sanity.io/manage and add it to web/.env.",
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: !preview,
    token,
    perspective: preview ? "drafts" : "published",
    stega: {
      enabled: preview,
      studioUrl,
    },
  });
}
