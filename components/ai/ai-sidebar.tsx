"use client";

import * as React from "react";
import {
  usePathname,
  useParams,
  useSearchParams,
  useRouter,
} from "next/navigation";
import {
  Sparkles,
  Trash2,
  GraduationCap,
  FileText,
  Upload,
  Search,
  Globe,
  ExternalLink,
  Link2,
  RefreshCw,
  ArrowRight,
  Save,
  Database,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat } from "@ai-sdk/react";
import { preprocessMarkdown } from "@/lib/markdown-preprocessor";
import { lastAssistantMessageIsCompleteWithToolCalls, UIMessagePart } from "ai";
import { StudentOSTools, StudentOSDataTypes } from "@/types";
import { getPageContext, PageContext } from "@/actions/page-context";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface TaggedDocument {
  fileName: string;
  courseId: string;
}

interface StudentOSUIMessage extends StudentOSToolCallsMessage {
  taggedDocuments?: TaggedDocument[];
}

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
import { saveChat, getChat } from "@/actions/chats";
import { cn, stripSystemReminders } from "@/lib/utils";
import { ReasoningAccordion } from "./reasoning-accordion";
import {
  QuizPreviewCard,
  type QuizQuestion,
} from "@/components/quiz/quiz-preview-card";

export function AICopilotSidebar({ aiEnabled }: { aiEnabled: boolean }) {
  const [chatId, setChatId] = React.useState<string>("");
  const [mounted, setMounted] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [pageContext, setPageContext] = React.useState<PageContext>({
    type: "unknown",
  });
  // Store messages by chatId to avoid flashing
  const messagesByChatId = React.useRef<
    Map<string, StudentOSToolCallsMessage[]>
  >(new Map());
  // Track if we're loading a chat to prevent clearing messages
  const isLoadingChat = React.useRef(false);

  // Route hooks for page context awareness
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch AI context (courses + grade weights) with caching
  const { data: aiContext } = useAIContext();

  // Track the chatId that pendingMessages are for - declared early so mount effect can use it
  const pendingChatIdRef = React.useRef<string>("");

  // Update URL search param when chatId changes
  const updateChatParam = React.useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("chat", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // Initialize chat from search params or create new one
  React.useEffect(() => {
    setMounted(true);

    const chatParam = searchParams.get("chat");
    if (chatParam) {
      // Load chat from URL param
      const loadChatFromParam = async () => {
        try {
          isLoadingChat.current = true;
          const chat = await getChat(chatParam);
          if (chat) {
            // Store messages in the map
            messagesByChatId.current.set(
              chatParam,
              (chat.messages as unknown as StudentOSToolCallsMessage[]) || [],
            );
            pendingChatIdRef.current = chatParam;
            setChatId(chatParam);
            // Set messages after a brief delay to ensure useChat has processed the id change
            setTimeout(() => {
              setMessages(
                chat.messages as unknown as StudentOSToolCallsMessage[],
              );
            }, 50);
          } else {
            // Chat not found, create new one
            const newId = crypto.randomUUID();
            messagesByChatId.current.set(newId, []);
            setChatId(newId);
            updateChatParam(newId);
          }
        } catch (error) {
          console.error("Failed to load chat from param", error);
          const newId = crypto.randomUUID();
          messagesByChatId.current.set(newId, []);
          setChatId(newId);
          updateChatParam(newId);
        } finally {
          isLoadingChat.current = false;
        }
      };
      loadChatFromParam();
    } else {
      // No chat param, create new one
      const newId = crypto.randomUUID();
      messagesByChatId.current.set(newId, []);
      setChatId(newId);
      updateChatParam(newId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Watch for search param changes (e.g., browser back/forward)
  // Use a ref to track if we're updating from URL to prevent loops
  const isUpdatingFromUrl = React.useRef(false);
  const handledMissingChats = React.useRef<Set<string>>(new Set());
  const lastProcessedChatParam = React.useRef<string>("");

  React.useEffect(() => {
    if (!mounted) return;

    const chatParam = searchParams.get("chat");

    // Skip if we just processed this chat param (prevents infinite loop)
    if (chatParam === lastProcessedChatParam.current) {
      return;
    }

    if (chatParam && chatParam !== chatId) {
      // Prevent infinite loop if we've already handled this missing chat
      if (handledMissingChats.current.has(chatParam)) {
        // Still update lastProcessed to prevent retries
        lastProcessedChatParam.current = chatParam;
        return;
      }

      isUpdatingFromUrl.current = true;
      lastProcessedChatParam.current = chatParam;

      // Load chat from URL param
      const loadChatFromParam = async () => {
        try {
          isLoadingChat.current = true;
          const chat = await getChat(chatParam);
          if (chat) {
            // Chat found, clear from handled set in case it was there
            handledMissingChats.current.delete(chatParam);
            // Store messages in the map
            messagesByChatId.current.set(
              chatParam,
              (chat.messages as unknown as StudentOSToolCallsMessage[]) || [],
            );
            pendingChatIdRef.current = chatParam;
            setChatId(chatParam);
            // Set messages after a brief delay to ensure useChat has processed the id change
            setTimeout(() => {
              setMessages(
                chat.messages as unknown as StudentOSToolCallsMessage[],
              );
            }, 50);
          } else {
            // Chat not found - create empty chat with that ID (don't create new random ID)
            // This way the URL stays consistent
            handledMissingChats.current.add(chatParam);
            messagesByChatId.current.set(chatParam, []);
            setChatId(chatParam);
            // DON'T update URL - it already has the correct ID
          }
        } catch (error) {
          console.error("Failed to load chat from param", error);
          // Mark as handled to prevent retry loop
          handledMissingChats.current.add(chatParam);
          // Create empty chat with the same ID from URL
          messagesByChatId.current.set(chatParam, []);
          setChatId(chatParam);
          // DON'T update URL
        } finally {
          isLoadingChat.current = false;
          isUpdatingFromUrl.current = false;
        }
      };
      loadChatFromParam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, mounted, chatId, updateChatParam]);

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

  // Sync messages with our store when they change (for autosave)
  // Also restore messages if useChat cleared them after id change
  const prevChatIdRef = React.useRef<string>("");
  const isRestoringRef = React.useRef(false);

  React.useEffect(() => {
    // Skip if we're in the middle of loading or restoring
    if (isLoadingChat.current || isRestoringRef.current) {
      return;
    }

    if (!chatId) {
      prevChatIdRef.current = "";
      return;
    }

    // If chatId changed, useChat might have reset messages
    // Restore from store if messages are empty but we have stored messages
    if (chatId !== prevChatIdRef.current) {
      prevChatIdRef.current = chatId;
      const storedMessages = messagesByChatId.current.get(chatId);

      // If we have stored messages but current messages are empty, restore them
      if (
        storedMessages &&
        storedMessages.length > 0 &&
        messages.length === 0
      ) {
        isRestoringRef.current = true;
        // Small delay to ensure useChat has processed
        const timer = setTimeout(() => {
          if (chatId === prevChatIdRef.current) {
            const msgs = messagesByChatId.current.get(chatId);
            if (msgs && messages.length === 0) {
              setMessages(msgs as unknown as StudentOSToolCallsMessage[]);
            }
          }
          isRestoringRef.current = false;
        }, 50);
        return () => {
          clearTimeout(timer);
          isRestoringRef.current = false;
        };
      }
    }
  }, [chatId, messages, setMessages]);

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

  // Autosave chat and update stored messages
  React.useEffect(() => {
    if (chatId && mounted) {
      // Update stored messages whenever they change
      messagesByChatId.current.set(chatId, messages);

      // Autosave if there are messages
      if (messages.length > 0) {
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
    }
  }, [messages, chatId, mounted]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectChat = (id: string, loadedMessages: any[]) => {
    isUpdatingFromUrl.current = false;
    isLoadingChat.current = true;
    // Store messages in the map before changing chatId
    messagesByChatId.current.set(id, loadedMessages);
    pendingChatIdRef.current = id;
    // Set chatId first (useChat will reset messages)
    setChatId(id);
    updateChatParam(id);
    // Set messages after useChat has processed the id change
    setTimeout(() => {
      setMessages(loadedMessages as unknown as StudentOSToolCallsMessage[]);
      isLoadingChat.current = false;
    }, 50);
  };

  const handleNewChat = () => {
    isUpdatingFromUrl.current = false;
    isLoadingChat.current = true;
    const newId = crypto.randomUUID();
    messagesByChatId.current.set(newId, []);
    setChatId(newId);
    setFiles([]);
    updateChatParam(newId);
    setTimeout(() => {
      isLoadingChat.current = false;
    }, 100);
  };

  const handleSubmit = async (
    text: string,
    submittedFiles?: File[],
    taggedDocuments?: Array<{ courseId: string; fileName: string }>,
  ) => {
    const filesToSend = submittedFiles || files;

    // Pass page context, cached AI context, and user timezone via body
    const options = {
      body: {
        pageContext,
        aiContext, // Pass cached courses + grade weights
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // User's local timezone
        taggedDocuments, // Pass tagged documents from ChatInput
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
    // Don't clear selectedDocs here since ChatInput handles it internally
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
        "hidden lg:flex h-full ml-0 border bg-sidebar transition-all duration-200",
        isDragging && "border-primary/50 bg-primary/5",
      )}
      style={
        {
          "--sidebar-width-right": isExpanded ? "50rem" : "22rem",
        } as React.CSSProperties
      }
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
            <Button
              variant="ghost"
              size="icon"
              title={isExpanded ? "Collapse" : "Expand"}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
              <span className="sr-only">
                {isExpanded ? "Collapse" : "Expand"}
              </span>
            </Button>
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
                {messages.map((m) => {
                  const msg = m as StudentOSUIMessage;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col gap-2 ${
                        m.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Show tagged documents for user messages */}
                      {msg.role === "user" &&
                        msg.taggedDocuments &&
                        msg.taggedDocuments.length > 0 && (
                          <div className="flex flex-wrap gap-2 max-w-[90%] justify-end">
                            {msg.taggedDocuments.map((doc, idx: number) => (
                              <Badge
                                key={`${idx}-${doc.fileName}`}
                                variant="outline"
                                className="gap-1 text-xs"
                              >
                                <FileText className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">
                                  {doc.fileName}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        )}

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
                            case "text": {
                              const sanitizedText = stripSystemReminders(
                                p.text,
                              );
                              if (!sanitizedText) return null;
                              return (
                                <div
                                  key={i}
                                  className={`p-3 rounded-lg text-sm prose dark:prose-invert max-w-none wrap-anywhere overflow-hidden ${
                                    m.role === "user"
                                      ? "bg-primary text-primary-foreground prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-a:text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  <ReactMarkdown
                                    rehypePlugins={[rehypeKatex]}
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                  >
                                    {preprocessMarkdown(sanitizedText)}
                                  </ReactMarkdown>
                                </div>
                              );
                            }

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
                              return (
                                <ReasoningAccordion key={i} content={p.text} />
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
                                          Schedule (
                                          {output?.start_date || "..."} -{" "}
                                          {output?.end_date || "..."})
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
                                          {output?.message ||
                                            "Schedule Updated"}
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
                                          {output.count !== 1 ? "s" : ""} to
                                          High priority
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
                                    (output?.tasks_without_dates as any[]) ||
                                    [];
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
                                            {tasks_without_weights.length >
                                              3 && (
                                              <li>
                                                ...and{" "}
                                                {tasks_without_weights.length -
                                                  3}{" "}
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
                            // TOOL: retrieve_course_context (RAG - course document search)
                            // -----------------------------------------------------------------------
                            case "tool-retrieve_course_context": {
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
                                        <span>
                                          Searching course documents...
                                        </span>
                                      </div>
                                    </div>
                                  );
                                case "output-available": {
                                  const output = p.output;
                                  const results = output?.results || [];
                                  const summary = output?.summary;

                                  return (
                                    <div
                                      key={callId}
                                      className="bg-muted/50 border border-border/50 p-4 rounded-lg my-2 text-sm w-full"
                                    >
                                      <div className="flex flex-wrap items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                                        <Search className="size-4" />
                                        <span className="font-semibold text-sm">
                                          Document Search Results
                                        </span>
                                        {output?.found > 0 && (
                                          <Badge
                                            variant="outline"
                                            className="ml-auto"
                                          >
                                            {output.found} found
                                          </Badge>
                                        )}
                                      </div>

                                      {summary && (
                                        <div className="mb-3 text-xs text-muted-foreground">
                                          {summary}
                                        </div>
                                      )}

                                      {results.length > 0 ? (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-sleek">
                                          {results.map(
                                            (
                                              result: {
                                                chunk_number: number;
                                                file_name: string;
                                                document_type: string;
                                                content: string;
                                                similarity: string;
                                              },
                                              i: number,
                                            ) => (
                                              <div
                                                key={i}
                                                className="p-3 bg-background/50 rounded border border-border/30 hover:border-blue-400/50 transition-colors"
                                              >
                                                <div className="flex  flex-wrap items-start justify-between gap-2 mb-1.5">
                                                  <div className="flex  flex-wrap items-center gap-1.5">
                                                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                                                    <span className="font-medium text-xs truncate max-w-[180px]">
                                                      {result.file_name}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2 shrink-0">
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[10px] h-4 px-1"
                                                    >
                                                      Chunk{" "}
                                                      {result.chunk_number}
                                                    </Badge>
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[10px] h-4 px-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                                    >
                                                      {result.similarity}%
                                                    </Badge>
                                                  </div>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mb-1.5 capitalize">
                                                  {result.document_type}
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
                                          {output?.message ||
                                            "No documents found"}
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
                                            {action === "added" &&
                                              "Weight added"}
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
                                                  <ReactMarkdown
                                                    rehypePlugins={[
                                                      rehypeKatex,
                                                    ]}
                                                    remarkPlugins={[
                                                      remarkGfm,
                                                      remarkMath,
                                                    ]}
                                                  >
                                                    {preprocessMarkdown(
                                                      stripSystemReminders(
                                                        result.content &&
                                                          result.content
                                                            .length > 500
                                                          ? result.content.slice(
                                                              0,
                                                              500,
                                                            ) + "..."
                                                          : result.content,
                                                      ),
                                                    )}
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
                                                  {stripSystemReminders(
                                                    result.content.length > 150
                                                      ? result.content.slice(
                                                          0,
                                                          150,
                                                        ) + "..."
                                                      : result.content,
                                                  )}
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

                                  const updatedTasks =
                                    output.updated_tasks || [];
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
                                                        {
                                                          task.changes.title
                                                            .from
                                                        }
                                                      </span>
                                                      <ArrowRight className="size-2.5 shrink-0" />
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
                                                  {task.changes
                                                    ?.scoreReceived !==
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

                            // -----------------------------------------------------------------------
                            // TOOL: save_to_memory (Save text to knowledge base)
                            // -----------------------------------------------------------------------
                            case "tool-save_to_memory": {
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
                                        <Database className="size-3.5 animate-pulse" />
                                        <span>Saving to memory...</span>
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
                                              "Failed to save to memory"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  const saved = output.saved;

                                  return (
                                    <div
                                      key={callId}
                                      className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg my-2 text-sm w-full"
                                    >
                                      <div className="flex items-center gap-2 mb-3 text-green-600 dark:text-green-400">
                                        <Save className="size-4" />
                                        <span className="font-semibold text-sm">
                                          Saved to Memory
                                        </span>
                                        {saved?.course && (
                                          <Badge
                                            variant="outline"
                                            className="ml-auto bg-green-500/10 border-green-500/30"
                                          >
                                            {saved.course.code}
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1">
                                            <div className="font-medium text-xs text-green-800 dark:text-green-300 mb-0.5">
                                              {saved?.document_name}
                                            </div>
                                            {saved?.course && (
                                              <div className="text-[10px] text-green-700/70 dark:text-green-400/70">
                                                {saved.course.name}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-[10px] text-green-700/80 dark:text-green-400/80">
                                          <div className="flex items-center gap-1">
                                            <Database className="size-3" />
                                            <span>
                                              {saved?.chunk_count} chunk
                                              {saved?.chunk_count !== 1
                                                ? "s"
                                                : ""}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <FileText className="size-3" />
                                            <span className="capitalize">
                                              {saved?.document_type}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-[10px] text-green-700/60 dark:text-green-400/60 italic pt-2 border-t border-green-500/20">
                                          This information is now searchable and
                                          I can reference it in future
                                          conversations.
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
                            // TOOL: generate_quiz (Quiz generation)
                            // -----------------------------------------------------------------------
                            case "tool-generate_quiz": {
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
                                        <Sparkles className="size-3.5 animate-pulse" />
                                        <span>Generating quiz...</span>
                                      </div>
                                    </div>
                                  );
                                case "output-available": {
                                  const output = p.output;
                                  const quiz = output?.quiz;

                                  if (!quiz) {
                                    return (
                                      <div
                                        key={callId}
                                        className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg my-2 text-sm w-full"
                                      >
                                        <div className="text-destructive font-medium">
                                          ❌ Failed to generate quiz
                                        </div>
                                      </div>
                                    );
                                  }

                                  const questions: QuizQuestion[] =
                                    quiz.questions?.map((q): QuizQuestion => {
                                      let mappedType: QuizQuestion["type"];

                                      switch (q.type) {
                                        case "multiple_choice":
                                          mappedType = "multiple-choice";
                                          break;
                                        case "true_false":
                                          mappedType = "true-false";
                                          break;
                                        case "short_answer":
                                          mappedType = "short-answer";
                                          break;
                                        case "fill_in_the_blank":
                                          mappedType = "fill-blank";
                                          break;
                                        default:
                                          // Fallback: assume backend already used correct format
                                          mappedType = q.type;
                                      }

                                      return {
                                        ...q,
                                        type: mappedType,
                                      };
                                    }) ?? [];

                                  return (
                                    <QuizPreviewCard
                                      key={callId}
                                      quiz={{
                                        id: quiz.id,
                                        title: quiz.title,
                                        topic: quiz.topic || "",
                                        difficulty: quiz.difficulty,
                                        questionCount: quiz.questionCount,
                                        description: quiz.description,
                                        questions,
                                      }}
                                    />
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
                  );
                })}
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
          courseId={pageContext.type === "course" ? pageContext.id : undefined}
          semesterId={
            pageContext.type === "semester" ? pageContext.id : undefined
          }
        />
        <div className="text-[10px] text-center text-muted-foreground/60 mt-2">
          AI can make mistakes. Check important info.
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
