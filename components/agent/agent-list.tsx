"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentStatusBadge } from "@/components/agent/agent-hitl-prompt";
import Link from "next/link";
import { ExternalLink, Terminal, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentListProps {
  sessions: any[];
}

export function AgentList({ sessions }: AgentListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Terminal className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No agents found</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
          You haven&apos;t run any browser agents yet. Start a new chat to spawn an agent.
        </p>
        <Link href="/chat">
          <Button>Start New Agent</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => {
        const hasPendingHITL = session.hitl_status === "pending";
        const pendingPause = session.agent_pauses?.find((p: any) => !p.resolved_at);
        
        return (
          <Card key={session.id} className={`flex flex-col transition-all hover:shadow-md ${hasPendingHITL ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-medium line-clamp-2 leading-tight">
                  {session.prompt}
                </CardTitle>
                <AgentStatusBadge status={session.status} hitlStatus={session.hitl_status} />
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
              <div className="text-xs text-muted-foreground flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Terminal className="h-3 w-3" />
                  <span className="font-mono text-[10px]">{session.container_id?.substring(0, 12) || "Allocating..."}</span>
                </div>
                <div className="flex items-center gap-1">
                   <Clock className="h-3 w-3" />
                   <span>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              
              {hasPendingHITL && (
                <div className="mt-3 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400 border border-yellow-500/20">
                  <div className="font-semibold mb-0.5">Input Required</div>
                  <div>{pendingPause?.reason || "Agent needs assistance"}</div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Link href={`/agents/${session.id}`} className="w-full">
                <Button variant={hasPendingHITL ? "default" : "secondary"} className={`w-full gap-2 ${hasPendingHITL ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}`}>
                  <ExternalLink className="h-4 w-4" />
                  {hasPendingHITL ? "Resolve Issue" : "View Details"}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
