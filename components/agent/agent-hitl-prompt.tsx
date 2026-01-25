"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { resumeAgent } from "@/actions/agents/resume-agent";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentHITLPromptProps {
  sessionId: string;
  pauseId: string;
  reason: string;
  snapshot?: string | null;
  onResolved?: () => void;
}

export function AgentHITLPrompt({
  sessionId,
  pauseId,
  reason,
  snapshot,
  onResolved,
}: AgentHITLPromptProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Resume the agent (action: "completed")
  const handleResume = async () => {
    setIsSubmitting(true);
    try {
      const result = await resumeAgent(sessionId, pauseId, "completed");

      if (result.success) {
        toast.success("Agent resumed successfully");
        setIsDismissed(true);
        onResolved?.();
      } else {
        toast.error(result.error || "Failed to resume agent");
      }
    } catch (error) {
      console.error("Failed to resume agent:", error);
      toast.error("An error occurred while resuming the agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel the task (action: "cancelled")
  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      const result = await resumeAgent(sessionId, pauseId, "cancelled");

      if (result.success) {
        toast.success("Agent task cancelled");
        setIsDismissed(true);
        onResolved?.();
      } else {
        toast.error(result.error || "Failed to cancel agent");
      }
    } catch (error) {
      console.error("Failed to cancel agent:", error);
      toast.error("An error occurred while cancelling the agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5 shadow-sm p-4 space-y-4 mb-4">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-yellow-500/10 p-2 mt-0.5">
          <AlertCircle className="size-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-yellow-700 dark:text-yellow-400">
              Agent Needs Help
            </h3>
            <Badge
              variant="outline"
              className="gap-1 border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
            >
              <Clock className="size-3" />
              Paused
            </Badge>
          </div>
          <p className="text-sm font-medium">{reason}</p>
        </div>
      </div>

      {snapshot && (
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-black/5 dark:bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/jpeg;base64,${snapshot}`}
            alt="Agent Snapshot"
            className="object-contain w-full h-full"
          />
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <a
          href={`/agents/${sessionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center justify-center gap-2 text-sm font-medium h-9 rounded-md px-3",
            "bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          )}
        >
          <ExternalLink className="size-4" />
          Open Live Control
        </a>

        <div className="flex items-center justify-end gap-2 border-t pt-3 mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
          >
            <X className="size-4 mr-2" />
            Cancel Task
          </Button>

          <Button
            onClick={handleResume}
            disabled={isSubmitting}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            I've Resolved It - Resume
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface AgentStatusBadgeProps {
  status: "running" | "stopped" | "error" | "completed";
  hitlStatus?: "none" | "pending" | "active" | "resolved";
  className?: string;
}

export function AgentStatusBadge({
  status,
  hitlStatus,
  className,
}: AgentStatusBadgeProps) {
  // If HITL is pending/active, show Paused status
  if (hitlStatus === "pending" || hitlStatus === "active") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
          className
        )}
      >
        <Clock className="size-3" />
        Paused (Help Needed)
      </Badge>
    );
  }

  const variants: Record<string, any> = {
    running: {
      icon: Loader2,
      label: "Running",
      className:
        "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      iconClassName: "animate-spin",
    },
    stopped: {
      icon: CheckCircle2, // or stop icon
      label: "Stopped",
      className:
        "bg-muted text-muted-foreground border-border",
      iconClassName: "",
    },
    completed: {
      icon: CheckCircle2,
      label: "Completed",
      className:
        "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
      iconClassName: "",
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      className:
        "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
      iconClassName: "",
    },
  };

  const variant = variants[status] || variants.stopped;
  const Icon = variant.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", variant.className, className)}
    >
      <Icon className={cn("size-3", variant.iconClassName)} />
      {variant.label}
    </Badge>
  );
}
