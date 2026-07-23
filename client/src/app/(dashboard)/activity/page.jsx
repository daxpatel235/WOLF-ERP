"use client";

import { Activity as ActivityIcon } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { reportsApi } from "@/lib/api";
import { toTimelineItems } from "@/lib/activity";
import { PageHeader, Card, EmptyState } from "@/components/ui/kit";
import { Timeline } from "@/components/ui/Timeline";
import { Skeleton } from "@/components/ui/feedback";

export default function ActivityPage() {
  const { data, loading, error } = useFetch(() => reportsApi.activity(100), [], {
    key: "reports:activity:100",
  });
  const items = toTimelineItems(data?.data || []);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Activity"
        subtitle="Everything that's happened in your workspace, most recent first."
      />

      <Card className="p-6">
        {loading ? (
          <div className="space-y-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={ActivityIcon}
            title="Couldn't load activity"
            hint={error.message}
          />
        ) : (
          <Timeline
            items={items}
            emptyLabel="No activity yet. As you add vendors, RFQs, and orders, they'll show up here."
          />
        )}
      </Card>
    </div>
  );
}
