import { getTask } from "@/actions/tasks";
import { TaskProperties } from "@/components/tasks/task-properties";
import { TaskMainContent } from "@/components/tasks/task-main-content";
import { notFound } from "next/navigation";
import { Task } from "@/types";
import { TaskCommandInitializer } from "@/components/tasks/task-command-initializer";
import Link from "next/link";

interface TaskPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { id } = await params;
  const task = await getTask(id);

  if (!task) {
    notFound();
  }

  // Cast task to Task type for the command menu - ensure compatibility
  // In a real app we might want to make sure the type overlap is exact
  const taskForMenu = task as unknown as Task;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <TaskCommandInitializer task={taskForMenu} />
      {/* Main Content (Fluid) */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-8 pb-20 max-w-4xl mx-auto">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/courses/${task.course?.id || ""}`}>
              {task.course?.code || "No Course"}
            </Link>
            <span>/</span>
            <span>Tasks</span>
            <span>/</span>
            <span className="text-foreground font-medium">
              T-{task.id.slice(0, 4)}
            </span>
          </div>
          <TaskMainContent task={task} />
        </div>
      </div>

      {/* Right Sidebar (Rigid) */}
      <div className="w-[350px] shrink-0 border-l bg-background overflow-y-auto">
        <div className="p-6">
          <TaskProperties task={task} />
        </div>
      </div>
    </div>
  );
}
