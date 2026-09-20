/**
 * src/lib/offline-queue.ts
 *
 * Lightweight client-side IndexedDB buffer manager.
 * Caches voice intents and telemetry events when network drops, preserving original capturedAt timestamps.
 */

export interface BufferedEvent {
  type: string;
  rawPayload?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  frameTimestamp?: Date;
  wellId?: string;
  clientTimestamp?: Date;
  capturedAt: Date;
  experimentId?: string;
}

const DB_NAME = 'KochOfflineQueueDB';
const STORE_NAME = 'events';
const DB_VERSION = 1;

/**
 * Initializes the IndexedDB database.
 */
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if we are running in a browser environment
    if (typeof window === 'undefined' || !window.indexedDB) {
      // Return a mock DB for server/test environments
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// In-memory fallback for SSR/Testing
let memoryBuffer: BufferedEvent[] = [];

/**
 * Queues an event to IndexedDB, preserving the capturedAt timestamp.
 */
export async function queueEvent(event: Omit<BufferedEvent, 'capturedAt'> & { capturedAt?: Date }): Promise<void> {
  const bufferedEvent: BufferedEvent = {
    ...event,
    capturedAt: event.capturedAt ?? new Date(),
  };

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(bufferedEvent);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    // Fallback to memory
    memoryBuffer.push(bufferedEvent);
  }
}

/**
 * Retrieves all currently buffered events.
 */
export async function getBufferedEvents(): Promise<BufferedEvent[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return [...memoryBuffer];
  }
}

/**
 * Clears the offline buffer (typically called after successful flush).
 */
export async function clearBuffer(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    memoryBuffer = [];
  }
}
