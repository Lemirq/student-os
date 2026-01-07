"use client";

import {
  useState,
  useTransition,
  useEffect,
  startTransition,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  LucideCornerDownLeft,
} from "lucide-react";
import { submitQuizAttempt } from "@/actions/quiz/submit-quiz-attempt";

interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "fill_in_the_blank";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

interface QuizData {
  id: string;
  title: string;
  difficulty: string;
  topic?: string | null;
}

interface QuizTakingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: QuizData;
  onSuccess?: () => void;
}

export function QuizTakingModal({
  open,
  onOpenChange,
  quiz,
  onSuccess,
}: QuizTakingModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, startSubmitting] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    answers: Array<{
      questionId: string;
      userAnswer: string;
      isCorrect: boolean;
      correctAnswer?: string;
      explanation?: string;
    }>;
  } | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pulseQuestionId, setPulseQuestionId] = useState<string | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion =
    questions.length > 0 && currentQuestionIndex === questions.length - 1;

  useEffect(() => {
    if (open && quiz.id) {
      startTransition(() => {
        setIsLoading(true);
      });

      fetch(`/api/quiz/${quiz.id}/questions`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setQuestions(data.questions);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch quiz questions:", err);
          toast.error("Failed to load quiz questions");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, quiz.id]);

  const goToNext = useCallback(() => {
    setCurrentQuestionIndex((prev) => {
      if (questions.length === 0) return prev;
      return Math.min(prev + 1, questions.length - 1);
    });
  }, [questions.length]);

  const goToPrevious = useCallback(() => {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleAnswerChange = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: value,
      }));
    },
    [],
  );

  const handleAutoAdvance = useCallback(
    (
      value: string,
      options?: { skipAdvance?: boolean; immediateAdvance?: boolean },
    ) => {
      if (!currentQuestion) return;
      const targetQuestionId = currentQuestion.id;
      handleAnswerChange(targetQuestionId, value);

      const shouldAdvance = !options?.skipAdvance && !isLastQuestion;
      setPulseQuestionId(targetQuestionId);

      // For some interactions (like pressing Enter in text inputs), we want to
      // advance immediately without waiting for the full blink delay.
      if (options?.immediateAdvance && shouldAdvance) {
        goToNext();
        return;
      }

      const timeout = window.setTimeout(() => {
        setPulseQuestionId((prev) => (prev === targetQuestionId ? null : prev));
        if (shouldAdvance) {
          goToNext();
        }
      }, 600);

      return () => window.clearTimeout(timeout);
    },
    [currentQuestion, goToNext, handleAnswerChange, isLastQuestion],
  );

  const handleSubmit = useCallback(async () => {
    const unansweredQuestions = questions.filter((q) => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    startSubmitting(async () => {
      try {
        const submissionResult = await submitQuizAttempt({
          quizId: quiz.id,
          answers: Object.entries(answers).map(([questionId, userAnswer]) => ({
            questionId,
            userAnswer,
          })),
        });

        setResult({
          score: submissionResult.score,
          answers: submissionResult.answers.map((answer: unknown) => {
            const typedAnswer = answer as {
              questionId: string;
              userAnswer: string;
              isCorrect: boolean;
              correctAnswer?: string;
              explanation?: string;
            };
            return {
              questionId: typedAnswer.questionId,
              userAnswer: typedAnswer.userAnswer,
              isCorrect: typedAnswer.isCorrect,
              correctAnswer: typedAnswer.correctAnswer,
              explanation: typedAnswer.explanation,
            };
          }),
        });
        setSubmitted(true);
        onSuccess?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to submit quiz",
        );
      }
    });
  }, [answers, onSuccess, questions, quiz.id]);

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setSubmitted(false);
      setResult(null);
      onOpenChange(false);
    }
  };

  useEffect(() => {
    if (!open || submitted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const question = questions[currentQuestionIndex];
      if (!question) return;

      // Command/Ctrl + Enter submits (if not already submitting)
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (!isSubmitting) {
          handleSubmit();
        }
        return;
      }

      // Plain Enter always maps to "Next question" behavior (no auto-submit)
      if (event.key === "Enter" && !(event.metaKey || event.ctrlKey)) {
        event.preventDefault();

        if (
          question.type === "short_answer" ||
          question.type === "fill_in_the_blank"
        ) {
          const currentValue = answers[question.id] ?? "";
          // For inputs, advance immediately without waiting for the full blink delay
          handleAutoAdvance(currentValue, {
            skipAdvance: false,
            immediateAdvance: true,
          });
        } else if (!isLastQuestion && answers[question.id]) {
          goToNext();
        }
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const isTextInputActive =
        !!activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true");

      if (
        question.type === "multiple_choice" &&
        question.options &&
        question.options.length > 0
      ) {
        if (isTextInputActive) return;
        const keyIndex = ["1", "2", "3", "4"].indexOf(event.key);
        if (keyIndex !== -1 && keyIndex < question.options.length) {
          event.preventDefault();
          handleAutoAdvance(question.options[keyIndex], {
            skipAdvance: false,
          });
        }
      } else if (question.type === "true_false") {
        if (isTextInputActive) return;
        const key = event.key.toLowerCase();
        if (key === "t") {
          event.preventDefault();
          handleAutoAdvance("True", { skipAdvance: false });
        } else if (key === "f") {
          event.preventDefault();
          handleAutoAdvance("False", { skipAdvance: false });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    answers,
    currentQuestionIndex,
    handleAutoAdvance,
    handleSubmit,
    isSubmitting,
    isLastQuestion,
    goToNext,
    open,
    questions,
    submitted,
  ]);

  if (isLoading || !currentQuestion) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (submitted && result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Results</DialogTitle>
            <DialogDescription>
              You scored {result.score.toFixed(1)}%
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-center justify-center gap-4 p-6 rounded-lg bg-muted">
              <div className="text-4xl font-bold">
                {result.score.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">
                {result.score >= 70
                  ? "Great job! Keep it up!"
                  : result.score >= 50
                    ? "Good effort! Review material and try again."
                    : "Keep practicing! Review your answers below."}
              </div>
            </div>

            <div className="space-y-3">
              {result.answers.map((answer, index) => {
                const question = questions.find(
                  (q) => q.id === answer.questionId,
                );
                if (!question) return null;

                return (
                  <div
                    key={answer.questionId}
                    className={`p-4 rounded-lg border ${
                      answer.isCorrect
                        ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {answer.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {index + 1}. {question.question}
                        </p>
                        <div className="mt-2 space-y-1 text-xs">
                          <div>
                            <span className="font-medium">Your answer: </span>
                            <span
                              className={
                                answer.isCorrect
                                  ? ""
                                  : "line-through opacity-60"
                              }
                            >
                              {answer.userAnswer}
                            </span>
                          </div>
                          {!answer.isCorrect && answer.correctAnswer && (
                            <div>
                              <span className="font-medium">
                                Correct answer:{" "}
                              </span>
                              <span className="text-green-700 dark:text-green-300">
                                {answer.correctAnswer}
                              </span>
                            </div>
                          )}
                          {answer.explanation && (
                            <p className="text-muted-foreground mt-2 pt-2 border-t">
                              {answer.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{quiz.title}</DialogTitle>
          <DialogDescription>
            Question {currentQuestionIndex + 1} of {questions.length}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Difficulty:</span>
              <span className="font-medium capitalize">{quiz.difficulty}</span>
            </div>
            {quiz.topic && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Topic:</span>
                <span className="font-medium">{quiz.topic}</span>
              </div>
            )}
          </div>

          <div className="p-6 rounded-lg bg-muted">
            <p className="text-base font-medium">{currentQuestion.question}</p>
          </div>

          <div className="space-y-4">
            {currentQuestion.type === "multiple_choice" &&
              currentQuestion.options &&
              currentQuestion.options.length > 0 && (
                <div className="grid gap-3">
                  {currentQuestion.options.map((option, index) => (
                    <label
                      key={index}
                      htmlFor={`option-${index}`}
                      className={`
                        relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          answers[currentQuestion.id] === option
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                        ${
                          answers[currentQuestion.id] === option &&
                          pulseQuestionId === currentQuestion.id
                            ? "animate-[pulse_0.25s_ease-in-out_2]"
                            : ""
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        id={`option-${index}`}
                        value={option}
                        checked={answers[currentQuestion.id] === option}
                        onChange={(e) =>
                          handleAnswerChange(currentQuestion.id, e.target.value)
                        }
                        className={`mt-1 w-4 h-4 accent-primary ${
                          answers[currentQuestion.id] === option &&
                          pulseQuestionId === currentQuestion.id
                            ? "animate-[pulse_0.25s_ease-in-out_2]"
                            : ""
                        }`}
                      />
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="flex-1 text-sm leading-relaxed">
                          {option}
                        </span>
                        <Kbd className="ml-2">{index + 1}</Kbd>
                      </div>
                    </label>
                  ))}
                </div>
              )}

            {currentQuestion.type === "true_false" && (
              <div className="grid gap-3">
                {["True", "False"].map((value) => (
                  <label
                    key={value}
                    htmlFor={value.toLowerCase()}
                    className={`
                      relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        answers[currentQuestion.id] === value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }
                      ${
                        answers[currentQuestion.id] === value &&
                        pulseQuestionId === currentQuestion.id
                          ? "animate-[pulse_0.25s_ease-in-out_2]"
                          : ""
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.id}
                      id={value.toLowerCase()}
                      value={value}
                      checked={answers[currentQuestion.id] === value}
                      onChange={(e) =>
                        handleAnswerChange(currentQuestion.id, e.target.value)
                      }
                      className={`mt-1 w-4 h-4 accent-primary ${
                        answers[currentQuestion.id] === value &&
                        pulseQuestionId === currentQuestion.id
                          ? "animate-[pulse_0.25s_ease-in-out_2]"
                          : ""
                      }`}
                    />
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="flex-1 text-sm leading-relaxed">
                        {value}
                      </span>
                      <Kbd className="ml-2">{value === "True" ? "T" : "F"}</Kbd>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {(currentQuestion.type === "short_answer" ||
              currentQuestion.type === "fill_in_the_blank") && (
              <div className="space-y-2">
                <Label htmlFor="answer-input" className="text-sm font-medium">
                  Your Answer
                </Label>
                <Input
                  id="answer-input"
                  type="text"
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) =>
                    handleAnswerChange(currentQuestion.id, e.target.value)
                  }
                  className={`text-base ${
                    pulseQuestionId === currentQuestion.id
                      ? "animate-pulse"
                      : ""
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          <Button
            onClick={
              currentQuestionIndex === questions.length - 1
                ? handleSubmit
                : goToNext
            }
            disabled={!answers[currentQuestion.id] || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : currentQuestionIndex === questions.length - 1 ? (
              <span className="inline-flex items-center gap-2">
                <span>Submit Quiz</span>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>
                    <LucideCornerDownLeft className="size-3" />
                  </Kbd>
                </KbdGroup>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span>Next</span>
                <Kbd>
                  <LucideCornerDownLeft className="size-3" />
                </Kbd>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
