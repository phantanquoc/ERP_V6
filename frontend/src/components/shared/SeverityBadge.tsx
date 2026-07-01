import React from 'react';
import StatusBadge, { type BadgeTone } from './StatusBadge';

const SEVERITY_TONE: Record<string, BadgeTone> = {
  'Nghiêm trọng': 'red',
  'Trung bình': 'yellow',
  'Nhẹ': 'gray',
};

interface SeverityBadgeProps {
  value: string;
  size?: 'sm' | 'md';
}

export const SeverityBadge = ({ value, size }: SeverityBadgeProps) => {
  const tone: BadgeTone = SEVERITY_TONE[value] ?? 'gray';
  return <StatusBadge label={value} tone={tone} size={size} />;
};

export default SeverityBadge;
