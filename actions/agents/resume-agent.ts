"use server";

import { createClient } from "@/utils/supabase/server";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL ?? "";
const AGENT_SERVICE_API_KEY = process.env.AGENT_SERVICE_API_KEY ?? "";

export async function resumeAgent(
  sessionId: string,
  pauseId: string,
  actionType: "completed" | "cancelled",
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!AGENT_SERVICE_URL) {
      return {
        success: false,
        error: "Agent service not configured. Please set AGENT_SERVICE_URL.",
      };
    }

    if (!sessionId) {
      return { success: false, error: "Session ID is required" };
    }
    
    if (!pauseId) {
      return { success: false, error: "Pause ID is required" };
    }

    // Call the agent service to resume the task
    // POST /agents/:id/hitl
    const response = await fetch(`${AGENT_SERVICE_URL}/agents/${sessionId}/hitl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(AGENT_SERVICE_API_KEY && {
          "x-api-key": AGENT_SERVICE_API_KEY,
        }),
      },
      body: JSON.stringify({
        pauseId,
        action: actionType, // "completed" or "cancelled"
        userResponse: actionType === "completed" ? "User manually completed action" : "User cancelled",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "[resume-agent] Agent service error:",
        response.status,
        errorData,
      );
      return {
        success: false,
        error:
          errorData.message ||
          `Agent service error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.resumed || data.cancelled) {
      return { success: true };
    } else {
      return {
        success: false,
        error: data.message || "Failed to resume agent",
      };
    }
  } catch (error) {
    console.error("[resume-agent] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resume agent",
    };
  }
}
