import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Laptop } from "lucide-react";
import Link from "next/link";
import { AgentList } from "@/components/agent/agent-list";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AgentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Monitor and manage your browser automation agents.
          </p>
        </div>
        <Link href="/chat">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Agent Task
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <Suspense fallback={<AgentsSkeleton />}>
          <AgentListWrapper />
        </Suspense>
      </div>
    </div>
  );
}

async function AgentListWrapper() {
  const supabase = await createClient();
  
  // Fetch sessions with pauses to check for pending HITL
  const { data: sessions, error } = await supabase
    .from("agent_sessions")
    .select(`
      *,
      agent_pauses (
        id,
        reason,
        created_at,
        resolved_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agents:", error);
    return <div className="p-4 text-red-500">Failed to load agents</div>;
  }

  return <AgentList sessions={sessions || []} />;
}

function AgentsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col space-y-3 rounded-xl border p-4 shadow-sm">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <div className="flex items-center gap-4 pt-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
