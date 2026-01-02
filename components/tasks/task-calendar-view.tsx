"use client";

import {
  Calendar,
  dateFnsLocalizer,
  View,
  Views,
  ToolbarProps,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import { TaskWithDetails } from "./columns";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTask } from "@/actions/tasks";
import { toast } from "sonner";

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

// Create the drag-and-drop calendar component
const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

interface TaskCalendarViewProps {
  tasks: TaskWithDetails[];
  context?: { type: "semester" | "course"; id: string };
}

interface CalendarEvent {
  id: string;
  title: string;
  code?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: TaskWithDetails;
  color?: string | null;
}

export function TaskCalendarView({ tasks }: TaskCalendarViewProps) {
  const router = useRouter();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Record<string, Date>
  >({});

  // Map tasks to calendar events with optimistic updates applied
  const events = useMemo(
    () =>
      tasks
        .filter((task) => task.dueDate) // Only tasks with due dates
        .map((task) => {
          // Use optimistic update if available, otherwise use original date
          const dueDate = optimisticUpdates[task.id]
            ? optimisticUpdates[task.id]
            : new Date(task.dueDate!);
          return {
            id: task.id,
            title: task.title,
            code: task.course?.code,
            start: dueDate,
            end: dueDate,
            allDay: true,
            resource: task,
            color: task.course?.color,
          };
        }),
    [tasks, optimisticUpdates],
  );

  const handleSelectEvent = (event: CalendarEvent) => {
    router.push(`/tasks/${event.id}`);
  };

  const handleEventDrop = async ({
    event,
    start,
  }: {
    event: CalendarEvent;
    start: string | Date;
    end: string | Date;
  }) => {
    // Convert start to Date if it's a string
    const newDueDate = typeof start === "string" ? new Date(start) : start;

    // Optimistically update the UI
    setOptimisticUpdates((prev) => ({
      ...prev,
      [event.id]: newDueDate,
    }));

    try {
      // Update the task with the new due date
      await updateTask(event.id, { dueDate: newDueDate });
      toast.success("Task due date updated successfully");

      // Clear optimistic update after successful server update
      setOptimisticUpdates((prev) => {
        const newUpdates = { ...prev };
        delete newUpdates[event.id];
        return newUpdates;
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task due date");

      // Rollback optimistic update on error
      setOptimisticUpdates((prev) => {
        const newUpdates = { ...prev };
        delete newUpdates[event.id];
        return newUpdates;
      });
    }
  };

  const eventPropGetter = (event: CalendarEvent) => {
    const backgroundColor = event.color || "#3b82f6";
    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 1,
        color: "#fff",
        border: "0px",
        display: "block",
        padding: "0px",
        overflow: "hidden",
      },
    };
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
      <div className="flex items-center justify-between mb-4 px-1">
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
            <SelectItem value={Views.MONTH}>Month</SelectItem>
            <SelectItem value={Views.WEEK}>Week</SelectItem>
            <SelectItem value={Views.AGENDA}>Agenda</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    return (
      <div className="gap-1.5 px-2 py-0.5 text-xs font-medium w-full h-full fc items-start">
        {event.code && (
          <span className="font-bold opacity-90 text-[10px] uppercase tracking-wider shrink-0">
            {event.code}
          </span>
        )}
        <span className="w-full wrap-break-word text-wrap">{event.title}</span>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-250px)] min-h-[500px] bg-background rounded-lg border p-4 shadow-sm">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        eventPropGetter={eventPropGetter}
        components={{
          toolbar: CustomToolbar,
          event: CustomEvent,
        }}
        views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
        popup
        selectable
        className="font-sans"
      />
    </div>
  );
}
