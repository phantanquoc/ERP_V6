import React, { useState } from 'react';
import { useRules, useResources, useCreateRule, useUpdateRule, useDeleteRule, useMyPermissions } from '../hooks/useRules';
import { useDepartments } from '../hooks/useDepartments';
import { PageHeader } from '../design-system/PageHeader';

const RuleManagement: React.FC = () => {
  const { data: rules } = useRules();
  const { data: resources } = useResources();
  const { data: myPerms } = useMyPermissions();
  const { data: departments } = useDepartments();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const [filterResource, setFilterResource] = useState('');
  const [filterScope, setFilterScope] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ resourceCode: '', action: 'READ', scope: 'GLOBAL', allow: true });
  const [activeTab, setActiveTab] = useState<'rules' | 'matrix' | 'my-perms'>('rules');

  const filtered = (rules ?? []).filter((r: any) => {
    if (filterResource && r.resourceCode !== filterResource) return false;
    if (filterScope && r.scope !== filterScope) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!(form as any).resourceCode) return;
    try {
      await createRule.mutateAsync(form as any);
      setShowForm(false);
      setForm({ resourceCode: '', action: 'READ', scope: 'GLOBAL', allow: true });
    } catch (e: any) {
      alert(e?.response?.data?.message || e.message || 'Tạo rule thất bại');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Quản trị phân quyền (Rule Matrix)" description="CRUD rule theo phòng ban & chức vụ — baseline: CREATE/READ/UPDATE mọi nhân viên, APPROVE chỉ TEAM_LEAD+, DELETE chỉ Trưởng phòng" />

      <div className="flex gap-2 border-b">
        {(['rules', 'matrix', 'my-perms'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
            {tab === 'rules' ? 'Danh sách Rule' : tab === 'matrix' ? 'Ma trận' : 'Quyền của tôi'}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={filterResource} onChange={e => setFilterResource(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">Tất cả resource</option>
              {(resources ?? []).map((r: any) => <option key={r.code} value={r.code}>{r.code}</option>)}
            </select>
            <select value={filterScope} onChange={e => setFilterScope(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">Tất cả scope</option>
              <option value="GLOBAL">GLOBAL</option>
              <option value="DEPARTMENT">DEPARTMENT</option>
              <option value="SUB_DEPARTMENT">SUB_DEPARTMENT</option>
            </select>
            <button onClick={() => setShowForm(!showForm)} className="ml-auto bg-blue-600 text-white px-3 py-1 rounded text-sm">+ Thêm Rule</button>
          </div>

          {showForm && (
            <div className="border rounded p-3 bg-gray-50 space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={(form as any).resourceCode} onChange={e => setForm({ ...form, resourceCode: e.target.value })} className="border rounded px-2 py-1 text-sm">
                  <option value="">-- Resource --</option>
                  {(resources ?? []).map((r: any) => <option key={r.code} value={r.code}>{r.label} ({r.code})</option>)}
                </select>
                <select value={(form as any).action} onChange={e => setForm({ ...form, action: e.target.value })} className="border rounded px-2 py-1 text-sm">
                  {['CREATE','READ','UPDATE','DELETE','APPROVE','REJECT','EXPORT','IMPORT'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={(form as any).scope} onChange={e => setForm({ ...form, scope: e.target.value })} className="border rounded px-2 py-1 text-sm">
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="DEPARTMENT">DEPARTMENT</option>
                  <option value="SUB_DEPARTMENT">SUB_DEPARTMENT</option>
                </select>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(form as any).allow} onChange={e => setForm({ ...form, allow: e.target.checked })} /> Allow</label>
              </div>
              {(form as any).scope === 'DEPARTMENT' && (
                <select value={(form as any).departmentId ?? ''} onChange={e => setForm({ ...form, departmentId: e.target.value || null })} className="border rounded px-2 py-1 text-sm">
                  <option value="">-- Chọn phòng ban --</option>
                  {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={createRule.isPending} className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">Lưu</button>
                <button onClick={() => setShowForm(false)} className="border px-3 py-1 rounded text-sm">Hủy</button>
              </div>
              {(form as any).allow === true && ((form as any).action === 'DELETE' || (form as any).action === 'APPROVE') && (
                <p className="text-xs text-amber-600">Cảnh báo: Bạn đang nới quyền {(form as any).action} — hãy xác nhận kỹ trước khi lưu.</p>
              )}
            </div>
          )}

          <div className="border rounded overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Resource</th>
                  <th className="px-2 py-1 text-left">Action</th>
                  <th className="px-2 py-1 text-left">Scope</th>
                  <th className="px-2 py-1 text-center">Allow</th>
                  <th className="px-2 py-1 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={5} className="px-2 py-4 text-center text-gray-400">Chưa có rule — hệ thống đang chạy baseline (mọi nhân viên được thao tác, DELETE chỉ Trưởng phòng)</td></tr>}
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-2 py-1">{r.resourceCode}</td>
                    <td className="px-2 py-1">{r.action}</td>
                    <td className="px-2 py-1">{r.scope}{r.departmentId ? ` (${r.departmentId.slice(0,6)})` : ''}</td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => updateRule.mutate({ id: r.id, data: { allow: !r.allow } })} className={`px-2 py-0.5 rounded text-xs ${r.allow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.allow ? 'Allow' : 'Deny'}</button>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => { if (confirm('Xóa rule này?')) deleteRule.mutate(r.id); }} className="text-red-600 text-xs">Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'matrix' && (
        <div className="text-sm text-gray-500">
          Ma trận Position × Resource × Action — hiển thị baseline-allow/baseline-deny, inherited, override.
          Dữ liệu chi tiết sẽ được mở rộng khi có nhiều Position/Department.
          Hiện có {resources?.length ?? 0} resources × 8 actions = {(resources?.length ?? 0) * 8} ô.
        </div>
      )}

      {activeTab === 'my-perms' && (
        <div className="border rounded overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-2 py-1 text-left">Resource</th><th className="px-2 py-1">Action</th><th className="px-2 py-1">Allow</th><th className="px-2 py-1">Source</th></tr></thead>
            <tbody>
              {(myPerms ?? []).slice(0, 100).map((p: any, i: number) => (
                <tr key={i} className="border-t"><td className="px-2 py-1">{p.resourceCode}</td><td className="px-2 py-1">{p.action}</td><td className="px-2 py-1 text-center">{p.allow ? '✓' : '✗'}</td><td className="px-2 py-1 text-xs text-gray-500">{p.source}</td></tr>
              ))}
              {(myPerms && myPerms.length > 100) && <tr><td colSpan={4} className="px-2 py-1 text-center text-gray-400">... và {myPerms.length - 100} dòng nữa</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RuleManagement;
