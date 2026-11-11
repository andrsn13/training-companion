import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTraining } from './useTraining';
import { parseISODate, type Activity } from './scheduler';
import { quoteFor, type QuoteKey } from './quotes';

type T = ReturnType<typeof useTraining>;

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => parseISODate(iso).toLocaleDateString('en-US', o);

const hapticPulse = (pattern: number | number[] = 12) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors on unsupported devices
    }
  }
};

/* ==========================================================================
   SVG ICONS (High-precision vectors matching reference screenshot)
   ========================================================================== */

const BedIcon = ({ s = 24 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2.5 6.5v13" />
    <path d="M21.5 11v8.5" />
    <path d="M2.5 15.5h19" />
    <path d="M6 11h5a2 2 0 0 1 2 2v2.5H6z" />
  </svg>
);

const HeroBedIcon = ({ s = 90 }: { s?: number }) => {
  const h = Math.round(s * 0.636);
  return (
    <svg
      width={s}
      height={h}
      viewBox="0 0 88 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: '56%', height: 'auto', maxHeight: '56%', display: 'block' }}
    >
      {/* Left headboard post */}
      <line x1="8" y1="10" x2="8" y2="48" strokeWidth="5.2" />
      {/* Right footboard post */}
      <line x1="80" y1="24" x2="80" y2="48" strokeWidth="5.2" />
      {/* Lower mattress foundation */}
      <line x1="8" y1="38" x2="80" y2="38" strokeWidth="5.2" />
      {/* Soft rounded pillow loop on left */}
      <path
        d="M21 28c-4.5 0-7.5-3-7.5-6.5s3-6.5 7.5-6.5h6v13h-6z"
        strokeWidth="4.2"
        fill="currentColor"
        fillOpacity="0.18"
      />
      {/* Draped blanket on right */}
      <path
        d="M34 23h38a5 5 0 0 1 5 5v10H34z"
        strokeWidth="4.2"
        fill="currentColor"
        fillOpacity="0.14"
      />
    </svg>
  );
};

const HeroDumbbellIcon = ({ s = 84 }: { s?: number }) => (
  <svg
    width={s}
    height={Math.round(s * 0.6)}
    viewBox="0 0 80 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="4.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ width: '54%', height: 'auto', maxHeight: '54%', display: 'block' }}
  >
    <rect x="14" y="10" width="7" height="28" rx="3.5" strokeWidth="4.2" fill="currentColor" fillOpacity="0.2" />
    <rect x="59" y="10" width="7" height="28" rx="3.5" strokeWidth="4.2" fill="currentColor" fillOpacity="0.2" />
    <rect x="7" y="16" width="6" height="16" rx="3" strokeWidth="3.6" />
    <rect x="67" y="16" width="6" height="16" rx="3" strokeWidth="3.6" />
    <line x1="21" y1="24" x2="59" y2="24" strokeWidth="5.2" />
  </svg>
);

const HeroRunIcon = ({ s = 80 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ width: '50%', height: 'auto', maxHeight: '50%', display: 'block' }}
  >
    <circle cx="41" cy="12" r="5.5" fill="currentColor" stroke="none" />
    <path d="M36 23l-5 13" strokeWidth="4.2" />
    <path d="M35 24l8 5 5-5" strokeWidth="4.2" />
    <path d="M35 24L26 27l-6 7" strokeWidth="4.2" />
    <path d="M31 36l8 6-3 12" strokeWidth="4.2" />
    <path d="M31 36l-5 8-10 3" strokeWidth="4.2" />
  </svg>
);

const HeroCheckIcon = ({ s = 80 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ width: '50%', height: 'auto', maxHeight: '50%', display: 'block' }}
  >
    <polyline points="14 34 26 46 50 18" />
  </svg>
);

