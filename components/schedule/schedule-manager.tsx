"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Upload } from "lucide-react";
import { ScheduleCalendar } from "./schedule-calendar";
import { ScheduleUploadDialog } from "./schedule-upload-dialog";
import { AddScheduleEventDialog } from "./add-schedule-event-dialog";
import { ScheduleEventCard } from "./schedule-event-card";
import { ScheduleStats } from "./schedule-stats";
import type { ScheduleData, ScheduleEvent } from "@/types";
import { deleteScheduleEvent } from "@/actions/schedule";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

interface CourseWithSchedule {
  id: string;
  code: string;
  name: string | null;
  color: string | null;
  schedule: ScheduleData | null;
}

interface ScheduleManagerProps {
  initialCourses: CourseWithSchedule[];
  allCourses: Array<{ id: string; code: string; name: string | null }>;
  isLoading?: boolean;
}

export function ScheduleManager({
  initialCourses,
  allCourses,
  isLoading = false,
}: ScheduleManagerProps) {
  const router = useRouter();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false);
  const [eventCardOpen, setEventCardOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{
    event: ScheduleEvent;
    course: CourseWithSchedule;
    eventIndex: number;
  } | null>(null);
  const [editingEvent, setEditingEvent] = useState<{
    event: ScheduleEvent;
    courseId: string;
    eventIndex: number;
  } | null>(null);

  const coursesWithSchedule = initialCourses.filter(
    (course) => course.schedule && course.schedule.events.length > 0,
  );

  const hasSchedules = coursesWithSchedule.length > 0;

  const handleEventClick = (calendarEvent: {
    resource: {
      courseId: string;
      type: string;
      section: string;
    };
  }) => {
    const course = initialCourses.find(
      (c) => c.id === calendarEvent.resource.courseId,
    );

    if (!course || !course.schedule) return;

    const eventIndex = course.schedule.events.findIndex(
      (e) =>
        e.type === calendarEvent.resource.type &&
        e.section === calendarEvent.resource.section,
    );

    if (eventIndex === -1) return;

    const event = course.schedule.events[eventIndex];

    setSelectedEvent({
      event,
      course,
      eventIndex,
    });
    setEventCardOpen(true);
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;

    setEditingEvent({
      event: selectedEvent.event,
      courseId: selectedEvent.course.id,
      eventIndex: selectedEvent.eventIndex,
    });
    setEventCardOpen(false);
    setAddEventDialogOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      const result = await deleteScheduleEvent(
        selectedEvent.course.id,
        selectedEvent.eventIndex,
      );

      if (!result.success) {
        toast.error(result.error || "Failed to delete event");
        return;
      }

      toast.success("Event deleted successfully");
      setEventCardOpen(false);
      setSelectedEvent(null);
      router.refresh();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const handleCloseAddDialog = () => {
    setAddEventDialogOpen(false);
    setEditingEvent(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  // Empty state
  if (!hasSchedules) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Schedule</h2>
            <p className="text-muted-foreground">
              View and manage your class schedule
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 space-y-6 border rounded-lg bg-muted/20">
          <div className="rounded-full bg-primary/10 p-6">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">No schedule yet</h3>
            <p className="text-muted-foreground max-w-md">
              Import your schedule from Acorn or add events manually to get
              started
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setUploadDialogOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import from Acorn
            </Button>
            <Button
              onClick={() => setAddEventDialogOpen(true)}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Manually
            </Button>
          </div>
        </div>

        {/* Dialogs */}
        <ScheduleUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={handleSuccess}
        />
        <AddScheduleEventDialog
          open={addEventDialogOpen}
          onOpenChange={handleCloseAddDialog}
          courses={allCourses}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  // Main schedule view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Schedule</h2>
          <p className="text-muted-foreground">
            {coursesWithSchedule.length} course
            {coursesWithSchedule.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setUploadDialogOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import from ICS
          </Button>
          <Button onClick={() => setAddEventDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <ScheduleStats courses={initialCourses} />

      {/* Calendar */}
      <ScheduleCalendar
        courses={coursesWithSchedule}
        onEventClick={handleEventClick}
      />

      {/* Dialogs */}
      <ScheduleUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={handleSuccess}
      />
      <AddScheduleEventDialog
        open={addEventDialogOpen}
        onOpenChange={handleCloseAddDialog}
        courses={allCourses}
        initialEvent={editingEvent?.event}
        initialCourseId={editingEvent?.courseId}
        eventIndex={editingEvent?.eventIndex}
        onSuccess={handleSuccess}
      />
      {selectedEvent && (
        <ScheduleEventCard
          open={eventCardOpen}
          onOpenChange={setEventCardOpen}
          event={selectedEvent.event}
          course={selectedEvent.course}
          courseId={selectedEvent.course.id}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}
