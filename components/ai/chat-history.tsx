"use client";

import * as React from "react";
import { MoreHorizontal, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getChats, deleteChat } from "@/actions/chats";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Chat = {
  id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
};

interface ChatHistoryProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelectChat: (id: string, messages: any[]) => void;
  onNewChat: () => void;
  currentChatId?: string;
}

const CHATS_PER_PAGE = 20;

export function ChatHistory({
  onSelectChat,
  onNewChat,
  currentChatId,
}: ChatHistoryProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [page, setPage] = React.useState(0);

  const loadChats = React.useCallback(
    async (pageNum: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const offset = pageNum * CHATS_PER_PAGE;
        const data = await getChats(CHATS_PER_PAGE + 1, offset);
        const newChats = data as unknown as Chat[];

        if (newChats.length <= CHATS_PER_PAGE) {
          setHasMore(false);
        }

        setChats((prev) =>
          append
            ? [...prev, ...newChats.slice(0, CHATS_PER_PAGE)]
            : newChats.slice(0, CHATS_PER_PAGE),
        );
      } catch (error) {
        toast.error("Failed to load chats");
        console.error(error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (isOpen && chats.length === 0) {
      loadChats(0);
    }
  }, [isOpen, loadChats, chats.length]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadChats(nextPage, true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      toast.success("Chat deleted");
    } catch (error) {
      toast.error("Failed to delete chat");
      console.error(error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="History">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Chat History</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Sidebar collapsible="none" className="bg-transparent max-h-[700px]">
          <SidebarContent>
            <SidebarGroup className="border-b p-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onNewChat();
                  setIsOpen(false);
                }}
              >
                <Plus className="size-4" />
                New Chat
              </Button>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupContent className="gap-0">
                <ScrollArea className="h-[500px]">
                  <SidebarMenu>
                    {loading ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Loading...
                      </div>
                    ) : chats.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No recent chats
                      </div>
                    ) : (
                      <>
                        {chats.map((chat) => (
                          <SidebarMenuItem key={chat.id}>
                            <SidebarMenuButton
                              onClick={() => {
                                onSelectChat(chat.id, chat.messages);
                                setIsOpen(false);
                              }}
                              className={cn(
                                "h-auto px-2 group/menu-button relative",
                                chat.id === currentChatId
                                  ? "bg-primary/10"
                                  : "hover:bg-primary/10!",
                              )}
                            >
                              <div className="flex flex-col gap-1 w-full text-left overflow-hidden pr-6">
                                <span
                                  className={cn(
                                    "truncate font-medium text-xs",
                                    chat.id === currentChatId && "font-bold",
                                  )}
                                >
                                  {chat.title.length > 50
                                    ? chat.title.slice(0, 50) + "..."
                                    : chat.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {formatDistanceToNow(
                                    new Date(chat.updatedAt),
                                    {
                                      addSuffix: true,
                                    },
                                  )}
                                </span>
                              </div>
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/menu-button:opacity-100 transition-opacity">
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className="hover:bg-accent text-muted-foreground hover:text-destructive flex aspect-square w-6 items-center justify-center rounded-md p-0 transition-transform cursor-pointer"
                                  onClick={(e) => handleDelete(e, chat.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      handleDelete(
                                        e as unknown as React.MouseEvent,
                                        chat.id,
                                      );
                                    }
                                  }}
                                >
                                  <Trash2 className="size-3" />
                                </div>
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                        {hasMore && (
                          <div className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={handleLoadMore}
                              disabled={loadingMore}
                            >
                              {loadingMore ? "Loading..." : "Load More"}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </SidebarMenu>
                </ScrollArea>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </PopoverContent>
    </Popover>
  );
}
