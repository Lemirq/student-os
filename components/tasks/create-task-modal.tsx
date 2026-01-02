"use client";

import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartDatetimeInput } from "@/components/ui/smart-datetime-input";
import { Kbd } from "@/components/ui/kbd";
import { Resolver, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema } from "@/lib/schemas";
import { createTask } from "@/actions/tasks";
import { z } from "zod";
import { GradeWeight } from "@/types";
import { Plus, X } from "lucide-react";

interface CreateTaskModalProps {
  courseId: string;
  gradeWeights: GradeWeight[];
}

export function CreateTaskModal({
  courseId,
  gradeWeights,
}: CreateTaskModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle modal with Cmd+C
  useHotkeys(
    "meta+c, ctrl+c",
    (e) => {
      e.preventDefault();
      setIsOpen(true);
    },
    { enableOnFormTags: false },
  ); // Don't trigger if typing in a form? Actually usually we want it globally unless in input.

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema) as unknown as Resolver<
      z.infer<typeof taskSchema>
    >,
    defaultValues: {
      courseId: courseId,
      title: "",
      status: "Todo",
      priority: "Medium",
    },
  });

  const onSubmit = async (
    values: Omit<z.infer<typeof taskSchema>, "courseId">,
  ) => {
    await createTask({ ...values, courseId: courseId });
    setIsOpen(false);
    form.reset();
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Task <Kbd className="ml-2">C</Kbd>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg border animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create New Task</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          onSubmit={form.handleSubmit((values) =>
            onSubmit(
              values as unknown as Omit<z.infer<typeof taskSchema>, "courseId">,
            ),
          )}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              {...form.register("title")}
              placeholder="Task title"
              autoFocus
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-500">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                {...form.register("gradeWeightId")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None</option>
                {gradeWeights.map((gw) => (
                  <option key={gw.id} value={gw.id}>
                    {gw.name} ({gw.weightPercent}%)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select
                {...form.register("priority")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Do Date</label>
              <Controller
                control={form.control}
                name="doDate"
                render={({ field }) => (
                  <SmartDatetimeInput
                    value={field.value}
                    onValueChange={(date) => field.onChange(date ?? null)}
                    placeholder="e.g. Tomorrow"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Controller
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <SmartDatetimeInput
                    value={field.value}
                    onValueChange={(date) => field.onChange(date ?? null)}
                    placeholder="e.g. Next Friday"
                  />
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
