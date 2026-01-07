"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getQuizAttempts } from "@/actions/quiz/get-quiz-attempts";
import type { QuizSummary } from "@/actions/quiz/get-quizzes";

interface QuizHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: QuizSummary;
}

export function QuizHistoryDialog({
  open,
  onOpenChange,
  quiz,
}: QuizHistoryDialogProps) {
  const [attempts, setAttempts] = useState<
    Array<{
      id: string;
      score: string;
      completedAt: Date | null;
      improvement: number | null;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && quiz?.id) {
      setIsLoading(true);
      getQuizAttempts(quiz.id)
        .then((data) => {
          setAttempts(data);
        })
        .catch((err) => {
          console.error("Failed to fetch quiz attempts:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, quiz?.id]);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quiz History</DialogTitle>
          <DialogDescription>
            {quiz.title} - {attempts.length} attempt
            {attempts.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No attempts yet. Take the quiz to see your progress!
          </div>
        ) : (
          <div className="py-4 space-y-3">
            {attempts.map((attempt, index) => {
              const score = parseFloat(attempt.score);
              const isLastAttempt = index === 0;

              return (
                <div
                  key={attempt.id}
                  className="p-4 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold">
                        {score.toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(attempt.completedAt)}
                      </div>
                    </div>

                    {attempt.improvement !== null && !isLastAttempt && (
                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          attempt.improvement > 0
                            ? "text-green-600 dark:text-green-400"
                            : attempt.improvement < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {attempt.improvement > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : attempt.improvement < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                        {attempt.improvement > 0 ? "+" : ""}
                        {attempt.improvement.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {attempts.length > 1 && (
              <div className="pt-4 border-t mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Best score:</span>
                  <span className="font-bold">
                    {Math.max(
                      ...attempts.map((a) => parseFloat(a.score)),
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Average score:</span>
                  <span className="font-medium">
                    {(
                      attempts.reduce(
                        (sum, a) => sum + parseFloat(a.score),
                        0,
                      ) / attempts.length
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
