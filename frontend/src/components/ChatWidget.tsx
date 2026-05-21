import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, ThumbsUp, ThumbsDown, Download, CheckCircle, XCircle, Edit3, Maximize2, Minimize2, Square, Plus, Menu, Pencil, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import { getDepartmentDisplayName } from '../utils/permissions';
import { API_BASE_URL } from '../config/api';

// --- Types ---
interface AgentAction {
  type: 'confirm' | 'export' | 'error';
  tool: string;
  params: Record<string, unknown>;
  message: string;
  url: string;
  filename: string;
  context?: Record<string, unknown>;
  display?: Record<string, string>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agentAction?: AgentAction;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// --- Constants ---
const STORAGE_KEY = (userId: string) => `erp_chat_sessions_${userId}`;

const FIELD_LABELS: Record<string, string> = {
  leaveType: 'Loại nghỉ phép', startDate: 'Ngày bắt đầu', endDate: 'Ngày kết thúc',
  reason: 'Lý do', nguoiNhan: 'Người nhận', noiDung: 'Nội dung',
  thoiHanHoanThanh: 'Thời hạn hoàn thành', mucDoUuTien: 'Mức độ ưu tiên', ghiChu: 'Ghi chú',
  tenKhachHang: 'Tên khách hàng', tenCongTy: 'Tên công ty', nguoiLienHe: 'Người liên hệ',
  soDienThoai: 'Số điện thoại', email: 'Email', diaChi: 'Địa chỉ', quocGia: 'Quốc gia',
  loaiKhachHang: 'Loại khách hàng', tenNhaCungCap: 'Tên nhà cung cấp', loaiCungCap: 'Loại cung cấp',
  tenSanPham: 'Tên sản phẩm', maSanPham: 'Mã sản phẩm', moTaSanPham: 'Mô tả sản phẩm',
  loaiSanPham: 'Loại sản phẩm', giaBan: 'Giá bán', mucDichYeuCau: 'Mục đích yêu cầu',
  items: 'Danh sách hàng hóa', customerId: 'Mã khách hàng',
  hinhThucVanChuyen: 'Hình thức vận chuyển', hinhThucThanhToan: 'Hình thức thanh toán',
  cangDen: 'Cảng đến', tenHeThong: 'Tên hệ thống', noiDungLoi: 'Nội dung lỗi', loaiLoi: 'Loại lỗi',
  reportDate: 'Ngày báo cáo', workDescription: 'Mô tả công việc', achievements: 'Kết quả đạt được',
  challenges: 'Khó khăn', planForNextDay: 'Kế hoạch ngày tiếp theo',
  loaiPhanHoi: 'Loại phản hồi', noiDungPhanHoi: 'Nội dung phản hồi', mucDoNghiemTrong: 'Mức độ nghiêm trọng',
};

const HIDDEN_FIELDS = new Set(['employeeId', 'maNhanVien', 'tenNhanVien', 'approvedBy', 'id']);

// Fields shown as readonly (display only, not editable)
const READONLY_FIELDS = new Set(['nguoiNhan', 'customerId', 'supplierId', 'productId']);

// Fields that use date picker
const DATE_FIELDS = new Set(['thoiHanHoanThanh', 'startDate', 'endDate', 'reportDate', 'ngayYeuCau', 'ngayBaoCao']);

// Fields that use select dropdown with predefined options
const SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  mucDoUuTien: [
    { value: 'KHAN_CAP', label: 'Khẩn cấp' },
    { value: 'CAO', label: 'Cao' },
    { value: 'TRUNG_BINH', label: 'Trung bình' },
    { value: 'THAP', label: 'Thấp' },
  ],
  leaveType: [
    { value: 'ANNUAL', label: 'Nghỉ phép năm' },
    { value: 'SICK', label: 'Nghỉ ốm' },
    { value: 'PERSONAL', label: 'Nghỉ việc riêng' },
    { value: 'MATERNITY', label: 'Nghỉ thai sản' },
    { value: 'EMERGENCY', label: 'Nghỉ khẩn cấp' },
    { value: 'COMPENSATORY', label: 'Nghỉ bù' },
  ],
  loaiKhachHang: [
    { value: 'Nhập khẩu', label: 'Nhập khẩu' },
    { value: 'Xuất khẩu', label: 'Xuất khẩu' },
    { value: 'Nội địa', label: 'Nội địa' },
    { value: 'Cả hai', label: 'Cả hai' },
  ],
  loaiCungCap: [
    { value: 'Nguyên liệu', label: 'Nguyên liệu' },
    { value: 'Bao bì', label: 'Bao bì' },
    { value: 'Thiết bị', label: 'Thiết bị' },
  ],
  loaiPhanHoi: [
    { value: 'Khiếu nại', label: 'Khiếu nại' },
    { value: 'Góp ý', label: 'Góp ý' },
    { value: 'Yêu cầu hỗ trợ', label: 'Yêu cầu hỗ trợ' },
    { value: 'Khen ngợi', label: 'Khen ngợi' },
  ],
  mucDoNghiemTrong: [
    { value: 'Cao', label: 'Cao' },
    { value: 'Trung bình', label: 'Trung bình' },
    { value: 'Thấp', label: 'Thấp' },
  ],
  loaiLoi: [
    { value: 'Cơ khí', label: 'Cơ khí' },
    { value: 'Điện', label: 'Điện' },
    { value: 'Điện tử', label: 'Điện tử' },
    { value: 'Phần mềm', label: 'Phần mềm' },
    { value: 'Khác', label: 'Khác' },
  ],
  hinhThucVanChuyen: [
    { value: 'Đường biển (FCL)', label: 'Đường biển (FCL)' },
    { value: 'Đường biển (LCL)', label: 'Đường biển (LCL)' },
    { value: 'Đường hàng không', label: 'Đường hàng không' },
    { value: 'Đường bộ', label: 'Đường bộ' },
  ],
  hinhThucThanhToan: [
    { value: 'T/T', label: 'T/T (Chuyển khoản)' },
    { value: 'L/C', label: 'L/C (Thư tín dụng)' },
    { value: 'D/P', label: 'D/P (Nhờ thu)' },
    { value: 'Tiền mặt', label: 'Tiền mặt' },
  ],
};

