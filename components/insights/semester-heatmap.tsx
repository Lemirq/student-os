"use client";

import { useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isWithinInterval,
  isSameWeek,
  startOfDay,
} from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  dueDate: Date | string | null;
  gradeWeight?: {
    id: string;
    weightPercent: string | number;
  } | null;
}

interface HeatmapWeek {
  startDate: Date;
  endDate: Date;
  totalWeight: number;
  level: 0 | 1 | 2 | 3 | 4;
  weekNumber: number;
}

interface SemesterHeatmapProps {
  semesterStart: Date | string;
  semesterEnd: Date | string;
  tasks: Task[];
  onWeekSelect?: (startDate: Date, endDate: Date) => void;
}

function getHeatmapData(
  semesterStart: Date,
  semesterEnd: Date,
  tasks: Task[],
): HeatmapWeek[] {
  // First, group tasks by gradeWeightId to calculate individual task weights
  const gradeWeightCounts = new Map<
    string,
    { count: number; weight: number }
  >();

  tasks.forEach((task) => {
    if (task.gradeWeight) {
      const key = task.gradeWeight.id;
      const existing = gradeWeightCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        gradeWeightCounts.set(key, {
          count: 1,
          weight: Number(task.gradeWeight.weightPercent),
        });
      }
    }
  });

  console.log(
    "[Heatmap] Grade weight distribution (Effective Weight per Task):",
    Array.from(gradeWeightCounts.entries()).map(([id, data]) => ({
      id,
      totalWeight: data.weight + "%",
      taskCount: data.count,
      effectiveWeightPerTask: (data.weight / data.count).toFixed(2) + "%",
    })),
  );

  const weeks: HeatmapWeek[] = [];
  let currentWeekStart = startOfWeek(semesterStart, { weekStartsOn: 1 }); // Monday
  let weekNumber = 1;

  // Generate all weeks from start to end
  while (currentWeekStart <= semesterEnd) {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 }); // Sunday 23:59:59
    const nextWeekStart = addWeeks(currentWeekStart, 1); // Next Monday 00:00:00

    // Calculate total weight for tasks in this week
    let totalWeight = 0;

    console.groupCollapsed(
      `[Heatmap] Processing Week ${weekNumber} (${format(currentWeekStart, "MMM d")} - ${format(weekEnd, "MMM d")})`,
    );

    tasks.forEach((task) => {
      if (!task.dueDate) return;

      const dueDate =
        task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);

      // Check if task falls within this week
      if (
        isWithinInterval(dueDate, { start: currentWeekStart, end: weekEnd })
      ) {
        if (task.gradeWeight) {
          const key = task.gradeWeight.id;
          const gradeWeightData = gradeWeightCounts.get(key);

          if (gradeWeightData) {
            // Effective Weight = category weight / number of tasks in category
            // E.g., "12 assignments worth 20% total" → each worth 1.67%
            const effectiveWeight =
              gradeWeightData.weight / gradeWeightData.count;

            console.log(
              `[Heatmap] Found task "${task.id}" due ${format(dueDate, "MMM d ha")}\n` +
                `   Category Weight: ${gradeWeightData.weight}%\n` +
                `   Total Tasks in Category: ${gradeWeightData.count}\n` +
                `   Calculation: ${gradeWeightData.weight} / ${gradeWeightData.count} = ${effectiveWeight.toFixed(4)}%\n` +
                `   Running Total: ${totalWeight.toFixed(4)}% + ${effectiveWeight.toFixed(4)}% = ${(totalWeight + effectiveWeight).toFixed(4)}%`,
            );
            totalWeight += effectiveWeight;
          }
        } else {
          console.log(
            `[Heatmap] Found task "${task.id}" (No Grade Weight linked)`,
          );
        }
      }
    });

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
      `[Heatmap] Week ${weekNumber} Final: ${totalWeight.toFixed(1)}% Points at Stake → ${levelLabel}`,
    );
    console.groupEnd();

    weeks.push({
      startDate: currentWeekStart,
      endDate: weekEnd,
      totalWeight,
      level,
      weekNumber,
    });

    currentWeekStart = nextWeekStart;
    weekNumber++;
  }

  return weeks;
}

export function SemesterHeatmap({
  semesterStart,
  semesterEnd,
  tasks,
  onWeekSelect,
  className,
}: SemesterHeatmapProps & { className?: string }) {
  const heatmapData = useMemo(() => {
    const startDate =
      semesterStart instanceof Date ? semesterStart : new Date(semesterStart);
    const endDate =
      semesterEnd instanceof Date ? semesterEnd : new Date(semesterEnd);
    return getHeatmapData(startDate, endDate, tasks);
  }, [semesterStart, semesterEnd, tasks]);

  const now = startOfDay(new Date());

  return (
    <div className={cn("flex gap-1 w-full", className)}>
      {heatmapData.map((week, index) => {
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
                  "h-1.5 flex-1 transition-all cursor-pointer hover:opacity-80",
                  week.level === 0 && "bg-green-500/60", // No tasks - green (most chill)
                  week.level === 1 && "bg-green-400/70", // Chill - light green
                  week.level === 2 && "bg-primary", // Normal - blue
                  week.level === 3 && "bg-orange-500/80", // Busy - orange
                  week.level === 4 &&
                    "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]", // Hell Week - very red with glow
                  isHellWeekAndCurrent &&
                    "animate-pulse shadow-[0_0_12px_rgba(220,38,38,0.8)]", // Pulse + stronger glow for current hell week
                  isBusyOrHellWeek && "ring-1 ring-red-400", // Ring for current busy/hell weeks
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
      })}
    </div>
  );
}
