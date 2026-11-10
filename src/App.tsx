import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTraining } from './useTraining';
import { addDays, daysBetween, parseISODate, toISODate, type Activity } from './scheduler';
import { quoteFor, type QuoteKey } from './quotes';
import type { DailyRecord } from './db';

type T = ReturnType<typeof useTraining>;
const TITLE: Record<Activity, string> = { resistance: 'Resistance Training', cardio: 'Cardio', rest: 'Rest Day' };
const SHORT: Record<Activity, string> = { resistance: 'Resistance', cardio: 'Cardio', rest: 'Rest' };
const ICON: Record<Activity, string> = { resistance: 'dumbbell', cardio: 'run', rest: 'moon' };
const tone = (a: Activity) => ({ '--c': `var(--${a === 'resistance' ? 'res' : a === 'cardio' ? 'car' : 'rest'})`, '--ct': `var(--${a === 'resistance' ? 'res' : a === 'cardio' ? 'car' : 'rest'}-t)` }) as CSSProperties;
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => parseISODate(iso).toLocaleDateString('en-US', o);
const rel = (n: number) => (n === 1 ? 'tomorrow' : `in ${n} days`);
const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

const PATHS: Record<string, ReactNode> = {
  cal: <><rect x="3.5" y="5" width="17" height="15.5" rx="3.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><rect x="10" y="13" width="4" height="4" rx="1" fill="currentColor" stroke="none" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  dumbbell: <><rect x="4" y="7" width="3" height="10" rx="1.2" /><rect x="17" y="7" width="3" height="10" rx="1.2" /><path d="M7 12h10M2 9.5v5M22 9.5v5" /></>,
  run: <><circle cx="15.2" cy="4.2" r="1.7" /><path d="M13.2 8.2l-1.7 5.3M13 8.8l3 1.9 1.6-2M13 8.8L10 9.8 8 12.3M11.5 13.5l3 2.1-1 4.4M11.5 13.5l-2 3-4 1.3" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkc: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.2v.1" /></>,
  ring: <circle cx="12" cy="12" r="8.5" />,
  dash: <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />,
  notes: <path d="M5 7h14M5 12h14M5 17h9" />,
  back: <path d="M15 5l-7 7 7 7" />,
};
const Icon = ({ n, s = 24, f = false, w = 1.8 }: { n: string; s?: number; f?: boolean; w?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={f ? 'currentColor' : 'none'} fillOpacity={f ? 0.2 : 0} stroke="currentColor" strokeWidth={f ? w + 0.4 : w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[n]}</svg>
);

function Notes({ date, value, onSave }: { date: string; value: string; onSave: (d: string, t: string) => Promise<void> }) {
  const [text, setText] = useState(value), [cue, setCue] = useState('');
  const latest = useRef(value), dirty = useRef(false), timer = useRef<number>(), hide = useRef<number>();
  const flush = async () => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false; setCue('Saving…');
    await onSave(date, latest.current);
    setCue('Saved'); window.clearTimeout(hide.current); hide.current = window.setTimeout(() => setCue(''), 1600);
  };
  useEffect(() => () => { flush(); window.clearTimeout(hide.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="notes">
      <div className="sechead"><h2 id={`n-${date}`} className="section">Daily Notes</h2><span className="cue" role="status">{cue}</span></div>
      <textarea aria-labelledby={`n-${date}`} placeholder="How are you feeling today?" rows={4} value={text}
        onChange={(e) => { setText(e.target.value); latest.current = e.target.value; dirty.current = true; window.clearTimeout(timer.current); timer.current = window.setTimeout(flush, 600); }}
        onBlur={flush} />
    </section>
  );
}

type Opt = { label: string; iso: string };
function Pick({ label, value, onChange, options, max }: { label: string; value: string; onChange: (v: string) => void; options: Opt[]; max: string }) {
  const id = useId(), custom = !options.some((o) => o.iso === value);
  const row = (text: string, on: boolean, click: () => void) => (
    <li key={text}><button type="button" role="radio" aria-checked={on} className="item" onClick={click}><span className="grow">{text}</span>{on && <span className="tick"><Icon n="check" s={20} w={2.4} /></span>}</button></li>
  );
  return (
    <section className="stack tight" role="radiogroup" aria-labelledby={id}>
      <h2 id={id} className="section">{label}</h2>
      <ul className="group list radio">
        {options.map((o) => row(o.label, o.iso === value, () => onChange(o.iso)))}
        {row('Earlier…', custom, () => onChange(addDays(max, -4)))}
        {custom && <li className="field"><span>Date</span><input type="date" required max={max} value={value} aria-label={`${label} date`} onChange={(e) => e.target.value && onChange(e.target.value)} /></li>}
      </ul>
    </section>
  );
}

function Setup({ initial, onDone, onCancel, busy }: { initial?: { r: string; c: string }; onDone: (r: string, c: string) => void; onCancel?: () => void; busy: boolean }) {
  const t = toISODate();
  const [r, setR] = useState(initial?.r ?? addDays(t, -3)), [c, setC] = useState(initial?.c ?? t);
  const ro: Opt[] = [{ label: 'Not yet', iso: addDays(t, -3) }, { label: 'Today', iso: t }, { label: 'Yesterday', iso: addDays(t, -1) }, { label: '2 days ago', iso: addDays(t, -2) }];
  const co: Opt[] = [{ label: 'Today or not yet', iso: t }, { label: 'Yesterday', iso: addDays(t, -1) }, { label: '3 days ago', iso: addDays(t, -3) }, { label: '5 days ago', iso: addDays(t, -5) }];
  return (
    <main className="app setup">
      {onCancel && <button className="link back" onClick={onCancel}><Icon n="back" s={20} /> History</button>}
      <header className="head">
        <h1 className="large">{initial ? 'Starting dates' : 'When did you last train?'}</h1>
        <p className="sub">Choose your most recent completed session of each type. Starting fresh? Keep the defaults.</p>
      </header>
      <form className="stack form" onSubmit={(e) => { e.preventDefault(); onDone(r, c); }}>
        <Pick label="Resistance" value={r} onChange={setR} options={ro} max={t} />
        <Pick label="Cardio" value={c} onChange={setC} options={co} max={t} />
        <div className="dock"><button className="btn" type="submit" disabled={busy}>{initial ? 'Save' : 'Show today'}</button></div>
      </form>
    </main>
  );
}

function overdueDays(records: DailyRecord[], rec: DailyRecord) {
  let i = records.findIndex((r) => r.date === rec.date) - 1, n = 0;
  while (i >= 0 && records[i].status === 'missed' && records[i].activityType === rec.activityType) { n++; i--; }
  return n;
}

function factFor(rec: DailyRecord, t: T): string {
  const a = rec.activityType, { plan, next } = t;
  const nx = next ? `${SHORT[next.activityType]} ${rel(daysBetween(rec.date, next.date))}` : '';
  if (rec.status === 'completed') return nx ? `Next: ${nx}` : '';
  if (!plan) return '';
  if (a === 'rest') return nx;
  if (a === 'cardio') return `Resistance returns ${rel(daysBetween(rec.date, plan.nextResistanceDate))}`;
  return plan.daysSinceLastCardio >= 7 ? 'Cardio follows on your next recovery day' : '';
}

const keyFor = (r: DailyRecord): QuoteKey => r.activityType === 'rest' ? 'rest' : r.status === 'completed' ? (r.activityType === 'resistance' ? 'resistanceDone' : 'cardioDone') : r.activityType;

function Quote({ k, date }: { k: QuoteKey; date: string }) {
  const q = quoteFor(k, date);
  return <blockquote className="quote"><p>{q.text}</p><footer>{q.author} · {q.work}</footer></blockquote>;
}

function Cycle({ pos, done }: { pos: number; done: boolean }) {
  return (
    <div className="cycle" role="img" aria-label={`Cycle day ${pos + 1} of 3`}>
      {[0, 1, 2].map((i) => <i key={i} className={`${i < pos || (i === pos && done) ? 'done' : ''} ${i === pos ? 'cur' : ''}`} />)}
    </div>
  );
}

function Today({ rec, t }: { rec: DailyRecord; t: T }) {
  const a = rec.activityType, done = rec.status === 'completed';
  const over = done ? 0 : overdueDays(t.records, rec);
  const key: QuoteKey = a === 'rest' ? 'rest' : done ? (a === 'resistance' ? 'resistanceDone' : 'cardioDone') : over ? 'overdue' : t.records.length === 1 ? 'firstDay' : a;
  const pos = a === 'resistance' ? 0 : Math.min(2, Math.max(1, t.plan?.daysSinceLastResistance ?? 1));
  const fact = factFor(rec, t);
  return (
    <main className={`app today ${a}`}>
      <header className="head"><h1 className="eyebrow">{fmt(rec.date, { weekday: 'long', month: 'long', day: 'numeric' })}</h1></header>
      <section className="stage" style={tone(a)} aria-labelledby="act">
        <div className="mark">
          <span className="glyphbig"><Icon n={ICON[a]} s={44} w={1.6} /></span>
          <span aria-live="polite">
            {done && <span className="tag s-completed"><Icon n="check" s={14} w={2.4} /> Completed</span>}
            {over > 0 && <span className="tag s-missed">Overdue · {plural(over)}</span>}
          </span>
        </div>
        <div className="lead">
          <h2 id="act" className="title">{TITLE[a]}</h2>
          <Cycle pos={pos} done={done && a === 'resistance'} />
          {fact && <p className="fact">{fact}</p>}
        </div>
        <Quote key={key + rec.date} k={key} date={rec.date} />
      </section>
      <Notes key={rec.date} date={rec.date} value={rec.notes} onSave={t.setNotes} />
      {a !== 'rest' && (
        <div className="dock">
          {done
            ? <button className="btn secondary" disabled={t.busy} onClick={() => t.undo(rec.date)}>Undo completion</button>
            : <button className="btn" disabled={t.busy} aria-label={`Mark ${TITLE[a]} as completed`} onClick={() => { navigator.vibrate?.(12); t.complete(rec.date); }}>Complete</button>}
        </div>
      )}
    </main>
  );
}

const dayLabel = (iso: string, today: string) => {
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  return fmt(iso, { weekday: 'short', month: 'short', day: 'numeric', ...(iso.slice(0, 4) !== today.slice(0, 4) && { year: 'numeric' }) });
};

function Switch({ on, labelId, disabled, onClick }: { on: boolean; labelId: string; disabled: boolean; onClick: () => void }) {
  return <button role="switch" aria-checked={on} aria-labelledby={labelId} className="switch" disabled={disabled} onClick={onClick}><span /></button>;
}

function History({ t, sel, setSel, onEdit }: { t: T; sel: string | null; setSel: (d: string | null) => void; onEdit: () => void }) {
  const scroll = useRef(0);
  useLayoutEffect(() => { window.scrollTo(0, sel ? 0 : scroll.current); }, [sel]);
  const rec = t.records.find((r) => r.date === sel);
  if (rec) {
    const a = rec.activityType, on = rec.status === 'completed';
    return (
      <main className="app slide-in">
        <button className="link back" onClick={() => setSel(null)}><Icon n="back" s={20} /> History</button>
        <header className="head"><h1 className="large">{fmt(rec.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h1></header>
        <Quote k={keyFor(rec)} date={rec.date} />
        <div className="stack">
          <dl className="group" style={tone(a)}>
            <div className="field"><dt>Activity</dt><dd>{TITLE[a]}</dd></div>
            {a !== 'rest' && <div className="field"><dt id="cl">Completed</dt><dd><Switch on={on} labelId="cl" disabled={t.busy} onClick={() => (on ? t.undo(rec.date) : t.complete(rec.date))} /></dd></div>}
          </dl>
          {rec.status === 'missed' && <p className="foot warn">Missed. No completion was logged for this day.</p>}
        </div>
        <Notes key={rec.date} date={rec.date} value={rec.notes} onSave={t.setNotes} />
      </main>
    );
  }
  const groups: [string, DailyRecord[]][] = [];
  for (const r of [...t.records].reverse()) {
    const k = r.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last[0] === k) last[1].push(r); else groups.push([k, [r]]);
  }
  const glyph = (r: DailyRecord) => r.activityType === 'rest' ? ['dash', 'Rest day', 'rest'] : r.status === 'completed' ? ['checkc', 'Completed', 'done'] : r.status === 'missed' ? ['alert', 'Missed', 'missed'] : ['ring', 'Scheduled', 'pending'];
  return (
    <main className="app">
      <header className="head"><h1 className="large">History</h1></header>
      {groups.map(([k, rows]) => (
        <section key={k} className="stack">
          <h2 className="section">{fmt(`${k}-01`, { month: 'long', year: 'numeric' })}</h2>
          <ul className="group list">
            {rows.map((r) => { const [g, word, cls] = glyph(r); return (
              <li key={r.date}>
                <button className={`item ${cls}`} style={tone(r.activityType)} onClick={() => { scroll.current = window.scrollY; setSel(r.date); }}>
                  <span className="glyph"><Icon n={g} s={22} f={cls === 'done' || cls === 'missed'} /></span>
                  <span className="grow"><span className="name">{TITLE[r.activityType]}</span><span className="meta">{dayLabel(r.date, t.today)}<span className="sr"> — {word}</span></span>{r.notes.trim() && <span className="preview">{r.notes.trim().split('\n')[0]}</span>}</span>
                </button>
              </li>
            ); })}
          </ul>
          {t.records.length === 1 && <p className="foot">Your history builds from today.</p>}
        </section>
      ))}
      <ul className="group"><li><button className="item" onClick={onEdit}><span className="grow"><span className="linktext">Edit starting dates</span></span></button></li></ul>
    </main>
  );
}

export default function App() {
  const t = useTraining();
  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setMsg('A new day has started.'); }, [t.today]);
  if (t.error) return (
    <main className="app"><div className="empty">
      <span className="tile" style={tone('cardio')}><Icon n="alert" s={28} /></span>
      <h1 className="section">Can’t open your data</h1><p className="muted">{t.error}</p>
      <button className="btn" onClick={() => location.reload()}>Try again</button>
    </div></main>
  );
  if (!t.ready) return <main className="app" aria-busy="true"><div className="head"><div className="sk" style={{ height: '2.5rem', width: '60%' }} /></div><div className="sk" style={{ height: '18rem' }} /></main>;
  if (!t.settings) return <Setup onDone={t.setup} busy={t.busy} />;
  if (editing) return <Setup initial={{ r: t.settings.baselineResistanceDate, c: t.settings.baselineCardioDate }} busy={t.busy} onCancel={() => setEditing(false)} onDone={async (r, c) => { await t.updateStart(r, c); setEditing(false); }} />;
  const todayRec = t.records.find((r) => r.date === t.today);
  const mood: Activity = todayRec?.activityType ?? 'rest';
  return (
    <>
      <div key={mood} className={`atmos${tab === 'history' ? ' dim' : ''}`} data-calm={todayRec?.status === 'completed' || undefined} style={tone(mood)} aria-hidden="true" />
      {tab === 'today' ? (todayRec ? <Today rec={todayRec} t={t} /> : null) : <History t={t} sel={sel} setSel={setSel} onEdit={() => setEditing(true)} />}
      <div className="sr" role="status" aria-live="polite">{msg}</div>
      <nav className="tabs" aria-label="Primary">
        <div>
          {(['today', 'history'] as const).map((k) => (
            <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}>
              <Icon n={k === 'today' ? 'cal' : 'history'} s={24} f={tab === k} /><span>{k === 'today' ? 'Today' : 'History'}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
