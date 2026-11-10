import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTraining } from './useTraining';
import { parseISODate, toISODate, type Activity, type Status } from './scheduler';
import type { DailyRecord } from './db';

const TITLE: Record<Activity, string> = { resistance: 'Resistance Training', cardio: 'Cardio', rest: 'Rest Day' };
const DESC: Record<Activity, string> = {
  resistance: 'Time to train. Prioritize your resistance workout.',
  cardio: 'Cardiovascular training. Follow your planned cardio session.',
  rest: 'Recovery day. Let your body recover and adapt.',
};
const STATUS: Record<Status, string> = { completed: 'Completed', missed: 'Missed', scheduled: 'Scheduled' };
const COLOR: Record<Activity, string> = { resistance: 'var(--res)', cardio: 'var(--car)', rest: 'var(--rest)' };
const ICON: Record<Activity, string> = { resistance: 'dumbbell', cardio: 'run', rest: 'moon' };
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => parseISODate(iso).toLocaleDateString('en-US', o);

const PATHS: Record<string, ReactNode> = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />,
  run: <><circle cx="15" cy="4.5" r="1.8" /><path d="M5 12l3-3 4 1 3 3 3 1M9.5 10L7 17l-3 3M12 14l2 3 1 4" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  notes: <path d="M5 7h14M5 12h14M5 17h9" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
};
const Icon = ({ n, s = 24 }: { n: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[n]}</svg>
);

function Notes({ date, value, onSave }: { date: string; value: string; onSave: (d: string, t: string) => void }) {
  const [text, setText] = useState(value);
  const latest = useRef(value), dirty = useRef(false), timer = useRef<number>();
  const flush = () => { window.clearTimeout(timer.current); if (dirty.current) { dirty.current = false; onSave(date, latest.current); } };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="notes">
      <h2 id={`n-${date}`} className="section">Daily Notes</h2>
      <textarea aria-labelledby={`n-${date}`} placeholder="How are you feeling today?" rows={4} value={text}
        onChange={(e) => { setText(e.target.value); latest.current = e.target.value; dirty.current = true; window.clearTimeout(timer.current); timer.current = window.setTimeout(flush, 600); }}
        onBlur={flush} />
    </section>
  );
}

function Setup({ onDone, busy }: { onDone: (r: string, c: string) => void; busy: boolean }) {
  const t = toISODate();
  const [r, setR] = useState(t), [c, setC] = useState(t);
  return (
    <main className="app">
      <header className="head"><span className="mark">TRAINING</span><h1 className="large">Set up</h1></header>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); onDone(r, c); }}>
        <div className="group">
          <label className="field"><span>Last resistance</span><input type="date" required max={t} value={r} onChange={(e) => setR(e.target.value)} /></label>
          <label className="field"><span>Last cardio</span><input type="date" required max={t} value={c} onChange={(e) => setC(e.target.value)} /></label>
        </div>
        <p className="foot">Enter the date of your most recent completed session of each. No history yet? Leave both as today.</p>
        <button className="btn" type="submit" disabled={busy || !r || !c}>Continue</button>
      </form>
    </main>
  );
}

function Action({ rec, busy, t }: { rec: DailyRecord; busy: boolean; t: ReturnType<typeof useTraining> }) {
  if (rec.activityType === 'rest') return null;
  return (
    <div aria-live="polite">
      {rec.status === 'completed' ? (
        <div className="doneRow"><span className="done"><Icon n="check" s={20} /> Completed</span><button className="link" disabled={busy} onClick={() => t.undo(rec.date)}>Undo</button></div>
      ) : <button className="btn" disabled={busy} onClick={() => t.complete(rec.date)}>Mark as completed</button>}
    </div>
  );
}

