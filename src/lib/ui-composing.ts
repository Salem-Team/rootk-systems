const COMPOSING_OVERLAY_SELECTOR = [
  '[data-ui-overlay][data-state="open"]',
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  '[role="menu"][data-state="open"]',
].join(",");

function isEditableTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** True when a modal/sheet/menu is open or the user is typing in a field. */
export function isUiComposing(): boolean {
  if (typeof document === "undefined") return false;
  if (document.querySelector(COMPOSING_OVERLAY_SELECTOR)) return true;
  return isEditableTarget(document.activeElement);
}
