"use server";

import { createClient } from "@/utils/supabase/server";

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL ?? "";
const AGENT_SERVICE_API_KEY = process.env.AGENT_SERVICE_API_KEY ?? "";

export async function resumeAgent(
  taskId: string,
  userResponse: string,
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

    if (!taskId) {
      return { success: false, error: "Task ID is required" };
    }

    // Call the agent service to resume the task
    const response = await fetch(`${AGENT_SERVICE_URL}/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(AGENT_SERVICE_API_KEY && {
          Authorization: `Bearer ${AGENT_SERVICE_API_KEY}`,
        }),
      },
      body: JSON.stringify({
        task_id: taskId,
        user_id: user.id,
        user_response: userResponse,
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
          errorData.detail ||
          errorData.error ||
          `Agent service error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status === "resumed") {
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
