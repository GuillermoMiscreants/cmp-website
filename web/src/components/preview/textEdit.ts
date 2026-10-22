import { stegaClean } from "@sanity/client/stega";
import { decodeSanityNodeData, type SanityStegaNode } from "@sanity/visual-editing-csm";
import { vercelStegaDecode } from "@vercel/stega";
import { recentlyDragged } from "./reorder";

type Field = {
  element: HTMLElement;
  id: string;
  path: string;
  /** The text node as rendered, with the invisible source-map characters. */
  encoded: string;
  text: string;
  /** The element's markup before editing, so a cancel puts back the line breaks too. */
  html: string;
  /** Line breaks in the source text render as <br>, so the field holds more than one line. */
  multiline: boolean;
};

type Change = { id: string; path: string; before: string; after: string };

type Write = (id: string, path: string, value: string) => Promise<void>;

let installed = false;
let session: Field | null = null;
let write: Write | null = null;
const undoStack: Change[] = [];
const redoStack: Change[] = [];

/**
 * A leaf element whose children are stega-encoded text, with <br> for line breaks. Stega is how
 * Sanity says which field produced the text, so the same marker tells us where
 * a typed value goes. Anything with child elements or mixed text is left alone.
 */
function fieldOf(element: Element): Field | null {
  if (!(element instanceof HTMLElement) || element.childNodes.length === 0) return null;
  let encoded = "";
  let multiline = false;
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) encoded += node.textContent ?? "";
    else if (node instanceof HTMLBRElement) {
      encoded += "\n";
      multiline = true;
    } else return null;
  }
  if (!encoded) return null;
  const text = stegaClean(encoded);
  if (text === encoded) return null;
  const decoded = vercelStegaDecode<SanityStegaNode>(encoded);
  const target = decoded ? decodeSanityNodeData(decoded) : undefined;
  if (!target || !("id" in target) || !("path" in target)) return null;
  if (typeof target.id !== "string" || typeof target.path !== "string") return null;
  return {
    element,
    id: stegaClean(target.id),
    path: stegaClean(target.path),
    encoded,
    text,
    html: element.innerHTML,
    // Rich text paragraphs can always take line breaks, even before they have one.
    multiline: multiline || /\.children\[[^\]]*\]\.text$/.test(stegaClean(target.path)),
  };
}

/** The page element under the pointer, looking through the Presentation overlay that sits on top of it. */
function fieldAtPoint(x: number, y: number) {
  for (const element of document.elementsFromPoint(x, y)) {
    if (element.closest("sanity-visual-editing, [data-insert-anchor]")) continue;
    return fieldOf(element);
  }
  return null;
}

function placeCaret(element: HTMLElement, x: number, y: number) {
  const selection = window.getSelection();
  if (!selection) return;
  let range: Range | null = null;
  const position = document.caretPositionFromPoint?.(x, y);
  if (position && element.contains(position.offsetNode)) {
    range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
  } else {
    const fallback = document.caretRangeFromPoint?.(x, y) ?? null;
    if (fallback && element.contains(fallback.startContainer)) range = fallback;
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function onKeyDown(event: KeyboardEvent) {
  // Keep page scripts (menus, sliders, the delete shortcut) out of the typing.
  event.stopPropagation();
  const multiline = Boolean(session?.multiline);
  if (event.key === "Enter") {
    event.preventDefault();
    // In a multi-line field Enter starts a new line. Cmd/Ctrl+Enter finishes, like Escape.
    if (multiline && !(event.metaKey || event.ctrlKey)) document.execCommand("insertText", false, "\n");
    else finish(true);
  } else if (event.key === "Escape") {
    event.preventDefault();
    // Typing several lines is work worth keeping, so Escape saves there. A single line still cancels.
    finish(multiline);
  } else if (event.key === " " && session?.element.closest("button")) {
    // A space inside a button presses it instead of typing.
    event.preventDefault();
    document.execCommand("insertText", false, " ");
  }
}

function onKeyUp(event: KeyboardEvent) {
  event.stopPropagation();
  if (event.key === " ") event.preventDefault();
}

function onBlur() {
  finish(true);
}

function begin(field: Field, x: number, y: number) {
  const { element } = field;
  session = field;
  document.documentElement.setAttribute("data-text-editing", "");
  element.setAttribute("data-text-editing-target", "");
  element.closest("a")?.setAttribute("draggable", "false");
  // Type into clean text. The encoded copy comes back on cancel or after the page refreshes.
  element.textContent = field.text;
  if (field.multiline) element.style.whiteSpace = "pre-wrap";
  element.setAttribute("contenteditable", "plaintext-only");
  if (element.contentEditable !== "plaintext-only") element.setAttribute("contenteditable", "true");
  element.addEventListener("keydown", onKeyDown);
  element.addEventListener("keyup", onKeyUp);
  element.addEventListener("blur", onBlur);
  element.focus({ preventScroll: true });
  placeCaret(element, x, y);
}

/** The typed text with line breaks kept. Chrome may store a break as <br> or a <div> instead of "\n". */
function readText(element: HTMLElement) {
  let out = "";
  const walk = (node: Node, top: boolean) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? "";
      else if (child instanceof HTMLBRElement) out += "\n";
      else if (child instanceof HTMLElement) {
        if (!top || out === "" || out.endsWith("\n")) walk(child, false);
        else {
          out += "\n";
          walk(child, false);
        }
      }
    }
  };
  walk(element, true);
  return out;
}

