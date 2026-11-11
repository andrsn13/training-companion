// Orchestration: loads from IndexedDB, replays the 8-stage scheduler,
// manages persistence, and exposes high-level reactive state to the UI.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as db from './db';
import {
  buildTimeline,
  calculateMetrics,
  getHorizon,
  toISODate,
  type Activity,
  type DayPlan,
  type HorizonDay,
  type TrainingMetrics,
} from './scheduler';

const same = (a: db.DailyRecord, b?: db.DailyRecord) =>
  !!b &&
  a.activityType === b.activityType &&
  a.status === b.status &&
  a.completedAt === b.completedAt &&
  a.notes === b.notes &&
  JSON.stringify(a.readinessTags ?? []) === JSON.stringify(b.readinessTags ?? []);

export function useToday() {
  const [today, setToday] = useState(toISODate());
  useEffect(() => {
    const tick = () => setToday(toISODate());
    const id = window.setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}

export function useTraining() {
  const today = useToday();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<db.Settings | null>(null);
  const [records, setRecords] = useState<db.DailyRecord[]>([]);
  const [timeline, setTimeline] = useState<DayPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [horizon, setHorizon] = useState<HorizonDay[]>([]);
  const [metrics, setMetrics] = useState<TrainingMetrics>({
    completedCycles: 0,
    currentStageNumber: 1,
    adherencePercent: 100,
    totalWorkoutsCompleted: 0,
    currentStreakDays: 0,
  });

  const st = useRef({ settings: null as db.Settings | null, records: [] as db.DailyRecord[] });
  const loaded = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback(<T>(fn: () => Promise<T>): Promise<T> => {
    const run = () => fn();
    const res = queue.current.then(run, run);
    queue.current = res.then(() => {}, () => {});
    return res;
  }, []);

  const commit = (s: db.Settings | null, r: db.DailyRecord[]) => {
    st.current = { settings: s, records: r };
    setSettings(s);
    setRecords(r);
  };

  // Replays the 8-stage sequence over the active timeline, syncs changed records to IndexedDB, and updates state
  async function sync(s: db.Settings, input: db.DailyRecord[]) {
    const now = new Date().toISOString();
    const t = toISODate();
    const prev = new Map(input.map((r) => [r.date, r]));
    const stored = new Map(st.current.records.map((r) => [r.date, r]));

    // Anchor date: The active training prescription is calculated from the anchor date (defaulting to createdAt or today).
    // Historical sessions before anchorDate do not alter currentStage progression or today's prescription.
    const rawAnchor = s.anchorDate ?? toISODate(new Date(s.createdAt));
    const anchor = rawAnchor > t ? t : rawAnchor;

    const done = new Map<string, Activity>(
      input
        .filter((r) => r.status === 'completed' && !r.isHistorical)
        .map((r) => [r.date, r.activityType])
    );

    const startStage = s.startCycleStage ?? 0;
    const { days, refs } = buildTimeline(
      anchor,
      t,
      { resistance: s.baselineResistanceDate, cardio: s.baselineCardioDate },
      done,
      startStage
    );

    const changed: db.DailyRecord[] = [];
    const allRecordsMap = new Map<string, db.DailyRecord>(input.map((r) => [r.date, r]));

    days.forEach((p) => {
      const o = prev.get(p.date);
      if (o?.isHistorical) {
        allRecordsMap.set(p.date, o);
        return;
      }
      const nextRec: db.DailyRecord = {
        date: p.date,
        activityType: p.activityType,
        status: p.status,
        notes: o?.notes ?? '',
        stageIndex: p.stageIndex,
        cycleNumber: p.cycleNumber,
        readinessTags: o?.readinessTags ?? [],
        createdAt: o?.createdAt ?? now,
        updatedAt: o?.updatedAt ?? now,
        completedAt: p.status === 'completed' ? o?.completedAt ?? now : null,
      };
      if (!same(nextRec, stored.get(p.date))) {
        nextRec.updatedAt = now;
        changed.push(nextRec);
      }
      allRecordsMap.set(p.date, nextRec);
    });

    const out = Array.from(allRecordsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const moved = refs.resistance !== s.lastResistanceDate || refs.cardio !== s.lastCardioDate;
    const s2: db.Settings = moved
      ? { ...s, lastResistanceDate: refs.resistance, lastCardioDate: refs.cardio, updatedAt: now }
      : s;

    await db.commit(moved ? s2 : null, changed);
    commit(s2, out);
    setTimeline(days);

    const currentTodayPlan = days[days.length - 1] ?? null;
    setPlan(currentTodayPlan);

    if (currentTodayPlan) {
      const isDone = currentTodayPlan.status === 'completed';
      setHorizon(
        getHorizon(
          t,
          currentTodayPlan.stageIndex,
          currentTodayPlan.cycleNumber,
          isDone,
          currentTodayPlan.activityType,
          3
        )
      );
    }

    setMetrics(calculateMetrics(days));
  }

  useEffect(() => {
    enqueue(async () => {
      if (!loaded.current) {
        if (!db.supported()) {
          throw new Error(
            'Persistent storage is unavailable. This browser or private browsing mode has blocked IndexedDB, so Training cannot save anything.'
          );
        }
        const [s, r] = await Promise.all([db.getSettings(), db.getRecords()]);
        let activeSettings = s ?? null;
        if (!activeSettings) {
          const now = new Date().toISOString();
          const t = toISODate();
          activeSettings = {
            id: 'training-settings',
            lastResistanceDate: t,
            lastCardioDate: t,
            baselineResistanceDate: t,
            baselineCardioDate: t,
            startCycleStage: 1,
            anchorDate: t,
            createdAt: now,
            updatedAt: now,
          };
          await db.commit(activeSettings, []);
        }
        st.current = { settings: activeSettings, records: r };
        loaded.current = true;
      }
      const { settings: s, records: r } = st.current;
      if (s) await sync(s, r);
      else commit(null, r);
      setReady(true);
    }).catch((e) => {
      setError(
        e instanceof Error && e.message.startsWith('Persistent')
          ? e.message
          : 'Your data could not be saved or loaded. Reload the page; previously saved data is unaffected.'
      );
    });
  }, [today]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async <T>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await enqueue(fn);
    } finally {
      setBusy(false);
    }
  };

  const setup = (res: string, cardio: string, startStage = 0) =>
    act(async () => {
      const now = new Date().toISOString();
      const s: db.Settings = {
        id: 'training-settings',
        lastResistanceDate: res,
        lastCardioDate: cardio,
        baselineResistanceDate: res,
        baselineCardioDate: cardio,
        startCycleStage: startStage,
        createdAt: now,
        updatedAt: now,
      };
      await db.commit(s, []);
      await sync(s, st.current.records);
    });

  const setStatus = (date: string, completed: boolean) =>
    act(async () => {
      const { settings: s, records: r } = st.current;
      const rec = r.find((x) => x.date === date);
      if (!s || !rec) return;
      if (completed && (rec.activityType === 'rest' || date > toISODate() || rec.status === 'completed')) return;
      const now = new Date().toISOString();
      await sync(
        s,
        r.map((x) =>
          x.date !== date
            ? x
            : { ...x, status: completed ? 'completed' : 'scheduled', completedAt: completed ? now : null, updatedAt: now }
        )
      );
    });

  const setNotes = useCallback(
    (date: string, notes: string) =>
      enqueue(async () => {
        const rec = st.current.records.find((x) => x.date === date);
        if (!rec || rec.notes === notes) return;
        const next = { ...rec, notes, updatedAt: new Date().toISOString() };
        await db.commit(null, [next]);
        commit(st.current.settings, st.current.records.map((x) => (x.date === date ? next : x)));
      }),
    [enqueue]
  );

  const toggleReadinessTag = useCallback(
    (date: string, tag: string) =>
      act(async () => {
        const { settings: s, records: r } = st.current;
        const rec = r.find((x) => x.date === date);
        if (!s || !rec) return;
        const currentTags = rec.readinessTags ?? [];
        const nextTags = currentTags.includes(tag)
          ? currentTags.filter((t) => t !== tag)
          : [...currentTags, tag];

        const nextRec: db.DailyRecord = {
          ...rec,
          readinessTags: nextTags,
          updatedAt: new Date().toISOString(),
        };

        await db.commit(null, [nextRec]);
        commit(s, r.map((x) => (x.date === date ? nextRec : x)));
      }),
    [enqueue] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const updateStart = (res: string, cardio: string, startStage?: number) =>
    act(async () => {
      const now = new Date().toISOString();
      const s = st.current.settings;
      const todayIso = toISODate();
      const s2: db.Settings = s
        ? {
            ...s,
            baselineResistanceDate: res,
            baselineCardioDate: cardio,
            ...(startStage !== undefined ? { startCycleStage: startStage } : {}),
            anchorDate: todayIso,
            updatedAt: now,
          }
        : {
            id: 'training-settings',
            lastResistanceDate: res,
            lastCardioDate: cardio,
            baselineResistanceDate: res,
            baselineCardioDate: cardio,
            startCycleStage: startStage ?? 0,
            anchorDate: todayIso,
            createdAt: now,
            updatedAt: now,
          };
      await db.commit(s2, []);
      st.current = { ...st.current, settings: s2 };
      await sync(s2, st.current.records);
    });

  const logHistoricalSession = (activityType: Activity, date: string, notes: string) =>
    act(async () => {
      const now = new Date().toISOString();
      const todayIso = toISODate();
      let s = st.current.settings;
      if (!s) {
        s = {
          id: 'training-settings',
          lastResistanceDate: todayIso,
          lastCardioDate: todayIso,
          baselineResistanceDate: todayIso,
          baselineCardioDate: todayIso,
          startCycleStage: 1,
          anchorDate: todayIso,
          createdAt: now,
          updatedAt: now,
        };
        await db.commit(s, []);
        st.current.settings = s;
      }
      const r = st.current.records;

      if (!date) {
        throw new Error('Please select a session date.');
      }
      if (date > todayIso) {
        throw new Error('Cannot log sessions for future dates. Please select today or an earlier date.');
      }

      const existing = r.find((x) => x.date === date && x.status === 'completed');
      if (existing) {
        throw new Error('A session is already recorded for this date. Duplicate records are prevented.');
      }

      const newRec: db.DailyRecord = {
        date,
        activityType,
        status: 'completed',
        notes: notes.trim(),
        isHistorical: true,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      };

      const existingIdx = r.findIndex((x) => x.date === date);
      const updated = existingIdx >= 0
        ? r.map((x, i) => (i === existingIdx ? newRec : x))
        : [...r, newRec].sort((a, b) => a.date.localeCompare(b.date));

      await db.commit(null, [newRec]);
      st.current = { ...st.current, records: updated };
      setRecords(updated);
      await sync(s, updated);
    });

  return {
    today,
    ready,
    error,
    settings,
    records,
    timeline,
    busy,
    setup,
    complete: (d: string) => setStatus(d, true),
    undo: (d: string) => setStatus(d, false),
    setNotes,
    toggleReadinessTag,
    plan,
    horizon,
    metrics,
    updateStart,
    logHistoricalSession,
  };
}
