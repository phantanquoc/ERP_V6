import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, MessageSquare, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { PeerFeedbackAggregate } from '../services/employeeEvaluationService';
import { useInvitePeers, useSubmitPeerFeedback, useDeclinePeerFeedback } from '../hooks/useEmployeeEvaluation';

// ── Invite view ──────────────────────────────────────────────────────────────

interface PeerUser {
  userId: string;
  employeeName: string;
  employeeCode: string;
}

const inviteSchema = z.object({
  inviteeUserIds: z
    .array(z.string())
    .min(2, 'Phải mời ít nhất 2 người')
    .max(3, 'Tối đa 3 người'),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteViewProps {
  evaluationId: string;
  availablePeers: PeerUser[];
  onSent?: () => void;
}

const InviteView: React.FC<InviteViewProps> = ({ evaluationId, availablePeers, onSent }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const invitePeers = useInvitePeers();
  const { handleSubmit, formState: { errors }, setValue } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { inviteeUserIds: [] },
  });

  const togglePeer = (userId: string) => {
    setSelected(prev => {
      const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
      setValue('inviteeUserIds', next);
      return next;
    });
  };

  const onSubmit = async () => {
    await invitePeers.mutateAsync({ evaluationId, inviteeUserIds: selected });
    onSent?.();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Chọn 2-3 đồng nghiệp trong cùng bộ phận để mời đánh giá. Phản hồi sẽ ẩn danh.
      </p>

      <div className="space-y-1.5 max-h-52 overflow-y-auto">
        {availablePeers.map(peer => (
          <label
            key={peer.userId}
            className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer transition-colors ${
              selected.includes(peer.userId)
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(peer.userId)}
              onChange={() => togglePeer(peer.userId)}
              disabled={!selected.includes(peer.userId) && selected.length >= 3}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-800">
              {peer.employeeName}
              <span className="text-xs text-gray-400 ml-1">({peer.employeeCode})</span>
            </span>
          </label>
        ))}
      </div>

      {errors.inviteeUserIds && (
        <p className="text-xs text-red-600">{errors.inviteeUserIds.message}</p>
      )}

      <p className="text-xs text-gray-500">Đã chọn: {selected.length}/3</p>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={selected.length < 2 || invitePeers.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {invitePeers.isPending ? 'Đang gửi...' : 'Gửi lời mời'}
        </button>
      </div>
    </div>
  );
};

// ── Submit view (token-based) ─────────────────────────────────────────────

const submitSchema = z.object({
  strength: z.string().min(10, 'Vui lòng nhập ít nhất 10 ký tự'),
  weakness: z.string().min(10, 'Vui lòng nhập ít nhất 10 ký tự'),
  suggestion: z.string().min(10, 'Vui lòng nhập ít nhất 10 ký tự'),
});

type SubmitFormValues = z.infer<typeof submitSchema>;

interface SubmitViewProps {
  token: string;
  onDone?: () => void;
}

const SubmitView: React.FC<SubmitViewProps> = ({ token, onDone }) => {
  const submitFeedback = useSubmitPeerFeedback();
  const declineFeedback = useDeclinePeerFeedback();
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
  });

  const onSubmit = async (data: SubmitFormValues) => {
    await submitFeedback.mutateAsync({ token, body: data });
    setDone(true);
    onDone?.();
  };

  const handleDecline = async () => {
    await declineFeedback.mutateAsync(token);
    setDone(true);
    onDone?.();
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-8 gap-3 text-green-700">
        <CheckCircle className="w-10 h-10" />
        <p className="text-sm font-medium">Cảm ơn bạn đã gửi phản hồi!</p>
        <p className="text-xs text-gray-500">Phản hồi của bạn hoàn toàn ẩn danh.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-gray-600">
        Phản hồi của bạn hoàn toàn <strong>ẩn danh</strong>. Vui lòng trả lời trung thực.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Điểm mạnh</label>
        <textarea
          {...register('strength')}
          rows={3}
          placeholder="Điểm mạnh nổi bật của người này là gì?"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.strength && <p className="text-xs text-red-600 mt-1">{errors.strength.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Điểm cần cải thiện</label>
        <textarea
          {...register('weakness')}
          rows={3}
          placeholder="Điều gì cần được cải thiện?"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.weakness && <p className="text-xs text-red-600 mt-1">{errors.weakness.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gợi ý phát triển</label>
        <textarea
          {...register('suggestion')}
          rows={3}
          placeholder="Bạn có gợi ý gì để người này phát triển hơn?"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.suggestion && <p className="text-xs text-red-600 mt-1">{errors.suggestion.message}</p>}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleDecline}
          disabled={declineFeedback.isPending}
          className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {declineFeedback.isPending ? 'Đang xử lý...' : 'Từ chối tham gia'}
        </button>
        <button
          type="submit"
          disabled={submitFeedback.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {submitFeedback.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
        </button>
      </div>
    </form>
  );
};

// ── Aggregate view ────────────────────────────────────────────────────────

interface AggregateViewProps {
  aggregate: PeerFeedbackAggregate | null | undefined;
  isLoading?: boolean;
}

const AggregateView: React.FC<AggregateViewProps> = ({ aggregate, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-500 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Đang tải phản hồi...</span>
      </div>
    );
  }

  if (!aggregate) return <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu phản hồi.</p>;

  if (aggregate.pending) {
    return (
      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
        <p className="text-sm text-yellow-800">
          Đã nhận <strong>{aggregate.respondentCount}</strong> phản hồi.
          Cần tối thiểu <strong>{aggregate.expectedMinimum}</strong> để hiển thị kết quả tổng hợp.
        </p>
      </div>
    );
  }

  const renderSection = (title: string, items: string[], color: string) => (
    <div className="space-y-2">
      <h5 className={`text-sm font-semibold ${color}`}>{title}</h5>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Không có phản hồi.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm text-gray-700 pl-3 border-l-2 border-gray-200">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Users className="w-3.5 h-3.5" />
        <span>Tổng hợp từ {aggregate.respondentCount} phản hồi ẩn danh</span>
      </div>
      {renderSection('Điểm mạnh', aggregate.strengths, 'text-green-700')}
      {renderSection('Điểm cần cải thiện', aggregate.weaknesses, 'text-orange-700')}
      {renderSection('Gợi ý phát triển', aggregate.suggestions, 'text-blue-700')}
    </div>
  );
};

// ── Main PeerFeedbackForm ─────────────────────────────────────────────────

type PeerFeedbackView = 'invite' | 'aggregate';

interface PeerFeedbackFormProps {
  evaluationId: string;
  view: PeerFeedbackView;
  availablePeers?: PeerUser[];
  aggregate?: PeerFeedbackAggregate | null;
  isLoadingAggregate?: boolean;
  onInviteSent?: () => void;
  // For token-based submit, use SubmitView directly via standalone usage
  token?: string;
}

const PeerFeedbackForm: React.FC<PeerFeedbackFormProps> = ({
  evaluationId,
  view,
  availablePeers = [],
  aggregate,
  isLoadingAggregate,
  onInviteSent,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-indigo-600" />
        <h4 className="text-sm font-semibold text-gray-800">Phản hồi đồng nghiệp</h4>
      </div>

      {view === 'invite' && (
        <InviteView
          evaluationId={evaluationId}
          availablePeers={availablePeers}
          onSent={onInviteSent}
        />
      )}

      {view === 'aggregate' && (
        <AggregateView aggregate={aggregate} isLoading={isLoadingAggregate} />
      )}
    </div>
  );
};

// Export individual views for flexible usage
export { InviteView, SubmitView, AggregateView };
export default PeerFeedbackForm;
