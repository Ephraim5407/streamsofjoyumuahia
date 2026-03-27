export default {
  getItem: async (key: string) => localStorage.getItem(key),
  setItem: async (key: string, value: string) =>
    localStorage.setItem(key, value),
  removeItem: async (key: string) => localStorage.removeItem(key),
  clear: async () => localStorage.clear(),
  multiRemove: async (keys: string[]) =>
    keys.forEach((key) => localStorage.removeItem(key)),
  multiGet: async (keys: string[]) =>
    keys.map((key) => [key, localStorage.getItem(key)]),
  multiSet: async (keyValuePairs: [string, string][]) =>
    keyValuePairs.forEach(([key, value]) => localStorage.setItem(key, value)),
};
