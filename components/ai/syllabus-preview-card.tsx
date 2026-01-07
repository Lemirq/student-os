"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { importSyllabusTasks } from "@/actions/import-syllabus";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface SyllabusTask {
  title: string;
  weight: number;
  due_date: string | null | undefined;
  type: string;
}

interface SyllabusPreviewCardProps {
  data: {
    course: string;
    tasks: SyllabusTask[];
    raw_text?: string;
  };
}

export function SyllabusPreviewCard({ data }: SyllabusPreviewCardProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const taskCount = data.tasks?.length || 0;
  const tasksWithoutDates =
    data.tasks?.filter((t) => !t.due_date || t.due_date.trim() === "").length ||
    0;

  const summary =
    tasksWithoutDates > 0
      ? `Found ${taskCount} task${taskCount !== 1 ? "s" : ""} (${tasksWithoutDates} missing dates)`
      : `Found ${taskCount} task${taskCount !== 1 ? "s" : ""}`;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // This is where the actual database operations happen:
      // 1. Create/find course
      // 2. Create grade weights
      // 3. Create tasks
      const result = await importSyllabusTasks({
        ...data,
        syllabusBody: data.raw_text,
      });

      if (!result.success) {
        toast.error("Import Failed", {
          description: "No tasks could be imported",
        });
        return;
      }

      setIsImported(true);

      // Build description
      let description = "";
      if (result.courseCreated) {
        description = `Created course ${result.courseCode} and imported ${result.count} task${result.count !== 1 ? "s" : ""}`;
      } else {
        description = `Imported ${result.count} task${result.count !== 1 ? "s" : ""} to ${result.courseCode}`;
      }

      toast.success("Import Complete", { description });
    } catch (error) {
      toast.error("Import Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setIsImported(false); // Reset on error so user can retry
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm bg-sidebar-accent/20 backdrop-blur-2xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="size-4" />
          </div>
          <div className="flex flex-col">
            <CardTitle className="text-sm font-medium">
              Syllabus Found
            </CardTitle>
            <CardDescription className="text-xs">{data.course}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 text-sm text-muted-foreground">
        <p className="mb-2">{summary}</p>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto font-normal text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              {isOpen ? "Hide details" : "Show details"}
              {isOpen ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {data.tasks?.map((task, idx) => {
              const hasDate = task.due_date && task.due_date.trim() !== "";
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between text-xs p-2 rounded ${
                    hasDate
                      ? "bg-muted/50"
                      : "bg-destructive/10 border border-destructive/20"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      {!hasDate && (
                        <AlertCircle className="size-3 text-destructive" />
                      )}
                      <span className="font-medium">{task.title}</span>
                    </div>
                    <span
                      className={`text-[10px] ${hasDate ? "text-muted-foreground" : "text-destructive"}`}
                    >
                      {hasDate ? task.due_date : "No date"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.weight && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {task.weight}%
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] h-5">
                      {task.type}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full h-8 text-xs"
          onClick={handleImport}
          disabled={isImporting || isImported}
          variant={isImported ? "outline" : "default"}
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 size-3 animate-spin" />
              Importing...
            </>
          ) : isImported ? (
            <>
              <Check className="mr-2 size-3" />
              Imported
            </>
          ) : (
            "Import to Database"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
