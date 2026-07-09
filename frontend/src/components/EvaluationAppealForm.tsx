import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { useSubmitAppeal, useReplyAppeal } from '../hooks/useEmployeeEvaluation';

const appealSchema = z.object({
  appealComment: z.string().min(10, 'Khiếu nại phải có ít nhất 10 ký tự'),
});

const replySchema = z.object({
  appealResponse: z.string().min(5, 'Phản hồi phải có ít nhất 5 ký tự'),
});

type AppealFormValues = z.infer<typeof appealSchema>;
type ReplyFormValues = z.infer<typeof replySchema>;

interface EvaluationAppealFormProps {
  evaluationId: string;
  evaluationEmployeeUserId: string;
  acknowledgedAt?: string | null;
  appealComment?: string | null;
  appealResponse?: string | null;
  appealedAt?: string | null;
  appealRespondedAt?: string | null;
  onSuccess?: () => void;
}

const APPEAL_WINDOW_DAYS = 7;

const EvaluationAppealForm: React.FC<EvaluationAppealFormProps> = ({
  evaluationId,
  evaluationEmployeeUserId,
  acknowledgedAt,
  appealComment,
  appealResponse,
  appealedAt,
  appealRespondedAt,
  onSuccess,
}) => {
  const { user } = useAuth();
  const submitAppeal = useSubmitAppeal();
  const replyAppeal = useReplyAppeal();

  const isEmployee = user?._id === evaluationEmployeeUserId;
  const canReply =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.DEPARTMENT_HEAD ||
    user?.role === UserRole.TEAM_LEAD;

  // Calculate days remaining in appeal window
  const { daysRemaining, withinWindow } = useMemo(() => {
    if (!acknowledgedAt) return { daysRemaining: 0, withinWindow: false };
    const acknowledged = new Date(acknowledgedAt);
    const deadline = new Date(acknowledged.getTime() + APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return { daysRemaining: Math.max(0, days), withinWindow: diffMs > 0 };
  }, [acknowledgedAt]);

  const appealForm = useForm<AppealFormValues>({
    resolver: zodResolver(appealSchema),
    defaultValues: { appealComment: '' },
  });

  const replyForm = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { appealResponse: '' },
  });

  const onSubmitAppeal = async (data: AppealFormValues) => {
    await submitAppeal.mutateAsync({ evaluationId, appealComment: data.appealComment });
    onSuccess?.();
  };

  const onSubmitReply = async (data: ReplyFormValues) => {
    await replyAppeal.mutateAsync({ evaluationId, appealResponse: data.appealResponse });
    onSuccess?.();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-orange-600" />
        <h4 className="text-sm font-semibold text-gray-800">Khiếu nại kết quả đánh giá</h4>
      </div>

      {/* Show existing appeal */}
      {appealComment && (
        <div className="border border-orange-200 rounded-lg p-3 bg-orange-50 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-orange-800">Khiếu nại của nhân viên</span>
                {appealedAt && (
                  <span className="text-xs text-gray-400">{formatDate(appealedAt)}</span>
                )}
              </div>
              <p className="text-sm text-gray-700">{appealComment}</p>
            </div>
          </div>

          {/* Show reply */}
          {appealResponse && (
            <div className="ml-4 pl-3 border-l-2 border-green-300">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-800">Phản hồi của quản lý</span>
                {appealRespondedAt && (
                  <span className="text-xs text-gray-400">{formatDate(appealRespondedAt)}</span>
                )}
              </div>
              <p className="text-sm text-gray-700">{appealResponse}</p>
            </div>
          )}

          {/* Reply form for managers — only if no reply yet */}
          {canReply && !appealResponse && (
            <form onSubmit={replyForm.handleSubmit(onSubmitReply)} className="mt-2">
              <textarea
                {...replyForm.register('appealResponse')}
                rows={3}
                placeholder="Nhập phản hồi của bạn..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {replyForm.formState.errors.appealResponse && (
                <p className="text-xs text-red-600 mt-1">
                  {replyForm.formState.errors.appealResponse.message}
                </p>
              )}
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={replyAppeal.isPending}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 font-medium"
                >
                  {replyAppeal.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Employee appeal form — only if no appeal yet and within window */}
      {isEmployee && !appealComment && (
        <>
          {withinWindow ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
                <span className="text-xs text-yellow-800">
                  Còn <strong>{daysRemaining} ngày</strong> để khiếu nại kết quả đánh giá
                </span>
              </div>

              <form onSubmit={appealForm.handleSubmit(onSubmitAppeal)} className="space-y-2">
                <textarea
                  {...appealForm.register('appealComment')}
                  rows={3}
                  placeholder="Mô tả lý do bạn không đồng ý với kết quả đánh giá..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {appealForm.formState.errors.appealComment && (
                  <p className="text-xs text-red-600">
                    {appealForm.formState.errors.appealComment.message}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitAppeal.isPending}
                    className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:bg-gray-400 font-medium"
                  >
                    {submitAppeal.isPending ? 'Đang gửi...' : 'Gửi khiếu nại'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-sm text-gray-500 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              Đã hết thời hạn khiếu nại ({APPEAL_WINDOW_DAYS} ngày kể từ khi xác nhận).
            </div>
          )}
        </>
      )}

      {!isEmployee && !canReply && !appealComment && (
        <p className="text-sm text-gray-400">Chưa có khiếu nại nào.</p>
      )}
    </div>
  );
};

export default EvaluationAppealForm;
