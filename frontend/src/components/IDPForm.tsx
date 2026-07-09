import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { EvaluationIdpItem } from '../services/employeeEvaluationService';
import { useCreateIdpItem, useUpdateIdpItem, useDeleteIdpItem } from '../hooks/useEmployeeEvaluation';

const idpSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),
      skill: z.string().min(1, 'Vui lòng nhập kỹ năng cần phát triển'),
      action: z.string().min(1, 'Vui lòng nhập hành động cụ thể'),
      deadline: z.string().optional(),
    })
  ).max(3, 'Tối đa 3 mục phát triển'),
});

type IdpFormValues = z.infer<typeof idpSchema>;

interface IDPFormProps {
  evaluationId: string;
  existingItems: EvaluationIdpItem[];
  readOnly?: boolean;
  onSaved?: () => void;
}

const IDPForm: React.FC<IDPFormProps> = ({ evaluationId, existingItems, readOnly = false, onSaved }) => {
  const createItem = useCreateIdpItem();
  const updateItem = useUpdateIdpItem();
  const deleteItem = useDeleteIdpItem();

  const { control, register, handleSubmit, formState: { errors, isDirty } } = useForm<IdpFormValues>({
    resolver: zodResolver(idpSchema),
    defaultValues: {
      items: existingItems.length > 0
        ? existingItems.map(item => ({
            id: item.id,
            skill: item.skill,
            action: item.action,
            deadline: item.deadline ?? '',
          }))
        : [{ skill: '', action: '', deadline: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const onSubmit = async (data: IdpFormValues) => {
    for (const item of data.items) {
      if (item.id) {
        await updateItem.mutateAsync({
          evaluationId,
          idpId: item.id,
          body: { skill: item.skill, action: item.action, deadline: item.deadline || undefined },
        });
      } else {
        await createItem.mutateAsync({
          evaluationId,
          body: { skill: item.skill, action: item.action, deadline: item.deadline || undefined },
        });
      }
    }
    onSaved?.();
  };

  const handleDelete = async (index: number, idpId?: string) => {
    if (idpId) {
      await deleteItem.mutateAsync({ evaluationId, idpId });
    }
    remove(index);
  };

  const isSaving = createItem.isPending || updateItem.isPending || deleteItem.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-600" />
          <h4 className="text-sm font-semibold text-gray-800">Kế hoạch phát triển cá nhân (IDP)</h4>
          <span className="text-xs text-gray-500">({fields.length}/3)</span>
        </div>
        {!readOnly && fields.length < 3 && (
          <button
            type="button"
            onClick={() => append({ skill: '', action: '', deadline: '' })}
            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm mục
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-600">Mục {index + 1}</span>
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
                {...register(`items.${index}.skill`)}
                disabled={readOnly}
                placeholder="Kỹ năng cần phát triển *"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
              {errors.items?.[index]?.skill && (
                <p className="text-xs text-red-600 mt-1">{errors.items[index]?.skill?.message}</p>
              )}
            </div>

            <div>
              <textarea
                {...register(`items.${index}.action`)}
                disabled={readOnly}
                rows={2}
                placeholder="Hành động cụ thể *"
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
              {errors.items?.[index]?.action && (
                <p className="text-xs text-red-600 mt-1">{errors.items[index]?.action?.message}</p>
              )}
            </div>

            <div>
              <input
                type="date"
                {...register(`items.${index}.deadline`)}
                disabled={readOnly}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-400 mt-0.5">Hạn hoàn thành (tùy chọn)</p>
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Chưa có kế hoạch phát triển nào.</p>
        )}

        {!readOnly && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isDirty || isSaving}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu kế hoạch'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default IDPForm;
