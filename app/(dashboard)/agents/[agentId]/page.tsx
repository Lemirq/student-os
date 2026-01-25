import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { AgentLiveView } from "@/components/agent/agent-live-view";
import {
  AgentHITLPrompt,
  AgentStatusBadge,
} from "@/components/agent/agent-hitl-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Terminal } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface PageProps {
  params: Promise<{
    agentId: string;
  }>;
}

import { AgentDetailClient } from "./client-page";

export default async function AgentDetailPage(props: PageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: session, error } = await supabase
    .from("agent_sessions")
    .select(
      `
      *,
      agent_pauses (
        id,
        reason,
        snapshot_base64,
        created_at,
        resolved_at
      ),
      agent_actions (
        id,
        action,
        created_at
      )
    `,
    )
    .eq("id", params.agentId)
    .single();

  if (error || !session) {
    console.error("Error fetching session:", error);
    notFound();
  }

  // Determine WS URL (env var or default)
  const agentServiceUrl =
    process.env.AGENT_SERVICE_URL || "http://127.0.0.1:3001";
  const wsUrl = agentServiceUrl.replace(/^http/, "ws") + "/ws";

  return <AgentDetailClient session={session} wsUrl={wsUrl} />;
}
