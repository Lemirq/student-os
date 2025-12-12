import { DashboardMetrics } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface HighStakesListProps {
  tasks: DashboardMetrics["highStakesTasks"];
}

export function HighStakesList({ tasks }: HighStakesListProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          High Stakes & Upcoming
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full px-6 pb-4">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
              <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
              <p>No high stakes tasks upcoming!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.courseCode} •{" "}
                      {task.dueDate
                        ? format(new Date(task.dueDate), "MMM d")
                        : "No date"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {task.weight > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(task.weight)}% Weight
                      </Badge>
                    )}
                    {task.priority === "High" && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] h-5 px-1.5"
                      >
                        High Priority
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
