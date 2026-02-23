import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export const AGENT_COLORS = {
  orchestrator: '#8B5CF6',
  garment_extract: '#10B981',
  model_manager: '#3B82F6',
  virtual_tryon: '#F59E0B',
  qc: '#EF4444',
} as const;

export const AGENT_ICONS = {
  orchestrator: 'brain',
  garment_extract: 'shirt',
  model_manager: 'user',
  virtual_tryon: 'sparkles',
  qc: 'check-circle',
} as const;

export const STATUS_COLORS = {
  queued: '#71717A',
  processing: '#3B82F6',
  completed: '#10B981',
  failed: '#EF4444',
  cancelled: '#71717A',
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  needs_review: '#F59E0B',
} as const;
