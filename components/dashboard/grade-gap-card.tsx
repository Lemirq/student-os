import { DashboardMetrics } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GradeGapCardProps {
  data: DashboardMetrics["gradeGap"];
}

/**
 * Converts a percentage grade to U of T's 4.0 GPA scale
 */
function percentageToGPA(percentage: number): number {
  if (percentage >= 90) return 4.0;
  if (percentage >= 85) return 4.0;
  if (percentage >= 80) return 3.7;
  if (percentage >= 77) return 3.3;
  if (percentage >= 73) return 3.0;
  if (percentage >= 70) return 2.7;
  if (percentage >= 67) return 2.3;
  if (percentage >= 63) return 2.0;
  if (percentage >= 60) return 1.7;
  if (percentage >= 57) return 1.3;
  if (percentage >= 53) return 1.0;
  if (percentage >= 50) return 0.7;
  return 0.0;
}

/**
 * Calculates the average GPA from multiple courses
 */
function calculateAverageGPA(
  courses: DashboardMetrics["gradeGap"],
): number | null {
  if (courses.length === 0) return null;

  const totalGPA = courses.reduce((sum, course) => {
    return sum + percentageToGPA(course.currentGrade);
  }, 0);

  return totalGPA / courses.length;
}

export function GradeGapCard({ data }: GradeGapCardProps) {
  const averageGPA = calculateAverageGPA(data);

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
            {/* Live GPA Display */}
            {averageGPA !== null && (
              <div className="border-b pb-4">
                <div className="flex flex-col items-center justify-center gap-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Semester GPA
                  </p>
                  <p className="text-5xl font-bold bg-linear-to-b from-[#656CD9] to-primary bg-clip-text text-transparent">
                    {averageGPA.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">/ 4.0 Scale</p>
                </div>
              </div>
            )}

            {/* empty */}
            {data.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                <p>No courses found</p>
              </div>
            )}

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
