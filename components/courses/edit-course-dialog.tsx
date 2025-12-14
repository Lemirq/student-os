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
import { updateCourse, deleteCourse } from "@/actions/courses";
import { toast } from "sonner";
import { Course } from "@/types";
import { Settings, Check, Trash2 } from "lucide-react";

const PRESET_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Slate", value: "#64748b" },
];

interface EditCourseDialogProps {
  course: Course;
}

export function EditCourseDialog({ course }: EditCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(course.code || "");
  const [name, setName] = useState(course.name || "");
  const [color, setColor] = useState(course.color || PRESET_COLORS[0].value);
  const [goalGrade, setGoalGrade] = useState(
    course.goalGrade?.toString() || "85",
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        await updateCourse(course.id, {
          code,
          name,
          color,
          goal_grade: parseFloat(goalGrade),
        });
        toast.success("Course updated successfully");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to update course");
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
          <span className="ml-2">Edit Course</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update the course information below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Course Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Introduction to Computer Science"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Course Code</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS101"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Course Color</Label>
            <div className="grid grid-cols-9 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor.value}
                  type="button"
                  onClick={() => setColor(presetColor.value)}
                  className="relative w-8 h-8 rounded-md border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: presetColor.value,
                    borderColor:
                      color === presetColor.value ? "#000" : "transparent",
                  }}
                  title={presetColor.name}
                >
                  {color === presetColor.value && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalGrade">Goal Grade (%)</Label>
            <Input
              id="goalGrade"
              type="number"
              value={goalGrade}
              onChange={(e) => setGoalGrade(e.target.value)}
              placeholder="85"
              min="0"
              max="100"
              step="0.1"
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
                    the course and all associated tasks and grades.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      startTransition(async () => {
                        await deleteCourse(course.id);
                        toast.success("Course deleted successfully");
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
