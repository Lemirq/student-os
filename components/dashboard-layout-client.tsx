"use client";

import { useSidebarData } from "@/hooks/use-sidebar-data";
import { AppSidebar } from "./app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { AICopilotSidebar } from "./ai/ai-sidebar";
import { GlobalCreateTaskModal } from "./tasks/global-create-task-modal";
import { TaskCommandMenu } from "./tasks/task-command-menu";
import { Provider as ChatStoreProvider } from "@ai-sdk-tools/store";

export function DashboardLayoutClient({
  children,
  defaultOpen,
  aiEnabled,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  aiEnabled: boolean;
}) {
  const { data, isLoading } = useSidebarData();

  if (isLoading || !data) {
    // Show a minimal loading state
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="flex h-screen items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
        </div>
      </SidebarProvider>
    );
  }

  return (
    <ChatStoreProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar semesters={data.semesters} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
            </div>
            <div className="flex items-center gap-2">
              <SidebarTrigger side="right" />
            </div>
          </header>
          <div className="flex dark flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
        <AICopilotSidebar aiEnabled={aiEnabled} />
        <GlobalCreateTaskModal semesters={data.semesters} />
        <TaskCommandMenu />
      </SidebarProvider>
    </ChatStoreProvider>
  );
}
