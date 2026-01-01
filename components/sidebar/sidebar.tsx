"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Semester, Course } from "@/types";
import { useHotkeys } from "react-hotkeys-hook";

const SIDEBAR_EXPANDED_KEY = "sidebar-expanded-semesters";

type SidebarProps = {
  semesters: (Semester & { courses: Course[] })[];
};

export function Sidebar({ semesters }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Initialize from localStorage or default to current semester expanded
  const [expandedSemesters, setExpandedSemesters] = useState<
    Record<string, boolean>
  >(() => {
    // Default: expand current semester
    return semesters.reduce(
      (acc, semester) => ({ ...acc, [semester.id]: semester.isCurrent }),
      {},
    );
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        // Merge with current semesters (in case new semesters were added)
        setExpandedSemesters((prev) => {
          const merged = { ...prev };
          // Apply saved state for semesters that exist
          semesters.forEach((semester) => {
            if (semester.id in parsed) {
              merged[semester.id] = parsed[semester.id];
            }
          });
          return merged;
        });
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever expanded state changes (after initialization)
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(
          SIDEBAR_EXPANDED_KEY,
          JSON.stringify(expandedSemesters),
        );
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [expandedSemesters, isInitialized]);

  // Global Navigation Shortcuts
  useHotkeys("g+t", () => router.push("/dashboard"));
  useHotkeys("g+s", () => router.push("/settings"));
  useHotkeys("g+c", () => {
    if (semesters.length > 0) {
      router.push(`/semesters/${semesters[0].id}`);
    } else {
      router.push("/semesters/new");
    }
  });

  const toggleSemester = (semesterId: string) => {
    setExpandedSemesters((prev) => ({
      ...prev,
      [semesterId]: !prev[semesterId],
    }));
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <GraduationCap className="h-6 w-6" />
          <span className="">StudentOS</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
              pathname === "/dashboard"
                ? "bg-muted text-primary"
                : "text-muted-foreground",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
            <Kbd className="ml-auto">
              <span className="text-xs">G</span>T
            </Kbd>
          </Link>

          <div className="mt-4 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
            Semesters
            <Link href="/semesters/new">
              <Button variant="ghost" size="icon-sm" className="h-5 w-5">
                <Plus className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {semesters.length === 0 && (
            <div className="px-3 text-sm text-muted-foreground">
              No semesters found.
            </div>
          )}

          {semesters.map((semester) => (
            <div key={semester.id} className="mb-1">
              <div
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary cursor-pointer select-none",
                  pathname.startsWith(`/semesters/${semester.id}`) &&
                    pathname === `/semesters/${semester.id}`
                    ? "bg-muted text-primary"
                    : "text-muted-foreground",
                )}
                onClick={() => {
                  router.push(`/semesters/${semester.id}`);
                  if (!expandedSemesters[semester.id]) {
                    toggleSemester(semester.id);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSemester(semester.id);
                    }}
                    className="p-1 hover:bg-muted-foreground/10 rounded"
                  >
                    {expandedSemesters[semester.id] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                  <span>{semester.name}</span>
                </div>
                <Link
                  href={`/semesters/${semester.id}/courses/new`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="h-3 w-3 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>

              {expandedSemesters[semester.id] && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                  {semester.courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary text-sm",
                        pathname === `/courses/${course.id}`
                          ? "bg-muted text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: course.color || "#000000" }}
                      />
                      {course.code}
                    </Link>
                  ))}
                  {semester.courses.length === 0 && (
                    <div className="px-3 py-1 text-xs text-muted-foreground">
                      No courses
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <Link href="/settings">
          <Button variant="outline" className="w-full justify-start gap-2">
            Settings
            <Kbd className="ml-auto">
              <span className="text-xs">G</span>S
            </Kbd>
          </Button>
        </Link>
      </div>
    </div>
  );
}
