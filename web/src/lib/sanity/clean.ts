import { stegaClean } from "@sanity/client/stega";

export function clean(value: string | null | undefined) {
  return stegaClean(value ?? "");
}

export function pick(map: Record<string, string>, value: string | null | undefined, fallback: string) {
  const key = clean(value);
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : map[fallback];
}
