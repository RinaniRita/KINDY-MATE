const OPEN_CHILD_ENTRY_EVENT = "kindy-mate:open-child-entry";

export function triggerChildEntry(childId?: string) {
  if (typeof window === "undefined") return;
  if (childId) {
    window.localStorage.setItem("active_child_id", childId);
  }
  window.dispatchEvent(
    new CustomEvent(OPEN_CHILD_ENTRY_EVENT, {
      detail: { childId: childId ?? "" },
    }),
  );
}

export function onChildEntryRequest(listener: (childId?: string) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ childId?: string }>;
    listener(customEvent.detail?.childId);
  };

  window.addEventListener(OPEN_CHILD_ENTRY_EVENT, handler as EventListener);
  return () => window.removeEventListener(OPEN_CHILD_ENTRY_EVENT, handler as EventListener);
}
