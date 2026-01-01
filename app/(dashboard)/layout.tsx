import { cookies } from "next/headers";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  createServerQueryClient,
  dehydrateQueryClient,
  prefetchQuery,
} from "@/lib/query-utils";
import { queryKeys } from "@/lib/query-keys";
import { getSidebarData } from "@/actions/sidebar";
import { DashboardLayoutClient } from "@/components/dashboard-layout-client";
import { createClient } from "@/utils/supabase/server";
import { PushNotificationSetup } from "@/components/notifications/push-notification-setup";
import { IOSInstallPrompt } from "@/components/notifications/ios-install-prompt";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = createServerQueryClient();

  // Prefetch sidebar data on server
  await prefetchQuery(queryClient, queryKeys.sidebar.all, getSidebarData);

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const aiEnabled = user?.user?.email === "sharmavihaan190@gmail.com";

  return (
    <HydrationBoundary state={dehydrateQueryClient(queryClient)}>
      <PushNotificationSetup />
      <IOSInstallPrompt />
      <DashboardLayoutClient defaultOpen={defaultOpen} aiEnabled={aiEnabled}>
        {children}
      </DashboardLayoutClient>
    </HydrationBoundary>
  );
}