// --- localStorage helpers ---
function loadSessions(userId: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId));
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch { return []; }
}

function saveSessions(userId: string, sessions: ChatSession[]): void {
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(sessions));
}

function generateTitle(firstMessage: string): string {
  const clean = firstMessage.replace(/\n/g, ' ').trim();
  return clean.length > 35 ? clean.slice(0, 35) + '...' : clean;
}

function groupSessionsByDate(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const last7 = today - 7 * 86400000;

  const groups: { label: string; items: ChatSession[] }[] = [
    { label: 'Hôm nay', items: [] },
    { label: 'Hôm qua', items: [] },
    { label: '7 ngày trước', items: [] },
    { label: 'Cũ hơn', items: [] },
  ];

  for (const s of sessions) {
    if (s.updatedAt >= today) groups[0].items.push(s);
    else if (s.updatedAt >= yesterday) groups[1].items.push(s);
    else if (s.updatedAt >= last7) groups[2].items.push(s);
    else groups[3].items.push(s);
  }

  return groups.filter(g => g.items.length > 0);
}

// --- Sub-components ---
const EditParamsForm: React.FC<{
  params: Record<string, unknown>;
  display?: Record<string, string>;
  onSubmit: (edited: Record<string, unknown>) => void;
  onCancel: () => void;
}> = ({ params, display, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const visible: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (!HIDDEN_FIELDS.has(k) && !READONLY_FIELDS.has(k)) visible[k] = v;
    }
    return visible;
  });

  // Collect readonly fields for display
  const readonlyEntries = Object.entries(params).filter(([k]) => READONLY_FIELDS.has(k) && !HIDDEN_FIELDS.has(k));

  const handleSubmit = () => {
    const merged: Record<string, unknown> = { ...params };
    for (const [k, v] of Object.entries(formData)) merged[k] = v;
    onSubmit(merged);
  };

  const formatDisplayValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value ?? '');
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
      <div className="text-xs font-medium text-gray-500 mb-2">Chỉnh sửa thông tin:</div>

      {/* Readonly fields */}
      {readonlyEntries.map(([key, value]) => {
        const label = FIELD_LABELS[key] || key;
        return (
          <div key={key} className="space-y-0.5">
            <label className="text-xs font-medium text-gray-400">{label} <span className="text-[10px] text-gray-300">(không thể thay đổi)</span></label>
            <div className="w-full px-2 py-1.5 text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded-md cursor-not-allowed">
              {display?.[key] || formatDisplayValue(value)}
            </div>
          </div>
        );
      })}

      {/* Editable fields */}
      {Object.entries(formData).map(([key, value]) => {
        const label = FIELD_LABELS[key] || key;
        const strValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
        const isLong = strValue.length > 50 || (typeof value === 'object' && !Array.isArray(value));
        const selectOpts = SELECT_OPTIONS[key];
        const isDate = DATE_FIELDS.has(key);

        return (
          <div key={key} className="space-y-0.5">
            <label className="text-xs font-medium text-gray-600">{label}</label>
            {selectOpts ? (
              <select
                value={String(value ?? '')}
                onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white"
              >
                {selectOpts.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : isDate ? (
              <input
                type="date"
                value={strValue.slice(0, 10)}
                onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
            ) : isLong ? (
              <textarea
                value={strValue}
                onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400 resize-y min-h-[60px]"
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={strValue}
                onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-2">
        <button onClick={handleSubmit} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors">
          <CheckCircle size={12} /> Xác nhận
        </button>
        <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <XCircle size={12} /> Hủy
        </button>
      </div>
    </div>
  );
};

const TypingDots: React.FC = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {[0, 1, 2].map(i => (
      <span key={i} className="w-2 h-2 rounded-full bg-blue-400" style={{ animation: 'typingBounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
    ))}
  </div>
);

// --- Main Component ---
const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';

  // UI state
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [input, setInput] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, number>>({});
  const [editingMsgIndex, setEditingMsgIndex] = useState<number | null>(null);

  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // --- Session persistence ---
  const persistSessions = useCallback((updated: ChatSession[]) => {
    setSessions(updated);
    saveSessions(userId, updated);
  }, [userId]);

  const persistMessages = useCallback((msgs: ChatMessage[], sessionId: string | null) => {
    setMessages(msgs);
    if (!sessionId) return;
    setSessions(prev => {
      const updated = prev.map(s => s.id === sessionId ? { ...s, messages: msgs, updatedAt: Date.now() } : s);
      saveSessions(userId, updated);
      return updated;
    });
  }, [userId]);

  // Load sessions on open
  useEffect(() => {
    if (open) {
      const loaded = loadSessions(userId);
      setSessions(loaded);
      if (loaded.length > 0) {
        const latest = loaded[0]; // sorted by updatedAt desc
        setActiveSessionId(latest.id);
        setMessages(latest.messages);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
  }, [open, userId]);

  // Focus textarea
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open, activeSessionId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  // Focus rename input
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // --- Session actions ---
  const createNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setFeedbackGiven({});
    setEditingMsgIndex(null);
    setSidebarOpen(false);
  };

  const switchSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setFeedbackGiven({});
    setEditingMsgIndex(null);
    setSidebarOpen(false);
  };

  const deleteSession = (sessionId: string) => {
    const updated = sessions.filter(s => s.id !== sessionId);
    persistSessions(updated);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setMessages(updated[0].messages);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
    }
    setRenamingId(null);
  };

  const renameSession = (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) { setRenamingId(null); return; }
    const updated = sessions.map(s => s.id === sessionId ? { ...s, title: newTitle.trim() } : s);
    persistSessions(updated);
    setRenamingId(null);
  };

  // --- Markdown components ---
  const mdComponents = {
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-gray-900">{children}</strong>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
    h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-sm font-bold mb-1.5 mt-2 first:mt-0">{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
    hr: () => <hr className="my-3 border-gray-200" />,
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-2 rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-xs divide-y divide-gray-200">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-gray-50">{children}</thead>,
    tbody: ({ children }: { children?: React.ReactNode }) => <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>,
    tr: ({ children }: { children?: React.ReactNode }) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
    th: ({ children }: { children?: React.ReactNode }) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{children}</th>,
    td: ({ children }: { children?: React.ReactNode }) => <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{children}</td>,
    pre: ({ children }: { children?: React.ReactNode }) => <pre className="overflow-x-auto my-2 rounded-lg bg-gray-900 text-gray-100 p-3 text-xs font-mono leading-relaxed">{children}</pre>,
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      className?.includes('language-') ? <code className="text-xs font-mono">{children}</code> : <code className="bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>,
    blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-[3px] border-blue-300 pl-3 my-2 text-gray-500 italic">{children}</blockquote>,
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{children}</a>,
  };

  // --- Feedback ---
  const sendFeedback = async (msgIndex: number, rating: number) => {
    const question = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user')?.content || '';
    const answer = messages[msgIndex]?.content || '';
    setFeedbackGiven(prev => ({ ...prev, [msgIndex]: rating }));
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`${API_BASE_URL}/chat/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question, answer, rating, department: user?.department || '', role: user?.role || '' }),
      });
    } catch { /* silent */ }
  };

  // --- Textarea auto-resize ---
  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
  };

  // --- Send message ---
  const sendMessage = async (confirmTool?: string, confirmParams?: Record<string, unknown>, confirmContext?: Record<string, unknown>) => {
    const text = input.trim();
    if (!text && !confirmTool) return;
    if (streaming) return;

    let currentMessages = [...messages];
    let currentSessionId = activeSessionId;

    if (!confirmTool) {
      const userMsg: ChatMessage = { role: 'user', content: text };
      currentMessages = [...currentMessages, userMsg];
      setMessages(currentMessages);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      // Create session if first message
      if (!currentSessionId) {
        const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title: generateTitle(text),
          messages: currentMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        currentSessionId = newSession.id;
        setActiveSessionId(newSession.id);
        const updated = [newSession, ...sessions];
        persistSessions(updated);
      } else {
        persistMessages(currentMessages, currentSessionId);
      }
    }

    setStreaming(true);
    setShowTyping(true);

    const history = currentMessages.map(m => {
      if (m.agentAction) return { role: m.role, content: '[Đã xử lý yêu cầu trước đó]' };
      return { role: m.role, content: m.content };
    });
    const token = localStorage.getItem('accessToken');
    abortRef.current = new AbortController();

    const body: Record<string, unknown> = {
      message: confirmTool ? '' : text,
      history,
      confirm_tool: confirmTool || '',
      confirm_params: confirmParams || {},
      confirm_context: confirmContext || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        const sentinelIdx = accumulated.indexOf('__AGENT_ACTION__');
        const displayContent = sentinelIdx >= 0 ? accumulated.substring(0, sentinelIdx).trimEnd() : accumulated;

        if (firstChunk) {
          setShowTyping(false);
          setMessages(prev => [...prev, { role: 'assistant', content: displayContent }]);
          firstChunk = false;
        } else {
          setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: displayContent }; return u; });
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      // Parse agent action
      const sentinelIdx = accumulated.indexOf('__AGENT_ACTION__');
      if (sentinelIdx >= 0) {
        const actionStr = accumulated.substring(sentinelIdx + '__AGENT_ACTION__\n'.length).trim();
        try {
          const action: AgentAction = JSON.parse(actionStr);
          setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], agentAction: action }; return u; });
        } catch { /* ignore */ }
      }

      // Persist after streaming done
      setMessages(prev => { persistMessages(prev, currentSessionId); return prev; });
    } catch (err: unknown) {
      setShowTyping(false);
      if (err instanceof Error && err.name === 'AbortError') { setStreaming(false); return; }
      const errMsg: ChatMessage = { role: 'assistant', content: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.' };
      setMessages(prev => {
        const updated = prev[prev.length - 1]?.role === 'assistant'
          ? [...prev.slice(0, -1), errMsg]
          : [...prev, errMsg];
        persistMessages(updated, currentSessionId);
        return updated;
      });
    } finally {
      setShowTyping(false);
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
  const handleConfirm = (action: AgentAction) => { setEditingMsgIndex(null); sendMessage(action.tool, action.params as Record<string, unknown>, action.context as Record<string, unknown> | undefined); };
  const handleEditSubmit = (action: AgentAction, editedParams: Record<string, unknown>) => { setEditingMsgIndex(null); sendMessage(action.tool, editedParams, action.context as Record<string, unknown> | undefined); };
  const handleExport = (action: AgentAction) => {
    const token = localStorage.getItem('accessToken');
    fetch(`${API_BASE_URL}${action.url}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.blob()).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = action.filename || 'export.xlsx'; a.click(); URL.revokeObjectURL(a.href); }).catch(() => {});
  };
  const handleStop = () => { abortRef.current?.abort(); setShowTyping(false); setStreaming(false); };

  // --- Sorted sessions ---
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const groupedSessions = groupSessionsByDate(sortedSessions);

  // --- Render ---
  return (
    <>
      <style>{`
        @keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .chat-panel { animation: fadeSlideUp 0.2s ease-out; }
        .chat-fab { animation: popIn 0.15s ease-out; }
        .msg-bubble { animation: fadeSlideUp 0.12s ease-out; }
        .sidebar-slide { animation: slideIn 0.2s ease-out; }
      `}</style>

      {/* FAB */}
      {!expanded && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setOpen(!open)}
            className="chat-fab w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: open ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
            aria-label={open ? 'Đóng trợ lý' : 'Mở trợ lý ERP'}
          >
            {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
          </button>
        </div>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className={`chat-panel fixed z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? 'inset-4 rounded-xl' : 'bottom-24 right-6 rounded-2xl'
          }`}
          style={{
            ...(expanded ? {} : { width: '420px', maxWidth: 'calc(100vw - 2rem)', height: '600px' }),
            boxShadow: expanded ? '0 0 0 1px rgba(0,0,0,0.08), 0 32px 80px rgba(0,0,0,0.24)' : '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%)' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Menu">
              <Menu size={14} className="text-white" />
            </button>
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Sparkles size={16} className="text-white" /></div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-blue-800" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Trợ lý ERP</p>
              <p className="text-blue-200 text-xs">{streaming ? <span className="animate-pulse">Đang xử lý...</span> : 'An Binh Foods'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setExpanded(!expanded)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title={expanded ? 'Thu nhỏ' : 'Toàn màn hình'}>
                {expanded ? <Minimize2 size={13} className="text-white" /> : <Maximize2 size={13} className="text-white" />}
              </button>
              <button onClick={() => { setOpen(false); setExpanded(false); setSidebarOpen(false); }} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Đóng">
                <X size={14} className="text-white" />
              </button>
            </div>
          </div>

          {/* Body: sidebar + messages */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Sidebar */}
            {sidebarOpen && (
              <>
                {/* Backdrop on small mode */}
                {!expanded && <div className="absolute inset-0 bg-black/20 z-10" onClick={() => setSidebarOpen(false)} />}
                <div className={`sidebar-slide flex flex-col bg-gray-50 border-r border-gray-200 overflow-hidden z-20 ${expanded ? 'w-64 relative' : 'absolute inset-y-0 left-0 w-64'}`}>
                  {/* New chat button */}
                  <div className="p-3 border-b border-gray-200">
                    <button onClick={createNewSession} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <Plus size={14} /> Cuộc trò chuyện mới
                    </button>
                  </div>
                  {/* Session list */}
                  <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
                    {groupedSessions.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Chưa có cuộc trò chuyện nào</p>
                    )}
                    {groupedSessions.map(group => (
                      <div key={group.label}>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase px-2 mb-1">{group.label}</p>
                        {group.items.map(session => (
                          <div
                            key={session.id}
                            className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                              session.id === activeSessionId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                            }`}
                            onClick={() => switchSession(session)}
                          >
                            {renamingId === session.id ? (
                              <input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') renameSession(session.id, renameValue); if (e.key === 'Escape') setRenamingId(null); }}
                                onBlur={() => renameSession(session.id, renameValue)}
                                className="flex-1 text-xs bg-white border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none"
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <span className="flex-1 text-xs truncate">{session.title}</span>
                            )}
                            {renamingId !== session.id && (
                              <div className="hidden group-hover:flex items-center gap-0.5">
                                <button
                                  onClick={e => { e.stopPropagation(); setRenamingId(session.id); setRenameValue(session.title); }}
                                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                                  title="Đổi tên"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); if (confirm('Xóa cuộc trò chuyện này?')) deleteSession(session.id); }}
                                  className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                  title="Xóa"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Messages + Input */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ background: '#f8fafc' }}>
                {/* Welcome message if empty */}
                {messages.length === 0 && !showTyping && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3">
                      <Sparkles size={22} className="text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Xin chào{user ? ` ${user.firstName}` : ''}!</p>
                    <p className="text-xs text-gray-500">Tôi có thể giúp bạn tra cứu, tạo đơn, xem báo cáo và nhiều thao tác khác trên hệ thống ERP.</p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`msg-bubble flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs shadow-sm ${
                      msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                    }`}>
                      {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div
                      className={`text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? `px-4 py-3 rounded-2xl rounded-tr-sm text-white ${expanded ? 'max-w-[60%]' : 'max-w-[80%]'}`
                          : `px-4 py-3 rounded-2xl rounded-tl-sm text-gray-700 ${expanded ? 'max-w-[70%]' : 'max-w-[85%]'}`
                      }`}
                      style={msg.role === 'user'
                        ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }
                        : { background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }
                      }
                    >
                      {msg.role === 'user' ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      ) : (
                        <>
                          {msg.content && <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{msg.content}</ReactMarkdown>}
                          {streaming && i === messages.length - 1 && msg.content && (
                            <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-middle rounded-full" style={{ animation: 'typingBounce 1s ease-in-out infinite' }} />
                          )}
                          {msg.agentAction && !streaming && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              {msg.agentAction.type === 'confirm' && editingMsgIndex !== i && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <button onClick={() => handleConfirm(msg.agentAction!)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors shadow-sm"><CheckCircle size={13} /> Xác nhận</button>
                                  <button onClick={() => setEditingMsgIndex(i)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit3 size={13} /> Chỉnh sửa</button>
                                  <button onClick={() => { setEditingMsgIndex(null); setMessages(prev => { const u = [...prev]; u[u.length-1] = {...u[u.length-1], agentAction: undefined}; return [...u, {role:'assistant',content:'Đã hủy thao tác.'}]; }); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"><XCircle size={13} /> Hủy</button>
                                </div>
                              )}
                              {msg.agentAction.type === 'confirm' && editingMsgIndex === i && (
                                <EditParamsForm params={msg.agentAction.params} display={msg.agentAction.display} onSubmit={edited => handleEditSubmit(msg.agentAction!, edited)} onCancel={() => setEditingMsgIndex(null)} />
                              )}
                              {msg.agentAction.type === 'export' && (
                                <button onClick={() => handleExport(msg.agentAction!)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm"><Download size={13} /> Tải xuống {msg.agentAction.filename}</button>
                              )}
                            </div>
                          )}
                          {msg.content && !streaming && i > 0 && !msg.agentAction && (
                            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
                              {feedbackGiven[i] ? (
                                <span className="text-xs text-gray-400">{feedbackGiven[i] > 0 ? 'Cảm ơn!' : 'Đã ghi nhận'}</span>
                              ) : (
                                <>
                                  <button onClick={() => sendFeedback(i, 1)} className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Hữu ích"><ThumbsUp size={13} /></button>
                                  <button onClick={() => sendFeedback(i, -1)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Chưa chính xác"><ThumbsDown size={13} /></button>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {showTyping && (
                  <div className="msg-bubble flex gap-3">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm"><Bot size={14} className="text-white" /></div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}><TypingDots /></div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => { setInput(e.target.value); adjustTextarea(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập câu hỏi... (Shift+Enter xuống dòng)"
                    disabled={streaming}
                    rows={1}
                    className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-60 transition-all resize-none overflow-hidden"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                  {streaming ? (
                    <button onClick={handleStop} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 bg-red-500 hover:bg-red-600" aria-label="Dừng">
                      <Square size={14} className="text-white" fill="white" />
                    </button>
                  ) : (
                    <button onClick={() => sendMessage()} disabled={!input.trim()} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100" style={{ background: input.trim() ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#e5e7eb' }} aria-label="Gửi">
                      <Send size={15} className={input.trim() ? 'text-white' : 'text-gray-400'} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
