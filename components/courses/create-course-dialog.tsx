"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { courseSchema } from "@/lib/schemas";
import { createCourse } from "@/actions/courses";
import { toast } from "sonner";
import { Plus, Check } from "lucide-react";
import { SidebarMenuSubButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";

const COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#84cc16", // Lime
  "#22c55e", // Green
  "#10b981", // Emerald
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#71717a", // Zinc
  "#000000", // Black
  "#ffffff", // White
];

interface CreateCourseDialogProps {
  semesterId: string;
  children?: React.ReactNode;
}

export function CreateCourseDialog({
  semesterId,
  children,
}: CreateCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      semesterId: semesterId,
      code: "",
      name: "",
      color: "#3b82f6", // Default blue
      goalGrade: "85",
    },
  });

  function onSubmit(values: z.infer<typeof courseSchema>) {
    startTransition(async () => {
      try {
        const { id } = await createCourse(values);
        toast.success("Course created successfully");
        setOpen(false);
        form.reset();
        router.push(`/courses/${id}`);
      } catch (error) {
        toast.error("Failed to create course");
        console.error(error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <SidebarMenuSubButton>
            <Plus className="mr-2 size-4" />
            <span>Add Course</span>
          </SidebarMenuSubButton>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            Add a newly enrolled course to this semester.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Code</FormLabel>
                  <FormControl>
                    <Input placeholder="CSC101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Intro to CS"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((color) => (
                        <div
                          key={color}
                          className={cn(
                            "w-8 h-8 cursor-pointer flex items-center justify-center transition-all hover:scale-110",
                            field.value === color
                              ? "ring-1 ring-offset-2 ring-white"
                              : "hover:bg-opacity-80",
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        ></div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="goalGrade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Grade (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
