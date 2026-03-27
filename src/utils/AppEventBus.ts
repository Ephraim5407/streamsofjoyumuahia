// Simple event emitter for role changes & bootstrap (matches Mobile AppEventBus)
export const AppEventBus = {
  listeners: new Set<(event: string, payload?: any) => void>(),
  emit(event: string, payload?: any) {
    this.listeners.forEach((l) => {
      try {
        l(event, payload);
      } catch (err) {
        console.error("AppEventBus Emit Error:", err);
      }
    });
  },
  on(cb: (event: string, payload?: any) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  },
};
