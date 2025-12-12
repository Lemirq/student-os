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

export function AppSidebar({
  semesters,
}: {
  semesters: (Semester & { courses: Course[] })[];
}) {
  const pathname = usePathname();
  const router = useRouter();

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
                  <span className="truncate font-semibold">StudentOS</span>
                  <span className="truncate text-xs">Organize your life</span>
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
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

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
                      <span>{semester.name}</span>
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
                      {semester.courses.map((course) => (
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
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
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
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
