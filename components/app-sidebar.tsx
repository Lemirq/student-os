"use client";

import * as React from "react";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Plus,
  ChevronRight,
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

export function AppSidebar({
  semesters,
}: {
  semesters: (Semester & { courses: Course[] })[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Flatten all courses across semesters for keyboard shortcuts
  const allCourses = React.useMemo(() => {
    return semesters.flatMap((semester) => semester.courses);
  }, [semesters]);

  // Hotkeys
  useHotkeys("g+t", () => router.push("/dashboard"));
  useHotkeys("g+s", () => router.push("/settings"));
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
      <SidebarHeader>
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
        {/* <SidebarGroup>
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
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup> */}

        <SidebarGroup>
          <SidebarGroupLabel>Semesters</SidebarGroupLabel>
          <SidebarGroupAction title="Add Semester" asChild>
            <Link href="/semesters/new">
              {" "}
              <Plus /> <span className="sr-only">Add Semester</span>
            </Link>
          </SidebarGroupAction>
          <SidebarMenu>
            {semesters.map((semester) => (
              <Collapsible
                key={semester.id}
                asChild
                defaultOpen={semester.isCurrent ?? false}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={semester.name}
                    isActive={pathname.startsWith(`/semesters/${semester.id}`)}
                  >
                    <Link href={`/semesters/${semester.id}`}>
                      <BookOpen />
                      <span>
                        {semester.name} <Kbd>G G</Kbd>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
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
                              asChild
                              isActive={pathname === `/courses/${course.id}`}
                            >
                              <Link href={`/courses/${course.id}`}>
                                <span
                                  className="mr-2 size-2 rounded-full border border-sidebar-border"
                                  style={{
                                    backgroundColor: course.color || "#000000",
                                  }}
                                />
                                <span>{course.code}</span>
                                {shortcutNumber && (
                                  <Kbd className="ml-auto opacity-60 group-hover/menu-item:opacity-100 group-data-[collapsible=icon]:hidden">
                                    <span className="text-xs">G</span>
                                    {shortcutNumber}
                                  </Kbd>
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href={`/semesters/${semester.id}/courses/new`}>
                            <Plus className="mr-2 size-4" />
                            <span>Add Course</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
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
