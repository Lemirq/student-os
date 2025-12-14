import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AICopilotSidebar } from "@/components/ai/ai-sidebar";
import { getSidebarData } from "@/actions/sidebar";
import { GlobalCreateTaskModal } from "@/components/tasks/global-create-task-modal";
import { TaskCommandMenu } from "@/components/tasks/task-command-menu";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { semesters } = await getSidebarData();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const aiEnabled = user?.user?.email === "sharmavihaan190@gmail.com";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar semesters={semesters} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              title="Toggle AI"
            >
              <Sparkles className="size-4" />
            </Button>
            <SidebarTrigger side="right" />
          </div>
        </header>
        <div className="flex dark flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
      <AICopilotSidebar aiEnabled={aiEnabled} />
      <GlobalCreateTaskModal semesters={semesters} />
      <TaskCommandMenu />
    </SidebarProvider>
  );
}
