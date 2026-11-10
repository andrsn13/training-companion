// Orchestration: loads from IndexedDB, replays the scheduler, persists, and exposes actions to the UI.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from './db';
import { buildTimeline, toISODate, type Activity } from './scheduler';

const same = (a: db.DailyRecord, b?: db.DailyRecord) =>
  !!b && a.activityType === b.activityType && a.status === b.status && a.completedAt === b.completedAt && a.notes === b.notes;

export function useToday() {
  const [today, setToday] = useState(toISODate());
  useEffect(() => {
    const tick = () => setToday(toISODate());
    const id = window.setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);
  return today;
}

export function useTraining() {
  const today = useToday();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<db.Settings | null>(null);
  const [records, setRecords] = useState<db.DailyRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const st = useRef({ settings: null as db.Settings | null, records: [] as db.DailyRecord[] });
  const loaded = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((fn: () => Promise<void>) => {
    queue.current = queue.current.then(fn).catch((e) => {
      setError(e instanceof Error && e.message.startsWith('Persistent') ? e.message
        : 'Your data could not be saved or loaded. Reload the page; previously saved data is unaffected.');
    });
    return queue.current;
  }, []);

  const commit = (s: db.Settings | null, r: db.DailyRecord[]) => {
    st.current = { settings: s, records: r }; setSettings(s); setRecords(r);
  };

  // Replays the schedule over `input`, persists whatever differs from what is stored, then updates state.
  async function sync(s: db.Settings, input: db.DailyRecord[]) {
    const now = new Date().toISOString();
    const t = toISODate();
    const prev = new Map(input.map((r) => [r.date, r]));
    const stored = new Map(st.current.records.map((r) => [r.date, r]));
    const first = [toISODate(new Date(s.createdAt)), ...input.map((r) => r.date)].sort()[0];
    const done = new Map<string, Activity>(input.filter((r) => r.status === 'completed').map((r) => [r.date, r.activityType]));
    const { days, refs } = buildTimeline(first, t, { resistance: s.baselineResistanceDate, cardio: s.baselineCardioDate }, done);
    const changed: db.DailyRecord[] = [];
    const out = days.map((p) => {
      const o = prev.get(p.date);
      const next: db.DailyRecord = {
        date: p.date, activityType: p.activityType, status: p.status, notes: o?.notes ?? '',
        createdAt: o?.createdAt ?? now, updatedAt: o?.updatedAt ?? now,
        completedAt: p.status === 'completed' ? o?.completedAt ?? now : null,
      };
      if (!same(next, stored.get(p.date))) { next.updatedAt = now; changed.push(next); }
      return next;
    });
    const moved = refs.resistance !== s.lastResistanceDate || refs.cardio !== s.lastCardioDate;
    const s2 = moved ? { ...s, lastResistanceDate: refs.resistance, lastCardioDate: refs.cardio, updatedAt: now } : s;
    await db.commit(moved ? s2 : null, changed);
    commit(s2, out);
  }

  useEffect(() => {
    enqueue(async () => {
      if (!loaded.current) {
        if (!db.supported()) throw new Error('Persistent storage is unavailable. This browser or mode (for example private browsing) has blocked IndexedDB, so Training cannot save anything.');
        const [s, r] = await Promise.all([db.getSettings(), db.getRecords()]);
        st.current = { settings: s ?? null, records: r };
        loaded.current = true;
      }
      const { settings: s, records: r } = st.current;
      if (s) await sync(s, r); else commit(null, r);
      setReady(true);
    }).catch(() => {});
  }, [today]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<void>) => { setBusy(true); await enqueue(fn); setBusy(false); };

  const setup = (res: string, cardio: string) => act(async () => {
    const now = new Date().toISOString();
    const s: db.Settings = { id: 'training-settings', lastResistanceDate: res, lastCardioDate: cardio, baselineResistanceDate: res, baselineCardioDate: cardio, createdAt: now, updatedAt: now };
    await db.commit(s, []);
    await sync(s, st.current.records);
  });

  const setStatus = (date: string, completed: boolean) => act(async () => {
    const { settings: s, records: r } = st.current;
    const rec = r.find((x) => x.date === date);
    if (!s || !rec) return;
    if (completed && (rec.activityType === 'rest' || date > toISODate() || rec.status === 'completed')) return; // guards
    const now = new Date().toISOString();
    await sync(s, r.map((x) => x.date !== date ? x : { ...x, status: completed ? 'completed' : 'scheduled', completedAt: completed ? now : null, updatedAt: now }));
  });

  const setNotes = useCallback((date: string, notes: string) => enqueue(async () => {
    const rec = st.current.records.find((x) => x.date === date);
    if (!rec || rec.notes === notes) return;
    const next = { ...rec, notes, updatedAt: new Date().toISOString() };
    await db.commit(null, [next]);
    commit(st.current.settings, st.current.records.map((x) => (x.date === date ? next : x)));
  }), [enqueue]);

  return { today, ready, error, settings, records, busy, setup, complete: (d: string) => setStatus(d, true), undo: (d: string) => setStatus(d, false), setNotes };
}
