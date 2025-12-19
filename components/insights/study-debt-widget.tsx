"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useDebtStore } from "@/hooks/use-debt-store";
import { startOfToday, isBefore } from "date-fns";
import { AlertCircle, CheckCircle2, Siren, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Task {
  id: string;
  status: string | null;
  doDate?: Date | string | null;
  dueDate: Date | string | null;
  grade_weight?: {
    weightPercent: string | number;
  } | null;
}

interface StudyDebtWidgetProps {
  tasks: Task[];
}

export function StudyDebtWidget({ tasks }: StudyDebtWidgetProps) {
  const { isRepaymentMode, toggleRepaymentMode } = useDebtStore();

  const today = startOfToday();

  // Logic: "Debt" is any task where status !== 'Done' AND (do_date < today OR (no do_date AND due_date < today))
  const debtTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status === "Done") return false;

      const dateToCheck = task.doDate || task.dueDate;
      if (!dateToCheck) return false;

      const date =
        dateToCheck instanceof Date ? dateToCheck : new Date(dateToCheck);
      return isBefore(date, today);
    });
  }, [tasks, today]);

  const debtCount = debtTasks.length;

  if (debtCount === 0) {
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground/50 hover:text-foreground transition-colors cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px] p-3">
            <p className="font-semibold mb-1 text-sm">Study Debt Monitor</p>
            <p className="text-xs text-muted-foreground">
              Your &quot;Debt&quot; is the number of tasks you promised to do in
              the past but didn&apos;t finish. Clicking the badge activates{" "}
              <span className="font-medium text-red-500">Repayment Mode</span>{" "}
              to help you catch up.
            </p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground border-border/50 bg-background/50"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500/80" />
              <span className="hidden sm:inline">Debt Free</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Zero overdue tasks. You are solvent!</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // State C: Insolvent (High Debt)
  if (debtCount >= 5) {
    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground/50 hover:text-foreground transition-colors cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px] p-3">
            <p className="font-semibold mb-1 text-sm">Study Debt Monitor</p>
            <p className="text-xs text-muted-foreground">
              Your &quot;Debt&quot; is the number of tasks you promised to do in
              the past but didn&apos;t finish. Clicking the badge activates{" "}
              <span className="font-medium text-red-500">Repayment Mode</span>{" "}
              to help you catch up.
            </p>
          </TooltipContent>
        </Tooltip>
        <Button
          variant="outline"
          onClick={toggleRepaymentMode}
          className={cn(
            "h-8 gap-2 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all",
            isRepaymentMode && "bg-red-500/20 ring-1 ring-red-500/50",
          )}
        >
          <Siren className="h-4 w-4 animate-pulse" />
          <span className="font-semibold">Critical: {debtCount} Behind</span>
        </Button>
      </div>
    );
  }

  // State B: Manageable Debt
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-muted-foreground/50 hover:text-foreground transition-colors cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px] p-3">
          <p className="font-semibold mb-1 text-sm">Study Debt Monitor</p>
          <p className="text-xs text-muted-foreground">
            Your &quot;Debt&quot; is the number of tasks you promised to do in
            the past but didn&apos;t finish. Clicking the badge activates{" "}
            <span className="font-medium text-red-500">Repayment Mode</span> to
            help you catch up.
          </p>
        </TooltipContent>
      </Tooltip>
      <Button
        variant="outline"
        onClick={toggleRepaymentMode}
        className={cn(
          "h-8 gap-2 border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 transition-all",
          isRepaymentMode && "bg-yellow-500/20 ring-1 ring-yellow-500/50",
        )}
      >
        <AlertCircle className="h-4 w-4" />
        <span>{debtCount} Overdue</span>
      </Button>
    </div>
  );
}
