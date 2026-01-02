"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { addScheduleEvent, updateScheduleEvent } from "@/actions/schedule";
import type { ScheduleEvent } from "@/types";
import { cn } from "@/lib/utils";

const scheduleEventFormSchema = z.object({
  courseId: z.string().min(1, "Please select a course"),
  type: z.enum(["LEC", "TUT", "PRA", "LAB"], {
    message: "Please select an event type",
  }),
  section: z.string().min(1, "Section is required"),
  dayOfWeek: z.string().min(1, "Please select a day"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format (e.g., 09:00)"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format (e.g., 11:00)"),
  location: z.string().optional(),
  building: z.string().optional(),
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date({ message: "End date is required" }),
});

type FormValues = z.infer<typeof scheduleEventFormSchema>;

interface AddScheduleEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Array<{ id: string; code: string; name: string | null }>;
  initialEvent?: ScheduleEvent;
  initialCourseId?: string;
  eventIndex?: number;
  onSuccess?: () => void;
}

export function AddScheduleEventDialog({
  open,
  onOpenChange,
  courses,
  initialEvent,
  initialCourseId,
  eventIndex,
  onSuccess,
}: AddScheduleEventDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEditMode = initialEvent !== undefined && eventIndex !== undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(scheduleEventFormSchema),
    defaultValues: initialEvent
      ? {
          courseId: initialCourseId || "",
          type: initialEvent.type as "LEC" | "TUT" | "PRA" | "LAB",
          section: initialEvent.section,
          dayOfWeek: initialEvent.dayOfWeek.toString(),
          startTime: initialEvent.startTime,
          endTime: initialEvent.endTime,
          location: initialEvent.location || "",
          building: initialEvent.building || "",
          startDate: new Date(initialEvent.startDate),
          endDate: new Date(initialEvent.endDate),
        }
      : {
          courseId: initialCourseId || "",
          type: "LEC",
          section: "",
          dayOfWeek: "",
          startTime: "",
          endTime: "",
          location: "",
          building: "",
          startDate: new Date(),
          endDate: new Date(),
        },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      try {
        const scheduleEvent: ScheduleEvent = {
          type: values.type,
          section: values.section,
          dayOfWeek: parseInt(values.dayOfWeek),
          startTime: values.startTime,
          endTime: values.endTime,
          location: values.location || undefined,
          building: values.building || undefined,
          startDate: format(values.startDate, "yyyy-MM-dd"),
          endDate: format(values.endDate, "yyyy-MM-dd"),
        };

        let result;
        if (isEditMode && initialCourseId && eventIndex !== undefined) {
          result = await updateScheduleEvent(
            initialCourseId,
            eventIndex,
            scheduleEvent,
          );
        } else {
          result = await addScheduleEvent(values.courseId, scheduleEvent);
        }

        if (!result.success) {
          toast.error(result.error || "Failed to save schedule event");
          return;
        }

        toast.success(
          isEditMode
            ? "Schedule event updated successfully"
            : "Schedule event added successfully",
        );

        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        console.error("Error saving schedule event:", error);
        toast.error("Failed to save schedule event");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Schedule Event" : "Add Schedule Event"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the details of this schedule event"
              : "Manually add a class schedule event"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Course Selection */}
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code}
                          {course.name && ` - ${course.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type and Section */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LEC">Lecture</SelectItem>
                        <SelectItem value="TUT">Tutorial</SelectItem>
                        <SelectItem value="PRA">Practical</SelectItem>
                        <SelectItem value="LAB">Laboratory</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <Input placeholder="0101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Day and Times */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input placeholder="09:00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input placeholder="11:00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location and Building */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Room 1270" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="building"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Building" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Adding..."}
                  </>
                ) : isEditMode ? (
                  "Update Event"
                ) : (
                  "Add Event"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
