# Workload intensity calculation logic

_Exported on 12/14/2025 at 00:27:33 EST from Cursor (2.2.20)_

---

**User**

Edit the semester heatmap visualization to follow this pattern:

This is a great question because it touches on **Data Visualization Psychology**. The math you choose determines whether the user feels "Panic" (which is good for action) or "Comfort" (which is bad for deadlines).

You should **NOT divide by 400** (or the total number of courses).

Here is why, and the correct formula to use.

### **Why "Dividing by 400" Fails**

Imagine "Hell Week." You have **3 Midterms**, each worth **30%** of their respective classes. That is a massive amount of work.

- **Method A (Summing Raw Weights):**
  `30% + 30% + 30% = 90%`
  - **User Reaction:** "Whoa. I have nearly an entire course's worth of grades due this week. This is huge." (Correct reaction).

- **Method B (Your "Divide by 400" Idea):**
  `(30 + 30 + 30) / 400 = 0.225 (22.5%)`
  - **User Reaction:** "Oh, only 22%? That sounds like a low F. I guess it's not that bad." (Wrong reaction).

When students see a percentage, they instinctively compare it to **0-100%**.

- If the number is small (like 22%), it feels "safe."
- If the number is big (like 90% or 120%), it feels "urgent."

### **The Correct Approach: "Total Weight at Stake"**

You should simply **sum the effective weights** across all courses. Do not normalize them against the total semester.

**The Metric:** _"Points at Stake"_
If I have a Physics Midterm (30%) and a Calculus Quiz (5%) this week, my "Points at Stake" is **35**.

**The Scale:**

- **0 - 5%:** Chill Week.
- **5 - 15%:** Normal Week.
- **15 - 30%:** Busy Week.
- **30%+:** **Hell Week** (Red Alert).

---

### **The Final Logic for Cursor**

Here is the updated logic for your `getSemesterHeatmap` function. It combines the **Effective Weight Distribution** (the "12 assignments" problem you solved earlier) with this **Raw Sum** approach.

```typescript
// Example Calculation Logic

// 1. Calculate Effective Weight for EACH task first
// Task A (One of 12 assignments worth 20% total):
const taskA_Weight = 20 / 12; // = 1.66%

// Task B (Midterm worth 30% total):
const taskB_Weight = 30; // = 30.00%

// 2. Sum them up for the week
const weekTotal = taskA_Weight + taskB_Weight; // = 31.66%

// 3. Determine Intensity
let intensity = 0;
if (weekTotal > 30)
  intensity = 4; // Extreme (Hell Week)
else if (weekTotal > 15)
  intensity = 3; // High
else if (weekTotal > 5)
  intensity = 2; // Medium
else if (weekTotal > 0) intensity = 1; // Low
```

### **Why this is better for the User**

It normalizes **Effort**, not **Math**.
Writing one essay worth 20% feels like the same amount of "Life Stress" regardless of whether you are taking 3 courses or 6 courses. This formula reflects that stress accurately.

---

**Cursor**

I'll help you update the semester heatmap visualization to use the correct "Points at Stake" approach. Let me first check the current implementation.

Perfect! I can see the current implementation already calculates effective weights correctly (dividing by task count), but the intensity thresholds don't match the psychological pattern you described. Let me update it:

```typescriptreact
interface HeatmapWeek {
  startDate: Date;
  endDate: Date;
  totalWeight: number;
  level: 0 | 1 | 2 | 3 | 4;
  weekNumber: number;
}
```

```typescriptreact
    // Determine level based on "Points at Stake" psychology
    // This raw sum reflects actual stress, not normalized percentages
    // When students see a percentage, they compare it to 0-100%
    // A "Hell Week" with 3 midterms (30% each) = 90% total = HIGH urgency (correct)
    // If we divided by total courses, 90% → 22% = LOW urgency (wrong)
    let level: 0 | 1 | 2 | 3 | 4;
    if (totalWeight === 0) {
      level = 0; // No tasks
    } else if (totalWeight <= 5) {
      level = 1; // Chill Week (0-5%)
    } else if (totalWeight <= 15) {
      level = 2; // Normal Week (5-15%)
    } else if (totalWeight <= 30) {
      level = 3; // Busy Week (15-30%)
    } else {
      level = 4; // Hell Week (30%+)
    }
```

