"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SmartDatetimeInput } from "@/components/ui/smart-datetime-input";
import { updateSemester, deleteSemester } from "@/actions/semesters";
import { toast } from "sonner";
import { Semester } from "@/types";
import { Settings, Trash2 } from "lucide-react";
import { parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface EditSemesterDialogProps {
  semester: Semester;
}

// Helper to parse date-only strings without timezone issues
const parseDateOnly = (dateStr: string): Date => {
  // Parse as local date by using parseISO which handles YYYY-MM-DD correctly
  const date = parseISO(dateStr);
  // Set to noon to avoid any timezone boundary issues
  date.setHours(12, 0, 0, 0);
  return date;
};

// Helper to format date for submission (local date only, no timezone conversion)
const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function EditSemesterDialog({ semester }: EditSemesterDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(semester.name || "");
  const [startDate, setStartDate] = useState<Date | null>(
    parseDateOnly(semester.startDate),
  );
  const [endDate, setEndDate] = useState<Date | null>(
    parseDateOnly(semester.endDate),
  );
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Please provide both start and end dates");
      return;
    }

    startTransition(async () => {
      try {
        await updateSemester(semester.id, {
          name,
          start_date: formatDateOnly(startDate),
          end_date: formatDateOnly(endDate),
        });

        // Invalidate sidebar to refetch
        queryClient.invalidateQueries({ queryKey: queryKeys.sidebar.all });

        toast.success("Semester updated successfully");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to update semester");
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default">
          <Settings className="h-4 w-4" />
          <span className="ml-2">Edit Semester</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Semester</DialogTitle>
          <DialogDescription>
            Update the semester information below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Semester Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fall 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <SmartDatetimeInput
              id="startDate"
              value={startDate}
              onValueChange={setStartDate}
              placeholder="e.g. September 1st, 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <SmartDatetimeInput
              id="endDate"
              value={endDate}
              onValueChange={setEndDate}
              placeholder="e.g. December 20th, 2024"
            />
          </div>

          <div className="flex justify-between w-full">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the semester and all associated courses and tasks.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      startTransition(async () => {
                        await deleteSemester(semester.id);
                        toast.success("Semester deleted successfully");
                        setOpen(false);
                      });
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
