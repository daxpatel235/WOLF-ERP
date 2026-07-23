import { PageSkeleton } from "@/components/ui/feedback";

// Shown by Next during a route transition inside the dashboard shell. The
// sidebar and topbar stay put — only the page body swaps to a skeleton.
export default function DashboardLoading() {
  return <PageSkeleton />;
}