```typescriptreact
        const isCurrentWeek = isSameWeek(now, week.startDate, {
          weekStartsOn: 1,
        });
        const isHellWeekAndCurrent = week.level === 4 && isCurrentWeek;
        const isBusyOrHellWeek = week.level >= 3 && isCurrentWeek;

        // Label mapping for tooltip
        const levelLabels = {
          0: "No Tasks",
          1: "Chill Week",
          2: "Normal Week",
          3: "Busy Week",
          4: "Hell Week",
        };

        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "h-2 flex-1 rounded-sm transition-all cursor-pointer hover:opacity-80",
                  week.level === 0 && "bg-muted/30", // No tasks - subtle
                  week.level === 1 && "bg-green-500/40", // Chill - green
                  week.level === 2 && "bg-blue-500/50", // Normal - blue
                  week.level === 3 && "bg-yellow-500/60", // Busy - yellow
                  week.level === 4 && "bg-red-500", // Hell Week - red
                  isHellWeekAndCurrent && "animate-pulse", // Pulse for current hell week
                  isBusyOrHellWeek && "ring-1 ring-red-400" // Ring for current busy/hell weeks
                )}
                onClick={() => onWeekSelect?.(week.startDate, week.endDate)}
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div className="font-medium">
                  Week {week.weekNumber} ({format(week.startDate, "MMM d")})
                </div>
                <div className="text-muted-foreground">
                  {week.totalWeight > 0
                    ? `${week.totalWeight.toFixed(1)}% at stake · ${levelLabels[week.level]}`
                    : levelLabels[week.level]}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
```

```typescriptreact
  console.log(
    "[Heatmap] Grade weight distribution (Effective Weight per Task):",
    Array.from(gradeWeightCounts.entries()).map(([id, data]) => ({
      id,
      totalWeight: data.weight + "%",
      taskCount: data.count,
      effectiveWeightPerTask: (data.weight / data.count).toFixed(2) + "%",
    }))
  );
```

```typescriptreact
          if (gradeWeightData) {
            // Effective Weight = category weight / number of tasks in category
            // E.g., "12 assignments worth 20% total" → each worth 1.67%
            const effectiveWeight = gradeWeightData.weight / gradeWeightData.count;

            console.log(
              `[Heatmap] Task "${task.id}": ${gradeWeightData.weight}% ÷ ${gradeWeightData.count} tasks = ${effectiveWeight.toFixed(2)}% effective weight`
            );
            totalWeight += effectiveWeight;
          }
```

```typescriptreact
    // Determine level based on "Points at Stake" psychology
    // This raw sum reflects actual stress, not normalized percentages
    // When students see a percentage, they compare it to 0-100%
    // A "Hell Week" with 3 midterms (30% each) = 90% total = HIGH urgency (correct)
    // If we divided by total courses, 90% → 22% = LOW urgency (wrong)
    let level: 0 | 1 | 2 | 3 | 4;
    let levelLabel: string;
    if (totalWeight === 0) {
      level = 0; // No tasks
      levelLabel = "No Tasks";
    } else if (totalWeight <= 5) {
      level = 1; // Chill Week (0-5%)
      levelLabel = "Chill Week";
    } else if (totalWeight <= 15) {
      level = 2; // Normal Week (5-15%)
      levelLabel = "Normal Week";
    } else if (totalWeight <= 30) {
      level = 3; // Busy Week (15-30%)
      levelLabel = "Busy Week";
    } else {
      level = 4; // Hell Week (30%+)
      levelLabel = "Hell Week";
    }

    console.log(
      `[Heatmap] Week ${weekNumber}: ${totalWeight.toFixed(1)}% Points at Stake → ${levelLabel}`
    );

    weeks.push({
      startDate: currentWeekStart,
      endDate: weekEnd,
      totalWeight,
      level,
      weekNumber,
    });
```

Perfect! I've updated the semester heatmap to follow the "Points at Stake" psychology pattern. Here's what changed:

## Key Updates

### 1. **Correct Intensity Thresholds**

The visualization now uses the proper "raw sum" approach instead of normalizing:

```typescript
// Old thresholds (wrong)
// 0-5%: level 1
// 5-10%: level 2
// >10%: level 3

// New thresholds (correct - "Points at Stake")
// 0%: No Tasks
// 0-5%: Chill Week
// 5-15%: Normal Week
// 15-30%: Busy Week
// 30%+: Hell Week (Red Alert)
```

### 2. **5-Level System**

Added a 5th intensity level (0-4) to properly capture "Hell Week" scenarios where students have 30%+ of their total grade at stake in a single week.

### 3. **Enhanced Visual Feedback**

- **Level 0** (No tasks): Subtle muted background
- **Level 1** (Chill): Green (0-5%)
- **Level 2** (Normal): Blue (5-15%)
- **Level 3** (Busy): Yellow (15-30%)
- **Level 4** (Hell Week): Red with pulse animation (30%+)

Current busy/hell weeks also get a red ring for extra emphasis.

