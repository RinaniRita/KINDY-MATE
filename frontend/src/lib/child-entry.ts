export function prepareChildEntry(childId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("active_child_id", childId);
  window.localStorage.setItem("child_entry_nonce", String(Date.now()));
}
