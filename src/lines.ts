// Coaching lines: original, state-specific, chosen deterministically by date so they never flicker on refresh.
export type LineKey = 'resistance' | 'resistanceDone' | 'cardio' | 'cardioDone' | 'rest' | 'overdue' | 'firstDay';
const L: Record<LineKey, string[]> = {
  resistance: ['Warm up first. Earn the heavy sets.', 'Leave one clean rep in reserve.', 'Technique before load, every set.', 'Start the first set. Momentum does the rest.', 'Rest between sets is part of the work.', 'Train hard now. Recover fully after.'],
  resistanceDone: ['Done. Eat, hydrate, and let it settle.', 'That was the hard part. Recovery starts now.', 'Strength is built in the days after.', 'Session logged. Nothing more to prove today.', 'Two recovery days earn the next session.', 'Good work. Now protect the gains.'],
  cardio: ['Keep it conversational. Steady beats fast.', 'Easy pace. Finish feeling you could do more.', 'Aerobic base is built slowly.', 'Settle into a rhythm and hold it.', 'Breathe through your nose as long as you can.', 'Show up for the long game.'],
  cardioDone: ['Steady work, banked.', 'Base building is quiet progress.', 'Done. Walk it off and drink water.', 'Another aerobic block in the bank.', 'Cardio logged. Recover before the next lift.', 'Easy effort, lasting effect.'],
  rest: ['Sleep is the workout today.', 'Recovery is when you actually get stronger.', 'Nothing to prove today. Rest fully.', 'Light movement is fine. Heavy effort isn’t.', 'Eat well, hydrate, and sleep early.', 'Muscle rebuilds while you rest.'],
  overdue: ['Missed days happen. Pick the plan back up.', 'No catching up. Just do today’s session.', 'Start where you are. One session resets it.', 'Don’t double up. Do one good session.', 'The cycle waits for you. Begin.', 'Being back today is enough.'],
  firstDay: ['Day one. Keep it simple and start.', 'Begin lighter than you think you should.', 'A plan only works once you start it.', 'Consistency comes before intensity.', 'The first session just has to happen.', 'Show up today. Details can wait.'],
};
export function lineFor(key: LineKey, date: string): string {
  let h = 0;
  for (const c of date + key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return L[key][h % L[key].length];
}