### 4. **Better Tooltip Labels**

Tooltips now show:

- Week number and date
- "X% at stake" (instead of "Total Weight")
- Week classification (Chill/Normal/Busy/Hell)

### 5. **Comprehensive Logging**

Added detailed console logs to track:

- Effective weight distribution per grade category
- Per-task effective weight calculations
- Weekly "Points at Stake" totals with intensity labels

## The Psychology

The math now correctly reflects **student stress**:

- **3 midterms at 30% each = 90% at stake** → Shows as "Hell Week" (RED, pulsing)
- **NOT** normalized to 22% which would falsely suggest "low urgency"

Students instinctively compare percentages to 0-100%, so this raw sum approach triggers the correct emotional response for prioritization.

```typescript
// Old thresholds (wrong)
// 0-5%: level 1
// 5-10%: level 2
// >10%: level 3

// New thresholds (correct - "Points at Stake")
// 0%: No Tasks
// 0-5%: Chill Week
// 5-15%: Normal Week
// 15-30%: Busy Week
// 30%+: Hell Week (Red Alert)
```

---

**User**

range the colors from red to green, green is the most chill (no work), hell week is very red

---

**Cursor**

I'll update the color scheme to create a proper gradient from green (chill) to red (hell week).

```typescriptreact
              <div
                className={cn(
                  "h-2 flex-1 rounded-sm transition-all cursor-pointer hover:opacity-80",
                  week.level === 0 && "bg-green-500/60", // No tasks - green (most chill)
                  week.level === 1 && "bg-green-400/70", // Chill - light green
                  week.level === 2 && "bg-yellow-400/70", // Normal - yellow
                  week.level === 3 && "bg-orange-500/80", // Busy - orange
                  week.level === 4 && "bg-red-600", // Hell Week - very red
                  isHellWeekAndCurrent && "animate-pulse", // Pulse for current hell week
                  isBusyOrHellWeek && "ring-1 ring-red-400" // Ring for current busy/hell weeks
                )}
                onClick={() => onWeekSelect?.(week.startDate, week.endDate)}
              />
```

Perfect! I've updated the color scheme to create a proper gradient from green to red:

## Updated Color Gradient

- **Level 0** (No Tasks): `bg-green-500/60` - **Green** (most chill, no work)
- **Level 1** (Chill Week): `bg-green-400/70` - **Light Green** (0-5%)
- **Level 2** (Normal Week): `bg-yellow-400/70` - **Yellow** (5-15%)
- **Level 3** (Busy Week): `bg-orange-500/80` - **Orange** (15-30%)
- **Level 4** (Hell Week): `bg-red-600` - **Very Red** (30%+)

The visualization now uses a natural traffic light pattern where:

- 🟢 **Green** = Safe, relaxed, minimal workload
- 🟡 **Yellow** = Moderate, manageable workload
- 🟠 **Orange** = Caution, busy workload
- 🔴 **Red** = Danger, intense workload (Hell Week)

This creates an intuitive visual that immediately communicates stress levels at a glance!

---

**User**

make hell week glow red

---

**Cursor**

I'll add a glowing red effect to hell week bars in the heatmap.

```typescriptreact
              <div
                className={cn(
                  "h-2 flex-1 rounded-sm transition-all cursor-pointer hover:opacity-80",
                  week.level === 0 && "bg-green-500/60", // No tasks - green (most chill)
                  week.level === 1 && "bg-green-400/70", // Chill - light green
                  week.level === 2 && "bg-yellow-400/70", // Normal - yellow
                  week.level === 3 && "bg-orange-500/80", // Busy - orange
                  week.level === 4 && "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]", // Hell Week - very red with glow
                  isHellWeekAndCurrent && "animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.8)]", // Pulse + stronger glow for current hell week
                  isBusyOrHellWeek && "ring-1 ring-red-400" // Ring for current busy/hell weeks
                )}
                onClick={() => onWeekSelect?.(week.startDate, week.endDate)}
              />
```

Perfect! I've added a glowing red effect to Hell Week bars. Here's what changed:

## Hell Week Glow Effect

- **Level 4 (Hell Week)**: Now has `shadow-[0_0_8px_rgba(220,38,38,0.6)]` - creates a red glow around the bar
- **Current Hell Week**: Gets an even stronger glow `shadow-[0_0_12px_rgba(220,38,38,0.8)]` combined with the pulse animation

The red glow uses `rgba(220,38,38,...)` which matches Tailwind's `red-600` color, creating a cohesive and alarming visual effect that immediately draws attention to the most intense weeks. When it's the current week, the combination of pulsing + stronger glow makes it impossible to miss! 🔴✨

---

**User**

can you document this
