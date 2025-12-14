import { getSidebarData } from "@/actions/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default async function DashboardPage() {
  const { semesters } = await getSidebarData();

  // Group by Year Level
  const groupedSemesters: Record<number, typeof semesters> = {};

  semesters.forEach((semester) => {
    if (!groupedSemesters[semester.yearLevel]) {
      groupedSemesters[semester.yearLevel] = [];
    }
    groupedSemesters[semester.yearLevel].push(semester);
  });

  const sortedYears = Object.keys(groupedSemesters)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-8 h-full p-4 max-w-7xl mx-auto w-full">
      <div className="text-left space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Track your progress across semesters.
        </p>
      </div>

      {semesters.length === 0 ? (
        <div className="flex items-center justify-center h-[50vh] text-center">
          <div>
            <h2 className="text-lg font-semibold">No semesters found</h2>
            <p className="text-muted-foreground">
              Create a semester in the sidebar to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedYears.map((year) => (
            <div key={year} className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                Year {year}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedSemesters[year].map((semester) => (
                  <Link
                    href={`/semesters/${semester.id}`}
                    key={semester.id}
                    className="block group"
                  >
                    <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {semester.name}
                          </CardTitle>
                          {semester.isCurrent && (
                            <Badge variant="default">Current</Badge>
                          )}
                        </div>
                        <CardDescription>
                          {format(new Date(semester.startDate), "MMM yyyy")} -{" "}
                          {format(new Date(semester.endDate), "MMM yyyy")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {semester.courses.length > 0 ? (
                            semester.courses.map((course) => (
                              <Badge
                                key={course.id}
                                variant="secondary"
                                style={{
                                  backgroundColor: course.color + "20",
                                  color: course.color || "#000",
                                  borderColor: course.color + "40",
                                }}
                                className="border"
                              >
                                {course.code}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              No courses
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
