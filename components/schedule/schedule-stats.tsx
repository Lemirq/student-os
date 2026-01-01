"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import type { ScheduleData } from "@/types";
import { getDayName } from "@/lib/schedule-utils";

interface ScheduleStatsProps {
  courses: Array<{ schedule: ScheduleData | null }>;
}

export function ScheduleStats({ courses }: ScheduleStatsProps) {
  // Calculate total hours per week
  const calculateTotalHours = (): number => {
    let totalMinutes = 0;

    courses.forEach((course) => {
      if (!course.schedule) return;

      course.schedule.events.forEach((event) => {
        // Skip exam slots (ZZ TBA) as they don't occur weekly
        if (event.isExamSlot) return;

        const [startHour, startMinute] = event.startTime.split(":").map(Number);
        const [endHour, endMinute] = event.endTime.split(":").map(Number);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const durationMinutes = endTotalMinutes - startTotalMinutes;

        totalMinutes += durationMinutes;
      });
    });

    return Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal
  };

  // Find busiest day
  const getBusiestDay = (): { day: string; hours: number } => {
    const dayMinutes: Record<number, number> = {};

    courses.forEach((course) => {
      if (!course.schedule) return;

      course.schedule.events.forEach((event) => {
        // Skip exam slots (ZZ TBA) as they don't occur weekly
        if (event.isExamSlot) return;

        const [startHour, startMinute] = event.startTime.split(":").map(Number);
        const [endHour, endMinute] = event.endTime.split(":").map(Number);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const durationMinutes = endTotalMinutes - startTotalMinutes;

        dayMinutes[event.dayOfWeek] =
          (dayMinutes[event.dayOfWeek] || 0) + durationMinutes;
      });
    });

    let busiestDay = 0;
    let maxMinutes = 0;

    Object.entries(dayMinutes).forEach(([day, minutes]) => {
      if (minutes > maxMinutes) {
        maxMinutes = minutes;
        busiestDay = parseInt(day);
      }
    });

    return {
      day: getDayName(busiestDay),
      hours: Math.round((maxMinutes / 60) * 10) / 10,
    };
  };

  // Count courses with schedules
  const coursesWithSchedule = courses.filter(
    (course) => course.schedule && course.schedule.events.length > 0,
  ).length;

  const totalHours = calculateTotalHours();
  const busiestDay = getBusiestDay();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Courses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Courses with Schedule
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{coursesWithSchedule}</div>
          <p className="text-xs text-muted-foreground">
            {coursesWithSchedule === 1 ? "course" : "courses"} scheduled
          </p>
        </CardContent>
      </Card>

      {/* Total Hours */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hours per Week</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalHours}</div>
          <p className="text-xs text-muted-foreground">
            Total class time weekly
          </p>
        </CardContent>
      </Card>

      {/* Busiest Day */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Busiest Day</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {busiestDay.hours > 0 ? busiestDay.day : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {busiestDay.hours > 0 ? `${busiestDay.hours} hours` : "No data"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
