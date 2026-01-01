"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  closestCorners,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskWithDetails } from "./columns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isPast } from "date-fns";
import { hasTime } from "@/lib/date-parser";
import { TaskStatus } from "@/types";
import { useTaskMutations } from "@/hooks/use-task-mutations";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TaskBoardViewProps {
  tasks: TaskWithDetails[];
  context?: { type: "semester" | "course"; id: string };
}

const COLUMNS: TaskStatus[] = ["Todo", "In Progress", "Done"];

export function TaskBoardView({ tasks, context }: TaskBoardViewProps) {
  const { setStatus } = useTaskMutations();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = React.useState<TaskStatus | null>(
    null,
  );

  // Group tasks by status
  const tasksByStatus = React.useMemo(() => {
    const acc: Record<TaskStatus, TaskWithDetails[]> = {
      Todo: [],
      "In Progress": [],
      Done: [],
    };

    tasks.forEach((task) => {
      const status = (task.status as TaskStatus) || "Todo";
      if (acc[status]) {
        acc[status].push(task);
      } else {
        // Fallback for unknown statuses
        acc["Todo"].push(task);
      }
    });
    return acc;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  /**
   * Custom collision detection strategy for Kanban boards
   * Prioritizes column containers over individual items for better empty column detection
   */
  const collisionDetectionStrategy: CollisionDetection = React.useCallback(
    (args) => {
      // First, try to find collisions with droppable containers using pointer position
      const pointerCollisions = pointerWithin(args);

      // Filter for column containers only
      const columnCollisions = pointerCollisions.filter((collision) => {
        const data = args.droppableContainers.find(
          (container) => container.id === collision.id,
        )?.data.current;
        return data?.type === "Column";
      });

      // If we found a column under the pointer, use it
      if (columnCollisions.length > 0) {
        return columnCollisions;
      }

      // Otherwise, fall back to checking rectangular intersection
      const rectCollisions = rectIntersection(args);
      if (rectCollisions.length > 0) {
        return rectCollisions;
      }

      // Final fallback to closest corners
      return closestCorners(args);
    },
    [],
  );

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveId(id);

    // Save the original status before any optimistic updates
    const task = tasks.find((t) => t.id === id);
    if (task) {
      setOriginalStatus(task.status as TaskStatus);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    // We don't need manual optimistic updates here
    // React Query will handle them when we call the mutation
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !originalStatus) {
      setOriginalStatus(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the task
    const task = tasks.find((t) => t.id === activeId);
    if (!task) {
      setOriginalStatus(null);
      return;
    }

    let newStatus: TaskStatus | null = null;

    // Determine new status
    // If dropped on a column container
    if (COLUMNS.includes(overId as TaskStatus)) {
      if (originalStatus !== overId) {
        newStatus = overId as TaskStatus;
      }
    } else {
      // If dropped on another task, use that task's status
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask && overTask.status !== originalStatus) {
        newStatus = overTask.status as TaskStatus;
      }
    }

    // Reset original status
    setOriginalStatus(null);

    if (newStatus) {
      // Call React Query mutation - it handles optimistic updates automatically
      try {
        await setStatus(task, newStatus);
      } catch (error) {
        // React Query already handles rollback on error
        console.error("Failed to update status:", error);
      }
    }
  }

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
        {COLUMNS.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            context={context}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} context={context} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface BoardColumnProps {
  status: TaskStatus;
  tasks: TaskWithDetails[];
  context?: { type: "semester" | "course"; id: string };
}

function BoardColumn({ status, tasks, context }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: "Column",
      status,
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {status}
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto space-y-3 bg-muted/30 rounded-lg border p-4 transition-colors min-h-[200px]",
          isOver && "bg-muted/50 border-primary/50 ring-2 ring-primary/20",
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskItem key={task.id} task={task} context={context} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed rounded-md h-full flex items-start justify-center min-h-[150px]">
              Drop tasks here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

interface SortableTaskItemProps {
  task: TaskWithDetails;
  context?: { type: "semester" | "course"; id: string };
}

function SortableTaskItem({ task, context }: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} context={context} />
    </div>
  );
}

interface TaskCardProps {
  task: TaskWithDetails;
  context?: { type: "semester" | "course"; id: string };
  isOverlay?: boolean;
}

function TaskCard({ task, context, isOverlay }: TaskCardProps) {
  const router = useRouter();

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;

  // Overdue: compare full datetime, task is overdue only if it's past AND not done
  // If no specific time is set (midnight), treat deadline as end of day (23:59:59)
  const getEffectiveDeadline = (d: Date): Date => {
    if (!hasTime(d)) {
      const endOfDayDate = new Date(d);
      endOfDayDate.setHours(23, 59, 59, 999);
      return endOfDayDate;
    }
    return d;
  };

  const effectiveDeadline = dueDate ? getEffectiveDeadline(dueDate) : null;
  const isOverdue = effectiveDeadline
    ? isPast(effectiveDeadline) && task.status !== "Done"
    : false;
  const isDueToday = dueDate ? isToday(dueDate) && !isOverdue : false;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/tasks/${task.id}`);
  };

  return (
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing hover:border-primary/50 py-3 transition-colors shadow-sm bg-card",
        isOverlay && "shadow-lg rotate-2 scale-105 cursor-grabbing",
      )}
      onDoubleClick={handleDoubleClick}
    >
      <CardContent className="px-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm line-clamp-2 leading-tight">
            {task.title}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center mt-2">
          {/* Show course badge if not in course context */}
          {context?.type !== "course" && task.course && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 gap-1 font-normal"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: task.course.color || "#000" }}
              />
              <span className="truncate max-w-[60px]">{task.course.code}</span>
            </Badge>
          )}

          {/* Grade Weight / Category */}
          {task.grade_weight && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground"
            >
              {task.grade_weight.name}
            </Badge>
          )}

          {/* Priority */}
          {task.priority && task.priority !== "Low" && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-5 font-normal",
                task.priority === "High"
                  ? "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                  : "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800",
              )}
            >
              {task.priority}
            </Badge>
          )}
        </div>

        {dueDate && (
          <div
            className={cn(
              "text-xs flex items-center gap-1 mt-1",
              isOverdue
                ? "text-red-500 font-medium"
                : isDueToday
                  ? "text-orange-500 font-medium"
                  : "text-muted-foreground",
            )}
          >
            <CalendarIcon className="w-3 h-3" />
            {format(dueDate, "MMM d")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
