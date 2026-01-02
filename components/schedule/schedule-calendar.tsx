"use client";

import { useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  View,
  Views,
  ToolbarProps,
} from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { scheduleToCalendarEvents } from "@/lib/schedule-utils";
import type { ScheduleData } from "@/types";

// Setup the localizer for react-big-calendar
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface ScheduleCalendarProps {
  courses: Array<{
    id: string;
    code: string;
    name: string | null;
    color: string | null;
    schedule: ScheduleData | null;
  }>;
  onEventClick?: (event: CalendarEvent) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    courseId: string;
    courseCode: string;
    type: string;
    section: string;
    location?: string;
    building?: string;
    isExamSlot?: boolean;
  };
  color: string;
}

export function ScheduleCalendar({
  courses,
  onEventClick,
}: ScheduleCalendarProps) {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [eventTypeFilters, setEventTypeFilters] = useState<Set<string>>(
    new Set(["LEC", "TUT", "PRA", "LAB"]),
  );

  // Convert all courses to calendar events
  const allEvents = courses.flatMap((course) =>
    scheduleToCalendarEvents(course),
  );

  // Filter events by type
  const filteredEvents = allEvents.filter((event) =>
    eventTypeFilters.has(event.resource.type),
  );

  const handleSelectEvent = (event: CalendarEvent) => {
    onEventClick?.(event);
  };

  const eventPropGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: "4px",
        opacity: 1,
        color: "#fff",
        border: "0px",
        display: "block",
        padding: "2px 4px",
        overflow: "hidden",
      },
    };
  };

  const toggleEventType = (type: string) => {
    setEventTypeFilters((prev) => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  const CustomToolbar = (toolbar: ToolbarProps<CalendarEvent>) => {
    const goToBack = () => {
      toolbar.onNavigate("PREV");
    };

    const goToNext = () => {
      toolbar.onNavigate("NEXT");
    };

    const goToCurrent = () => {
      toolbar.onNavigate("TODAY");
    };

    return (
      <div className="flex flex-col gap-4 mb-4 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToCurrent}>
              Today
            </Button>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={goToBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-lg font-semibold ml-2 capitalize">
              {toolbar.label}
            </h2>
          </div>

          <Select
            value={toolbar.view}
            onValueChange={(v) => toolbar.onView(v as View)}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Views.WEEK}>Week</SelectItem>
              <SelectItem value={Views.MONTH}>Month</SelectItem>
              <SelectItem value={Views.AGENDA}>Agenda</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Event Type Filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">
            Show types:
          </span>
          {["LEC", "TUT", "PRA", "LAB"].map((type) => (
            <Button
              key={type}
              variant={eventTypeFilters.has(type) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleEventType(type)}
              className="h-7 text-xs"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const isExamSlot = event.resource.isExamSlot;

    return (
      <div className="flex flex-col gap-0.5 text-xs font-medium w-full h-full overflow-hidden">
        <span className="font-bold text-[10px] uppercase tracking-wider">
          {event.resource.courseCode} {event.resource.type}
        </span>
        {event.resource.location && (
          <span className="text-[9px] opacity-90 truncate">
            {isExamSlot ? "Test/Exam Slot" : event.resource.location}
          </span>
        )}
      </div>
    );
  };

  // Empty state
  if (allEvents.length === 0) {
    return (
      <div className="h-[calc(100vh-250px)] min-h-[500px] bg-background rounded-lg border p-4 shadow-sm flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">
            No schedule data available
          </p>
          <p className="text-sm text-muted-foreground">
            Import your schedule from Acorn or add events manually
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-250px)] min-h-[500px] bg-background rounded-lg border p-4 shadow-sm">
      <div className="h-full overflow-x-auto">
        <div className="min-w-[600px] h-full">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            components={{
              toolbar: CustomToolbar,
              event: CustomEvent,
            }}
            formats={{
              eventTimeRangeFormat: () => "", // Remove time from event display
            }}
            views={[Views.WEEK, Views.MONTH, Views.AGENDA]}
            popup
            selectable
            className="font-sans"
            defaultView={Views.WEEK}
            step={30}
            timeslots={2}
          />
        </div>
      </div>
    </div>
  );
}
