import { Pill } from './StatusPill';
import { priorityMeta } from '@/lib/format';
import type { Priority } from '@/types/domain';

export function PriorityPill({ priority }: { priority: Priority }) {
  const meta = priorityMeta[priority];
  return <Pill tone={meta.tone} label={meta.label} />;
}
