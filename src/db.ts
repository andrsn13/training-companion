// Data-access layer: the only module that touches IndexedDB.
import type { Activity, Status } from './scheduler';

export interface Settings {
  id: 'training-settings';
  lastResistanceDate: string; lastCardioDate: string;
  baselineResistanceDate: string; baselineCardioDate: string; // setup dates; used when no completed session remains
  createdAt: string; updatedAt: string;
}
export interface DailyRecord {
  date: string; activityType: Activity; status: Status; notes: string;
  createdAt: string; updatedAt: string; completedAt: string | null;
}

let conn: Promise<IDBDatabase> | null = null;
export const supported = () => typeof indexedDB !== 'undefined';

function open(): Promise<IDBDatabase> {
  conn ??= new Promise((res, rej) => {
    const q = indexedDB.open('TrainingCompanionDB', 1);
    q.onupgradeneeded = () => {
      const d = q.result;
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('dailyRecords')) {
        d.createObjectStore('dailyRecords', { keyPath: 'date' }).createIndex('date', 'date', { unique: true });
      }
    };
    q.onsuccess = () => { q.result.onversionchange = () => q.result.close(); res(q.result); };
    q.onerror = () => { conn = null; rej(q.error); };
  });
  return conn;
}
const req = <T,>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export async function getSettings() {
  const d = await open();
  return (await req(d.transaction('settings').objectStore('settings').get('training-settings'))) as Settings | undefined;
}
export async function getRecords() {
  const d = await open();
  return (await req(d.transaction('dailyRecords').objectStore('dailyRecords').getAll())) as DailyRecord[];
}
/** Writes settings and records in one transaction, so a refresh mid-save leaves earlier data intact. */
export async function commit(settings: Settings | null, records: DailyRecord[]) {
  const d = await open();
  return new Promise<void>((res, rej) => {
    const t = d.transaction(['settings', 'dailyRecords'], 'readwrite');
    if (settings) t.objectStore('settings').put(settings);
    const s = t.objectStore('dailyRecords');
    records.forEach((r) => s.put(r));
    t.oncomplete = () => res();
    t.onerror = t.onabort = () => rej(t.error);
  });
}
