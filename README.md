# Training

A minimal, cycle-based daily training tracker. It answers one question: what am I supposed to do today?

## Run

Requires Node.js 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build; the service worker (offline support) only runs here
npm run typecheck
```

Open the production build once while online; after that it works offline.

## Structure

- `src/scheduler.ts` - pure scheduling engine (no React, no IndexedDB), calendar-date arithmetic only
- `src/db.ts` - the only module that touches IndexedDB (`TrainingCompanionDB`: `settings`, `dailyRecords`)
- `src/useTraining.ts` - loads data, replays the schedule, persists changes, exposes actions
- `src/App.tsx`, `src/styles.css` - Today and History UI

## Behavior notes

- Resistance is due 3 calendar days after the last *completed* resistance session; cardio 7 days after the last completed cardio session. Resistance wins collisions, so cardio slides to the next recovery day.
- A past scheduled session that was never completed is stored as `missed`. It does not advance its cycle.
- History is replayed from the setup date, so correcting a past completion recalculates every later day. Notes and completed sessions are kept.
- `settings` also stores `baselineResistanceDate` / `baselineCardioDate` (the setup dates) so Undo can fall back to them.
- All data stays in the browser's IndexedDB. Clearing site data erases it.
