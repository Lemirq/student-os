"use client";

import { useState, useRef, useEffect } from "react";
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

interface AgentDetailClientProps {
  session: any;
  wsUrl: string;
}

export function AgentDetailClient({ session, wsUrl }: AgentDetailClientProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pendingPause = session.agent_pauses?.find((p: any) => !p.resolved_at);

  const handleLog = (log: string) => {
    setLogs((prev) => [...prev, log]);
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/agents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {session.container_id.substring(0, 8)}
            </Badge>
            <AgentStatusBadge
              status={session.status}
              hitlStatus={session.hitl_status}
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight line-clamp-1">
            Agent Task
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Live View, Logs, Result */}
        <div className="lg:col-span-2 space-y-6">
          {pendingPause && (
            <AgentHITLPrompt
              sessionId={session.id}
              pauseId={pendingPause.id}
              reason={pendingPause.reason}
              snapshot={pendingPause.snapshot_base64}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live View</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <AgentLiveView
                sessionId={session.id}
                wsUrl={wsUrl}
                initialStatus={session.status}
                onLog={handleLog}
              />
            </CardContent>
          </Card>

          <Card className="flex flex-col h-[400px] pb-0">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                System Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto bg-black/90 p-4 font-mono text-xs text-green-400">
              <div className="space-y-1">
                {logs.length === 0 && (
                  <div className="text-muted-foreground italic">
                    Connect to see live logs...
                  </div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all">
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>

          {session.result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-4 font-mono text-xs overflow-auto max-h-[400px]">
                  <pre>{JSON.stringify(session.result, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Info & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Prompt
                </div>
                <p className="text-sm border rounded-md p-3 bg-muted/30">
                  {session.prompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Created
                  </div>
                  <div className="text-sm">
                    {new Date(session.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Duration
                  </div>
                  <div className="text-sm">
                    {formatDistanceToNow(new Date(session.created_at))}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Details
                </div>
                <div className="flex flex-col gap-1 text-xs font-mono text-muted-foreground">
                  <div>ID: {session.id}</div>
                  <div>Container: {session.container_id}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-[500px]">
            <CardHeader>
              <CardTitle className="text-base">Action History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-4">
              {session.agent_actions && session.agent_actions.length > 0 ? (
                <div className="relative border-l border-muted ml-2 space-y-6">
                  {session.agent_actions.map((action: any) => (
                    <div key={action.id} className="ml-4 relative">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground/20 ring-4 ring-background" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {action.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(action.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No actions recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
