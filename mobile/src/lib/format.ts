import type { DocStatus, Money, Priority } from '@/types/domain';

const symbols: Record<Money['currency'], string> = { INR: '₹', USD: '$', EUR: '€' };

/** Full currency with Indian grouping — matches the web app's formatINR (₹8,80,000). */
export function money(m: Money): string {
  const s = symbols[m.currency];
  const locale = m.currency === 'INR' ? 'en-IN' : 'en-US';
  return `${s}${Number(m.amount).toLocaleString(locale)}`;
}

/** Relative time: "just now", "3h ago", "2d ago", else short date. */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const min = 60_000, hr = 3_600_000, day = 86_400_000;
  const suffix = diff >= 0 ? 'ago' : 'from now';
  if (abs < min) return 'just now';
  if (abs < hr) return `${Math.round(abs / min)}m ${suffix}`;
  if (abs < day) return `${Math.round(abs / hr)}h ${suffix}`;
  if (abs < 7 * day) return `${Math.round(abs / day)}d ${suffix}`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function percent(fraction: number, withSign = false): string {
  const v = Math.round(fraction * 1000) / 10;
  const sign = withSign && v > 0 ? '+' : '';
  return `${sign}${v}%`;
}

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Maps a document status to a semantic tone + label — mirrors web badgeClass. */
export const statusMeta: Record<DocStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'warning' },
  pending: { label: 'Pending', tone: 'warning' },
  pending_approval: { label: 'Pending Approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  sent: { label: 'Sent', tone: 'info' },
  received: { label: 'Received', tone: 'success' },
  paid: { label: 'Paid', tone: 'success' },
  partially_paid: { label: 'Partially Paid', tone: 'warning' },
  overdue: { label: 'Overdue', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  closed: { label: 'Closed', tone: 'neutral' },
  published: { label: 'Published', tone: 'info' },
  awarded: { label: 'Awarded', tone: 'success' },
  shortlisted: { label: 'Shortlisted', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'neutral' },
};

/** Priority → tone (web priorityClass: high=red, medium=amber, low=slate). */
export const priorityMeta: Record<Priority, { label: string; tone: Tone }> = {
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'neutral' },
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
