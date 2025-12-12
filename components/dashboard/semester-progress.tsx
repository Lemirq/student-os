import { DashboardMetrics } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "lucide-react";

interface SemesterProgressProps {
  data: DashboardMetrics["semesterProgress"];
}

export function SemesterProgress({ data }: SemesterProgressProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Semester Progress</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-end justify-between">
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
        </div>
      </CardContent>
    </Card>
  );
}
