"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getTask } from "@/actions/tasks";
import { getAllCourses } from "@/actions/get-course-data";
import { useTaskMutations } from "@/hooks/use-task-mutations";
import { TaskStatus, TaskPriority, Course } from "@/types";
import { SmartDatetimeInput } from "@/components/ui/smart-datetime-input";

type TaskWithRelations = NonNullable<Awaited<ReturnType<typeof getTask>>>;

interface TaskPropertiesProps {
  task: TaskWithRelations;
}

export function TaskProperties({ task }: TaskPropertiesProps) {
  const { setStatus, setPriority, setDueDate, updateTaskGeneric } =
    useTaskMutations();
  const [courses, setCourses] = React.useState<Course[]>([]);

  // State for editable fields
  const [date, setDate] = React.useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined,
  );
  const [doDate, setDoDate] = React.useState<Date | undefined>(
    task.doDate ? new Date(task.doDate) : undefined,
  );

  React.useEffect(() => {
    // Fetch courses for the dropdown
    getAllCourses().then(setCourses);
  }, []);

  const handleStatusChange = async (value: string) => {
    await setStatus(task, value as TaskStatus);
  };

  const handlePriorityChange = async (value: string) => {
    await setPriority(task, value as TaskPriority);
  };

  const handleCourseChange = async (value: string) => {
    await updateTaskGeneric(task.id, { courseId: value });
  };

  const handleDateSelect = async (newDate: Date | null) => {
    setDate(newDate || undefined);
    await setDueDate(task, newDate);
  };

  const handleDoDateSelect = async (newDate: Date | null) => {
    setDoDate(newDate || undefined);
    await updateTaskGeneric(task.id, { doDate: newDate });
  };

  const handleWeightChange = async (value: string) => {
    await updateTaskGeneric(task.id, { gradeWeightId: value });
  };

  const handleScoreBlur = async (
    e: React.FocusEvent<HTMLInputElement>,
    field: "received" | "max",
  ) => {
    const val = e.target.value;
    const num = val === "" ? null : parseFloat(val);
    const current = field === "received" ? task.scoreReceived : task.scoreMax;
    if (String(current) === String(num)) return;

    if (field === "received") {
      await updateTaskGeneric(task.id, {
        scoreReceived: num !== null ? String(num) : null,
      });
    } else {
      await updateTaskGeneric(task.id, {
        scoreMax: num !== null ? String(num) : null,
      });
    }
  };

  const impact = React.useMemo(() => {
    if (
      task.scoreReceived !== null &&
      task.scoreMax !== null &&
      task.gradeWeight?.weightPercent
    ) {
      const s = parseFloat(task.scoreReceived.toString());
      const m = parseFloat(task.scoreMax.toString());
      const w = parseFloat(task.gradeWeight.weightPercent.toString());
      if (m > 0) return (s / m) * w;
    }
    return null;
  }, [task.scoreReceived, task.scoreMax, task.gradeWeight]);

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
        <label className="text-sm font-medium text-foreground">Status</label>
        <Select
          defaultValue={task.status || "Todo"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todo">Todo</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
        <label className="text-sm font-medium text-foreground">Priority</label>
        <Select
          defaultValue={task.priority || "Medium"}
          onValueChange={handlePriorityChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Course */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
        <label className="text-sm font-medium text-foreground">Course</label>
        <Select
          defaultValue={task.courseId || undefined}
          onValueChange={handleCourseChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Do Date */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
        <label className="text-sm font-medium text-foreground">Do Date</label>
        <SmartDatetimeInput
          value={doDate}
          onValueChange={handleDoDateSelect}
          placeholder="Set start date"
          className="w-full"
        />
      </div>

      {/* Due Date */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
        <label className="text-sm font-medium text-foreground">Due Date</label>
        <SmartDatetimeInput
          value={date}
          onValueChange={handleDateSelect}
          placeholder="Set due date"
          className="w-full"
        />
      </div>

      {/* Weight Category */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
        <label className="text-sm font-medium text-foreground">Category</label>
        <Select
          value={(task.gradeWeightId || undefined) as string | undefined}
          onValueChange={handleWeightChange}
          disabled={
            !task.course?.gradeWeights || task.course.gradeWeights.length === 0
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="No Category" />
          </SelectTrigger>
          <SelectContent>
            {task.course?.gradeWeights.map((gw) => (
              <SelectItem key={gw.id} value={gw.id}>
                {gw.name} ({gw.weightPercent}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Score */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
        <label className="text-sm font-medium text-foreground">Score</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              defaultValue={task.scoreReceived?.toString() ?? ""}
              placeholder="-"
              className="w-full text-right"
              onBlur={(e) => handleScoreBlur(e, "received")}
            />
            <span className="text-muted-foreground">/</span>
            <Input
              defaultValue={task.scoreMax?.toString() ?? "100"}
              className="w-full"
              onBlur={(e) => handleScoreBlur(e, "max")}
            />
          </div>
          {impact !== null && (
            <p className="text-xs text-green-600 font-medium">
              Impact: +{impact.toFixed(2)}% to course
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
