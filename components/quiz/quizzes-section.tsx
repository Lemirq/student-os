"use client";

import { useState, useCallback, useEffect } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateQuizDialog } from "@/components/quiz/generate-quiz-dialog";
import { QuizTakingModal } from "@/components/quiz/quiz-taking-modal";
import { QuizHistoryDialog } from "@/components/quiz/quiz-history-dialog";
import { HelpCircle, Plus } from "lucide-react";
import { getCourseQuizzes, type QuizSummary } from "@/actions/quiz/get-quizzes";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface QuizzesSectionProps {
  courseId: string;
}

export const QuizzesSection = React.memo(function QuizzesSection({
  courseId,
}: QuizzesSectionProps) {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizSummary | null>(null);
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchQuizzes = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCourseQuizzes({ courseId });
      if (result.success) {
        setQuizzes(result.quizzes);
      } else {
        toast.error(result.message || "Failed to fetch quizzes");
      }
    } catch (error) {
      toast.error("Failed to fetch quizzes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchQuizzes();
  }, [courseId, refetchTrigger]);

  const handleGenerateSuccess = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
    setIsGenerateDialogOpen(false);
    toast.success("Quiz generated successfully!");
  }, []);

  const handleTakeQuiz = (quiz: QuizSummary) => {
    setSelectedQuiz(quiz);
    setIsTakingQuiz(true);
  };

  const handleViewHistory = (quiz: QuizSummary) => {
    setSelectedQuiz(quiz);
    setIsViewingHistory(true);
  };

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Quizzes
          </CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setIsGenerateDialogOpen(true)}
        >
          <Plus className="h-3 w-3 mr-2" />
          Generate Quiz
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No quizzes yet. Generate your first quiz to test your knowledge!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {quizzes.map((quiz) => (
              <QuizItem
                key={quiz.id}
                quiz={quiz}
                onTakeQuiz={handleTakeQuiz}
                onViewHistory={handleViewHistory}
                getDifficultyBadgeColor={getDifficultyBadgeColor}
              />
            ))}
          </div>
        )}
      </CardContent>
      <GenerateQuizDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        courseId={courseId}
        onSuccess={handleGenerateSuccess}
      />
      {selectedQuiz && isTakingQuiz && (
        <QuizTakingModal
          open={isTakingQuiz}
          onOpenChange={setIsTakingQuiz}
          quiz={selectedQuiz}
          onSuccess={() => {
            setRefetchTrigger((prev) => prev + 1);
          }}
        />
      )}
      {selectedQuiz && isViewingHistory && (
        <QuizHistoryDialog
          open={isViewingHistory}
          onOpenChange={setIsViewingHistory}
          quiz={selectedQuiz}
        />
      )}
    </Card>
  );
});

interface QuizItemProps {
  quiz: QuizSummary;
  onTakeQuiz: (quiz: QuizSummary) => void;
  onViewHistory: (quiz: QuizSummary) => void;
  getDifficultyBadgeColor: (difficulty: string) => string;
}

function QuizItem({
  quiz,
  onTakeQuiz,
  onViewHistory,
  getDifficultyBadgeColor,
}: QuizItemProps) {
  const improvement = quiz.improvement || 0;
  const lastAttemptScore = quiz.lastAttemptScore;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold truncate">{quiz.title}</h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyBadgeColor(quiz.difficulty)}`}
            >
              {quiz.difficulty}
            </span>
          </div>
          {quiz.topic && (
            <p className="text-xs text-muted-foreground">{quiz.topic}</p>
          )}
        </div>
        {lastAttemptScore !== null && (
          <div className="text-right">
            <div className="text-lg font-bold">
              {lastAttemptScore.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {quiz.lastAttemptDate &&
                new Date(quiz.lastAttemptDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {improvement !== 0 && (
        <div className="flex items-center gap-1 text-xs">
          {improvement > 0 ? (
            <span className="text-green-600 dark:text-green-400">
              📈 +{improvement.toFixed(1)}%
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400">
              📉 {improvement.toFixed(1)}%
            </span>
          )}
          <span className="text-muted-foreground">from last attempt</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onTakeQuiz(quiz)}
        >
          Take
        </Button>
        {quiz.attemptCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onViewHistory(quiz)}
          >
            View History
          </Button>
        )}
      </div>
    </div>
  );
}
