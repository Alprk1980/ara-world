// Tiny IndexedDB key-value store for the game save. Falls back to memory if IndexedDB is unavailable.
const DB = 'ara-world';
const STORE = 'kv';
const memory = new Map<string, unknown>();

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
const dbp = open();

export async function load<T>(key: string, fallback: T): Promise<T> {
  const db = await dbp;
  if (!db) return (memory.get(key) as T) ?? fallback;
  return new Promise((resolve) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? fallback);
    req.onerror = () => resolve(fallback);
  });
}

export async function save(key: string, value: unknown): Promise<void> {
  const db = await dbp;
  if (!db) {
    memory.set(key, value);
    return;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(structuredClone(value), key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
