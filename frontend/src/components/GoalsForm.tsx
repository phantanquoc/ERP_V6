import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Trash2, Target } from 'lucide-react';
import { EvaluationGoal } from '../services/employeeEvaluationService';
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/useEmployeeEvaluation';

const goalSchema = z.object({
  goals: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().min(1, 'Vui lòng nhập tiêu đề mục tiêu'),
      description: z.string().optional(),
      targetPeriod: z.string().optional(),
    })
  ).max(3, 'Tối đa 3 mục tiêu'),
});

type GoalsFormValues = z.infer<typeof goalSchema>;

interface GoalsFormProps {
  evaluationId: string;
  existingGoals: EvaluationGoal[];
  readOnly?: boolean;
  onSaved?: () => void;
}

const GoalsForm: React.FC<GoalsFormProps> = ({ evaluationId, existingGoals, readOnly = false, onSaved }) => {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const { control, register, handleSubmit, formState: { errors, isDirty } } = useForm<GoalsFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goals: existingGoals.length > 0
        ? existingGoals.map(g => ({
            id: g.id,
            title: g.title,
            description: g.description ?? '',
            targetPeriod: g.targetPeriod ?? '',
          }))
        : [{ title: '', description: '', targetPeriod: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'goals' });

  const onSubmit = async (data: GoalsFormValues) => {
    try {
      for (const goal of data.goals) {
        if (goal.id) {
          await updateGoal.mutateAsync({
            evaluationId,
            goalId: goal.id,
            body: { title: goal.title, description: goal.description, targetPeriod: goal.targetPeriod },
          });
        } else {
          await createGoal.mutateAsync({
            evaluationId,
            body: { title: goal.title, description: goal.description, targetPeriod: goal.targetPeriod },
          });
        }
      }
      toast.success('Lưu mục tiêu thành công');
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu mục tiêu thất bại');
    }
  };

  const handleDelete = async (index: number, goalId?: string) => {
    try {
      if (goalId) {
        await deleteGoal.mutateAsync({ evaluationId, goalId });
        toast.success('Đã xóa mục tiêu');
      }
      remove(index);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa mục tiêu thất bại');
    }
  };

  const isSaving = createGoal.isPending || updateGoal.isPending || deleteGoal.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-800">Mục tiêu kỳ tới</h4>
          <span className="text-xs text-gray-500">({fields.length}/3)</span>
        </div>
        {!readOnly && fields.length < 3 && (
          <button
            type="button"
            onClick={() => append({ title: '', description: '', targetPeriod: '' })}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm mục tiêu
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-600">Mục tiêu {index + 1}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleDelete(index, (field as any).id)}
                  className="text-red-400 hover:text-red-600"
                  disabled={isSaving}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <input
                {...register(`goals.${index}.title`)}
                disabled={readOnly}
                placeholder="Tiêu đề mục tiêu *"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              {errors.goals?.[index]?.title && (
                <p className="text-xs text-red-600 mt-1">{errors.goals[index]?.title?.message}</p>
              )}
            </div>

            <div>
              <textarea
                {...register(`goals.${index}.description`)}
                disabled={readOnly}
                rows={2}
                placeholder="Mô tả (tùy chọn)"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <input
                {...register(`goals.${index}.targetPeriod`)}
                disabled={readOnly}
                placeholder="Kỳ mục tiêu (ví dụ: 2026-08)"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Chưa có mục tiêu nào.</p>
        )}

        {!readOnly && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isDirty || isSaving}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu mục tiêu'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default GoalsForm;
