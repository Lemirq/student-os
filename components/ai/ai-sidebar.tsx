"use client";

import * as React from "react";
import { usePathname, useParams } from "next/navigation";
import {
  Sparkles,
  Trash2,
  GraduationCap,
  FileText,
  Upload,
  Brain,
  Search,
  Globe,
  ExternalLink,
  Link2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls, UIMessagePart } from "ai";
import { StudentOSTools, StudentOSDataTypes } from "@/types";
import { getPageContext, PageContext } from "@/actions/page-context";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DottedGlowBackground } from "../ui/dotted-glow-background";
import ChatInput from "@/components/chat-input";
import { StudentOSToolCallsMessage } from "@/app/api/chat/route";
import { SyllabusPreviewCard } from "./syllabus-preview-card";
import { useAIContext } from "@/hooks/use-ai-context";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChatHistory } from "./chat-history";
import { saveChat } from "@/actions/chats";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function AICopilotSidebar({ aiEnabled }: { aiEnabled: boolean }) {
  const [chatId, setChatId] = React.useState<string>("");
  const [mounted, setMounted] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [pageContext, setPageContext] = React.useState<PageContext>({
    type: "unknown",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingMessages, setPendingMessages] = React.useState<any[] | null>(
    null,
  );

  // Route hooks for page context awareness
  const pathname = usePathname();
  const params = useParams();

  // Fetch AI context (courses + grade weights) with caching
  const { data: aiContext } = useAIContext();

  React.useEffect(() => {
    setMounted(true);
    setChatId(crypto.randomUUID());
  }, []);

  // Fetch page context when route changes
  React.useEffect(() => {
    if (!mounted) return;

    const fetchContext = async () => {
      const paramsRecord: Record<string, string> = {};
      // Convert params to Record<string, string>
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (typeof value === "string") {
            paramsRecord[key] = value;
          }
        });
      }

      const context = await getPageContext(pathname, paramsRecord);
      setPageContext(context);
    };

    fetchContext();
  }, [pathname, params, mounted]);

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
    onData: (data) => {
      console.log("[DATA] ", data);
    },
    onError: (error) => {
      console.error("[ERROR] ", error);
    },
    onFinish: (data) => {
      console.log("[FINISH] ", data);
    },

    onToolCall: (toolCall) => {
      console.log("[TOOL CALL] ", toolCall);
    },
  });

  // Apply pending messages after chatId changes
  React.useEffect(() => {
    if (pendingMessages !== null) {
      setMessages(pendingMessages as unknown as StudentOSToolCallsMessage[]);
      setPendingMessages(null);
    }
  }, [chatId, pendingMessages, setMessages]);

  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      }
    },
    [],
  );

  // Check if user is at bottom of scroll container
  const checkIfAtBottom = React.useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;

    const threshold = 50; // pixels from bottom to consider "at bottom"
    const isBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      threshold;

    return isBottom;
  }, []);

  // Track scroll position to determine if user is at bottom
  React.useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = checkIfAtBottom();
      setIsAtBottom(atBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [checkIfAtBottom]);

  // Auto-scroll when new messages arrive, but only if user is at bottom
  React.useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage.role === "user";

    // Always scroll to bottom when:
    // 1. User just sent a message (force scroll)
    // 2. User is already at bottom (continue following)
    if (isUserMessage || isAtBottom) {
      // Use instant scroll for user messages, smooth for AI responses
      const behavior = isUserMessage ? "instant" : "smooth";
      const timer = setTimeout(() => {
        scrollToBottom(behavior as ScrollBehavior);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Also scroll during streaming if user is at bottom
  React.useEffect(() => {
    if (status === "streaming" && isAtBottom) {
      scrollToBottom("auto");
    }
  }, [status, isAtBottom, scrollToBottom]);

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
    setPendingMessages(loadedMessages);
    setChatId(id);
  };

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    setPendingMessages([]);
    setChatId(newId);
    setFiles([]);
  };

  const handleSubmit = async (text: string, submittedFiles?: File[]) => {
    const filesToSend = submittedFiles || files;

    // Pass page context, cached AI context, and user timezone via body
    const options = {
      body: {
        pageContext,
        aiContext, // Pass cached courses + grade weights
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // User's local timezone
      },
    };

    if (filesToSend && filesToSend.length > 0) {
      // Convert File[] to FileList for the AI SDK if needed, or pass as is if supported.
      // safely using DataTransfer to create a FileList to be sure.
      const dataTransfer = new DataTransfer();
      filesToSend.forEach((file) => dataTransfer.items.add(file));

      sendMessage(
        {
          text,
          files: dataTransfer.files,
        },
        options,
      );
    } else {
      sendMessage(
        {
          text,
        },
        options,
      );
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
      className={cn(
        "hidden lg:flex h-full ml-0 border bg-sidebar transition-colors",
        isDragging && "border-primary/50 bg-primary/5",
      )}
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
      <SidebarHeader className="border-b h-16 bg-transparent fc">
        <div className="flex items-center justify-between w-full">
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

      <SidebarContent ref={messagesContainerRef} className="scrollbar-sleek">
        {/* if the user's email isn't sharmavihaan190@gmail.com, then restrict access to AI */}
        {!aiEnabled ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] text-center p-6">
            <h3 className="font-semibold text-sm text-foreground">
              AI Copilot is not available for you. Contact
              sharmavihaan190@gmail.com <br />
              to get access.
            </h3>
          </div>
        ) : (
          <div>
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
                <div className="flex aspect-square size-16 items-center justify-center rounded-lg bg-white text-black z-20">
                  <GraduationCap className="size-8" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mt-3">
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
                      className={`flex flex-col gap-1 max-w-[90%] ${
                        m.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      {m.parts?.map((part, i) => {
                        const p = part as UIMessagePart<
                          StudentOSDataTypes,
                          StudentOSTools
                        >;
                        switch (p.type) {
                          case "text":
                            return (
                              <div
                                key={i}
                                className={`p-3 rounded-lg text-sm prose dark:prose-invert max-w-none wrap-anywhere overflow-hidden ${
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
                          // REASONING: Show AI's thinking process in accordion
                          // -----------------------------------------------------------------------
                          case "reasoning": {
                            const wordCount = p.text.trim().split(/\s+/).length;
                            // Collapse automatically when more than 100 words
                            const shouldBeOpen = wordCount < 100;
                            return (
                              <Accordion
                                key={i}
                                type="single"
                                collapsible
                                defaultValue={
                                  shouldBeOpen ? "reasoning" : undefined
                                }
                                className="w-full"
                              >
                                <AccordionItem
                                  value="reasoning"
                                  className="border-none"
                                >
                                  <AccordionTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-md hover:bg-muted/50 hover:no-underline">
                                    <Brain className="size-3.5 text-purple-500" />
                                    <span className="font-medium">
                                      Reasoning
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="mt-1 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs text-muted-foreground overflow-hidden">
                                      <div className="prose prose-xs dark:prose-invert max-w-none prose-p:text-muted-foreground prose-p:text-xs prose-p:leading-relaxed wrap-anywhere">
                                        <ReactMarkdown>{p.text}</ReactMarkdown>
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            );
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: parse_syllabus (composite tool - handles parsing + UI)
                          // -----------------------------------------------------------------------
                          case "tool-parse_syllabus": {
                            const callId = p.toolCallId;

                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    Parsing syllabus...
                                  </div>
                                );
                              case "output-available": {
                                // The composite tool returns { course, tasks, ui }
                                const output = p.output;
                                // Only require tasks to exist - course can be empty string
                                if (
                                  !output?.tasks ||
                                  !Array.isArray(output.tasks)
                                )
                                  return null;
                                // Pass the data in the format SyllabusPreviewCard expects
                                const data = {
                                  course: output.course || "",
                                  tasks: output.tasks,
                                };
                                return (
                                  <SyllabusPreviewCard
                                    key={callId}
                                    data={data}
                                  />
                                );
                              }
                              default:
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    Processing...
                                  </div>
                                );
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: query_schedule (composite - handles schedule query + UI)
                          // -----------------------------------------------------------------------
                          case "tool-query_schedule": {
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
                                const output = p.output;
                                const tasks = output?.tasks;

                                return (
                                  <div key={callId}>
                                    <div className="bg-muted p-3 rounded-lg text-sm w-full">
                                      <h4 className="font-medium mb-2">
                                        Schedule ({output?.start_date || "..."}{" "}
                                        - {output?.end_date || "..."})
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
                          // TOOL: calculate_grade_requirements (composite - handles grade calc + UI)
                          // -----------------------------------------------------------------------
                          case "tool-calculate_grade_requirements": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    Calculating grades...
                                  </div>
                                );
                              case "output-available": {
                                const data = p.output;
                                if (!data || data.error) {
                                  return (
                                    <div
                                      key={callId}
                                      className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg my-2 text-sm w-full"
                                    >
                                      <div className="text-destructive font-medium">
                                        ❌{" "}
                                        {data?.error || "Failed to calculate"}
                                      </div>
                                    </div>
                                  );
                                }
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
                              }
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
                          // TOOL: auto_schedule_tasks (composite - handles scheduling + UI)
                          // -----------------------------------------------------------------------
                          case "tool-auto_schedule_tasks": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    Scheduling tasks...
                                  </div>
                                );
                              case "output-available": {
                                const output = p.output;
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-4 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="flex items-center gap-2 mb-2 text-green-600">
                                      <Sparkles className="size-4" />
                                      <span className="font-medium">
                                        {output?.message || "Schedule Updated"}
                                      </span>
                                    </div>
                                    {output?.updates &&
                                    output.updates.length > 0 ? (
                                      <ul className="space-y-1 text-xs text-muted-foreground">
                                        {output.updates.map(
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
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic">
                                        No tasks needed scheduling.
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: rebalance_priorities (composite - handles rebalance + UI)
                          // -----------------------------------------------------------------------
                          case "tool-rebalance_priorities": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    Rebalancing priorities...
                                  </div>
                                );
                              case "output-available": {
                                const output = p.output;
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted/50 border border-border/50 p-3 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                      <Sparkles className="size-3.5" />
                                      <span className="font-medium text-xs">
                                        {output?.message ||
                                          "Priorities Rebalanced"}
                                      </span>
                                    </div>
                                    {output?.count > 0 && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Set {output.count} high-stakes task
                                        {output.count !== 1 ? "s" : ""} to High
                                        priority
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: create_tasks_natural_language (composite - handles task creation + UI)
                          // -----------------------------------------------------------------------
                          case "tool-create_tasks_natural_language": {
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
                              case "output-available": {
                                const output = p.output;
                                const taskArray = output?.tasks || [];
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
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: find_missing_data (composite - handles missing data check + UI)
                          // -----------------------------------------------------------------------
                          case "tool-find_missing_data": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    Checking for missing data...
                                  </div>
                                );
                              case "output-available": {
                                const output = p.output;
                                const tasks_without_weights =
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (output?.tasks_without_weights as any[]) ||
                                  [];
                                const tasks_without_dates =
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (output?.tasks_without_dates as any[]) || [];
                                const suggestion = output?.suggestion;
                                const hasIssues =
                                  tasks_without_weights.length > 0 ||
                                  tasks_without_dates.length > 0;

                                if (!hasIssues) {
                                  return (
                                    <div
                                      key={callId}
                                      className="bg-green-500/10 border border-green-200 p-3 rounded-lg my-2 text-sm w-full"
                                    >
                                      <div className="text-green-600 font-medium flex items-center gap-2">
                                        <span>✅</span>
                                        <span>All data looks clean!</span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={callId}
                                    className="bg-orange-500/10 border border-orange-200 p-4 rounded-lg my-2 text-sm w-full"
                                  >
                                    <h4 className="font-medium text-orange-800 dark:text-orange-400 mb-2">
                                      Missing Data Found
                                    </h4>
                                    {tasks_without_weights.length > 0 && (
                                      <div className="mb-3">
                                        <span className="text-xs font-semibold text-orange-800/80 dark:text-orange-400/80 block mb-1">
                                          Missing Grade Weights (
                                          {tasks_without_weights.length})
                                        </span>
                                        <ul className="list-disc list-inside text-xs text-orange-800/70 dark:text-orange-400/70">
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
                                        <span className="text-xs font-semibold text-orange-800/80 dark:text-orange-400/80 block mb-1">
                                          Missing Due Dates (
                                          {tasks_without_dates.length})
                                        </span>
                                        <ul className="list-disc list-inside text-xs text-orange-800/70 dark:text-orange-400/70">
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
                                    {suggestion && (
                                      <div className="mt-2 text-xs text-orange-800 dark:text-orange-400 italic border-t border-orange-200 dark:border-orange-800 pt-2">
                                        {suggestion}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: manage_grade_weights (composite - handles grade weights CRUD + UI)
                          // -----------------------------------------------------------------------
                          case "tool-manage_grade_weights": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    Managing grade weights...
                                  </div>
                                );
                              case "output-available": {
                                const result = p.output;

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
                                const weights = result.grade_weights || [];
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
                                          {action === "added" && "Weight added"}
                                          {action === "updated" &&
                                            "Weight updated"}
                                          {action === "deleted" &&
                                            "Weight deleted"}
                                        </span>
                                      </div>
                                    )}

                                    {weights.length === 0 ? (
                                      <div className="text-muted-foreground italic text-xs">
                                        No grade weights defined yet.
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {weights.map(
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
                                                {weight.weight_percent.toFixed(
                                                  1,
                                                )}
                                                %
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}

                                    {!isValid && weights.length > 0 && (
                                      <div className="mt-3 text-xs text-destructive border-t border-border pt-2">
                                        Warning: Weights do not add up to 100%
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: web_search (Tavily search)
                          // -----------------------------------------------------------------------
                          case "tool-web_search": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Search className="size-3.5 animate-pulse" />
                                      <span>Searching the web...</span>
                                    </div>
                                  </div>
                                );
                              case "output-available": {
                                const output = p.output;
                                const results = output?.results || [];
                                const answer = output?.answer;

                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted/50 border border-border/50 p-4 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                                      <Search className="size-4" />
                                      <span className="font-semibold text-sm">
                                        Web Search Results
                                      </span>
                                    </div>

                                    {answer && (
                                      <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                          AI Summary
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {answer}
                                        </div>
                                      </div>
                                    )}

                                    {results.length > 0 ? (
                                      <div className="space-y-2">
                                        <div className="text-xs font-medium text-muted-foreground mb-2">
                                          Sources ({results.length})
                                        </div>
                                        {results.map(
                                          (
                                            result: {
                                              title: string;
                                              url: string;
                                              content: string;
                                              score?: number;
                                            },
                                            i: number,
                                          ) => (
                                            <div
                                              key={i}
                                              className="p-3 bg-background/50 rounded border border-border/30 hover:border-blue-400/50 transition-colors"
                                            >
                                              <div className="flex items-start justify-between gap-2 mb-1">
                                                <a
                                                  href={result.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="font-medium text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 flex-1"
                                                >
                                                  {result.title}
                                                  <ExternalLink className="size-3 shrink-0" />
                                                </a>
                                              </div>
                                              <div className="text-[10px] text-muted-foreground/70 truncate mb-2">
                                                {result.url}
                                              </div>
                                              <div className="text-xs text-muted-foreground line-clamp-3">
                                                {result.content}
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic">
                                        No results found
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: extract_content (Tavily extract)
                          // -----------------------------------------------------------------------
                          case "tool-extract_content": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FileText className="size-3.5 animate-pulse" />
                                      <span>Extracting content...</span>
                                    </div>
                                  </div>
                                );
                              case "output-available": {
                                const output = p.output;
                                const results = output?.results || [];

                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted/50 border border-border/50 p-4 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="flex items-center gap-2 mb-3 text-green-600 dark:text-green-400">
                                      <FileText className="size-4" />
                                      <span className="font-semibold text-sm">
                                        Extracted Content
                                      </span>
                                    </div>

                                    {results.length > 0 ? (
                                      <div className="space-y-3">
                                        {results.map(
                                          (
                                            result: {
                                              url: string;
                                              content: string;
                                              images?: string[];
                                            },
                                            i: number,
                                          ) => (
                                            <div
                                              key={i}
                                              className="p-3 bg-background/50 rounded border border-border/30"
                                            >
                                              <div className="flex items-center gap-1 mb-2">
                                                <Link2 className="size-3 text-muted-foreground" />
                                                <a
                                                  href={result.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline truncate"
                                                >
                                                  {result.url}
                                                </a>
                                              </div>
                                              <div className="prose prose-xs dark:prose-invert max-w-none text-xs">
                                                <ReactMarkdown>
                                                  {result.content &&
                                                  result.content.length > 500
                                                    ? result.content.slice(
                                                        0,
                                                        500,
                                                      ) + "..."
                                                    : result.content}
                                                </ReactMarkdown>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic">
                                        No content extracted
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: crawl_website (Tavily crawl)
                          // -----------------------------------------------------------------------
                          case "tool-crawl_website": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Globe className="size-3.5 animate-pulse" />
                                      <span>Crawling website...</span>
                                    </div>
                                  </div>
                                );
                              case "output-available": {
                                const output = p.output;
                                const results = output?.results || [];

                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted/50 border border-border/50 p-4 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="flex items-center gap-2 mb-3 text-purple-600 dark:text-purple-400">
                                      <Globe className="size-4" />
                                      <span className="font-semibold text-sm">
                                        Website Crawl Results
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="ml-auto"
                                      >
                                        {results.length} pages
                                      </Badge>
                                    </div>

                                    {results.length > 0 ? (
                                      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-sleek">
                                        {results.map(
                                          (
                                            result: {
                                              url: string;
                                              content: string;
                                            },
                                            i: number,
                                          ) => (
                                            <div
                                              key={i}
                                              className="p-2.5 bg-background/50 rounded border border-border/30 hover:border-purple-400/50 transition-colors"
                                            >
                                              <a
                                                href={result.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline truncate flex items-center gap-1 mb-1.5"
                                              >
                                                <ExternalLink className="size-2.5 shrink-0" />
                                                {result.url}
                                              </a>
                                              <div className="text-xs text-muted-foreground line-clamp-2">
                                                {result.content.slice(0, 150)}
                                                {result.content.length > 150
                                                  ? "..."
                                                  : ""}
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic">
                                        No pages crawled
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: map_website (Tavily map)
                          // -----------------------------------------------------------------------
                          case "tool-map_website": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Globe className="size-3.5 animate-pulse" />
                                      <span>Mapping website...</span>
                                    </div>
                                  </div>
                                );
                              case "output-available": {
                                const output = p.output;
                                const results = output?.results || [];

                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted/50 border border-border/50 p-4 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="flex items-center gap-2 mb-3 text-orange-600 dark:text-orange-400">
                                      <Globe className="size-4" />
                                      <span className="font-semibold text-sm">
                                        Website Map
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="ml-auto"
                                      >
                                        {results.length} pages
                                      </Badge>
                                    </div>

                                    {results.length > 0 ? (
                                      <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-sleek">
                                        {results.map(
                                          (
                                            result: {
                                              url: string;
                                              title?: string;
                                            },
                                            i: number,
                                          ) => (
                                            <div
                                              key={i}
                                              className="p-2 bg-background/50 rounded border border-border/30 hover:border-orange-400/50 transition-colors"
                                            >
                                              <a
                                                href={result.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                                              >
                                                <ExternalLink className="size-3 shrink-0" />
                                                <span className="truncate">
                                                  {result.title || result.url}
                                                </span>
                                              </a>
                                              {result.title && (
                                                <div className="text-[10px] text-muted-foreground/70 truncate mt-0.5 ml-4">
                                                  {result.url}
                                                </div>
                                              )}
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic">
                                        No pages found
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          }

                          // -----------------------------------------------------------------------
                          // TOOL: bulk_update_tasks
                          // -----------------------------------------------------------------------
                          case "tool-bulk_update_tasks": {
                            const callId = p.toolCallId;
                            switch (p.state) {
                              case "input-streaming":
                              case "input-available":
                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted p-3 rounded-lg text-sm w-full animate-pulse"
                                  >
                                    <div className="flex items-center gap-2">
                                      <RefreshCw className="size-3.5 animate-spin" />
                                      <span>Updating tasks...</span>
                                    </div>
                                  </div>
                                );
                              case "output-available": {
                                const output = p.output;

                                // Handle error case
                                if (!output?.success) {
                                  return (
                                    <div
                                      key={callId}
                                      className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg my-2 text-sm w-full"
                                    >
                                      <div className="text-destructive font-medium flex items-center gap-2">
                                        <span>❌</span>
                                        <span>
                                          {output?.error ||
                                            "Failed to update tasks"}
                                        </span>
                                      </div>
                                      {output?.searched_for && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Searched for: &quot;
                                          {output.searched_for}&quot;
                                          {output.course_filter &&
                                            ` in ${output.course_filter}`}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                const updatedTasks = output.updated_tasks || [];
                                const errors = output.errors || [];
                                const course = output.course;

                                return (
                                  <div
                                    key={callId}
                                    className="bg-muted/50 border border-border/50 p-4 rounded-lg my-2 text-sm w-full"
                                  >
                                    <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                                      <RefreshCw className="size-4" />
                                      <span className="font-semibold text-sm">
                                        Bulk Update
                                      </span>
                                      {course && (
                                        <Badge
                                          variant="outline"
                                          className="ml-auto"
                                        >
                                          {course.code}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="text-xs text-muted-foreground mb-3">
                                      {output.summary}
                                    </div>

                                    {updatedTasks.length > 0 ? (
                                      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-sleek">
                                        {updatedTasks.map(
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                          (task: any, i: number) => (
                                            <div
                                              key={task.id || i}
                                              className="p-2.5 bg-background/50 rounded border border-border/30 hover:border-blue-400/50 transition-colors"
                                            >
                                              <div className="font-medium text-xs mb-1.5 truncate">
                                                {task.new_title ||
                                                  task.original_title ||
                                                  task.title}
                                              </div>
                                              <div className="space-y-1">
                                                {task.changes?.title && (
                                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                    <span>Renamed:</span>
                                                    <span className="text-muted-foreground/70 truncate max-w-[80px]">
                                                      {task.changes.title.from}
                                                    </span>
                                                    <ArrowRight className="size-2.5 flex-shrink-0" />
                                                    <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[80px]">
                                                      {task.changes.title.to}
                                                    </span>
                                                  </div>
                                                )}
                                                {task.changes?.status && (
                                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                    <span>Status:</span>
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[10px] h-4 px-1"
                                                    >
                                                      {task.changes.status}
                                                    </Badge>
                                                  </div>
                                                )}
                                                {task.changes?.priority && (
                                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                    <span>Priority:</span>
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[10px] h-4 px-1"
                                                    >
                                                      {task.changes.priority}
                                                    </Badge>
                                                  </div>
                                                )}
                                                {task.changes?.description !==
                                                  undefined && (
                                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                    <span>Description:</span>
                                                    <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[120px]">
                                                      {task.changes
                                                        .description ||
                                                        "(cleared)"}
                                                    </span>
                                                  </div>
                                                )}
                                                {task.changes?.scoreReceived !==
                                                  undefined && (
                                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                    <span>Score:</span>
                                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                      {task.changes
                                                        .scoreReceived ??
                                                        "(cleared)"}
                                                    </span>
                                                  </div>
                                                )}
                                                {task.changes?.dueDate && (
                                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                    <span>Due:</span>
                                                    <span className="text-muted-foreground/70">
                                                      {format(
                                                        new Date(
                                                          task.changes.dueDate
                                                            .from,
                                                        ),
                                                        "MMM d, h:mm a",
                                                      )}
                                                    </span>
                                                    <ArrowRight className="size-2.5" />
                                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                      {format(
                                                        new Date(
                                                          task.changes.dueDate
                                                            .to,
                                                        ),
                                                        "MMM d, h:mm a",
                                                      )}
                                                    </span>
                                                  </div>
                                                )}
                                                {task.changes?.doDate && (
                                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                    <span>Do:</span>
                                                    <span className="text-muted-foreground/70">
                                                      {format(
                                                        new Date(
                                                          task.changes.doDate
                                                            .from,
                                                        ),
                                                        "MMM d, h:mm a",
                                                      )}
                                                    </span>
                                                    <ArrowRight className="size-2.5" />
                                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                      {format(
                                                        new Date(
                                                          task.changes.doDate
                                                            .to,
                                                        ),
                                                        "MMM d, h:mm a",
                                                      )}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic">
                                        No tasks were updated
                                      </div>
                                    )}

                                    {errors.length > 0 && (
                                      <div className="mt-3 pt-2 border-t border-border">
                                        <div className="text-xs text-destructive font-medium mb-1">
                                          {errors.length} error
                                          {errors.length !== 1 ? "s" : ""}:
                                        </div>
                                        <div className="space-y-1">
                                          {errors.map(
                                            (
                                              err: {
                                                title: string;
                                                error: string;
                                              },
                                              i: number,
                                            ) => (
                                              <div
                                                key={i}
                                                className="text-[10px] text-destructive/80"
                                              >
                                                {err.title}: {err.error}
                                              </div>
                                            ),
                                          )}
                                        </div>
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
                    <div className="bg-muted p-3 rounded-lg text-sm max-w-[90%]">
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
              </div>
            )}
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 bg-transparent">
        <ChatInput
          disabled={!aiEnabled}
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
