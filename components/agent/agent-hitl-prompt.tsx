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
  taskId: string;
  question: string;
  context?: string;
  browserViewUrl?: string;
  onResume?: () => void;
}

export function AgentHITLPrompt({
  taskId,
  question,
  context,
  browserViewUrl,
  onResume,
}: AgentHITLPromptProps) {
  const [userResponse, setUserResponse] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  const handleSubmit = async () => {
    if (!userResponse.trim()) {
      toast.error("Please provide a response");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resumeAgent(taskId, userResponse);

      if (result.success) {
        toast.success("Agent resumed successfully");
        setIsDismissed(true);
        onResume?.();
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

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      const result = await resumeAgent(taskId, "CANCEL");

      if (result.success) {
        toast.success("Agent task cancelled");
        setIsDismissed(true);
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
    <Card className="border-primary/50 bg-primary/5 p-4 space-y-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="rounded-full bg-primary/10 p-2 mt-0.5">
            <AlertCircle className="size-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Agent Needs Your Input</h3>
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" />
                Paused
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{question}</p>
          </div>
        </div>
      </div>

      {context && (
        <div className="bg-muted/50 rounded-md p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Additional Context
          </p>
          <ScrollArea className="max-h-32">
            <p className="text-sm whitespace-pre-wrap">{context}</p>
          </ScrollArea>
        </div>
      )}

      {browserViewUrl && (
        <a
          href={browserViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="size-4" />
          View Live Browser Session
        </a>
      )}

      <div className="space-y-3">
        <Textarea
          placeholder="Type your response here..."
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          className="min-h-24 resize-none"
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-muted-foreground"
          >
            <X className="size-4" />
            Cancel Task
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !userResponse.trim()}
            size="sm"
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Resuming...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Resume Agent
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface AgentStatusBadgeProps {
  status: "running" | "paused" | "completed" | "failed";
  className?: string;
}

export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  const variants = {
    running: {
      icon: Loader2,
      label: "Running",
      className:
        "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      iconClassName: "animate-spin",
    },
    paused: {
      icon: Clock,
      label: "Paused",
      className:
        "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20",
      iconClassName: "",
    },
    completed: {
      icon: CheckCircle2,
      label: "Completed",
      className:
        "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
      iconClassName: "",
    },
    failed: {
      icon: AlertCircle,
      label: "Failed",
      className:
        "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20",
      iconClassName: "",
    },
  };

  const variant = variants[status];
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
