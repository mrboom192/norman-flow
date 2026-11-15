// IndexedDB avoids localStorage's small quota for complete collision workbooks.
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return (connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("norman-flow", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof indexedDB === "undefined") return null;
    const db = await database();
    return new Promise((resolve, reject) => {
      const request = db.transaction("state").objectStore("state").get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("state", "readwrite");
      transaction.objectStore("state").put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  },
  async removeItem(key: string): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("state", "readwrite");
      transaction.objectStore("state").delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
};
export default storage;
