"use client";

import * as React from "react";
import {
  Sparkles,
  Trash2,
  GraduationCap,
  FileText,
  Upload,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DottedGlowBackground } from "../ui/dotted-glow-background";
import ChatInput from "@/components/chat-input";
import { StudentOSToolCallsMessage } from "@/app/api/chat/route";
import { SyllabusPreviewCard } from "./syllabus-preview-card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChatHistory } from "./chat-history";
import { saveChat } from "@/actions/chats";
import { cn } from "@/lib/utils";

export function AICopilotSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [chatId, setChatId] = React.useState<string>("");
  const [mounted, setMounted] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setChatId(crypto.randomUUID());
  }, []);

  const {
    messages,
    setMessages,
    status,
    sendMessage,
    stop,
    error,
    regenerate,
  } = useChat({
    id: chatId,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: (message) => {
      console.log("Chat finished:", message);
    },
    onToolCall: (toolCall) => {
      console.log("Tool call:", toolCall);
    },
  });

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const messagesLength = messages.length;

  // Use IntersectionObserver to track if the user is at the bottom
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtBottom(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0, // Trigger as soon as any part is visible
      },
    );

    if (scrollRef.current) {
      observer.observe(scrollRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [messagesLength]); // Re-attach when the list potentially mounts/unmounts

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.closest(
        '[data-slot="scroll-area-viewport"]',
      );
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, []);

  React.useEffect(() => {
    if (messages.length === 0) return;

    // Check if the last message is from the user
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage.role === "user";

    // Scroll to bottom if:
    // 1. The user just sent a message (always force scroll)
    // 2. We were already at the bottom (sticky scroll)
    if (isUserMessage || isAtBottom) {
      // Use a small timeout to ensure DOM is updated
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, status, scrollToBottom, isAtBottom]);

  // Autosave chat
  React.useEffect(() => {
    if (messages.length > 0 && chatId && mounted) {
      const timer = setTimeout(async () => {
        try {
          await saveChat({
            id: chatId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages: messages as any[],
          });
        } catch (e) {
          console.error("Failed to save chat", e);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, chatId, mounted]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectChat = (id: string, loadedMessages: any[]) => {
    setChatId(id);
    setMessages(loadedMessages as unknown as StudentOSToolCallsMessage[]);
  };

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    setChatId(newId);
    setMessages([]);
    setFiles([]);
  };

  const handleSubmit = async (text: string, submittedFiles?: File[]) => {
    const filesToSend = submittedFiles || files;

    if (filesToSend && filesToSend.length > 0) {
      // Convert File[] to FileList for the AI SDK if needed, or pass as is if supported.
      // safely using DataTransfer to create a FileList to be sure.
      const dataTransfer = new DataTransfer();
      filesToSend.forEach((file) => dataTransfer.items.add(file));

      sendMessage({
        text,
        files: dataTransfer.files,
      });
    } else {
      sendMessage({
        text,
      });
    }
    setFiles([]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set dragging to false if we're leaving the main container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  if (!mounted) return null;

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className={cn(
        "hidden lg:flex h-[calc(100svh-2rem)] m-4 rounded-xl border shadow-xl bg-sidebar/60 backdrop-blur-xl sticky top-4 transition-colors",
        isDragging && "border-primary/50 bg-primary/5",
      )}
      {...props}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-primary animate-in fade-in duration-200">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <Upload className="size-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Drop files here</h3>
          <p className="text-muted-foreground text-sm">
            Add files to your chat
          </p>
        </div>
      )}
      <SidebarHeader className="border-b p-4 bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4" />
            <span>StudentOS AI</span>
          </div>
          <div className="flex items-center gap-1">
            <ChatHistory
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              currentChatId={chatId}
            />
            <Button
              variant="ghost"
              size="icon"
              title="Clear Chat"
              onClick={handleNewChat}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Clear Chat</span>
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <DottedGlowBackground
            className="pointer-events-none mask-radial-to-90% mask-radial-at-center opacity-20 dark:opacity-100"
            opacity={0.4}
            gap={10}
            radius={1.6}
            colorLightVar="--color-neutral-500"
            glowColorLightVar="--color-neutral-600"
            colorDarkVar="--color-neutral-500"
            glowColorDarkVar="--color-accent-800"
            backgroundOpacity={1}
            speedMin={0.3}
            speedMax={1.6}
            speedScale={1}
          />
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] text-center p-6">
              <GraduationCap className="size-16 text-muted-foreground/20 mb-4" />
              <h3 className="font-semibold text-lg text-foreground">
                StudentOS AI
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[15rem]">
                Ask questions. Get suggestions. Plan your semester.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4 min-h-full justify-end">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col gap-2 ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`flex flex-col gap-1 max-w-[85%] ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {m.parts?.map((part, i) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const p = part as any;
                      switch (p.type) {
                        case "text":
                          return (
                            <div
                              key={i}
                              className={`p-3 rounded-lg text-sm prose dark:prose-invert max-w-none ${
                                m.role === "user"
                                  ? "bg-primary text-primary-foreground prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-a:text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <ReactMarkdown>{p.text}</ReactMarkdown>
                            </div>
                          );

                        case "file":
                          if (p.url && p.mediaType?.startsWith("image/")) {
                            return (
                              <div key={i} className="mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={p.url}
                                  alt={p.filename || "Image attachment"}
                                  className="rounded-lg max-w-full max-h-[300px] object-cover"
                                />
                              </div>
                            );
                          }
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mb-2"
                            >
                              <FileText className="size-8 text-muted-foreground" />
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium truncate max-w-[12rem]">
                                  {p.filename || "File attachment"}
                                </span>
                                <span className="text-xs text-muted-foreground uppercase">
                                  {p.mediaType?.split("/").pop() || "FILE"}
                                </span>
                              </div>
                            </div>
                          );

                        // -----------------------------------------------------------------------
                        // TOOL: showSyllabus
                        // -----------------------------------------------------------------------
                        case "tool-showSyllabus": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                            // return (
                            //   <div
                            //     key={callId}
                            //     className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                            //   >
                            //     Generating syllabus preview...
                            //   </div>
                            // );
                            case "output-available": {
                              const data = p.output?.data; // The tool returns { data }
                              if (!data) return null;
                              return (
                                <div key={callId}>
                                  <SyllabusPreviewCard data={data} />
                                </div>
                              );
                            }
                            default:
                              return <div>Generating</div>;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: showSchedule
                        // -----------------------------------------------------------------------
                        case "tool-showSchedule": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return (
                                <div
                                  key={callId}
                                  className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                >
                                  Fetching schedule...
                                </div>
                              );
                            case "output-available": {
                              const args = p.input; // Start/End date are in input
                              const tasks = p.output?.tasks; // Tasks are in output

                              return (
                                <div key={callId}>
                                  <div className="bg-muted p-3 rounded-lg text-sm w-full">
                                    <h4 className="font-medium mb-2">
                                      Schedule ({args?.start_date || "..."} -{" "}
                                      {args?.end_date || "..."})
                                    </h4>
                                    {tasks && tasks.length > 0 ? (
                                      <ul className="space-y-2">
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {tasks.map((task: any) => (
                                          <li
                                            key={task.id}
                                            className="flex justify-between items-center text-xs"
                                          >
                                            <span>{task.title}</span>
                                            <span className="text-muted-foreground">
                                              {task.dueDate
                                                ? format(
                                                    new Date(task.dueDate),
                                                    "MMM d",
                                                  )
                                                : "No date"}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="text-muted-foreground italic">
                                        No tasks found.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            default:
                              return null;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: showTaskUpdate
                        // -----------------------------------------------------------------------
                        case "tool-showTaskUpdate": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return <div key={callId}>Updating task...</div>;
                            case "output-available":
                              const update = p.output?.taskUpdate;
                              return (
                                <div key={callId} className="my-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-green-500/10 text-green-600 border-green-200"
                                  >
                                    ✅ {update?.status || "Updated"}
                                  </Badge>
                                  {update?.task && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Updated {update.task} to {update.score}%
                                    </div>
                                  )}
                                </div>
                              );
                            default:
                              return null;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: update_task_score
                        // -----------------------------------------------------------------------
                        case "tool-update_task_score": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return (
                                <div
                                  key={callId}
                                  className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                >
                                  Updating score...
                                </div>
                              );
                            case "output-available": {
                              const result = p.output;

                              if (!result?.success) {
                                return (
                                  <div
                                    key={callId}
                                    className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="text-destructive font-medium flex items-center gap-2">
                                      <span>❌</span>
                                      <span>
                                        {result?.message ||
                                          "Failed to update task"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={callId}
                                  className="bg-muted/50 border border-border/50 p-3 rounded-lg my-2 text-sm w-full"
                                >
                                  <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                                    <Sparkles className="size-3.5" />
                                    <span className="font-medium text-xs">
                                      Score updated
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 bg-background/50 rounded border border-border/30">
                                    <span className="font-medium truncate">
                                      {result.task}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                        {result.score}%
                                      </span>
                                      {result.status === "Done" && (
                                        <span className="text-green-600 dark:text-green-400">
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            default:
                              return null;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: showGradeRequirements
                        // -----------------------------------------------------------------------
                        case "tool-showGradeRequirements": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return (
                                <div key={callId}>Calculating grades...</div>
                              );
                            case "output-available":
                              const data = p.output?.data;
                              if (!data) return null;
                              return (
                                <div
                                  key={callId}
                                  className="bg-muted p-4 rounded-lg my-2 text-sm w-full"
                                >
                                  <h4 className="font-semibold mb-2">
                                    Grade Analysis
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div>
                                      <span className="text-xs text-muted-foreground block">
                                        Current Grade
                                      </span>
                                      <span className="font-medium text-lg">
                                        {data.current_grade}%
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground block">
                                        Goal Grade
                                      </span>
                                      <span className="font-medium text-lg">
                                        {data.goal_grade}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-background/50 p-2 rounded border">
                                    <span className="text-xs text-muted-foreground block">
                                      Required on Remaining (
                                      {data.remaining_weight}%)
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                      <span className="font-bold text-xl text-primary">
                                        {data.required_avg_on_remaining}%
                                      </span>
                                      <Badge
                                        variant={
                                          data.status === "Impossible"
                                            ? "destructive"
                                            : data.status === "Secured"
                                              ? "default"
                                              : "outline"
                                        }
                                      >
                                        {data.status}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              );
                            default:
                              return null;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: showScheduleUpdate
                        // -----------------------------------------------------------------------
                        case "tool-showScheduleUpdate": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return (
                                <div key={callId}>Scheduling tasks...</div>
                              );
                            case "output-available":
                              const updates = p.output?.updates;
                              return (
                                <div
                                  key={callId}
                                  className="bg-muted p-4 rounded-lg my-2 text-sm w-full"
                                >
                                  <div className="flex items-center gap-2 mb-2 text-green-600">
                                    <Sparkles className="size-4" />
                                    <span className="font-medium">
                                      {updates?.message || "Schedule Updated"}
                                    </span>
                                  </div>
                                  <ul className="space-y-1 text-xs text-muted-foreground">
                                    {updates?.updates?.map(
                                      (
                                        u: {
                                          title: string;
                                          new_do_date: string;
                                        },
                                        i: number,
                                      ) => (
                                        <li key={i}>
                                          📅 <b>{u?.title}</b> &rarr;{" "}
                                          {format(
                                            new Date(u?.new_do_date),
                                            "MMM d",
                                          )}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              );
                            default:
                              return null;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: showPriorityRebalance
                        // -----------------------------------------------------------------------
                        case "tool-showPriorityRebalance": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return (
                                <div key={callId}>
                                  Rebalancing priorities...
                                </div>
                              );
                            case "output-available":
                              const count = p.output?.count;
                              return (
                                <div key={callId} className="my-2">
                                  <Badge
                                    variant="secondary"
                                    className="gap-1 py-1"
                                  >
                                    <Sparkles className="size-3" />
                                    {count?.message || "Priorities Rebalanced"}
                                  </Badge>
                                </div>
                              );
                            default:
                              return null;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: showCreatedTasks
                        // -----------------------------------------------------------------------
                        case "tool-showCreatedTasks": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return (
                                <div
                                  key={callId}
                                  className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                >
                                  Creating tasks...
                                </div>
                              );
                            case "output-available":
                              const tasks = p.output?.tasks;
                              const taskArray = Array.isArray(tasks)
                                ? tasks
                                : tasks?.tasks || [];
                              const taskCount = taskArray.length;

                              if (taskCount === 0) {
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-4 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="text-muted-foreground italic">
                                      No tasks created
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={callId}
                                  className="bg-muted/50 border border-border/50 p-3 rounded-lg my-2 text-sm w-full"
                                >
                                  <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
                                    <Sparkles className="size-3.5" />
                                    <span className="font-medium text-xs">
                                      {taskCount} task
                                      {taskCount !== 1 ? "s" : ""} created
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {taskArray.map((t: any, i: number) => {
                                      const hasScore =
                                        t.scoreReceived && t.scoreMax;
                                      const scorePercent = hasScore
                                        ? (
                                            (parseFloat(t.scoreReceived) /
                                              parseFloat(t.scoreMax)) *
                                            100
                                          ).toFixed(0)
                                        : null;

                                      return (
                                        <div
                                          key={i}
                                          className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 bg-background/50 rounded border border-border/30 hover:border-green-400/50 transition-colors"
                                        >
                                          <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <span className="font-medium truncate">
                                              {t.title}
                                            </span>
                                            {hasScore && (
                                              <span className="text-green-600 dark:text-green-400 font-semibold shrink-0">
                                                {scorePercent}%
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                                            {t.dueDate && (
                                              <span className="text-[10px]">
                                                {format(
                                                  new Date(t.dueDate),
                                                  "MMM d",
                                                )}
                                              </span>
                                            )}
                                            {t.status === "Done" && (
                                              <span className="text-green-600 dark:text-green-400">
                                                ✓
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            default:
                              return null;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: showMissingData
                        // -----------------------------------------------------------------------
                        case "tool-showMissingData": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return (
                                <div key={callId}>
                                  Checking for missing data...
                                </div>
                              );
                            case "output-available":
                              const data = p.output; // { tasks_without_dates, suggestion }
                              const tasks_without_weights =
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (data?.tasks_without_weights as any[]) || [];
                              const tasks_without_dates =
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (data?.tasks_without_dates as any[]) || [];
                              const suggestion = data?.suggestion;
                              const hasIssues =
                                tasks_without_weights.length > 0 ||
                                tasks_without_dates.length > 0;

                              if (!hasIssues) {
                                return (
                                  <div
                                    key={callId}
                                    className="text-sm text-green-600 my-2"
                                  >
                                    ✅ All data looks clean!
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={callId}
                                  className="bg-orange-500/10 border border-orange-200 p-4 rounded-lg my-2 text-sm w-full"
                                >
                                  <h4 className="font-medium text-orange-800 mb-2">
                                    Missing Data Found
                                  </h4>
                                  {tasks_without_weights.length > 0 && (
                                    <div className="mb-3">
                                      <span className="text-xs font-semibold text-orange-800/80 block mb-1">
                                        Missing Grade Weights (
                                        {tasks_without_weights.length})
                                      </span>
                                      <ul className="list-disc list-inside text-xs text-orange-800/70">
                                        {tasks_without_weights
                                          .slice(0, 3)
                                          .map((t, i) => (
                                            <li key={i}>{t.title}</li>
                                          ))}
                                        {tasks_without_weights.length > 3 && (
                                          <li>
                                            ...and{" "}
                                            {tasks_without_weights.length - 3}{" "}
                                            more
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                  {tasks_without_dates.length > 0 && (
                                    <div className="mb-2">
                                      <span className="text-xs font-semibold text-orange-800/80 block mb-1">
                                        Missing Due Dates (
                                        {tasks_without_dates.length})
                                      </span>
                                      <ul className="list-disc list-inside text-xs text-orange-800/70">
                                        {tasks_without_dates
                                          .slice(0, 3)
                                          .map((t, i) => (
                                            <li key={i}>{t.title}</li>
                                          ))}
                                        {tasks_without_dates.length > 3 && (
                                          <li>
                                            ...and{" "}
                                            {tasks_without_dates.length - 3}{" "}
                                            more
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                  <div className="mt-2 text-xs text-orange-800 italic border-t border-orange-200 pt-2">
                                    {suggestion}
                                  </div>
                                </div>
                              );
                            default:
                              return null;
                          }
                        }

                        // -----------------------------------------------------------------------
                        // TOOL: showGradeWeights
                        // -----------------------------------------------------------------------
                        case "tool-showGradeWeights": {
                          const callId = p.toolCallId;
                          switch (p.state) {
                            case "input-streaming":
                            case "input-available":
                              return (
                                <div key={callId}>
                                  Managing grade weights...
                                </div>
                              );
                            case "output-available": {
                              const result = p.output?.result;

                              if (!result) return null;

                              // Handle error case
                              if (!result.success) {
                                return (
                                  <div
                                    key={callId}
                                    className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="text-destructive font-medium">
                                      ❌ {result.error}
                                    </div>
                                  </div>
                                );
                              }

                              const course = result.course;
                              const gradeWeights = result.grade_weights || [];
                              const totalWeight = result.total_weight || 0;
                              const isValid = result.is_valid;
                              const action = result.action;

                              return (
                                <div
                                  key={callId}
                                  className="bg-muted p-4 rounded-lg my-2 text-sm w-full"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold">
                                      Grade Weights - {course?.code}
                                      {course?.name && (
                                        <span className="text-muted-foreground font-normal ml-1">
                                          ({course.name})
                                        </span>
                                      )}
                                    </h4>
                                    <Badge
                                      variant={
                                        isValid ? "default" : "destructive"
                                      }
                                    >
                                      Total: {totalWeight.toFixed(1)}%
                                    </Badge>
                                  </div>

                                  {action && (
                                    <div className="mb-2 text-xs text-green-600 flex items-center gap-1">
                                      <Sparkles className="size-3" />
                                      <span>
                                        {action === "added" &&
                                          "✅ Weight added"}
                                        {action === "updated" &&
                                          "✅ Weight updated"}
                                        {action === "deleted" &&
                                          "✅ Weight deleted"}
                                      </span>
                                    </div>
                                  )}

                                  {gradeWeights.length === 0 ? (
                                    <div className="text-muted-foreground italic text-xs">
                                      No grade weights defined yet.
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {gradeWeights.map(
                                        (
                                          weight: {
                                            id: string;
                                            name: string;
                                            weight_percent: number;
                                          },
                                          index: number,
                                        ) => (
                                          <div
                                            key={weight.id || index}
                                            className="flex items-center justify-between py-2 px-3 bg-background/50 rounded border"
                                          >
                                            <span className="font-medium text-xs">
                                              {weight.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {weight.weight_percent.toFixed(1)}
                                              %
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}

                                  {!isValid && gradeWeights.length > 0 && (
                                    <div className="mt-3 text-xs text-destructive border-t border-border pt-2">
                                      ⚠️ Warning: Weights do not add up to 100%
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            default:
                              return null;
                          }
                        }

                        default:
                          // Fallback for unknown parts
                          return null;
                      }
                    })}
                  </div>
                </div>
              ))}
              {status === "submitted" && (
                <div className="flex items-start gap-2">
                  <div className="bg-muted p-3 rounded-lg text-sm max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex flex-col items-center gap-2 mt-4 text-red-500 text-sm">
                  <div>An error occurred.</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => regenerate()}
                  >
                    Retry
                  </Button>
                </div>
              )}
              <div ref={scrollRef} className="h-px w-full" />
            </div>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-transparent">
        <ChatInput
          status={status}
          onStop={stop}
          onSubmit={handleSubmit}
          files={files}
          onFilesChange={setFiles}
        />
        <div className="text-[10px] text-center text-muted-foreground/60 mt-2">
          AI can make mistakes. Check important info.
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
