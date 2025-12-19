"use client";

import { useState } from "react";
import { TaskExplorer } from "@/components/tasks/task-explorer";
import { SemesterProgress } from "@/components/dashboard/semester-progress";
import { DashboardMetrics } from "@/actions/dashboard";
import { SemesterData } from "@/actions/semesters";
import { GradeGapCard } from "@/components/dashboard/grade-gap-card";
import { WorkloadHeatmap } from "@/components/dashboard/workload-heatmap";
import { HighStakesList } from "@/components/dashboard/high-stakes-list";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SemesterContentProps {
  semester: SemesterData;
  metrics: DashboardMetrics;
}

export function SemesterContent({ semester, metrics }: SemesterContentProps) {
  // Date filter state for heatmap <-> table integration
  const [dateFilter, setDateFilter] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  return (
    <>
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 max-h-[500px] grid-rows-3 gap-2">
        {/* Top Row: Progress & Quick Capture */}
        <div className="md:col-span-8 row-span-1">
          <SemesterProgress
            data={metrics.semesterProgress}
            semesterStart={semester.startDate}
            semesterEnd={semester.endDate}
            tasks={semester.tasks}
            onWeekSelect={(from, to) => setDateFilter({ from, to })}
          />
        </div>
        {/* <div className="md:col-span-4 row-span-2">
           <QuickCapture />
        </div> */}

        {/* Middle Row: Heatmap, Grade Gap, High Stakes */}
        <div className="md:col-span-4 md:row-span-3 h-full">
          <GradeGapCard data={metrics.gradeGap} />
        </div>
        <div className="md:col-span-4 md:row-span-2 h-full">
          <WorkloadHeatmap data={metrics.workloadHeatmap} />
        </div>
        <div className="md:col-span-4 md:row-span-2 h-full">
          <HighStakesList tasks={metrics.highStakesTasks} />
        </div>
      </div>

      {/* Course Grid */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Courses</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {semester.courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: course.color || "#000000" }}
                      />
                      {course.code}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {course.name}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
          {semester.courses.length === 0 && (
            <div className="col-span-full text-center py-6 text-muted-foreground border rounded-lg border-dashed">
              No courses yet.
            </div>
          )}
        </div>
      </div>

      {/* Task Table */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">All Tasks</h2>
        <TaskExplorer
          tasks={semester.tasks}
          storageKey={`semester-tasks-table-${semester.id}`}
          context={{ type: "semester", id: semester.id }}
          externalDateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
      </div>
    </>
  );
}