function Today({ rec, busy, t }: { rec: DailyRecord; busy: boolean; t: ReturnType<typeof useTraining> }) {
  const a = rec.activityType;
  return (
    <main className="app">
      <header className="head"><span className="mark">TRAINING</span><h1 className="large">{fmt(rec.date, { weekday: 'long', month: 'long', day: 'numeric' })}</h1></header>
      <section className="hero" style={{ '--c': COLOR[a] } as CSSProperties} aria-labelledby="act">
        <div className="hero-top">
          <span className="tile"><Icon n={ICON[a]} s={24} /></span>
          <span className={`tag s-${a === 'rest' ? 'rest' : rec.status}`}>{a === 'rest' ? 'Rest day' : STATUS[rec.status]}</span>
        </div>
        <div><h2 id="act" className="title">{TITLE[a]}</h2><p className="desc">{DESC[a]}</p></div>
        <Action rec={rec} busy={busy} t={t} />
      </section>
      <Notes key={rec.date} date={rec.date} value={rec.notes} onSave={t.setNotes} />
    </main>
  );
}

function History({ records, busy, t }: { records: DailyRecord[]; busy: boolean; t: ReturnType<typeof useTraining> }) {
  const [sel, setSel] = useState<string | null>(null);
  const rec = records.find((r) => r.date === sel);
  if (rec) {
    const a = rec.activityType;
    return (
      <main className="app">
        <button className="link back" onClick={() => setSel(null)}><Icon n="back" s={20} /> History</button>
        <header className="head"><h1 className="large">{fmt(rec.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h1></header>
        <div className="stack">
          <dl className="group" style={{ '--c': COLOR[a] } as CSSProperties}>
            <div className="field"><dt>Activity</dt><dd>{TITLE[a]}</dd></div>
            <div className="field"><dt>Status</dt><dd><span className={`tag s-${a === 'rest' ? 'rest' : rec.status}`}>{a === 'rest' ? 'Rest day' : STATUS[rec.status]}</span></dd></div>
          </dl>
          {a !== 'rest' && (rec.status === 'completed'
            ? <button className="btn secondary" disabled={busy} onClick={() => t.undo(rec.date)}>Mark as not completed</button>
            : <button className="btn" disabled={busy} onClick={() => t.complete(rec.date)}>Mark as completed</button>)}
        </div>
        <Notes key={rec.date} date={rec.date} value={rec.notes} onSave={t.setNotes} />
      </main>
    );
  }
  const list = [...records].reverse();
  return (
    <main className="app">
      <header className="head"><h1 className="large">History</h1></header>
      {list.length === 0 ? (
        <div className="empty"><h2 className="section">No history yet.</h2><p className="muted">Your completed sessions and daily activity records will appear here.</p></div>
      ) : (
        <ul className="group list">
          {list.map((r) => (
            <li key={r.date}>
              <button className="item" style={{ '--c': COLOR[r.activityType] } as CSSProperties} onClick={() => setSel(r.date)}>
                <span className="tile sm"><Icon n={ICON[r.activityType]} s={18} /></span>
                <span className="grow">
                  <span className="date">{fmt(r.date, { month: 'long', day: 'numeric' })}</span>
                  <span className="meta">{r.activityType === 'rest' ? 'Rest Day' : `${TITLE[r.activityType]} · ${STATUS[r.status]}`}</span>
                </span>
                {r.notes.trim() && <span className="trail" role="img" aria-label="Has notes"><Icon n="notes" s={16} /></span>}
                <span className="trail chev"><Icon n="chevron" s={14} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function App() {
  const t = useTraining();
  const [tab, setTab] = useState<'today' | 'history'>('today');
  if (t.error) return <main className="app"><div className="card empty"><h1 className="section">Storage problem</h1><p className="muted">{t.error}</p></div></main>;
  if (!t.ready) return null;
  if (!t.settings) return <Setup onDone={t.setup} busy={t.busy} />;
  const todayRec = t.records.find((r) => r.date === t.today);
  return (
    <>
      {tab === 'today' ? (todayRec ? <Today rec={todayRec} busy={t.busy} t={t} /> : null) : <History records={t.records} busy={t.busy} t={t} />}
      <nav className="tabs" aria-label="Primary">
        <div>
          {(['today', 'history'] as const).map((k) => (
            <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
              <Icon n={k === 'today' ? 'sun' : 'history'} s={24} /><span>{k === 'today' ? 'Today' : 'History'}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
