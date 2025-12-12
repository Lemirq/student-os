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
import { Check, FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
  due_date: string;
  type: string;
}

interface SyllabusPreviewCardProps {
  data: {
    course: string;
    tasks: SyllabusTask[];
  };
}

export function SyllabusPreviewCard({ data }: SyllabusPreviewCardProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const assignmentsCount =
    data.tasks?.filter((t) => t.type?.toLowerCase().includes("assignment"))
      .length || 0;
  const examsCount =
    data.tasks?.filter((t) => t.type?.toLowerCase().includes("exam")).length ||
    0;

  // Fallback if counts are 0, just show total tasks
  const summary =
    assignmentsCount > 0 || examsCount > 0
      ? `Found ${assignmentsCount} assignments, ${examsCount} exams`
      : `Found ${data.tasks?.length || 0} tasks`;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await importSyllabusTasks(data);
      setIsImported(true);
      toast.success("Syllabus Imported");
    } catch (error) {
      toast.error("Failed to import syllabus", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm bg-sidebar-accent/10 border-sidebar-border">
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
            {data.tasks?.map((task, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{task.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {task.due_date}
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
            ))}
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
