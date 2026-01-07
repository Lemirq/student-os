"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { generateQuiz } from "@/actions/quiz/generate-quiz";
import { createClient } from "@/utils/supabase/client";

interface GenerateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  onSuccess?: () => void;
}

export function GenerateQuizDialog({
  open,
  onOpenChange,
  courseId,
  onSuccess,
}: GenerateQuizDialogProps) {
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced"
  >("intermediate");
  const [questionCount, setQuestionCount] = useState(10);
  const [topic, setTopic] = useState("");
  const [isGenerating, startGenerating] = useTransition();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const ALLOWED_EMAILS = ["sharmavihaan190@gmail.com", "amoghmerudi@gmail.com"];
  const aiEnabled = userEmail ? ALLOWED_EMAILS.includes(userEmail) : false;

  useState(() => {
    const getUserEmail = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
      setIsLoadingUser(false);
    };

    getUserEmail();
  });

  const handleGenerate = async () => {
    if (!aiEnabled) {
      toast.error("AI features are not available for your account");
      return;
    }

    if (questionCount < 1 || questionCount > 20) {
      toast.error("Question count must be between 1 and 20");
      return;
    }

    startGenerating(async () => {
      try {
        const result = await generateQuiz({
          courseId,
          difficulty,
          questionCount,
          topic: topic || undefined,
        });

        toast.success("Quiz generated successfully!");
        setTopic("");
        setQuestionCount(10);
        setDifficulty("intermediate");
        onSuccess?.();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to generate quiz",
        );
      }
    });
  };

  const handleClose = () => {
    if (!isGenerating) {
      setTopic("");
      setQuestionCount(10);
      setDifficulty("intermediate");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate New Quiz</DialogTitle>
          <DialogDescription>
            Use AI to generate a quiz based on your course materials
          </DialogDescription>
        </DialogHeader>

        {isLoadingUser ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !aiEnabled ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-sm text-foreground">
              AI features are not available for you.
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Contact {ALLOWED_EMAILS[0]} to get access.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(value) =>
                  setDifficulty(
                    value as "beginner" | "intermediate" | "advanced",
                  )
                }
                disabled={isGenerating}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionCount">Question Count</Label>
              <Input
                id="questionCount"
                type="number"
                min="1"
                max="20"
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(parseInt(e.target.value) || 10)
                }
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Between 1 and 20 questions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic (Optional)</Label>
              <Input
                id="topic"
                placeholder="e.g., Functions, Arrays, Data Structures"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to generate quiz from all course materials
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!aiEnabled || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Quiz
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
