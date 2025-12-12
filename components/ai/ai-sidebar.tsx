"use client";

import * as React from "react";
import { Sparkles, Trash2, GraduationCap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
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

export function AICopilotSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const {
    messages,
    setMessages,
    status,
    sendMessage,
    stop,
    error,
    regenerate,
    addToolOutput,
  } = useChat<StudentOSToolCallsMessage>({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "showSyllabus") {
        addToolOutput({
          tool: "showSyllabus",
          toolCallId: toolCall.toolCallId,
          output: "Syllabus shown to user",
        });
      }
      if (toolCall.toolName === "showSchedule") {
        addToolOutput({
          tool: "showSchedule",
          toolCallId: toolCall.toolCallId,
          output: "Schedule shown to user",
        });
      }
      if (toolCall.toolName === "showTaskUpdate") {
        addToolOutput({
          tool: "showTaskUpdate",
          toolCallId: toolCall.toolCallId,
          output: "Task update confirmed to user",
        });
      }
    },
  });

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  return (
    <Sidebar
      side="right"
      collapsible="none"
      className="hidden lg:flex h-[calc(100svh-2rem)] m-4 rounded-xl border shadow-xl bg-sidebar/60 backdrop-blur-xl sticky top-4"
      {...props}
    >
      <SidebarHeader className="border-b p-4 bg-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4" />
            <span>StudentOS AI</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Clear Chat"
              onClick={() => setMessages([])}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Clear Chat</span>
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
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
            <div className="flex flex-col gap-4 p-4 min-h-[calc(100vh-10rem)]">
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
                    {m.parts ? (
                      m.parts.map((part, i) => {
                        if (part.type === "text") {
                          return (
                            <div
                              key={i}
                              className={`p-3 rounded-lg text-sm prose dark:prose-invert max-w-none ${
                                m.role === "user"
                                  ? "bg-primary text-primary-foreground prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-a:text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <ReactMarkdown>{part.text}</ReactMarkdown>
                            </div>
                          );
                        }

                        if (
                          part.type === "tool-showSyllabus" &&
                          part.input?.data
                        ) {
                          return (
                            <SyllabusPreviewCard
                              key={part.toolCallId}
                              // @ts-expect-error - Partial input data type mismatch during streaming
                              data={part.input.data}
                            />
                          );
                        }

                        if (part.type === "tool-showSchedule") {
                          return (
                            <div
                              key={part.toolCallId}
                              className="bg-muted p-3 rounded-lg text-sm w-full"
                            >
                              <h4 className="font-medium mb-2">
                                Schedule (
                                {part.input?.startDate
                                  ? part.input.startDate
                                  : "..."}
                                {" - "}
                                {part.input?.endDate
                                  ? part.input.endDate
                                  : "..."}
                                )
                              </h4>
                              {part.input?.tasks &&
                              part.input.tasks.length > 0 ? (
                                <ul className="space-y-2">
                                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                  {part.input.tasks.map((task: any) => (
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
                          );
                        }

                        if (part.type === "tool-showTaskUpdate") {
                          return (
                            <div key={part.toolCallId} className="my-2">
                              <Badge
                                variant="outline"
                                className="bg-green-500/10 text-green-600 border-green-200"
                              >
                                ✅ {part.input?.status || "Updated"}
                              </Badge>
                              {part.input?.taskName && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Updated {part.input.taskName} to{" "}
                                  {part.input.score}%
                                </div>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })
                    ) : (
                      <div
                        className={`p-3 rounded-lg text-sm prose dark:prose-invert max-w-none ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-a:text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <ReactMarkdown>{(m as any).content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(status === "submitted" || status === "streaming") && (
                <div className="flex items-start gap-2">
                  <div className="bg-muted p-3 rounded-lg text-sm max-w-[85%]">
                    {status === "submitted" ? (
                      <div>Loading...</div>
                    ) : (
                      <div className="flex space-x-1 h-5 items-center">
                        <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                      </div>
                    )}
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
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-transparent">
        <ChatInput
          status={status}
          onStop={stop}
          onSubmit={(text) => sendMessage({ text })}
        />
        <div className="text-[10px] text-center text-muted-foreground/60 mt-2">
          AI can make mistakes. Check important info.
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
