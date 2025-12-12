import { DashboardMetrics } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GradeGapCardProps {
  data: DashboardMetrics["gradeGap"];
}

export function GradeGapCard({ data }: GradeGapCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Grade Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <ScrollArea className="h-full px-6 pb-4">
          <div className="space-y-4">
            {data.map((course) => {
              const isBehind =
                course.goalGrade && course.currentGrade < course.goalGrade;
              // Warning if required performance is very high (> 95%) or impossible
              const isCritical =
                course.isImpossible ||
                (course.requiredPerformance !== null &&
                  course.requiredPerformance > 95);

              return (
                <div
                  key={course.courseId}
                  className="space-y-2 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{course.courseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.courseCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-lg font-bold ${isBehind ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}
                      >
                        {course.currentGrade}%
                      </span>
                      {course.goalGrade && (
                        <p className="text-xs text-muted-foreground">
                          Goal: {course.goalGrade}%
                        </p>
                      )}
                    </div>
                  </div>

                  {course.goalGrade && isBehind && (
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={isCritical ? "destructive" : "outline"}
                              className="w-full justify-center text-xs py-0.5 h-auto"
                            >
                              {course.isImpossible ? (
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Goal
                                  Unreachable (Max {course.maxPossibleGrade}%)
                                </span>
                              ) : (
                                <span>
                                  Need{" "}
                                  <strong>{course.requiredPerformance}%</strong>{" "}
                                  avg on remaining
                                </span>
                              )}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Max possible grade: {course.maxPossibleGrade}%
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
