import { at, insert, remove, setIfMissing, type NodePatchList } from "@sanity/mutate";
import { getAtPath, parse } from "@sanity/mutate/path";
import { hideLoader, showLoader } from "./loader";

type Snapshot = unknown;

/** The slice of a Presentation document these actions use. */
export type ActionDocument = {
  getSnapshot: () => Promise<Snapshot>;
  patch: (build: (api: { getSnapshot: () => Promise<Snapshot> }) => NodePatchList | Promise<NodePatchList>) => unknown;
};

export type GetActionDocument = (documentId: string) => ActionDocument;

const flowTypes = [
  "eyebrow",
  "heading",
  "richText",
  "buttonGroup",
  "imageBlock",
  "video",
  "spacer",
  "divider",
  "cardGrid",
  "contentWrapper",
];

/** What each container accepts. Mirrors the block palettes: wrappers take no columns, only sections sit at the top. */
const accepts: Record<string, string[]> = {
  root: ["section", "faq", "logoMarquee"],
  section: [...flowTypes, "columns"],
  column: [...flowTypes, "columns"],
  contentWrapper: flowTypes,
  columns: ["column"],
  cardGrid: ["card"],
  buttonGroup: ["button"],
};

const childField: Record<string, string> = {
  section: "content",
  column: "content",
  contentWrapper: "content",
  columns: "columns",
  cardGrid: "cards",
  buttonGroup: "buttons",
};

type Copied = { type: string; value: Record<string, unknown> };
let clipboard: Copied | null = null;

export function clipboardType() {
  return clipboard?.type ?? null;
}

export function splitPath(path: string) {
  const match = /^(.*)\[_key=="([^"]+)"\]$/.exec(path);
  return match ? { arrayPath: match[1], key: match[2] } : null;
}

/** Where a paste would land relative to this layer, or null when the copied block doesn't fit. */
export type PastePlan = { arrayPath: string; afterKey: string | null };

export function planPaste(
  target: { path: string; type: string; childKeys: string[] },
  parentType: string | null,
): PastePlan | null {
  const type = clipboard?.type;
  if (!type) return null;
  const sibling = splitPath(target.path);
  if (sibling && accepts[parentType ?? "root"]?.includes(type)) {
    return { arrayPath: sibling.arrayPath, afterKey: sibling.key };
  }
  const field = childField[target.type];
  if (field && accepts[target.type]?.includes(type)) {
    return { arrayPath: `${target.path}.${field}`, afterKey: target.childKeys.at(-1) ?? null };
  }
  return null;
}

function freshKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(freshKeys);
  if (!value || typeof value !== "object") return value;
  const next: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(value)) {
    next[name] = name === "_key" && typeof entry === "string" ? crypto.randomUUID() : freshKeys(entry);
  }
  return next;
}

async function readBlock(doc: ActionDocument, path: string) {
  const snapshot = await doc.getSnapshot();
  const value = snapshot ? getAtPath(parse(path), snapshot) : null;
  if (!value || typeof value !== "object") throw new Error("Block is not ready.");
  return value as Record<string, unknown>;
}

function fail(label: string, cause: unknown) {
  hideLoader();
  console.error(label, cause);
}

export async function copyBlock(getDocument: GetActionDocument, documentId: string, path: string) {
  try {
    const value = await readBlock(getDocument(documentId), path);
    clipboard = { type: String(value._type ?? ""), value: structuredClone(value) };
    return true;
  } catch (cause) {
    console.error("Could not copy block.", cause);
    return false;
  }
}

export function deleteBlock(getDocument: GetActionDocument, documentId: string, path: string) {
  const parts = splitPath(path);
  if (!parts) return;
  showLoader("Deleting block…");
  try {
    void Promise.resolve(getDocument(documentId).patch(() => [at(parts.arrayPath, remove({ _key: parts.key }))])).catch(
      (cause: unknown) => fail("Could not delete block.", cause),
    );
  } catch (cause) {
    fail("Could not delete block.", cause);
  }
}

export async function cutBlock(getDocument: GetActionDocument, documentId: string, path: string) {
  if (await copyBlock(getDocument, documentId, path)) deleteBlock(getDocument, documentId, path);
}

export function pasteBlock(getDocument: GetActionDocument, documentId: string, plan: PastePlan) {
  if (!clipboard) return;
  const block = freshKeys(clipboard.value);
  showLoader("Pasting block…");
  try {
    const placed = plan.afterKey ? insert(block, "after", { _key: plan.afterKey }) : insert(block, "after", -1);
    void Promise.resolve(
      getDocument(documentId).patch(() => [at(plan.arrayPath, setIfMissing([])), at(plan.arrayPath, placed)]),
    ).catch((cause: unknown) => fail("Could not paste block.", cause));
  } catch (cause) {
    fail("Could not paste block.", cause);
  }
}
