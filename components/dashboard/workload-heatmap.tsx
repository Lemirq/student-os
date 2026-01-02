"use client";

import { DashboardMetrics } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Activity } from "lucide-react";
import { format, parseISO } from "date-fns";

interface WorkloadHeatmapProps {
  data: DashboardMetrics["workloadHeatmap"];
}

const chartConfig = {
  taskCount: {
    label: "Tasks",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function WorkloadHeatmap({ data }: WorkloadHeatmapProps) {
  // Format dates for display
  const chartData = data.map((d) => ({
    ...d,
    dayName: format(parseISO(d.date), "EEE"), // Mon, Tue...
    formattedDate: format(parseISO(d.date), "MMM d"),
  }));

  const defaultBarColor = "var(--chart-1)";
  const warningBarColor = "var(--destructive)";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          7-Day Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 h-full pb-10 pr-3">
        <div className="h-full w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
            >
              <XAxis
                dataKey="dayName"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "currentColor", opacity: 0.7 }}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: "currentColor", opacity: 0.7 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="taskCount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.taskCount > 3 ? warningBarColor : defaultBarColor
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
