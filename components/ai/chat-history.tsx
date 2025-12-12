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
import { getChats, deleteChat } from "@/actions/chats";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

export function ChatHistory({
  onSelectChat,
  onNewChat,
  currentChatId,
}: ChatHistoryProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadChats = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChats();
      setChats(data as unknown as Chat[]);
    } catch (error) {
      toast.error("Failed to load chats");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadChats();
    }
  }, [isOpen, loadChats]);

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
        <Sidebar collapsible="none" className="bg-transparent">
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
                    chats.map((chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton
                          onClick={() => {
                            onSelectChat(chat.id, chat.messages);
                            setIsOpen(false);
                          }}
                          isActive={chat.id === currentChatId}
                          className="h-auto py-2 px-2 group/menu-button relative"
                        >
                          <div className="flex flex-col gap-1 w-full text-left overflow-hidden pr-6">
                            <span className="truncate font-medium text-xs">
                              {chat.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {formatDistanceToNow(new Date(chat.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/menu-button:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => handleDelete(e, chat.id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </PopoverContent>
    </Popover>
  );
}
