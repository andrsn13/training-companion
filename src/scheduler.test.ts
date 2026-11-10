import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CYCLE_STAGES,
  CYCLE_LENGTH,
  buildTimeline,
  getHorizon,
  calculateMetrics,
  type Activity,
} from './scheduler';

test('8-stage cycle definition matches the required training sequence', () => {
  assert.equal(CYCLE_LENGTH, 8);
  assert.equal(CYCLE_STAGES[0].activity, 'resistance');
  assert.equal(CYCLE_STAGES[1].activity, 'rest');
  assert.equal(CYCLE_STAGES[2].activity, 'cardio'); // squished cardio
  assert.equal(CYCLE_STAGES[3].activity, 'rest');
  assert.equal(CYCLE_STAGES[4].activity, 'resistance');
  assert.equal(CYCLE_STAGES[5].activity, 'rest');
  assert.equal(CYCLE_STAGES[6].activity, 'rest');
  assert.equal(CYCLE_STAGES[7].activity, 'rest');
  assert.equal(CYCLE_STAGES[5].isRestPlateau, true);
  assert.equal(CYCLE_STAGES[6].isRestPlateau, true);
  assert.equal(CYCLE_STAGES[7].isRestPlateau, true);
});

test('completed sessions advance stages sequentially', () => {
  const completed = new Map<string, Activity>([
    ['2026-11-01', 'resistance'],
    ['2026-11-03', 'cardio'],
    ['2026-11-05', 'resistance'],
  ]);

  const { days, currentStage } = buildTimeline(
    '2026-11-01',
    '2026-11-06',
    { resistance: '2026-11-01', cardio: '2026-11-03' },
    completed,
    0
  );

  assert.equal(days[0].stageIndex, 0); // 11-01: Resistance (completed)
  assert.equal(days[1].stageIndex, 1); // 11-02: Rest (completed)
  assert.equal(days[2].stageIndex, 2); // 11-03: Cardio (completed)
  assert.equal(days[3].stageIndex, 3); // 11-04: Rest (completed)
  assert.equal(days[4].stageIndex, 4); // 11-05: Resistance (completed)
  assert.equal(days[5].stageIndex, 5); // 11-06: Recovery Plateau Day 1
  assert.equal(currentStage, 5);
});

test('missed workouts shift the cycle forward preserving the exact sequence', () => {
  // Day 1 (11-01) Resistance was NOT completed
  const completed = new Map<string, Activity>();

  const { days } = buildTimeline(
    '2026-11-01',
    '2026-11-03',
    { resistance: '2026-10-28', cardio: '2026-10-25' },
    completed,
    0
  );

  // 11-01 was missed
  assert.equal(days[0].status, 'missed');
  assert.equal(days[0].stageIndex, 0);
  // 11-02 was still stage 0 (shift forward, preserving sequence)
  assert.equal(days[1].stageIndex, 0);
  // 11-03 is still stage 0
  assert.equal(days[2].stageIndex, 0);
});

test('horizon projection returns next 3 upcoming cycle stages', () => {
  const horizon = getHorizon('2026-11-10', 0, 1, false, 'resistance', 3);
  assert.equal(horizon.length, 3);
  assert.equal(horizon[0].stageIndex, 1); // Rest
  assert.equal(horizon[0].activityType, 'rest');
  assert.equal(horizon[1].stageIndex, 2); // Cardio
  assert.equal(horizon[1].activityType, 'cardio');
  assert.equal(horizon[2].stageIndex, 3); // Rest
  assert.equal(horizon[2].activityType, 'rest');
});

test('metrics calculation computes adherence and completed cycles', () => {
  const completed = new Map<string, Activity>([
    ['2026-11-01', 'resistance'],
    ['2026-11-03', 'cardio'],
  ]);

  const { days } = buildTimeline(
    '2026-11-01',
    '2026-11-04',
    { resistance: '2026-11-01', cardio: '2026-11-03' },
    completed,
    0
  );

  const metrics = calculateMetrics(days);
  assert.equal(metrics.adherencePercent, 100);
  assert.equal(metrics.totalWorkoutsCompleted, 2);
});
