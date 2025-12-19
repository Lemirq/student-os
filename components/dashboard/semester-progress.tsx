"use client";

import { DashboardMetrics } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Info } from "lucide-react";
import { SemesterHeatmap } from "@/components/insights/semester-heatmap";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Task {
  id: string;
  dueDate: Date | string | null;
  gradeWeightId: string | null;
  grade_weight: {
    weightPercent: string | number;
  } | null;
}

interface SemesterProgressProps {
  data: DashboardMetrics["semesterProgress"];
  semesterStart: string;
  semesterEnd: string;
  tasks: Task[];
  onWeekSelect?: (startDate: Date, endDate: Date) => void;
}

export function SemesterProgress({
  data,
  semesterStart,
  semesterEnd,
  tasks,
  onWeekSelect,
}: SemesterProgressProps) {
  return (
    <Card className="gap-2 py-2 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Semester Progress</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <div className="text-2xl font-bold">
              Week {data.weekNumber}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                of {data.totalWeeks}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {data.percentage}% Complete
            </span>
          </div>
          <Progress value={data.percentage} className="h-2" />
          {data.isOnBreak && (
            <p className="text-xs text-muted-foreground mt-2">
              Currently on break
            </p>
          )}
          <div className="flex items-center gap-2 mt-6 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workload Intensity
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[320px] p-4">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-sm mb-1">
                      Workload Heatmap
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Visualizes stress by summing the grade weights of tasks
                      due each week (e.g., a 20% midterm + 10% quiz = 30% at
                      stake).
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-green-500/60" />
                      <span className="font-medium">Chill Week</span>
                      <span className="text-muted-foreground ml-auto">
                        0-5%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-medium">Normal Week</span>
                      <span className="text-muted-foreground ml-auto">
                        5-15%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-orange-500/80" />
                      <span className="font-medium">Busy Week</span>
                      <span className="text-muted-foreground ml-auto">
                        15-30%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
                      <span className="font-medium">Hell Week</span>
                      <span className="text-muted-foreground ml-auto">
                        30%+
                      </span>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <SemesterHeatmap
            semesterStart={semesterStart}
            semesterEnd={semesterEnd}
            tasks={tasks.map((task) => ({
              id: task.id,
              dueDate: task.dueDate,
              gradeWeight:
                task.grade_weight && task.gradeWeightId
                  ? {
                      id: task.gradeWeightId,
                      weightPercent: task.grade_weight.weightPercent,
                    }
                  : null,
            }))}
            onWeekSelect={onWeekSelect}
          />
        </div>
      </CardContent>
    </Card>
  );
}
