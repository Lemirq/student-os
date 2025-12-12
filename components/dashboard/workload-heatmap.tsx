"use client";

import { DashboardMetrics } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Activity } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTheme } from "next-themes";

interface WorkloadHeatmapProps {
  data: DashboardMetrics["workloadHeatmap"];
}

export function WorkloadHeatmap({ data }: WorkloadHeatmapProps) {
  const { theme } = useTheme();

  // Format dates for display
  const chartData = data.map((d) => ({
    ...d,
    dayName: format(parseISO(d.date), "EEE"), // Mon, Tue...
    formattedDate: format(parseISO(d.date), "MMM d"),
  }));

  const isDark = theme === "dark";
  const defaultBarColor = isDark ? "var(--chart-1)" : "var(--chart-1)"; // slate-200 : slate-900
  const warningBarColor = "var(--destructive)"; // red-500

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          7-Day Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
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
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              {item.formattedDate}
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {item.taskCount} Tasks
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
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
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
