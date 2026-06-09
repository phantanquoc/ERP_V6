import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import docService, { DocItem, DocContent } from '../services/docService';

const DOC_ICONS: Record<string, string> = {
  '00-chung': '📋',
  '01-chat-luong': '✅',
  '02-tong-hop': '📊',
  '03-kinh-doanh': '💼',
  '04-ke-toan': '💰',
  '05-thu-mua': '📦',
  '06-san-xuat': '🏭',
  '07-ky-thuat': '🔧',
};

const DocumentationGuide = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        const list = await docService.listDocs();
        setDocs(list);
        if (list.length > 0 && !selectedSlug) {
          setSelectedSlug(list[0].slug);
        }
      } catch {
        setError('Không thể tải danh sách tài liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const fetchContent = useCallback(async (slug: string) => {
    try {
      setContentLoading(true);
      setError(null);
      setEditMode(false);
      const content = await docService.getDocContent(slug);
      setDocContent(content);
      setEditContent(content.content);
    } catch {
      setError('Không thể tải nội dung tài liệu');
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSlug) {
      fetchContent(selectedSlug);
    }
  }, [selectedSlug, fetchContent]);

  const handleSave = async () => {
    if (!docContent) return;
    try {
      setSaving(true);
      await docService.updateDocContent(docContent.slug, editContent);
      setDocContent({ ...docContent, content: editContent });
      setEditMode(false);
    } catch {
      setError('Không thể lưu tài liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (docContent) {
      setEditContent(docContent.content);
    }
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const handleSelectDoc = (slug: string) => {
    setSelectedSlug(slug);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 relative">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40 md:z-auto
        w-72 bg-white border-r border-gray-200 flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'}
        md:transition-all
      `}>
        <div className="w-72 h-full flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📖</span>
                <h2 className="text-base font-semibold text-gray-800">Hướng dẫn sử dụng</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">Chọn tài liệu để xem</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {docs.map((doc) => (
              <button
                key={doc.slug}
                onClick={() => handleSelectDoc(doc.slug)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center gap-3 ${
                  selectedSlug === doc.slug
                    ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="text-lg">{DOC_ICONS[doc.slug] || '📄'}</span>
                <span>{doc.title}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0 relative">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:block absolute top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-200 rounded-r-lg p-1.5 shadow-md hover:bg-gray-50 transition-all duration-200 group"
          style={{ left: sidebarOpen ? '-12px' : '0' }}
        >
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 group-hover:text-gray-600 ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {error && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {contentLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : docContent ? (
          <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 lg:px-10 pt-4 md:pt-6 lg:pt-8 pb-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="md:hidden flex-shrink-0 p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <span className="text-xl md:text-2xl flex-shrink-0">{DOC_ICONS[docContent.slug] || '📄'}</span>
                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate">{docContent.title}</h1>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && (
                      <button
                        onClick={() => setEditMode(!editMode)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          editMode
                            ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {editMode ? (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Xem trước
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Chỉnh sửa
                            </>
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {editMode ? (
                <div className="p-4 md:p-6 lg:p-10">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[calc(100vh-16rem)] md:h-[calc(100vh-20rem)] p-3 md:p-4 border border-gray-200 rounded-xl font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  />
                  <div className="flex gap-3 mt-4 justify-end">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Lưu
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 md:px-6 lg:px-10 py-4 md:py-6 lg:py-8 overflow-x-auto">
                  <div className="prose prose-sm lg:prose-base prose-gray max-w-none
                    prose-headings:font-semibold prose-headings:text-gray-900
                    prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-3 prose-h1:mb-6
                    prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-2 prose-h2:mb-4 prose-h2:mt-8
                    prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6
                    prose-p:leading-relaxed prose-p:text-gray-700
                    prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-gray-900
                    prose-ul:pl-5 prose-ol:pl-5
                    prose-li:my-0.5
                    prose-table:block prose-table:overflow-x-auto prose-table:border-collapse prose-table:w-full prose-table:my-6
                    prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:text-sm prose-th:font-semibold prose-th:text-gray-700 prose-th:border prose-th:border-gray-200
                    prose-td:px-4 prose-td:py-2.5 prose-td:text-sm prose-td:text-gray-600 prose-td:border prose-td:border-gray-200
                    prose-tr:even:bg-gray-50
                    prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:text-gray-800
                    prose-pre:bg-gray-900 prose-pre:rounded-xl prose-pre:p-4 prose-pre:text-sm prose-pre:leading-relaxed
                    prose-pre:border prose-pre:border-gray-200
                    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                    prose-img:rounded-xl prose-img:shadow-md
                    prose-hr:border-gray-200"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {docContent.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 px-4">
            <span className="text-5xl">📚</span>
            <p className="text-base text-center">Chọn một tài liệu từ danh sách bên trái</p>
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden mt-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              Mở danh sách tài liệu
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DocumentationGuide;
