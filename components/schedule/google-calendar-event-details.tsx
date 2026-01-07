"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Clock } from "lucide-react";
import { format } from "date-fns/format";

interface GoogleCalendarEvent {
  summary?: string;
  location?: string | null;
  description?: string | null;
  htmlLink?: string | null;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
}

interface GoogleCalendar {
  name: string;
  color: string;
}

interface GoogleCalendarEventDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GoogleCalendarEvent;
  calendar: GoogleCalendar;
}

export default function GoogleCalendarEventDetails({
  open,
  onOpenChange,
  event,
  calendar,
}: GoogleCalendarEventDetailsProps) {
  if (!event) return null;

  if (!event.start || !event.end) return null;

  const isAllDay = event.start.date && !event.start.dateTime;
  const startDate =
    isAllDay && event.start.date
      ? new Date(event.start.date)
      : event.start.dateTime
        ? new Date(event.start.dateTime)
        : new Date();
  const endDate =
    isAllDay && event.end.date
      ? new Date(event.end.date)
      : event.end.dateTime
        ? new Date(event.end.dateTime)
        : new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: calendar.color }}
            />
            {event.summary || "No title"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
            <div>
              {isAllDay ? (
                <div>
                  {format(startDate, "MMMM d, yyyy")}
                  {endDate.getTime() !== startDate.getTime() &&
                    ` - ${format(endDate, "MMMM d, yyyy")}`}
                </div>
              ) : (
                <div>
                  <div>{format(startDate, "MMMM d, yyyy")}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                  </div>
                </div>
              )}
            </div>
          </div>

          {event.location && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
              <div>{event.location}</div>
            </div>
          )}

          {event.description && (
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          )}

          {event.htmlLink && (
            <Button variant="outline" className="w-full" asChild>
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Google Calendar
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
