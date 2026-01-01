"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Trash2, MapPin, Calendar, Clock } from "lucide-react";
import type { ScheduleEvent } from "@/types";
import {
  formatTimeRange,
  getDayName,
  getShortDayName,
} from "@/lib/schedule-utils";
import { format, parse } from "date-fns";

interface ScheduleEventCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: ScheduleEvent;
  course: {
    code: string;
    name: string | null;
    color: string | null;
  };
  courseId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ScheduleEventCard({
  open,
  onOpenChange,
  event,
  course,
  courseId,
  onEdit,
  onDelete,
}: ScheduleEventCardProps) {
  const eventTypeMap: Record<string, string> = {
    LEC: "Lecture",
    TUT: "Tutorial",
    PRA: "Practical",
    LAB: "Laboratory",
  };

  const eventTypeFull = eventTypeMap[event.type] || event.type;
  const dayName = getDayName(event.dayOfWeek);
  const timeRange = formatTimeRange(event.startTime, event.endTime);

  const formatDate = (dateString: string): string => {
    try {
      const date = parse(dateString, "yyyy-MM-dd", new Date());
      return format(date, "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <SheetTitle className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: course.color || "#3b82f6" }}
                />
                {course.code} {event.type}
                {event.section}
              </SheetTitle>
              <SheetDescription>
                {event.isExamSlot
                  ? "Test/Exam Slot (not weekly recurring)"
                  : course.name || "Course schedule details"}
              </SheetDescription>
            </div>
            <Badge variant="secondary" className="ml-2">
              {event.isExamSlot ? "Exam Slot" : eventTypeFull}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Time and Day */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{dayName}</p>
                <p className="text-sm text-muted-foreground">{timeRange}</p>
              </div>
            </div>

            {/* Location */}
            {(event.location || event.building) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {event.isExamSlot
                      ? "TBA - To Be Announced"
                      : event.location || "Location not specified"}
                  </p>
                  {event.building && !event.isExamSlot && (
                    <p className="text-sm text-muted-foreground">
                      {event.building}
                    </p>
                  )}
                  {event.isExamSlot && (
                    <p className="text-sm text-muted-foreground">
                      This is a reserved test/exam time slot
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date Range</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Details Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Section</p>
                <p className="font-medium">{event.section}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{eventTypeFull}</p>
              </div>
            </div>
          </div>

          {/* Exception Dates */}
          {event.exceptionDates && event.exceptionDates.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Exception Dates</h4>
                <p className="text-sm text-muted-foreground">
                  Class will not occur on:
                </p>
                <div className="flex flex-wrap gap-2">
                  {event.exceptionDates.map((date) => (
                    <Badge key={date} variant="outline">
                      {formatDate(date)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recurring Pattern */}
          <Separator />
          <div className="space-y-2 bg-muted/50 rounded-lg p-3">
            <h4 className="text-sm font-semibold">
              {event.isExamSlot ? "Exam Slot Schedule" : "Recurring Pattern"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {event.isExamSlot ? (
                <>
                  Reserved {dayName} from {formatDate(event.startDate)} until{" "}
                  {formatDate(event.endDate)} for tests/exams
                  <br />
                  <span className="text-xs italic mt-1 block">
                    Note: This slot does not occur every week. The exact date
                    will be announced by your instructor.
                  </span>
                </>
              ) : (
                <>
                  Every {dayName} from {formatDate(event.startDate)} until{" "}
                  {formatDate(event.endDate)}
                  {event.exceptionDates && event.exceptionDates.length > 0 && (
                    <>, excluding {event.exceptionDates.length} exception(s)</>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          {(onEdit || onDelete) && (
            <>
              <Separator />
              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      onEdit();
                      onOpenChange(false);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      onDelete();
                      onOpenChange(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
