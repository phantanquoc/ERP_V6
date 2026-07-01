import React from 'react';

export type BadgeTone = 'green' | 'blue' | 'yellow' | 'red' | 'gray';

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
};

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
  size?: 'sm' | 'md';
}

export const StatusBadge = ({ label, tone, size = 'md' }: StatusBadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
