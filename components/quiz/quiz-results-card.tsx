"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuizQuestion } from "./quiz-preview-card";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface QuizResultsCardProps {
  score: number;
  maxScore: number;
  questions: QuizQuestion[];
  userAnswers: Record<string, string>;
  onRetry?: () => void;
}

export function QuizResultsCard({
  score,
  maxScore,
  questions,
  userAnswers,
  onRetry,
}: QuizResultsCardProps) {
  const percentage = Math.round((score / maxScore) * 100);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Quiz Results</CardTitle>
        <CardDescription>
          You scored {score} out of {maxScore} ({percentage}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {questions.map((question, idx) => {
            const userAnswer = userAnswers[question.id];
            const isCorrect =
              userAnswer?.toLowerCase().trim() ===
              question.correctAnswer.toLowerCase().trim();

            return (
              <div
                key={question.id}
                className={`p-4 rounded-lg border ${
                  isCorrect
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {isCorrect ? (
                    <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">
                      Question {idx + 1}: {question.question}
                    </p>
                    <div className="space-y-1 text-xs text-muted-foreground ml-7">
                      <p>
                        Your answer:{" "}
                        <span className="font-medium">
                          {userAnswer || "No answer"}
                        </span>
                      </p>
                      {!isCorrect && (
                        <>
                          <p>
                            Correct answer:{" "}
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {question.correctAnswer}
                            </span>
                          </p>
                          {question.explanation && (
                            <p className="mt-2">
                              <span className="font-medium">Explanation: </span>
                              {question.explanation}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      {onRetry && (
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={onRetry}>
            <RotateCcw className="mr-2 size-4" />
            Retry Quiz
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
