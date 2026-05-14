import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, ThumbsUp, ThumbsDown, Download, CheckCircle, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import { getDepartmentDisplayName } from '../utils/permissions';
import { API_BASE_URL } from '../config/api';

interface AgentAction {
  type: 'confirm' | 'export' | 'error';
  tool: string;
  params: Record<string, unknown>;
  message: string;
  url: string;
  filename: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agentAction?: AgentAction;
}

// Markdown components
const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-snug">{children}</li>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    className?.includes('language-') ? (
      <code className="block bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono my-1.5 whitespace-pre-wrap">
        {children}
      </code>
    ) : (
      <code className="bg-blue-50 text-blue-700 rounded px-1 text-xs font-mono">{children}</code>
    ),
  h1: ({ children }: { children?: React.ReactNode }) => <p className="font-bold mb-1">{children}</p>,
  h2: ({ children }: { children?: React.ReactNode }) => <p className="font-bold mb-1">{children}</p>,
  h3: ({ children }: { children?: React.ReactNode }) => <p className="font-semibold mb-0.5">{children}</p>,
  hr: () => <hr className="my-2 border-gray-200" />,
};

// Typing indicator dots
const TypingDots: React.FC = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-blue-400"
        style={{
          animation: 'typingBounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
  </div>
);

const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendFeedback = async (msgIndex: number, rating: number) => {
    // Tìm câu hỏi tương ứng (message user ngay trước assistant message)
    const question = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user')?.content || '';
    const answer = messages[msgIndex]?.content || '';
    setFeedbackGiven(prev => ({ ...prev, [msgIndex]: rating }));
    try {
      await fetch(`${API_BASE_URL}/chat/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer,
          rating,
          department: user?.department || '',
          role: user?.role || '',
        }),
      });
    } catch {
      // Silent fail — feedback is non-critical
    }
  };

  // Build personalized greeting
  const greeting = React.useMemo(() => {
    if (!user) return 'Xin chào! Bạn đang gặp khó khăn gì trong sử dụng hệ thống? Hãy nói vấn đề để tôi hỗ trợ.';
    const name = `${user.firstName} ${user.lastName}`.trim();
    const dept = getDepartmentDisplayName(user.department);
    return `Xin chào **${name}** — ${dept}! 👋\n\nBạn đang gặp khó khăn gì trong sử dụng hệ thống? Hãy mô tả vấn đề để tôi hỗ trợ bạn nhé.`;
  }, [user]);

  // Init messages when opened
  useEffect(() => {
    if (open && messages.length === 0) {
      // Simulate typing before showing greeting
      setShowTyping(true);
      const t = setTimeout(() => {
        setShowTyping(false);
        setMessages([{ role: 'assistant', content: greeting }]);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (confirmTool?: string, confirmParams?: Record<string, unknown>) => {
    const text = input.trim();
    if (!text && !confirmTool) return;
    if (streaming) return;

    if (!confirmTool) {
      const userMsg: ChatMessage = { role: 'user', content: text };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
    }

    setStreaming(true);
    setShowTyping(true);

    const history = messages.slice(1).filter(m => !m.agentAction).map(m => ({ role: m.role, content: m.content }));
    const token = localStorage.getItem('accessToken');
    abortRef.current = new AbortController();

    const body: Record<string, unknown> = {
      message: confirmTool ? '' : text,
      history,
      confirm_tool: confirmTool || '',
      confirm_params: confirmParams || {},
    };

    try {
      const res = await fetch(`${API_BASE_URL}/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        // Check for sentinel — don't render it
        const sentinelIdx = accumulated.indexOf('__AGENT_ACTION__');
        const displayContent = sentinelIdx >= 0 ? accumulated.substring(0, sentinelIdx).trimEnd() : accumulated;

        if (firstChunk) {
          setShowTyping(false);
          setMessages((prev) => [...prev, { role: 'assistant', content: displayContent }]);
          firstChunk = false;
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: displayContent };
            return updated;
          });
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      // Parse agent action from accumulated content
      const sentinelIdx = accumulated.indexOf('__AGENT_ACTION__');
      if (sentinelIdx >= 0) {
        const actionStr = accumulated.substring(sentinelIdx + '__AGENT_ACTION__\n'.length).trim();
        try {
          const action: AgentAction = JSON.parse(actionStr);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, agentAction: action };
            return updated;
          });
        } catch {
          // Failed to parse action — ignore
        }
      }
    } catch (err: unknown) {
      setShowTyping(false);
      if (err instanceof Error && err.name === 'AbortError') {
        setStreaming(false);
        return;
      }
      setMessages((prev) => {
        if (prev[prev.length - 1]?.role === 'assistant') {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.' };
          return updated;
        }
        return [...prev, { role: 'assistant', content: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.' }];
      });
    } finally {
      setShowTyping(false);
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleConfirm = (action: AgentAction) => {
    sendMessage(action.tool, action.params as Record<string, unknown>);
  };

  const handleExport = (action: AgentAction) => {
    const token = localStorage.getItem('accessToken');
    const url = `${API_BASE_URL}${action.url}`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = action.filename || 'export.xlsx';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {
        // Silent fail
      });
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setShowTyping(false);
    setStreaming(false);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        .chat-panel { animation: fadeSlideUp 0.22s ease-out; }
        .chat-fab   { animation: popIn 0.18s ease-out; }
        .msg-bubble { animation: fadeSlideUp 0.15s ease-out; }
      `}</style>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <button
          onClick={open ? handleClose : handleOpen}
          className="chat-fab w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: open
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          }}
          aria-label={open ? 'Đóng trợ lý' : 'Mở trợ lý ERP'}
        >
          {open ? (
            <X size={22} className="text-white" />
          ) : (
            <MessageCircle size={22} className="text-white" />
          )}
        </button>
      </div>

      {/* Chat Panel */}
      {open && (
        <div
          className="chat-panel fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden"
          style={{
            width: '380px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '560px',
            borderRadius: '20px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              borderRadius: '20px 20px 0 0',
            }}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-blue-700" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Trợ lý ERP</p>
              <p className="text-blue-200 text-xs">
                {streaming ? (
                  <span className="animate-pulse">Đang trả lời...</span>
                ) : (
                  'An Binh Foods · Luôn sẵn sàng hỗ trợ'
                )}
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Đóng"
            >
              <X size={14} className="text-white" />
            </button>
          </div>

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            style={{ background: '#f8fafc' }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`msg-bubble flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                      : 'bg-gradient-to-br from-indigo-500 to-blue-600'
                  }`}
                >
                  {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[78%] text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-white'
                      : 'px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-gray-700'
                  }`}
                  style={
                    msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }
                      : { background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)' }
                  }
                >
                  {msg.role === 'user' ? (
                    <span>{msg.content}</span>
                  ) : (
                    <>
                      {msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                          {msg.content}
                        </ReactMarkdown>
                      ) : null}
                      {/* Blinking cursor while streaming */}
                      {streaming && i === messages.length - 1 && msg.content && (
                        <span
                          className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-middle rounded-full"
                          style={{ animation: 'typingBounce 1s ease-in-out infinite' }}
                        />
                      )}
                      {/* Agent action buttons */}
                      {msg.agentAction && !streaming && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                          {msg.agentAction.type === 'confirm' && (
                            <>
                              <button
                                onClick={() => handleConfirm(msg.agentAction!)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                              >
                                <CheckCircle size={12} /> Xác nhận
                              </button>
                              <button
                                onClick={() => setMessages(prev => {
                                  const updated = [...prev];
                                  updated[updated.length - 1] = { ...updated[updated.length - 1], agentAction: undefined };
                                  return [...updated, { role: 'assistant', content: 'Đã hủy thao tác.' }];
                                })}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <XCircle size={12} /> Hủy
                              </button>
                            </>
                          )}
                          {msg.agentAction.type === 'export' && (
                            <button
                              onClick={() => handleExport(msg.agentAction!)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                            >
                              <Download size={12} /> Tải xuống {msg.agentAction.filename}
                            </button>
                          )}
                        </div>
                      )}
                      {/* Feedback buttons */}
                      {msg.content && !streaming && i > 0 && !msg.agentAction && (
                        <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-gray-100">
                          {feedbackGiven[i] ? (
                            <span className="text-xs text-gray-400">
                              {feedbackGiven[i] > 0 ? 'Cảm ơn!' : 'Đã ghi nhận'}
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => sendFeedback(i, 1)}
                                className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                                title="Hữu ích"
                              >
                                <ThumbsUp size={12} />
                              </button>
                              <button
                                onClick={() => sendFeedback(i, -1)}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                title="Chưa chính xác"
                              >
                                <ThumbsDown size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {showTyping && (
              <div className="msg-bubble flex gap-2.5">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm">
                  <Bot size={13} className="text-white" />
                </div>
                <div
                  className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
                  style={{ background: '#ffffff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)' }}
                >
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', flexShrink: 0 }} />

          {/* Input area */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
            style={{ background: '#ffffff', borderRadius: '0 0 20px 20px' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi của bạn..."
              disabled={streaming}
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-60 transition-all"
            />

            {streaming ? (
              <button
                onClick={handleStop}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                aria-label="Dừng"
              >
                <X size={15} className="text-white" />
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: input.trim() ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#e5e7eb' }}
                aria-label="Gửi"
              >
                <Send size={15} className={input.trim() ? 'text-white' : 'text-gray-400'} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