/** Puts text back as rendered markup, with <br> for each line break. */
function showText(element: HTMLElement, text: string) {
  element.replaceChildren();
  text.split("\n").forEach((line, index) => {
    if (index > 0) element.append(document.createElement("br"));
    if (line) element.append(document.createTextNode(line));
  });
}

function finish(commit: boolean) {
  const current = session;
  if (!current) return;
  session = null;
  const { element } = current;
  element.removeEventListener("keydown", onKeyDown);
  element.removeEventListener("keyup", onKeyUp);
  element.removeEventListener("blur", onBlur);
  const typed = current.multiline ? readText(element) : (element.textContent ?? "");
  const next = current.multiline ? typed.replace(/\r/g, "") : typed.replace(/[\r\n]+/g, " ");
  if (current.multiline) element.style.removeProperty("white-space");
  element.removeAttribute("contenteditable");
  element.removeAttribute("data-text-editing-target");
  element.closest("a")?.removeAttribute("draggable");
  document.documentElement.removeAttribute("data-text-editing");
  if (document.activeElement === element) element.blur();
  window.getSelection()?.removeAllRanges();

  if (!commit || next === current.text || !write) {
    element.innerHTML = current.html;
    return;
  }
  showText(element, next);
  const change: Change = { id: current.id, path: current.path, before: current.text, after: next };
  void commitChange(change).catch((cause: unknown) => {
    console.error("Could not save the text.", cause);
    element.innerHTML = current.html;
  });
}

async function commitChange(change: Change) {
  if (!write) throw new Error("Document is not ready.");
  await write(change.id, change.path, change.after);
  undoStack.push(change);
  redoStack.length = 0;
}

/** Cmd/Ctrl+Z outside a field undoes the last text edit. While typing, the browser undoes keystrokes itself. */
function onUndoKey(event: KeyboardEvent) {
  if (session || !write) return;
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "z") return;
  const redo = event.shiftKey;
  const change = (redo ? redoStack : undoStack).pop();
  if (!change) return;
  event.preventDefault();
  (redo ? undoStack : redoStack).push(change);
  void write(change.id, change.path, redo ? change.after : change.before).catch((cause: unknown) => {
    console.error("Could not undo the text edit.", cause);
  });
}

/**
 * Presentation's overlay listens to the pointer to start its own drag and open fields, and it can
 * cancel the default that moves the caret. While typing, keep pointer events on the edited text
 * away from it, and from the page's drag handling, without cancelling them. The browser then
 * places the caret or selects text where the user clicked.
 */
function onPointer(event: Event) {
  if (session && event.target instanceof Node && session.element.contains(event.target)) {
    event.stopImmediatePropagation();
  }
}

function onClick(event: MouseEvent) {
  // Placing the caret, double-click to select a word, shift-click to extend: each is a click on the
  // text being edited. Left alone, Presentation sees it and opens the field in the Studio panel.
  // The browser still gets the click, so the caret and selection work.
  if (session && event.target instanceof Node && session.element.contains(event.target)) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }
}

/**
 * A single click is left to Presentation, which opens the element's settings in the Studio panel.
 * Double-click is what starts typing on the page.
 */
function onDoubleClick(event: MouseEvent) {
  if (event.button !== 0 || event.defaultPrevented) return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  if (window.parent === window || session || recentlyDragged()) return;
  if (document.documentElement.hasAttribute("data-reordering")) return;
  // The insert plus floats over the page; a click on it belongs to the plus, not the text beneath.
  if (event.target instanceof Element && event.target.closest("[data-insert-anchor], [data-block-tab]")) return;
  const field = fieldAtPoint(event.clientX, event.clientY);
  if (!field) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  begin(field, event.clientX, event.clientY);
}

/** Double-click a heading, button label, or other text to type into it on the page. Saves on Enter or when focus leaves. */
export function installTextEdit(save: Write) {
  write = save;
  if (installed) return;
  installed = true;
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "dragstart", "selectstart"]) {
    window.addEventListener(type, onPointer, true);
  }
  window.addEventListener("click", onClick, true);
  window.addEventListener("dblclick", onDoubleClick, true);
  window.addEventListener("keydown", onUndoKey);
}
