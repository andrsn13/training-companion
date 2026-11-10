# Apple-Grade Cycle-Centric Mobile Training Companion

Transform the Training Companion into an ergonomic, mobile-first training application designed exclusively for smartphone viewports. The interface implements an 8-stage rolling microcycle engine, eliminating mental date arithmetic and cognitive friction through established Apple Human Interface Guidelines components.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX decisions were confirmed in Phase 1 and govern the execution:

- **Confirmed Decision 1 (Cycle Progression)**: When a workout session is missed or delayed, the rolling 8-stage cycle shifts forward so the exact sequence (`Resistance` → `Rest` → `Cardio` → `Rest` → `Resistance` → `3x Rest`) is strictly preserved without skipping days.
- **Confirmed Decision 2 (Cycle Tracker UI)**: The cycle progress indicator is an 8-node horizontal segmented bead rail with Apple system glyphs, subtle active glow, and completed check states.
- **Confirmed Decision 3 (Tactile Completion)**: Session completion on the Today hero card uses an interactive morphing spring button with tactile haptic vibration (`navigator.vibrate`) and immediate state transformation.
- **Confirmed Decision 4 (Mobile Ergonomics)**: Strictly designed for smartphone thumb-zone reachability (natural reach bottom 40%, 48px primary touch targets, 15% sticky cap, native-style bottom sheet drawers).

---

## 1. Overview & Core Concept

- **What It Does**: A mobile training companion that manages an 8-stage rolling microcycle: Resistance (Day 1), Rest (Day 2), Cardio (Day 3), Rest (Day 4), Resistance (Day 5), and a 3-Day Recovery Block (Days 6–8).
- **Target Audience / Persona**: Athletes who train according to physiological recovery waves rather than rigid 7-day calendar weeks.
- **Key Value**: Delivers instant orientation in under 200ms. Eliminates all mental date math by translating calendar dates into clear cycle positions, immediate workout duties, and visual recovery horizons.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Orientation & Today's Duty**:
   - The user opens the app on mobile and immediately sees the **8-Stage Phase Rail** at the top, showing their exact position in the 8-day wave (e.g., Stage 3: Cardio).
   - An ambient atmospheric tint reflects the session category (Warm Amber for Resistance, Fresh Emerald for Cardio, Serene Indigo for Rest).
   - The **Apple Fitness-style Hero Card** prominently states the day's activity, cycle stage, and contextual recovery insight.
2. **Logging Completion with Haptics**:
   - Tapping the bottom-docked **Morphing Completion Button** triggers a dual haptic pulse (`[15, 50]ms`), a smooth spring scale bounce, and transforms the control into a serene green checkmark state with timestamp.
   - On completion, the 8-stage rail marks the active node as complete and updates the forecast horizon in real time.
3. **Glanceable Horizon Peek**:
   - Directly below the hero card, a 3-card **Horizontal Horizon Strip** previews the upcoming three days (e.g., Tomorrow: Rest, Day After: Resistance, In 3 Days: 3-Day Recovery Plateau), so future physical demands are known at a glance.
4. **1-Tap Readiness & Notes (Apple Journal Style)**:
   - Below the horizon strip, an inset journal card provides 1-tap **Readiness Chips** (`Felt Strong`, `High Energy`, `Joint Soreness`, `PR`, `Deep Sleep`, `Active Walk`) that toggle into the session log, paired with a clean expandable notes input.
5. **Cycle-Grouped History & Health Metrics**:
   - Switching to the History tab displays summary metric chips (`Cycles Finished`, `Current Stage`, `Adherence %`) followed by records grouped by completed **8-Day Cycles** rather than disconnected calendar months.
6. **Native Bottom Sheet for Starting Dates & Detail Edits**:
   - Tapping "Edit starting dates" or inspecting historical entries opens a native-feeling slide-up **Bottom Sheet Drawer** with drag handle, keeping the user in their active context.

### Visual Identity & Theme

- **Aesthetic Direction**: Apple Human Interface Guidelines—clean inset grouped cards, hairline dividers, frosted glass backdrop filters (`backdrop-blur-md`), and refined typography.
- **Color Palette**:
  - Neutral Canvas: Off-white `#F6F4F0` (Light) / OLED True Black `#000000` (Dark)
  - Structural Surfaces: Pure White `#FFFFFF` (Light) / Elevated Card `#1C1C1E` (Dark)
  - Resistance Token: Amber `#D98A3D` (Text: `#B35900`, Dark: `#E39B54`)
  - Cardio Token: Emerald `#4FA66B` (Text: `#1F7A3D`, Dark: `#63B77F`)
  - Rest Token: Indigo `#7B6FD1` (Text: `#5B4FB8`, Dark: `#9A90E8`)
  - Interactive Accent: Apple System Blue `#0071E3`