const DumbbellIcon = ({ s = 24 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="7" width="2.5" height="10" rx="1.2" />
    <rect x="16.5" y="7" width="2.5" height="10" rx="1.2" />
    <path d="M2.5 9.5v5M21.5 9.5v5" />
    <path d="M7.5 12h9" />
  </svg>
);

const RunIcon = ({ s = 24 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="15.2" cy="4.5" r="1.8" fill="currentColor" stroke="none" />
    <path d="M13.2 8.5l-1.8 5.2" />
    <path d="M13 9l3 1.9 1.6-2" />
    <path d="M13 9L10 10 8 12.5" />
    <path d="M11.4 13.7l3 2.1-1 4.2" />
    <path d="M11.4 13.7l-2 3-3.8 1.3" />
  </svg>
);

const DotsIcon = ({ s = 24 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="6.5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="17.5" cy="12" r="1.8" />
  </svg>
);

const CalendarBadgeIcon = ({ s = 26 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4.5" width="18" height="16" rx="4.5" />
    <path d="M3 9.5h18" strokeWidth="1.6" />
    <path d="M7.5 2.5v3.5M16.5 2.5v3.5" strokeWidth="2.2" />
    <circle cx="8" cy="13.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="13.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="17" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const InfoCircleIcon = ({ s = 20 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

const HomeTabIcon = ({ s = 22 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 3l9 8h-3v10h-5v-6h-2v6H6V11H3l9-8z" />
  </svg>
);

const HistoryTabIcon = ({ s = 22 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </svg>
);

const ChevronRightIcon = ({ s = 18 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CloseIcon = ({ s = 20 }: { s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

/* ==========================================================================
   CYCLE STEP DEFINITIONS (6 visual nodes representing the 8-day cycle)
   ========================================================================== */

interface SixStepNode {
  step: number; // 1 to 6
  label: string; // 'Resist.', 'Rest', 'Cardio', 'Rest', 'Resist.', '3 Rest'
  activity: Activity;
  isWorkout: boolean;
  desc: string;
}

const SIX_STEPS: SixStepNode[] = [
  { step: 1, label: 'Resist.', activity: 'resistance', isWorkout: true, desc: 'Primary heavy lift session.' },
  { step: 2, label: 'Rest', activity: 'rest', isWorkout: false, desc: 'Post-lift recovery & glycogen recharge.' },
  { step: 3, label: 'Cardio', activity: 'cardio', isWorkout: true, desc: 'Squished aerobic base building.' },
  { step: 4, label: 'Rest', activity: 'rest', isWorkout: false, desc: 'Pre-workout active recovery.' },
  { step: 5, label: 'Resist.', activity: 'resistance', isWorkout: true, desc: 'Secondary strength bout.' },
  { step: 6, label: '3 Rest', activity: 'rest', isWorkout: false, desc: '72-hour full recovery plateau.' },
];

/** Maps 8-stage index (0..7) to 6-step progress number (1..6) */
function getStepNumber(stageIndex: number): number {
  if (stageIndex <= 4) return stageIndex + 1;
  return 6; // stages 5, 6, 7 are the 3-day recovery plateau
}

/* ==========================================================================
   CELESTIAL ARTWORK BACKGROUND FOR SCREEN 1 (Cinematic Twilight & Arc)
   ========================================================================== */

function CelestialBackground() {
  return (
    <div className="screen-1-art" aria-hidden="true">
      <img
        src="/hero-bg.png"
        alt=""
        className="screen-1-bg-img"
        loading="eager"
      />
    </div>
  );
}

/* ==========================================================================
   BOTTOM SHEET DRAWER (Info & Setup)
   ========================================================================== */

function BottomSheetDrawer({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="sheet-modal">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
            <CloseIcon s={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}


/* ==========================================================================
   MAIN APP COMPONENT
   ========================================================================== */

export default function App() {
  const t = useTraining();
  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const [inspectedStep, setInspectedStep] = useState<number | null>(null);
  const [isMorphing, setIsMorphing] = useState(false);
  const [shockwaveKey, setShockwaveKey] = useState(0);
  const [scrollRatio, setScrollRatio] = useState(0);

  const screen2Ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isAutoScrolling = useRef<boolean>(false);

  const todayRec = t.records.find((r) => r.date === t.today);
  const stageIndex = t.plan?.stageIndex ?? 1; // 0..7
  const currentStep = getStepNumber(stageIndex); // 1..6
  const activeStep = inspectedStep ?? currentStep;
  const isDoneToday = todayRec?.status === 'completed';

  // Keep bottom tab in sync with scroll position and calculate parallax ratio
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const vh = window.innerHeight || 800;
    const ratio = Math.min(1, Math.max(0, top / (vh * 0.7)));
    setScrollRatio(ratio);

    const threshold = vh * 0.45;
    if (top > threshold) {
      if (tab !== 'history') setTab('history');
    } else {
      if (tab !== 'today') setTab('today');
    }
  };

  // Smooth scroll down to Screen 2
  const scrollToScreen2 = () => {
    hapticPulse(10);
    setTab('history');
    screen2Ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Smooth scroll up to Screen 1
  const scrollToTop = () => {
    hapticPulse(8);
    setTab('today');
    canvasRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Kinetic Touch Gestures: Auto-scroll between Screen 1 and Screen 2 on swipe/flick
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;
    touchStartY.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentScroll = canvas.scrollTop;
    const vh = window.innerHeight || 800;
    const isFlick = deltaTime < 300 && Math.abs(deltaY) > 28;

    // If on Screen 1 and user swipes or flicks up to reveal Screen 2:
    if (currentScroll < vh * 0.4) {
      if (deltaY < -35 || (isFlick && deltaY < -20)) {
        scrollToScreen2();
      }
    } else if (currentScroll <= vh + 20) {
      // If near the top region of Screen 2 and user swipes down to spring back to Screen 1:
      if (deltaY > 35 || (isFlick && deltaY > 20)) {
        scrollToTop();
      }
    }
  };

  // Trackpad / Wheel inertial trigger
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || isAutoScrolling.current) return;
    const currentScroll = canvas.scrollTop;
    const vh = window.innerHeight || 800;

    if (currentScroll < 15 && e.deltaY > 30) {
      isAutoScrolling.current = true;
      scrollToScreen2();
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 500);
    } else if (currentScroll <= vh + 10 && currentScroll > 40 && e.deltaY < -30) {
      isAutoScrolling.current = true;
      scrollToTop();
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 500);
    }
  };

  // Determine current activity and titles
  const activity: Activity = todayRec?.activityType ?? 'rest';

  // Title for Screen 1
  const heroTitle =
    activity === 'rest'
      ? 'Rest Day'
      : activity === 'resistance'
        ? 'Resistance Training'
        : 'Cardio Session';

  // Subtitle for Screen 1
  const heroSub =
    activity === 'rest'
      ? "Take a break. You're on track."
      : isDoneToday
        ? 'Session completed. Recovery begins.'
        : activity === 'resistance'
          ? 'Time to lift. Build your strength.'
          : 'Cardio session. Steady aerobic pace.';

  // Next activity calculation
  let nextLabel = 'Cardio';
  let nextSub = 'in 1 day';
  let nextIcon = <RunIcon s={22} />;

  if (activity === 'rest') {
    if (stageIndex === 1) {
      nextLabel = 'Cardio';
      nextSub = 'in 1 day';
      nextIcon = <RunIcon s={22} />;
    } else if (stageIndex === 3) {
      nextLabel = 'Resistance';
      nextSub = 'in 1 day';
      nextIcon = <DumbbellIcon s={22} />;
    } else {
      const daysLeft = 8 - stageIndex;
      nextLabel = 'Resistance';
      nextSub = `in ${daysLeft} days`;
      nextIcon = <DumbbellIcon s={22} />;
    }
  } else if (activity === 'resistance') {
    nextLabel = 'Rest Day';
    nextSub = 'in 1 day';
    nextIcon = <BedIcon s={22} />;
  } else if (activity === 'cardio') {
    nextLabel = 'Rest Day';
    nextSub = 'in 1 day';
    nextIcon = <BedIcon s={22} />;
  }

  // Quote for Screen 2
  const quoteKey: QuoteKey =
    activity === 'rest' ? 'rest' : isDoneToday ? (activity === 'resistance' ? 'resistanceDone' : 'cardioDone') : activity;
  const quote = quoteFor(quoteKey, t.today);

  // Full unabridged quote for Screen 2
  const quoteText = quote.text;

  // Handle center orb click with spring celebration morph
  const handleOrbClick = () => {
    if (activity !== 'rest' && todayRec) {
      setIsMorphing(true);
      setShockwaveKey((k) => k + 1);

      if (isDoneToday) {
        hapticPulse(12);
        t.undo(todayRec.date);
      } else {
        hapticPulse([15, 45, 28]);
        t.complete(todayRec.date);
      }

      setTimeout(() => {
        setIsMorphing(false);
      }, 600);
    } else {
      hapticPulse(10);
    }
  };

  return (
    <div
      ref={canvasRef}
      className="phone-canvas"
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* ====================================================================
          SCREEN 1: CLEAR HIERARCHY (100dvh — Full Screen Bleed with Parallax Depth)
          ==================================================================== */}
      <section
        className="screen-1"
        aria-label="Today's Training Overview"
        style={{
          transform: `scale(${1 - scrollRatio * 0.04}) translateY(${scrollRatio * 18}px)`,
          opacity: 1 - scrollRatio * 0.25,
          transition: 'transform 0.08s ease-out, opacity 0.08s ease-out',
        }}
      >
        {/* Layered Celestial Background Artwork (Extends Edge-to-Edge Under Status Bar) */}
        <CelestialBackground />

        {/* Top Header: Date & Calendar Button (Spaced Below Phone Status Bar) */}
        <header className="screen-1-header">
          <span className="screen-1-date">
            {fmt(t.today, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <button
            type="button"
            className="btn-calendar-badge"
            aria-label="Adjust cycle position"
            onPointerDown={() => hapticPulse(10)}
            onClick={() => {
              setShowCalendarSheet(true);
            }}
          >
            <CalendarBadgeIcon s={26} />
          </button>
        </header>

        {/* Center Main Body: Title, Subtitle, Compound Glass Orb */}
        <div className="screen-1-body">
          {/* Exact, tight typography grouping */}
          <div className="hero-text-block">
            <h1 className="hero-main-title">{heroTitle}</h1>
            <p className="hero-main-sub">{heroSub}</p>
          </div>

          {/* High-Fidelity Compound Apple Glassmorphism Orb */}
          <div className="center-orb-container">
            <div className="orb-ambient-glow" />
            {shockwaveKey > 0 && (
              <div key={shockwaveKey} className="orb-shockwave-ring" aria-hidden="true" />
            )}
            <button
              type="button"
              className={`glass-orb ${isDoneToday ? 'is-workout-done' : ''} ${isMorphing ? 'is-morphing' : ''}`}
              aria-label={
                activity !== 'rest'
                  ? isDoneToday
                    ? 'Workout completed. Tap to undo.'
                    : 'Tap to mark workout complete.'
                  : 'Rest day active.'
              }
              onPointerDown={() => hapticPulse(12)}
              onClick={handleOrbClick}
            >
              {activity === 'rest' ? (
                <HeroBedIcon s={90} />
              ) : isDoneToday ? (
                <div className="orb-icon-wrapper is-done-icon">
                  <HeroCheckIcon s={80} />
                </div>
              ) : (
                <div className="orb-icon-wrapper">
                  {activity === 'resistance' ? (
                    <HeroDumbbellIcon s={84} />
                  ) : (
                    <HeroRunIcon s={80} />
                  )}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Card: Next Session Glass Card */}
        <div className="screen-1-bottom">
          <button
            type="button"
            className="next-session-card"
            onClick={scrollToScreen2}
            aria-label={`Next session: ${nextLabel} ${nextSub}. Tap to see full cycle.`}
          >
            <div className="next-icon-circle">{nextIcon}</div>
            <div className="next-info-col">
              <span className="next-label-title">Next: {nextLabel}</span>
              <span className="next-label-sub">{nextSub}</span>
            </div>
            <div className="next-arrow">
              <ChevronRightIcon s={20} />
            </div>
          </button>
        </div>
      </section>

      {/* ====================================================================
          SCREEN 2: STRUCTURED INFORMATION (Revealed on Intentional Scroll)
          ==================================================================== */}
      <section
        ref={screen2Ref}
        className="screen-2"
        aria-label="Structured Cycle Information"
      >
        {/* Top Header */}
        <div className="screen-2-header">
          <h2 className="screen-2-title">Your Training Cycle</h2>
          <button
            type="button"
            className="btn-info-circle"
            aria-label="Cycle info"
            onClick={() => {
              hapticPulse(10);
              setShowInfoSheet(true);
            }}
          >
            <InfoCircleIcon s={20} />
          </button>
        </div>

        {/* Interactive 6-Node Cycle Rail Track */}
        <div className="cycle-rail-section" aria-label="Cycle stages">
          <div className="rail-connector-line">
            <div
              className="rail-connector-highlight"
              style={{
                width: `${Math.min(100, Math.max(0, ((activeStep - 1) / 5) * 100))}%`,
              }}
            />
          </div>
          <div className="cycle-nodes-row" role="list">
            {SIX_STEPS.map((node) => {
              const isSelected = node.step === activeStep;
              const isActualCurrent = node.step === currentStep;

              return (
                <div key={node.step} className="cycle-node-col" role="listitem">
                  <button
                    type="button"
                    className="cycle-node-btn"
                    onClick={() => {
                      hapticPulse(8);
                      setInspectedStep(node.step === inspectedStep ? null : node.step);
                    }}
                    title={`Step ${node.step}: ${node.label}`}
                  >
                    <div
                      className={`cycle-node-circle ${node.isWorkout ? 'is-workout' : ''} ${
                        isSelected || isActualCurrent ? 'is-current' : ''
                      }`}
                    >
                      {node.activity === 'resistance' ? (
                        <DumbbellIcon s={20} />
                      ) : node.activity === 'cardio' ? (
                        <RunIcon s={20} />
                      ) : node.step === 6 ? (
                        <DotsIcon s={18} />
                      ) : (
                        <BedIcon s={20} />
                      )}
                    </div>
                    <span
                      className={`cycle-node-label ${
                        isSelected || isActualCurrent ? 'is-current' : ''
                      }`}
                    >
                      {node.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 1: Cycle Progress Card */}
        <div className="progress-card">
          <div className="progress-header-row">
            <div className="progress-accent-bar" />
            <div className="progress-info-col">
              <span className="progress-label">
                {inspectedStep ? `Inspecting Step ${inspectedStep}` : 'Cycle Progress'}
              </span>
              <span className="progress-num">{activeStep} / 6</span>
            </div>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(activeStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Training Metrics Grid */}
        <div className="metrics-grid" aria-label="Training stats">
          <div className="metric-tile">
            <span className="metric-tile-label">Completed Cycles</span>
            <span className="metric-tile-val">{t.metrics.completedCycles}</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile-label">Workouts Done</span>
            <span className="metric-tile-val">{t.metrics.totalWorkoutsCompleted}</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile-label">Current Streak</span>
            <span className="metric-tile-val">{t.metrics.currentStreakDays}d</span>
          </div>
          <div className="metric-tile">
            <span className="metric-tile-label">Adherence</span>
            <span className="metric-tile-val">{t.metrics.adherencePercent}%</span>
          </div>
        </div>

        {/* Recent Training History Section */}
        <div className="history-section">
          <h3 className="history-section-title">Training History</h3>
          <div className="history-list">
            {t.records.filter((r) => r.status === 'completed').length > 0 ? (
              t.records
                .filter((r) => r.status === 'completed')
                .slice(-5)
                .reverse()
                .map((rec) => (
                  <div key={rec.date} className="history-item-row">
                    <div className="history-item-info">
                      <span className={`history-item-badge ${rec.activityType}`}>
                        {rec.activityType === 'resistance'
                          ? 'Resistance'
                          : rec.activityType === 'cardio'
                            ? 'Cardio'
                            : 'Rest'}
                      </span>
                      <span className="history-item-date">
                        {fmt(rec.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className="history-item-status">✓ Completed</span>
                  </div>
                ))
            ) : (
              <div
                style={{
                  padding: '1rem',
                  textAlign: 'center',
                  background: 'rgba(28, 24, 46, 0.45)',
                  borderRadius: '1rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                No completed sessions yet. Tap the orb to log today's workout!
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Quote Card */}
        <div className="quote-card">
          <span className="quote-mark" aria-hidden="true">
            ❝
          </span>
          <blockquote className="quote-body-text">{quoteText}</blockquote>
          <span className="quote-author">— {quote.author}</span>
        </div>
      </section>

      {/* ====================================================================
          INFO BOTTOM SHEET (Cycle Explanation)
          ==================================================================== */}
      <BottomSheetDrawer
        isOpen={showInfoSheet}
        title="Training Cycle Structure"
        onClose={() => setShowInfoSheet(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-lavender)' }}>
          <p style={{ fontSize: '0.9375rem', lineHeight: '1.45', color: 'var(--text-muted)', overflowWrap: 'break-word' }}>
            This cycle is physiologically grounded rather than tied to a 7-day calendar week:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
            <li><strong>Step 1 (Resistance 1)</strong>: Heavy mechanical stimulus.</li>
            <li><strong>Step 2 (Rest Day)</strong>: Glycogen replenishment & nervous system restoration.</li>
            <li><strong>Step 3 (Cardio Session)</strong>: Aerobic base building squished between rest days to avoid interfering with lifting.</li>
            <li><strong>Step 4 (Rest Day)</strong>: Full recovery priming your body for the second heavy session.</li>
            <li><strong>Step 5 (Resistance 2)</strong>: Secondary hypertrophy & strength stimulus.</li>
            <li><strong>Step 6 (3 Rest Days)</strong>: 72-hour full recovery plateau for systemic repair and supercompensation.</li>
          </ul>
        </div>
      </BottomSheetDrawer>

      {/* ====================================================================
          CALENDAR BOTTOM SHEET (Cycle Position Adjuster)
          ==================================================================== */}
      <BottomSheetDrawer
        isOpen={showCalendarSheet}
        title="Select Today's Cycle Step"
        onClose={() => setShowCalendarSheet(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {SIX_STEPS.map((node) => {
            const isSelected = node.step === currentStep;
            return (
              <button
                key={node.step}
                type="button"
                className={`sheet-step-btn ${isSelected ? 'is-selected' : ''}`}
                onPointerDown={() => hapticPulse(8)}
                onClick={async () => {
                  hapticPulse([12, 30]);
                  const targetStage = node.step === 6 ? 5 : node.step - 1;
                  await t.updateStart(t.today, t.today, targetStage);
                  setShowCalendarSheet(false);
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    borderRadius: '50%',
                    background: node.isWorkout ? 'linear-gradient(135deg, #7C6EE6, #9282F8)' : 'rgba(28, 24, 44, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {node.activity === 'resistance' ? (
                    <DumbbellIcon s={16} />
                  ) : node.activity === 'cardio' ? (
                    <RunIcon s={16} />
                  ) : node.step === 6 ? (
                    <DotsIcon s={14} />
                  ) : (
                    <BedIcon s={16} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#fff', overflowWrap: 'break-word' }}>
                    Step {node.step}: {node.label === '3 Rest' ? '3-Day Recovery Plateau' : node.label === 'Resist.' ? 'Resistance Training' : node.label === 'Cardio' ? 'Cardio Session' : 'Rest Day'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflowWrap: 'break-word' }}>{node.desc}</div>
                </div>
                {isSelected && <span style={{ color: '#8B78F6', fontWeight: 700, flexShrink: 0 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </BottomSheetDrawer>

      {/* ====================================================================
          FIXED BOTTOM TAB BAR (Today / History)
          ==================================================================== */}
      <nav className="tabs-bar" aria-label="Primary Mobile Navigation">
        <div className="tabs-inner">
          <button
            type="button"
            className="tab-btn"
            aria-current={tab === 'today' ? 'page' : undefined}
            onClick={scrollToTop}
          >
            <HomeTabIcon s={22} />
            <span>Today</span>
          </button>
          <button
            type="button"
            className="tab-btn"
            aria-current={tab === 'history' ? 'page' : undefined}
            onClick={scrollToScreen2}
          >
            <HistoryTabIcon s={22} />
            <span>History</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
