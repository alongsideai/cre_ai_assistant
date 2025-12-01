'use client';

/**
 * StatusBadge Component
 *
 * A reusable badge component for displaying priority, impact, category,
 * and status values with consistent color coding across the maintenance module.
 */

export type BadgeVariant = 'priority' | 'impact' | 'category' | 'status' | 'sla';

interface StatusBadgeProps {
  variant: BadgeVariant;
  value: string;
  showLabel?: boolean; // Whether to show "Priority:", "Impact:", etc.
  size?: 'sm' | 'md';
}

// Priority color mapping - most visually important
function getPriorityColors(priority: string) {
  switch (priority.toUpperCase()) {
    case 'EMERGENCY':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'LOW':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// Impact color mapping
function getImpactColors(impact: string) {
  switch (impact.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'MAJOR':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MODERATE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'MINOR':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// Status color mapping
function getStatusColors(status: string) {
  switch (status.toUpperCase()) {
    case 'NEW':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'ASSIGNED':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'EXECUTED':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'SENT':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// Category color mapping - neutral to not compete with priority
function getCategoryColors() {
  return 'bg-slate-100 text-slate-700 border-slate-300';
}

// SLA color - informational blue
function getSlaColors() {
  return 'bg-blue-100 text-blue-800 border-blue-300';
}

function getColors(variant: BadgeVariant, value: string): string {
  switch (variant) {
    case 'priority':
      return getPriorityColors(value);
    case 'impact':
      return getImpactColors(value);
    case 'status':
      return getStatusColors(value);
    case 'category':
      return getCategoryColors();
    case 'sla':
      return getSlaColors();
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

function getLabel(variant: BadgeVariant): string {
  switch (variant) {
    case 'priority':
      return 'Priority';
    case 'impact':
      return 'Impact';
    case 'status':
      return 'Status';
    case 'category':
      return 'Category';
    case 'sla':
      return 'SLA';
    default:
      return '';
  }
}

export default function StatusBadge({
  variant,
  value,
  showLabel = false,
  size = 'md',
}: StatusBadgeProps) {
  const colors = getColors(variant, value);
  const label = getLabel(variant);

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  const displayValue = showLabel ? `${label}: ${value}` : value;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${colors} ${sizeClasses}`}
    >
      {displayValue}
    </span>
  );
}

// Export color functions for use in other components if needed
export { getPriorityColors, getImpactColors, getStatusColors, getCategoryColors };
