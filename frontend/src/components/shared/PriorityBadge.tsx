import StatusBadge, { type BadgeTone } from './StatusBadge';

const PRIORITY_TONE: Record<string, BadgeTone> = {
  'Cao': 'red',
  'Trung bình': 'yellow',
  'Thấp': 'blue',
};

interface PriorityBadgeProps {
  value: string;
  size?: 'sm' | 'md';
}

export const PriorityBadge = ({ value, size }: PriorityBadgeProps) => {
  const tone: BadgeTone = PRIORITY_TONE[value] ?? 'gray';
  return <StatusBadge label={value} tone={tone} size={size} />;
};

export default PriorityBadge;