- **Typography & Scale**:
  - Primary: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui`
  - Quotes: `ui-serif, "New York", "Iowan Old Style", Georgia, serif`
  - Tabular Numbers: `font-variant-numeric: tabular-nums` for all stats, cycle counts, and dates.
- **Ergonomics & Touch Targets**:
  - Minimum hit target of 44x44px across all list rows, tab buttons, chips, and sheet triggers.
  - Primary completion button anchored in the natural thumb zone (bottom 40% of viewport).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Strict 8-Stage Cycle Sequence vs. Independent Interval Counters
- **Chosen Approach**: Transition `scheduler.ts` from separate 3-day and 7-day interval arithmetic to a dedicated 8-stage sequence engine:
  `[0: Resistance] → [1: Rest] → [2: Cardio] → [3: Rest] → [4: Resistance] → [5: Rest] → [6: Rest] → [7: Rest]`.
- **Why**: Perfectly aligns with the user's specific training philosophy. When a workout is delayed, shifting the cycle preserves the exact planned stimulus and recovery order without skipping cardio or clustering heavy lifting.
- **Alternatives Considered**: Retaining calendar-only day modulo calculations was rejected because it causes workouts to drift out of sync with actual bodily recovery.

### Decision 2: Interactive Readiness Chips in Daily Notes
- **Chosen Approach**: Provide a curated row of 1-tap contextual chips (differentiated by workout vs. rest days) that store structured readiness markers in the note text while allowing optional freeform elaboration.
- **Why**: Eliminates mobile typing friction while training or resting. Most days only require a single tap (`Felt Strong` or `Deep Sleep`).

### Decision 3: Cycle-Centric History Grouping
- **Chosen Approach**: Group historical logs into completed "Cycle N" blocks with completion badges, while retaining date indicators for reference.
- **Why**: Reinforces cycle momentum and progress instead of judging consistency by arbitrary Monday-to-Sunday weeks.

---

## 4. Technical Architecture & Data Strategy

### System & Component Hierarchy

```
┌────────────────────────────────────────────────────────┐
│                   Mobile Viewport                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Atmospheric Ambient Tint (Dynamic Radial Mesh)   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Top Header: Date Eyebrow + Cycle Stage Badge     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 8-Stage Phase Rail (Segmented Bead Track)        │  │
│  │ [Res]─[Rest]─[Car]─[Rest]─[Res]─[Rest-Plateau]   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Today Hero Card (Frosted Glass Inset)            │  │
│  │  - Primary Activity Icon & Title                 │  │
│  │  - Contextual Recovery/Stimulus Fact             │  │
│  │  - Philosophical Quote (New York Serif)          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 3-Day Horizon Strip (Glanceable Forecast Cards)  │  │
│  │  [Tomorrow]     [Day After]     [In 3 Days]      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Apple Journal Card: Readiness Chips + Notes      │  │
│  │  - [Felt Strong] [High Energy] [PR] [Soreness]   │  │
│  │  - Expanding Minimal Textarea                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Sticky Thumb Dock: Morphing Spring Action Button │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Translucent 49pt Bottom Tab Bar [Today | History]│  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Bottom Sheet Drawer (Settings & History Detail)  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Data Model & State Engine

1. **`scheduler.ts`**:
   - Microcycle Definition:
     ```typescript
     export const CYCLE_STAGES: Activity[] = [
       'resistance', // Stage 0 (Day 1)
       'rest',       // Stage 1 (Day 2)
       'cardio',     // Stage 2 (Day 3: squished cardio)
       'rest',       // Stage 3 (Day 4)
       'resistance', // Stage 4 (Day 5)
       'rest',       // Stage 5 (Day 6: recovery block 1/3)
       'rest',       // Stage 6 (Day 7: recovery block 2/3)
       'rest',       // Stage 7 (Day 8: recovery block 3/3)
     ];
     ```
   - Replay logic tracks `currentCycleIndex` (0 to 7) and `cycleNumber`. Completed workouts advance the index. Missed workouts shift timeline forward without skipping stages.
   - Horizon projection function outputs the next 3 stages with calendar date mapping.
2. **`useTraining.ts`**:
   - Exposes `cycleStage`, `cycleNumber`, `horizon`, `metrics` (completed cycles, adherence %, current streak), `completeSession`, `undoSession`, and `toggleReadinessChip`.
3. **`db.ts`**:
   - Retains IndexedDB schema (`settings`, `dailyRecords`) with backward compatibility, storing cycle metadata seamlessly.
4. **`App.tsx` & `styles.css`**:
   - Re-architected into modular subcomponents: `CycleRail`, `TodayHero`, `HorizonStrip`, `JournalNotes`, `HistoryCycles`, and `BottomSheet`.
   - Polished CSS variables, haptic feedback integration, spring keyframes, and safe-area insets.
