"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function QuickCapture() {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Captured!", {
      description: "This feature will be connected to AI soon.",
    });

    setInput("");
    setIsProcessing(false);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Quick Capture
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <Textarea
          placeholder="Paste syllabus, type 'Midterm on Oct 5', or dump raw notes..."
          className="flex-1 resize-none text-sm min-h-[100px]"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button
          size="sm"
          className="w-full"
          onClick={handleProcess}
          disabled={!input.trim() || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Process with AI"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
