type ChildEntryCallback = (childId: string) => void;

const listeners = new Set<ChildEntryCallback>();

/**
 * Triggers a child entry request event.
 * Used by sibling components to request opening the child entry modal.
 */
export function triggerChildEntry(childId: string): void {
  listeners.forEach((callback) => {
    try {
      callback(childId);
    } catch (error) {
      console.error("Error in triggerChildEntry listener:", error);
    }
  });
}

/**
 * Subscribes to child entry request events.
 * Returns a cleanup function to unsubscribe.
 */
export function onChildEntryRequest(callback: ChildEntryCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
