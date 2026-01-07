"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Play } from "lucide-react";
import { QuizTakingModal } from "./quiz-taking-modal";

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "short-answer" | "true-false" | "fill-blank";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface QuizData {
  id: string;
  title: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  questionCount: number;
  description?: string;
  questions: QuizQuestion[];
}

interface QuizPreviewCardProps {
  quiz: QuizData;
}

export function QuizPreviewCard({ quiz }: QuizPreviewCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Card className="w-full max-w-sm bg-sidebar-accent/20 backdrop-blur-2xl border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BrainCircuit className="size-4" />
            </div>
            <div className="flex flex-col">
              <CardTitle className="text-sm font-medium">
                {quiz.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {quiz.topic}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary" className="text-[10px] h-5">
              {quiz.difficulty}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5">
              {quiz.questionCount} questions
            </Badge>
          </div>
          {quiz.description && <p className="text-xs">{quiz.description}</p>}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full h-8 text-xs"
            onClick={() => setIsOpen(true)}
          >
            <Play className="mr-2 size-3" />
            Take Quiz
          </Button>
        </CardFooter>
      </Card>
      <QuizTakingModal open={isOpen} onOpenChange={setIsOpen} quiz={quiz} />
    </>
  );
}
