import { TaskPriority } from '../services/taskService';

export const getTaskPriorityLabel = (priority: TaskPriority): string => {
  const labels: Record<TaskPriority, string> = {
    [TaskPriority.KHAN_CAP]: 'Khẩn cấp',
    [TaskPriority.CAO]: 'Cao',
    [TaskPriority.TRUNG_BINH]: 'Trung bình',
    [TaskPriority.THAP]: 'Thấp',
  };
  return labels[priority] || priority;
};

export const getTaskPriorityColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.KHAN_CAP]: 'bg-red-100 text-red-800',
    [TaskPriority.CAO]: 'bg-orange-100 text-orange-800',
    [TaskPriority.TRUNG_BINH]: 'bg-yellow-100 text-yellow-800',
    [TaskPriority.THAP]: 'bg-green-100 text-green-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

