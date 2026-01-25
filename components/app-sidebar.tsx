"use client";

import * as React from "react";
import {
  GraduationCap,
  Settings,
  Plus,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Calendar,
  Laptop,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Semester, Course } from "@/types";
import { Kbd } from "@/components/ui/kbd";
import { CreateSemesterDialog } from "@/components/semesters/create-semester-dialog";
import { CreateCourseDialog } from "@/components/courses/create-course-dialog";
import { createClient } from "@/utils/supabase/client";
import { usePrefetchLinks } from "@/hooks/use-prefetch-links";

const SIDEBAR_YEARS_KEY = "sidebar-expanded-years";
const SIDEBAR_SEMESTERS_KEY = "sidebar-expanded-semesters";

export function AppSidebar({
  semesters,
}: {
  semesters: (Semester & { courses: Course[] })[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { prefetchCourse } = usePrefetchLinks();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // or refresh/redirect as needed
  };

  // Flatten all courses across semesters for keyboard shortcuts
  const allCourses = React.useMemo(() => {
    return semesters.flatMap((semester) => semester.courses);
  }, [semesters]);

  // Group semesters by year level
  const groupedSemesters = React.useMemo(() => {
    const groups = new Map<number, (Semester & { courses: Course[] })[]>();
    semesters.forEach((s) => {
      const year = s.yearLevel;
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year)!.push(s);
    });
    // Sort by year level ascending
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [semesters]);

  // Helper to get default years state
  const getDefaultYears = React.useCallback(() => {
    const defaultYears: Record<number, boolean> = {};
    semesters.forEach((s) => {
      const year = s.yearLevel;
      if (s.isCurrent) defaultYears[year] = true;
    });
    return defaultYears;
  }, [semesters]);

  // Helper to get default semesters state
  const getDefaultSemesters = React.useCallback(() => {
    const defaultSemesters: Record<string, boolean> = {};
    semesters.forEach((s) => {
      defaultSemesters[s.id] = s.isCurrent ?? false;
    });
    return defaultSemesters;
  }, [semesters]);

  // Expanded state for years
  const [expandedYears, setExpandedYears] = React.useState<
    Record<number, boolean>
  >({});

  // Expanded state for semesters
  const [expandedSemesters, setExpandedSemesters] = React.useState<
    Record<string, boolean>
  >({});

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    // Years
    try {
      const savedYears = localStorage.getItem(SIDEBAR_YEARS_KEY);
      if (savedYears) {
        setExpandedYears(JSON.parse(savedYears));
      }
    } catch {}

    // Semesters
    try {
      const savedSemesters = localStorage.getItem(SIDEBAR_SEMESTERS_KEY);
      if (savedSemesters) {
        setExpandedSemesters(JSON.parse(savedSemesters));
      }
    } catch {}
  }, []);

  // Track if we've set defaults (only do this once on mount)
  const hasSetDefaults = React.useRef(false);

  // Set defaults on mount if localStorage was empty
  React.useEffect(() => {
    if (hasSetDefaults.current) return;
    hasSetDefaults.current = true;

    // Only set defaults if state is empty (no localStorage data)
    if (Object.keys(expandedYears).length === 0) {
      setExpandedYears(getDefaultYears());
    }
    if (Object.keys(expandedSemesters).length === 0) {
      setExpandedSemesters(getDefaultSemesters());
    }
  }, [expandedYears, expandedSemesters, getDefaultYears, getDefaultSemesters]);

  // Save years to localStorage when changed
  React.useEffect(() => {
    if (Object.keys(expandedYears).length > 0) {
      try {
        localStorage.setItem(SIDEBAR_YEARS_KEY, JSON.stringify(expandedYears));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [expandedYears]);

  // Save semesters to localStorage when changed
  React.useEffect(() => {
    if (Object.keys(expandedSemesters).length > 0) {
      try {
        localStorage.setItem(
          SIDEBAR_SEMESTERS_KEY,
          JSON.stringify(expandedSemesters),
        );
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [expandedSemesters]);

  // Toggle handlers
  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleSemester = (semesterId: string) => {
    setExpandedSemesters((prev) => ({
      ...prev,
      [semesterId]: !prev[semesterId],
    }));
  };

  // Hotkeys
  useHotkeys("g+t", () => router.push("/dashboard"));
  useHotkeys("g+s", () => router.push("/settings"));
  useHotkeys("g+h", () => router.push("/schedule"));
  useHotkeys("g+a", () => router.push("/agents"));
  useHotkeys("g+c", () => {
    if (semesters.length > 0) {
      router.push(`/semesters/${semesters[0].id}`);
    } else {
      router.push("/semesters/new");
    }
  });

  // Navigate to current semester
  useHotkeys("g+g", () => {
    const currentSemester = semesters.find((s) => s.isCurrent);
    if (currentSemester) {
      router.push(`/semesters/${currentSemester.id}`);
    } else if (semesters.length > 0) {
      router.push(`/semesters/${semesters[0].id}`);
    }
  });

  // Course navigation shortcuts (g-1, g-2, etc.)
  // Register up to 9 course shortcuts
  useHotkeys(
    "g+1",
    () => allCourses[0] && router.push(`/courses/${allCourses[0].id}`),
  );
  useHotkeys(
    "g+2",
    () => allCourses[1] && router.push(`/courses/${allCourses[1].id}`),
  );
  useHotkeys(
    "g+3",
    () => allCourses[2] && router.push(`/courses/${allCourses[2].id}`),
  );
  useHotkeys(
    "g+4",
    () => allCourses[3] && router.push(`/courses/${allCourses[3].id}`),
  );
  useHotkeys(
    "g+5",
    () => allCourses[4] && router.push(`/courses/${allCourses[4].id}`),
  );
  useHotkeys(
    "g+6",
    () => allCourses[5] && router.push(`/courses/${allCourses[5].id}`),
  );
  useHotkeys(
    "g+7",
    () => allCourses[6] && router.push(`/courses/${allCourses[6].id}`),
  );
  useHotkeys(
    "g+8",
    () => allCourses[7] && router.push(`/courses/${allCourses[7].id}`),
  );
  useHotkeys(
    "g+9",
    () => allCourses[8] && router.push(`/courses/${allCourses[8].id}`),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="text-2xl tracking-tight font-bold text-white">
                    {/* when not expanded, show sOS, otherwise show StudentOS */}
                    StudentOS
                  </div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/dashboard"}
                tooltip="Dashboard"
              >
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                  <Kbd className="ml-auto">
                    <span className="text-xs">G</span>T
                  </Kbd>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/schedule"}
                tooltip="Schedule"
              >
                <Link href="/schedule">
                  <Calendar />
                  <span>Schedule</span>
                  <Kbd className="ml-auto">
                    <span className="text-xs">G</span>H
                  </Kbd>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/agents")}
                tooltip="Agents"
              >
                <Link href="/agents">
                  <Laptop />
                  <span>Agents</span>
                  <Kbd className="ml-auto">
                    <span className="text-xs">G</span>A
                  </Kbd>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Semesters</SidebarGroupLabel>
          <CreateSemesterDialog>
            <SidebarGroupAction title="Add Semester">
              <Plus /> <span className="sr-only">Add Semester</span>
            </SidebarGroupAction>
          </CreateSemesterDialog>
          <SidebarMenu>
            {groupedSemesters.map(([year, yearSemesters]) => (
              <Collapsible
                key={year}
                open={expandedYears[year] ?? false}
                onOpenChange={() => toggleYear(year)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={`Year ${year}`}>
                      <span className="font-medium">Year {year}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="border-border mx-1">
                      {yearSemesters.map((semester) => (
                        <Collapsible
                          key={semester.id}
                          asChild
                          open={expandedSemesters[semester.id] ?? false}
                          onOpenChange={() => toggleSemester(semester.id)}
                          className="group/semester-collapsible"
                        >
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname.startsWith(
                                `/semesters/${semester.id}`,
                              )}
                              className="pr-8" // Make room for the action
                            >
                              <Link href={`/semesters/${semester.id}`}>
                                <span>
                                  {semester.name}{" "}
                                  {semester.isCurrent && <Kbd>G G</Kbd>}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuAction className="data-[state=open]:rotate-90">
                                <ChevronRight />
                                <span className="sr-only">Toggle</span>
                              </SidebarMenuAction>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub className="border-border mr-0 ml-1">
                                {semester.courses.map((course) => {
                                  const courseIndex = allCourses.findIndex(
                                    (c) => c.id === course.id,
                                  );
                                  const shortcutNumber =
                                    courseIndex !== -1 && courseIndex < 9
                                      ? courseIndex + 1
                                      : null;

                                  return (
                                    <SidebarMenuSubItem key={course.id}>
                                      <SidebarMenuSubButton
                                        className="px-0"
                                        asChild
                                        isActive={
                                          pathname === `/courses/${course.id}`
                                        }
                                      >
                                        <Link
                                          href={`/courses/${course.id}`}
                                          onMouseEnter={() =>
                                            prefetchCourse(course.id)
                                          }
                                        >
                                          <span
                                            className="mr-2 size-2 rounded-full border"
                                            style={{
                                              backgroundColor:
                                                course.color || "#000000",
                                            }}
                                          />
                                          <span>{course.code}</span>
                                          {shortcutNumber &&
                                            semester.isCurrent && (
                                              <Kbd className="ml-auto opacity-60 group-hover/menu-item:opacity-100 group-data-[collapsible=icon]:hidden">
                                                <span className="text-xs">
                                                  G
                                                </span>
                                                {shortcutNumber}
                                              </Kbd>
                                            )}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  );
                                })}
                                <SidebarMenuSubItem>
                                  <CreateCourseDialog semesterId={semester.id}>
                                    <SidebarMenuSubButton>
                                      <Plus className="mr-2 size-4" />
                                      <span>Add Course</span>
                                    </SidebarMenuSubButton>
                                  </CreateCourseDialog>
                                </SidebarMenuSubItem>
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuSubItem>
                        </Collapsible>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              isActive={pathname === "/settings"}
            >
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Log out">
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-4 py-2 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
          created with love by{" "}
          <a
            href="https://vhaan.me"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-medium"
          >
            vihaan
          </a>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
