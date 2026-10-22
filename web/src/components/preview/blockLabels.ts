import { stegaClean } from "@sanity/client/stega";
import { layerTree, pageDocumentId, type LayerDocument, type LayerNode } from "./layers";

type GetDocument = (documentId: string) => LayerDocument;

let source: GetDocument | null = null;
let labels = new Map<string, string>();
let generation = 0;
const listeners = new Set<() => void>();

function collect(nodes: LayerNode[], into: Map<string, string>) {
  for (const node of nodes) {
    into.set(stegaClean(node.path), node.label);
    collect(node.children, into);
  }
}

/** Names the green hover tag after the block: "Heading — Hello World", "Button — Learn More". */
export function blockLabelForPath(path: string) {
  return labels.get(stegaClean(path)) ?? null;
}

/** Runs after the label table changes, so a tag drawn before the snapshot arrived can rename itself. */
export function onBlockLabelsChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLabelSource(getDocument: GetDocument) {
  if (source === getDocument) return;
  source = getDocument;
  void refreshBlockLabels();
}

export async function refreshBlockLabels() {
  const getDocument = source;
  const id = pageDocumentId();
  if (!getDocument || !id) return;
  const current = ++generation;
  try {
    const snapshot = await getDocument(id).getSnapshot();
    if (current !== generation) return;
    const next = new Map<string, string>();
    if (snapshot) collect(layerTree(snapshot), next);
    labels = next;
    listeners.forEach((listener) => listener());
  } catch (cause) {
    console.error("Could not read block names.", cause);
  }
}
