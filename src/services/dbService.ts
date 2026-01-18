// Simple IndexedDB wrapper for storing file metadata locally
import { StoredFile } from "../types";

const DB_NAME = "SuiCloudDB";
const DB_VERSION = 1;
const STORE_NAME = "files";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const getAllFilesFromDB = async (): Promise<StoredFile[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result || []) as StoredFile[];
      // Convert any plain-date strings back into Date objects
      items.forEach((i) => {
        if (i.uploadDate && !(i.uploadDate instanceof Date)) {
          i.uploadDate = new Date(i.uploadDate as unknown as string);
        }
        if (i.accessedAt && !(i.accessedAt instanceof Date)) {
          i.accessedAt = new Date(i.accessedAt as unknown as string);
        }
      });
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
};

export const addFileToDB = async (file: StoredFile): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ ...file });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const updateFileInDB = async (
  id: string,
  patch: Partial<StoredFile>,
): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as StoredFile | undefined;
      if (!existing) return reject(new Error("Not found"));
      const updated = { ...existing, ...patch };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
};

export const deleteFileFromDB = async (id: string): Promise<boolean> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      console.debug('[dbService] Deleting file id=', id);
      const req = store.delete(id);
      req.onsuccess = () => {
        console.debug('[dbService] delete onsuccess for id=', id);
        resolve(true);
      };
      req.onerror = () => {
        console.warn('[dbService] delete onerror for id=', id, req.error);
        reject(req.error);
      };
    } catch (err) {
      console.warn('[dbService] deleteFileFromDB exception', err);
      reject(err);
    }
  });
};

export const clearAllFilesInDB = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export default {
  getAllFilesFromDB,
  addFileToDB,
  updateFileInDB,
  deleteFileFromDB,
  clearAllFilesInDB,
};
