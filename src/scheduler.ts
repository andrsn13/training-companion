// Pure scheduling engine: no React, no IndexedDB.
// Manages the rolling 8-stage microcycle:
// Stage 0: Resistance 1
// Stage 1: Rest Day (Post-Lift Recovery)
// Stage 2: Cardio (Squished between rest days)
// Stage 3: Rest Day (Active Recovery)
// Stage 4: Resistance 2
// Stage 5: Rest (Recovery Plateau 1 of 3)
// Stage 6: Rest (Recovery Plateau 2 of 3)
// Stage 7: Rest (Recovery Plateau 3 of 3)

export type Activity = 'resistance' | 'cardio' | 'rest';
export type Status = 'completed' | 'missed' | 'scheduled';

export interface StageDefinition {
  index: number;
  activity: Activity;
  title: string;
  subLabel: string;
  isRestPlateau: boolean;
}

export const CYCLE_LENGTH = 8;

export const CYCLE_STAGES: readonly StageDefinition[] = [
  { index: 0, activity: 'resistance', title: 'Resistance Training', subLabel: 'Workout 1 of 2', isRestPlateau: false },
  { index: 1, activity: 'rest', title: 'Rest & Recovery', subLabel: 'Post-Lift Recovery', isRestPlateau: false },
  { index: 2, activity: 'cardio', title: 'Cardio Session', subLabel: 'Squished Cardio', isRestPlateau: false },
  { index: 3, activity: 'rest', title: 'Rest & Recovery', subLabel: 'Pre-Lift Recovery', isRestPlateau: false },
  { index: 4, activity: 'resistance', title: 'Resistance Training', subLabel: 'Workout 2 of 2', isRestPlateau: false },
  { index: 5, activity: 'rest', title: 'Recovery Plateau', subLabel: 'Plateau 1 of 3', isRestPlateau: true },
  { index: 6, activity: 'rest', title: 'Recovery Plateau', subLabel: 'Plateau 2 of 3', isRestPlateau: true },
  { index: 7, activity: 'rest', title: 'Recovery Plateau', subLabel: 'Plateau 3 of 3', isRestPlateau: true },
] as const;

export interface Refs {
  resistance: string;
  cardio: string;
}

export interface DayPlan {
  date: string;
  activityType: Activity;
  status: Status;
  stageIndex: number;
  cycleNumber: number;
  stageTitle: string;
  stageSubLabel: string;
  isRestPlateau: boolean;
  daysSinceLastResistance: number;
  daysSinceLastCardio: number;
  nextResistanceDate: string;
  nextCardioDate: string;
}

export interface HorizonDay {
  date: string;
  dayOffset: number;
  activityType: Activity;
  stageIndex: number;
  cycleNumber: number;
  stageTitle: string;
  stageSubLabel: string;
  isRestPlateau: boolean;
  label: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayNum = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

export const toISODate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISODate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso: string, n: number) => new Date((dayNum(iso) + n) * 86400000).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => dayNum(to) - dayNum(from);

/** Replays the 8-stage sequence day-by-day from start to today.
 * If a workout was missed on a past day, the cycle preserves the exact sequence and shifts forward.
 */
