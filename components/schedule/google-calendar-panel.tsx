"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import type { GoogleCalendar } from "@/types";

interface GoogleCalendarPanelProps {
  onSync?: () => void;
}

export default function GoogleCalendarPanel({
  onSync,
}: GoogleCalendarPanelProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);

  const fetchCalendars = async () => {
    try {
      const response = await fetch("/api/google-calendar/calendars");
      if (!response.ok) {
        throw new Error("Failed to fetch calendars");
      }
      const data = await response.json();
      setIsConnected(data.isConnected || false);
      setGoogleEmail(data.googleEmail || "");
      setLastSync(data.lastSync || null);
      setCalendars(data.calendars || []);
    } catch (error) {
      setIsConnected(false);
      setGoogleEmail("");
      setLastSync(null);
      setCalendars([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/google-calendar/sync", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to sync calendars");
      }
      toast.success("Calendars synced successfully");
      await fetchCalendars();
      onSync?.();
    } catch (error) {
      toast.error("Failed to sync calendars");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch("/api/google-calendar/disconnect", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      toast.success("Disconnected from Google Calendar");
      setIsConnected(false);
      setGoogleEmail("");
      setLastSync(null);
      setCalendars([]);
    } catch (error) {
      toast.error("Failed to disconnect");
    }
  };

  const toggleCalendarVisibility = async (
    calendarId: string,
    isVisible: boolean,
  ) => {
    try {
      const response = await fetch(
        "/api/google-calendar/calendars/visibility",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ calendarId, visible: isVisible }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to update calendar visibility");
      }
      setCalendars(
        calendars.map((cal) =>
          cal.id === calendarId ? { ...cal, isVisible } : cal,
        ),
      );
    } catch (error) {
      toast.error("Failed to update calendar visibility");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <CalendarIcon className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Connect your Google Calendar to view your events
        </p>
        <Button asChild>
          <a href="/api/google-calendar">Connect Google Calendar</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 font-semibold">
            <CalendarIcon className="h-5 w-5" />
            Google Calendar
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{googleEmail}</span>
            {lastSync && (
              <span>• Last synced: {new Date(lastSync).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            <X className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {calendars.map((calendar) => (
          <div
            key={calendar.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: calendar.backgroundColor,
                  color: calendar.foregroundColor,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{calendar.name}</span>
                  {calendar.primary && (
                    <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                {calendar.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {calendar.description}
                  </p>
                )}
              </div>
            </div>
            <Switch
              checked={calendar.isVisible ?? false}
              onCheckedChange={(checked) =>
                toggleCalendarVisibility(calendar.id, checked)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
