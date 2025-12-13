"use client";

import * as React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { CourseData } from "@/actions/get-course-data";
import { Task } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CourseStrategySidebarProps {
  course: CourseData;
}

export function CourseStrategySidebar({ course }: CourseStrategySidebarProps) {
  // 1. Calculate Weights and Scores
  const { completedWeight, currentWeightedScore, remainingWeight } =
    React.useMemo(() => {
      let completedWeight = 0;
      let currentWeightedScore = 0;

      // Group tasks by gradeWeightId to distribute weight
      const tasksByWeight: Record<string, Task[]> = {};
      course.tasks.forEach((task) => {
        if (task.gradeWeightId) {
          if (!tasksByWeight[task.gradeWeightId]) {
            tasksByWeight[task.gradeWeightId] = [];
          }
          tasksByWeight[task.gradeWeightId].push(task);
        }
      });

      // Iterate through grade weights to calculate contributions
      course.grade_weights.forEach((gw) => {
        const gwTasks = tasksByWeight[gw.id] || [];
        const totalTasksInGw = gwTasks.length;
        const weightPercent = parseFloat(gw.weightPercent?.toString() || "0");

        if (totalTasksInGw > 0) {
          const weightPerTask = weightPercent / totalTasksInGw;

          gwTasks.forEach((task) => {
            if (task.scoreReceived !== null) {
              completedWeight += weightPerTask;
              const score = parseFloat(task.scoreReceived.toString());
              const max = parseFloat(task.scoreMax?.toString() || "100");
              const percentage = max > 0 ? score / max : 0;
              currentWeightedScore += percentage * weightPerTask;
            }
          });
        }
      });

      // Handle tasks without grade weights or if logic needs adjustment
      // For now, only weighted tasks contribute to the "decided" portion.

      return {
        completedWeight,
        currentWeightedScore,
        remainingWeight: 100 - completedWeight,
      };
    }, [course]);

  // 2. State for What-If Calculator
  const [whatIfScore, setWhatIfScore] = React.useState([85]);

  const projectedGrade = React.useMemo(() => {
    // Formula: CurrentWeightedScore + (SliderValue * RemainingWeight / 100)
    // Note: CurrentWeightedScore is already weighted (e.g. 35 out of 40 possible points)
    // Actually, CurrentWeightedScore should be: (Points Earned / Points Possible so far) * CompletedWeight?
    // No, standard formula: Sum(Score% * Weight).
    // Example: Midterm (20%) - Scored 90%. Contribution = 0.9 * 20 = 18.
    // CurrentWeightedScore = 18.
    // Remaining Weight = 80.
    // If I average 85% on remaining: 0.85 * 80 = 68.
    // Total = 18 + 68 = 86.

    const futureContribution = (whatIfScore[0] / 100) * remainingWeight;
    return currentWeightedScore + futureContribution;
  }, [currentWeightedScore, remainingWeight, whatIfScore]);

  // Data for Pie Chart
  const pieData = [
    {
      name: "Completed",
      value: completedWeight,
      color: course.color || "#000",
    },
    { name: "Remaining", value: remainingWeight, color: "#e5e7eb" }, // gray-200
  ];

  // Calculate total weight for grade weights
  const totalWeight = React.useMemo(() => {
    return course.grade_weights.reduce((sum, weight) => {
      return sum + parseFloat(weight.weightPercent?.toString() || "0");
    }, 0);
  }, [course.grade_weights]);

  const isValidTotal = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="space-y-6 sticky top-6">
      {/* Widget A: Grade Weights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Grade Weights
          </CardTitle>
          <Badge
            variant={isValidTotal ? "default" : "destructive"}
            className="text-xs"
          >
            Total: {totalWeight.toFixed(1)}%
          </Badge>
        </CardHeader>
        <CardContent>
          {course.grade_weights.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No grade weights defined yet.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-right text-xs">Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {course.grade_weights.map((weight) => (
                    <TableRow key={weight.id}>
                      <TableCell className="font-medium text-xs py-2">
                        {weight.name}
                      </TableCell>
                      <TableCell className="text-right text-xs py-2">
                        {parseFloat(
                          weight.weightPercent?.toString() || "0",
                        ).toFixed(1)}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!isValidTotal && (
                <div className="mt-3 text-xs text-destructive">
                  ⚠️ Warning: Grade weights do not add up to 100%
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Widget B: Weight Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Weight Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill={pieData[0].color} />
                  <Cell fill={pieData[1].color} fillOpacity={0.3} />
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{ borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold">
                {completedWeight.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">decided</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget C: What-If Calculator */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            What-If Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>If I average...</span>
              <span className="font-bold">{whatIfScore[0]}%</span>
            </div>
            <Slider
              value={whatIfScore}
              onValueChange={setWhatIfScore}
              max={100}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              ...on remaining tasks
            </p>
          </div>

          <div className="pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Final Grade</p>
              <div className="text-4xl font-bold tracking-tight">
                {projectedGrade.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
