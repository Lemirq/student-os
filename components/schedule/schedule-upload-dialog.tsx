"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { importScheduleFromICS, saveScheduleMatches } from "@/actions/schedule";
import type { CourseMatch } from "@/types";
import { cn } from "@/lib/utils";
import { formatTimeRange, getShortDayName } from "@/lib/schedule-utils";

interface ScheduleUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: ScheduleUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [matches, setMatches] = useState<CourseMatch[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<
    Record<string, string>
  >({});
  const [isParsing, startParsing] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".ics")) {
      toast.error("Please upload a valid .ics file");
      return;
    }

    setFile(selectedFile);
    setMatches([]);
    setSelectedCourses({});
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleParse = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    startParsing(async () => {
      try {
        const text = await file.text();
        const result = await importScheduleFromICS(text);

        if (!result.success) {
          toast.error(result.errors?.[0] || "Failed to parse ICS file");
          return;
        }

        if (!result.matches || result.matches.length === 0) {
          toast.error("No courses found in the ICS file");
          return;
        }

        setMatches(result.matches);

        // Pre-populate selections with suggested courses
        const initialSelections: Record<string, string> = {};
        result.matches.forEach((match) => {
          if (match.suggestedCourseId) {
            initialSelections[match.icsCode] = match.suggestedCourseId;
          }
        });
        setSelectedCourses(initialSelections);

        toast.success(`Found ${result.matches.length} course(s) in schedule`);
      } catch (error) {
        console.error("Error parsing ICS:", error);
        toast.error("Failed to parse ICS file");
      }
    });
  };

  const handleImport = async () => {
    if (matches.length === 0) {
      toast.error("No courses to import");
      return;
    }

    // Check that all courses have a selection
    const missingSelections = matches.filter(
      (match) => !selectedCourses[match.icsCode],
    );

    if (missingSelections.length > 0) {
      toast.error("Please select a course for all schedule entries");
      return;
    }

    startImporting(async () => {
      try {
        // Build matches array for server action
        const matchesToSave = matches.map((match) => ({
          courseId: selectedCourses[match.icsCode],
          events: match.events,
        }));

        const result = await saveScheduleMatches(matchesToSave);

        if (!result.success) {
          toast.error(result.error || "Failed to import schedule");
          return;
        }

        toast.success(
          `Successfully imported schedule for ${result.updatedCount} course(s)`,
        );

        // Reset state
        setFile(null);
        setMatches([]);
        setSelectedCourses({});

        // Call success callback and close dialog
        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        console.error("Error importing schedule:", error);
        toast.error("Failed to import schedule");
      }
    });
  };

  const getEventSummary = (match: CourseMatch): string => {
    const eventsByDay: Record<string, string[]> = {};
    let examSlotCount = 0;

    match.events.forEach((event) => {
      if (event.isExamSlot) {
        examSlotCount++;
        return;
      }

      const dayName = getShortDayName(event.dayOfWeek);
      const timeRange = formatTimeRange(event.startTime, event.endTime);
      const key = dayName;

      if (!eventsByDay[key]) {
        eventsByDay[key] = [];
      }
      eventsByDay[key].push(`${event.type} ${timeRange}`);
    });

    const summary = Object.entries(eventsByDay)
      .map(([day, times]) => `${day}: ${times.join(", ")}`)
      .join(" • ");

    const regularEventCount = match.events.length - examSlotCount;
    const eventCountText = `${regularEventCount} weekly event(s)${examSlotCount > 0 ? ` + ${examSlotCount} exam slot(s)` : ""}`;

    return summary ? `${eventCountText} - ${summary}` : `${eventCountText}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Schedule from ICS</DialogTitle>
          <DialogDescription>
            Upload your calendar file from Acorn to import your class schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Calendar File (.ics)</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
              )}
            >
              <input
                type="file"
                accept=".ics"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isParsing}
              />
              <div className="flex flex-col items-center gap-2">
                {file ? (
                  <>
                    <FileUp className="h-10 w-10 text-primary" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Click or drag to replace
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drop your .ics file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Export your schedule from Acorn as an ICS file
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Parse Button */}
          {file && matches.length === 0 && (
            <Button
              onClick={handleParse}
              disabled={isParsing}
              className="w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                "Parse Schedule"
              )}
            </Button>
          )}

          {/* Course Matches */}
          {matches.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Match Courses</Label>
                <span className="text-sm text-muted-foreground">
                  {matches.length} course(s) found
                </span>
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                {matches.map((match) => (
                  <div
                    key={match.icsCode}
                    className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">
                        {match.icsCode} - {match.icsCourseName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getEventSummary(match)}
                      </p>
                      {match.semesterName && (
                        <p className="text-xs text-muted-foreground">
                          Detected semester: {match.semesterName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`course-${match.icsCode}`}>
                        Assign to Course
                      </Label>
                      <Select
                        value={selectedCourses[match.icsCode] || ""}
                        onValueChange={(value) =>
                          setSelectedCourses((prev) => ({
                            ...prev,
                            [match.icsCode]: value,
                          }))
                        }
                      >
                        <SelectTrigger id={`course-${match.icsCode}`}>
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent>
                          {match.availableCourses.length > 0 ? (
                            match.availableCourses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.code}
                                {course.name && ` - ${course.name}`}
                                {course.semesterName &&
                                  ` (${course.semesterName})`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No courses available - create one first
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Button */}
          {matches.length > 0 && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setMatches([]);
                  setSelectedCourses({});
                  onOpenChange(false);
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Schedule"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
