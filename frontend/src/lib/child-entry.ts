export function prepareChildEntry(childId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("active_child_id", childId);
  window.localStorage.setItem("child_entry_nonce", Math.random().toString(36).substring(2, 11));
}