export function buildTimeline(
  start: string,
  today: string,
  baseline: Refs,
  completedMap: Map<string, Activity>,
  startStage = 0
) {
  const refs: Refs = { ...baseline };
  const days: DayPlan[] = [];

  let currentStage = ((startStage % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  let cycleNumber = 1;

  for (let d = start; d <= today; d = addDays(d, 1)) {
    const stageDef = CYCLE_STAGES[currentStage];
    const isToday = d === today;
    const isPast = d < today;
    const completedActivity = completedMap.get(d);
    const isCompleted = !!completedActivity;

    let status: Status = 'scheduled';
    let activityType: Activity = stageDef.activity;

    if (stageDef.activity === 'rest') {
      // Rest day is passive recovery
      status = isPast ? 'completed' : 'scheduled';
    } else {
      // Workout day (Resistance or Cardio)
      if (isCompleted) {
        status = 'completed';
        activityType = completedActivity;
      } else if (isPast) {
        status = 'missed';
      } else {
        status = 'scheduled';
      }
    }

    const daysSinceLastResistance = Math.max(0, daysBetween(refs.resistance, d));
    const daysSinceLastCardio = Math.max(0, daysBetween(refs.cardio, d));

    const plan: DayPlan = {
      date: d,
      activityType,
      status,
      stageIndex: stageDef.index,
      cycleNumber,
      stageTitle: stageDef.title,
      stageSubLabel: stageDef.subLabel,
      isRestPlateau: stageDef.isRestPlateau,
      daysSinceLastResistance,
      daysSinceLastCardio,
      nextResistanceDate: '',
      nextCardioDate: '',
    };
    days.push(plan);

    // Update reference dates on workout completion
    if (isCompleted) {
      if (activityType === 'resistance') refs.resistance = d;
      if (activityType === 'cardio') refs.cardio = d;
    }

    // Sequence progression logic:
    // If completed (or rest day that has passed), advance to next stage!
    // If a past workout was missed, DO NOT ADVANCE! Shift cycle forward, keeping currentStage.
    if (isCompleted || (stageDef.activity === 'rest' && isPast)) {
      currentStage = (currentStage + 1) % CYCLE_LENGTH;
      if (currentStage === 0) {
        cycleNumber += 1;
      }
    }
  }

  // Calculate next workout dates from today's perspective
  const todayPlan = days[days.length - 1];
  if (todayPlan) {
    let testStage = todayPlan.status === 'completed' || todayPlan.activityType === 'rest'
      ? (todayPlan.stageIndex + 1) % CYCLE_LENGTH
      : todayPlan.stageIndex;
    let daysAhead = 1;

    for (let i = 1; i <= 14; i++) {
      const targetDate = addDays(today, i);
      const st = CYCLE_STAGES[testStage];
      if (!todayPlan.nextResistanceDate && st.activity === 'resistance') {
        todayPlan.nextResistanceDate = targetDate;
      }
      if (!todayPlan.nextCardioDate && st.activity === 'cardio') {
        todayPlan.nextCardioDate = targetDate;
      }
      if (todayPlan.nextResistanceDate && todayPlan.nextCardioDate) break;
      testStage = (testStage + 1) % CYCLE_LENGTH;
      daysAhead++;
    }
  }

  return { days, refs, currentStage, cycleNumber };
}

/** Returns the next 3 days of the horizon sequence starting after today. */
export function getHorizon(
  today: string,
  currentStageIndex: number,
  currentCycle: number,
  todayCompleted: boolean,
  todayActivity: Activity,
  count = 3
): HorizonDay[] {
  const horizon: HorizonDay[] = [];

  // If today is completed or today is rest, the next day is stage + 1.
  // If today is an incomplete workout, the athlete still faces tomorrow assuming today finishes.
  let stageCursor = (currentStageIndex + 1) % CYCLE_LENGTH;
  let cycleCursor = stageCursor === 0 ? currentCycle + 1 : currentCycle;

  for (let offset = 1; offset <= count; offset++) {
    const targetDate = addDays(today, offset);
    const stageDef = CYCLE_STAGES[stageCursor];
    const dateObj = parseISODate(targetDate);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const label = offset === 1 ? 'Tomorrow' : offset === 2 ? 'In 2 days' : dayName;

    horizon.push({
      date: targetDate,
      dayOffset: offset,
      activityType: stageDef.activity,
      stageIndex: stageDef.index,
      cycleNumber: cycleCursor,
      stageTitle: stageDef.title,
      stageSubLabel: stageDef.subLabel,
      isRestPlateau: stageDef.isRestPlateau,
      label,
    });

    stageCursor = (stageCursor + 1) % CYCLE_LENGTH;
    if (stageCursor === 0) cycleCursor += 1;
  }

  return horizon;
}

export interface TrainingMetrics {
  completedCycles: number;
  currentStageNumber: number;
  adherencePercent: number;
  totalWorkoutsCompleted: number;
  currentStreakDays: number;
}

/** Calculates summary health metrics across all logged cycles. */
export function calculateMetrics(records: DayPlan[]): TrainingMetrics {
  const workoutRecords = records.filter((r) => r.activityType !== 'rest');
  const completedWorkouts = workoutRecords.filter((r) => r.status === 'completed');

  const totalWorkouts = workoutRecords.length;
  const adherencePercent = totalWorkouts > 0 ? Math.round((completedWorkouts.length / totalWorkouts) * 100) : 100;

  // Maximum cycle completed
  const maxCycle = records.length > 0 ? Math.max(...records.map((r) => r.cycleNumber)) : 1;
  const completedCycles = Math.max(0, maxCycle - 1);
  const currentStageNumber = records.length > 0 ? records[records.length - 1].stageIndex + 1 : 1;

  // Streak calculation (consecutive completed non-missed days backwards from today)
  let streak = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r.status === 'completed' || r.activityType === 'rest') {
      if (r.status === 'completed') streak++;
    } else if (r.status === 'missed') {
      break;
    }
  }

  return {
    completedCycles,
    currentStageNumber,
    adherencePercent,
    totalWorkoutsCompleted: completedWorkouts.length,
    currentStreakDays: streak,
  };
}

