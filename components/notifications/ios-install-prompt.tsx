"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const STORAGE_KEY = "ios-install-prompt-dismissed";

/**
 * Detects if the user is on an iOS device
 */
const isIOSDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

/**
 * Checks if the app is already running in standalone mode (installed to home screen)
 */
const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
};

/**
 * Banner component that prompts iOS users to install the app to their home screen
 * Shows instructions for adding to home screen via Share button
 * Dismissible and stores dismissal state in localStorage
 */
export const IOSInstallPrompt = (): React.ReactElement | null => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // Check if we should show the prompt
    const shouldShow =
      isIOSDevice() && !isStandalone() && !localStorage.getItem(STORAGE_KEY);

    setIsVisible(shouldShow);
  }, []);

  const handleDismiss = (): void => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom">
      <Card className="relative shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>

        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Install Student OS</CardTitle>
          <CardDescription>
            Get notifications and the best experience by installing the app
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">To enable notifications and install:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>
              Tap the Share button{" "}
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs border rounded">
                ⎋
              </span>
            </li>
            <li>
              Select "Add to Home Screen"{" "}
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs border rounded">
                ➕
              </span>
            </li>
            <li>Open from your home screen icon</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