export interface HistoricalSession {
  date: string;
  activityType: Activity;
  status: Status;
  notes: string;
  completedAt: string | null;
}

export interface TrainingCycle {
  id: string;
  cycleNumber: number;
  label: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  dateRangeFormatted: string;
  resistanceCount: number;
  cardioCount: number;
  restCount: number;
  totalSessions: number;
  sessions: HistoricalSession[];
}

export function formatCycleDateRange(startDate: string, endDate: string): string {
  const s = parseISODate(startDate);
  const e = parseISODate(endDate);
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const sDay = s.getDate();
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  const eDay = e.getDate();
  const year = e.getFullYear();

  if (sMonth === eMonth) {
    return `${sMonth} ${sDay} – ${eDay}, ${year}`;
  }
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
}

/**
 * Partitions completed sessions into rolling 8-day training cycles.
 * Returns cycles sorted in reverse chronological order (newest first).
 */
export function groupCycles(
  completedRecords: Array<{
    date: string;
    activityType: Activity;
    status: Status;
    notes?: string;
    completedAt?: string | null;
  }>,
  today: string
): TrainingCycle[] {
  const sessions = completedRecords.filter(
    (r) =>
      r.status === 'completed' &&
      (r.activityType === 'resistance' || r.activityType === 'cardio' || r.activityType === 'rest')
  );

  const bucketMap = new Map<number, HistoricalSession[]>();

  for (const s of sessions) {
    const daysAgo = dayNum(today) - dayNum(s.date);
    const cycleAgo = Math.max(0, Math.floor(daysAgo / CYCLE_LENGTH));
    const list = bucketMap.get(cycleAgo) ?? [];
    list.push({
      date: s.date,
      activityType: s.activityType,
      status: s.status,
      notes: s.notes ?? '',
      completedAt: s.completedAt ?? null,
    });
    bucketMap.set(cycleAgo, list);
  }

  const cycleAgos = Array.from(bucketMap.keys()).sort((a, b) => b - a);
  if (cycleAgos.length === 0) {
    return [];
  }

  const maxCycleAgo = Math.max(...cycleAgos);
  const cycles: TrainingCycle[] = [];

  for (const cycleAgo of cycleAgos) {
    const bucketSessions = bucketMap.get(cycleAgo) ?? [];
    bucketSessions.sort((a, b) => b.date.localeCompare(a.date));

    const cycleNumber = maxCycleAgo - cycleAgo + 1;
    const isCurrent = cycleAgo === 0;
    const endDate = addDays(today, -cycleAgo * CYCLE_LENGTH);
    const startDate = addDays(today, -cycleAgo * CYCLE_LENGTH - (CYCLE_LENGTH - 1));

    const resistanceCount = bucketSessions.filter((s) => s.activityType === 'resistance').length;
    const cardioCount = bucketSessions.filter((s) => s.activityType === 'cardio').length;
    const restCount = bucketSessions.filter((s) => s.activityType === 'rest').length;
    const totalSessions = bucketSessions.length;

    cycles.push({
      id: `cycle-${cycleNumber}`,
      cycleNumber,
      label: `Cycle ${cycleNumber}`,
      isCurrent,
      startDate,
      endDate,
      dateRangeFormatted: formatCycleDateRange(startDate, endDate),
      resistanceCount,
      cardioCount,
      restCount,
      totalSessions,
      sessions: bucketSessions,
    });
  }

  cycles.sort((a, b) => b.cycleNumber - a.cycleNumber);
  return cycles;
}

