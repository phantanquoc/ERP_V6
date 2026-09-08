import React, { useState, useMemo } from 'react';
import { useRules, useResources, useCreateRule, useUpdateRule, useDeleteRule, useMyPermissions, useEffectivePermissions } from '../hooks/useRules';
import { usePositions } from '../hooks/usePositions';
import { useDepartments } from '../hooks/useDepartments';
import { useUsers } from '../hooks/useUsers';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  RULE_ALLOW:      { label: 'Rule (allow)',   cls: 'bg-green-100 text-green-700' },
  RULE_DENY:       { label: 'Rule (deny)',    cls: 'bg-red-100 text-red-700' },
  DELEGATION:      { label: 'Ủy quyền',       cls: 'bg-indigo-100 text-indigo-700' },
  BASELINE_ALLOW:  { label: 'Baseline',       cls: 'bg-gray-100 text-gray-600' },
  BASELINE_DENY:   { label: 'Baseline',       cls: 'bg-gray-100 text-gray-600' },
  CHUNG_ALLOW:     { label: 'Chung',          cls: 'bg-blue-50 text-blue-600' },
  BASELINE_NO_DEPT:{ label: 'Không phòng ban',cls: 'bg-gray-100 text-gray-400' },
  ADMIN_BYPASS:    { label: 'Admin bypass',   cls: 'bg-black text-white' },
};

function CheckIcon({ allow }: { allow: boolean }) {
  return allow ? <span className="text-green-600 font-bold">✓</span> : <span className="text-red-500 font-bold">✗</span>;
}

// ─── Grid primitive ────────────────────────────────────────────────────────────
function PermissionGrid({
  actions, groups,
  // when true, header shows "Thao tác × Resource" label and rows have endpoint chips
  showEndpoints = true,
}: {
  actions: string[];
  groups: Array<{ group: string; groupName: string; resources: Array<{ code: string; label: string; endpoints: string[]; actions: Record<string, { allow: boolean; source: string }> }> }>;
  showEndpoints?: boolean;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(groups.map((g) => g.group)));
  const toggle = (g: string) => setOpenGroups((prev) => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const open = openGroups.has(g.group);
        return (
          <div key={g.group} className="border rounded-lg overflow-hidden">
            <button type="button" onClick={() => toggle(g.group)} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left">
              <span className="text-sm font-semibold text-gray-700">{g.groupName} <span className="font-normal text-gray-400">· {g.group} · {g.resources.length}</span></span>
              <span className="text-xs text-gray-400">{open ? 'Thu gọn' : 'Mở rộng'}</span>
            </button>
            {open && (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left w-[36%]">Tài nguyên</th>
                      {actions.map((a) => <th key={a} className="px-1 py-1 text-center w-[8%]">{a}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {g.resources.map((r) => (
                      <tr key={r.code} className="border-t hover:bg-gray-50/50">
                        <td className="px-2 py-1">
                          <div className="font-medium text-gray-800 leading-tight">{r.label}</div>
                          <div className="text-[11px] text-gray-400 leading-tight">{r.code}</div>
                          {showEndpoints && r.endpoints.length > 0 && (
                            <div className="text-[11px] text-blue-600 font-mono leading-tight">{r.endpoints.join(', ')}</div>
                          )}
                        </td>
                        {actions.map((a) => {
                          const cell = r.actions[a];
                          if (!cell) return <td key={a} className="px-1 py-1 text-center text-gray-300">—</td>;
                          const badge = SOURCE_BADGE[cell.source] ?? { label: cell.source, cls: 'bg-gray-100 text-gray-500' };
                          return (
                            <td key={a} className="px-1 py-1 text-center" title={`${cell.source}: ${cell.allow ? 'Cho phép' : 'Từ chối'}`}>
                              <span className="inline-flex flex-col items-center gap-0.5">
                                <CheckIcon allow={cell.allow} />
                                <span className={`px-1 py-0.5 rounded text-[10px] leading-none ${badge.cls}`}>{badge.label}</span>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
type TabKey = 'lookup' | 'users' | 'rules' | 'my-perms';

const RuleManagement: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('lookup');

  // Lookup tab — hypothetical role/dept combo
  const ROLES = ['EMPLOYEE', 'TEAM_LEAD', 'DEPARTMENT_HEAD', 'ADMIN'] as const;
  const [lookupRole, setLookupRole] = useState('EMPLOYEE');
  const [lookupDept, setLookupDept] = useState('');
  const [lookupSub, setLookupSub] = useState('');
  const [lookupPos, setLookupPos] = useState('');
  const { data: departments } = useDepartments();
  const { data: positions } = usePositions(activeTab === 'lookup' || activeTab === 'rules');

  const deptList: any[] = useMemo(() => (departments as any)?.data ?? (departments as any) ?? [], [departments]);
  const subList = useMemo(() => {
    if (!lookupDept) return [];
    const d: any = deptList.find((x: any) => x.id === lookupDept);
    return d?.subDepartments ?? [];
  }, [deptList, lookupDept]);

  const lookupParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (lookupRole) p.role = lookupRole;
    if (lookupDept) p.departmentId = lookupDept;
    if (lookupSub) p.subDepartmentId = lookupSub;
    if (lookupPos) p.positionId = lookupPos;
    return p;
  }, [lookupRole, lookupDept, lookupSub, lookupPos]);

  const { data: lookupData, isLoading: lookupLoading, isError: lookupError } =
    useEffectivePermissions(lookupParams, { enabled: activeTab === 'lookup' });

  // Users tab
  const [selectedUserId, setSelectedUserId] = useState('');
  const { data: usersData } = useUsers(activeTab === 'users' ? { limit: 100 } : { enabled: false } as any);
  const userList: any[] = useMemo(() => (usersData as any)?.data ?? (usersData as any)?.users ?? (usersData as any) ?? [], [usersData]);
  const { data: userEffData, isLoading: userEffLoading } =
    useEffectivePermissions(selectedUserId ? { userId: selectedUserId } : {}, { enabled: activeTab === 'users' && !!selectedUserId });

  // Rules list tab
  const { data: rules } = useRules();
  const { data: resources } = useResources();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const [filterResource, setFilterResource] = useState('');
  const [filterScope, setFilterScope] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ resourceCode: '', action: 'READ', scope: 'GLOBAL', allow: true });
  const filtered = useMemo(() => {
    let arr = (rules ?? []) as any[];
    if (filterResource && (arr[0] as any)?.resourceCode !== undefined) arr = arr.filter((r: any) => r.resourceCode === filterResource);
    if (filterScope) arr = arr.filter((r: any) => r.scope === filterScope);
    if (filterRole) arr = arr.filter((r: any) => r.role === filterRole);
    if (q) { const qq = q.toLowerCase(); arr = arr.filter((r: any) => String(r.resourceCode).toLowerCase().includes(qq) || String(r.resourceLabel ?? '').toLowerCase().includes(qq)); }
    return arr;
  }, [rules, filterResource, filterScope, filterRole, q]);

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

  // My-perms tab
  const { data: myPerms } = useMyPermissions();

  return (
    <div className={hideHeader ? 'space-y-4' : 'p-4 space-y-4'}>
      {!hideHeader && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quản trị phân quyền</h1>
            <p className="text-sm text-gray-500 mt-1">CRUD rule theo bộ phận &amp; chức vụ — baseline: CREATE/READ/UPDATE mọi nhân viên, APPROVE chỉ TEAM_LEAD+, DELETE chỉ Trưởng phòng.</p>
          </div>
        </div>
      )}
      {hideHeader && (
        <p className="text-xs text-gray-500">
          CRUD rule theo bộ phận &amp; chức vụ — baseline: CREATE/READ/UPDATE mọi nhân viên, APPROVE chỉ TEAM_LEAD+, DELETE chỉ Trưởng phòng. Tất cả thao tác đều sinh audit log.
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-b -mb-px">
        {([
          ['lookup', 'Tra theo vai trò'],
          ['users', 'Theo người dùng'],
          ['rules', 'Danh sách Rule'],
          ['my-perms', 'Quyền của tôi'],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setActiveTab(k as TabKey)} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1 — Tra theo vai trò (hypothetical combo, no user needed) */}
      {activeTab === 'lookup' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end bg-gray-50 border rounded-lg p-3">
            <label className="text-xs font-medium text-gray-600">Vai trò
              <select value={lookupRole} onChange={(e) => setLookupRole(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">Bộ phận
              <select value={lookupDept} onChange={(e) => { setLookupDept(e.target.value); setLookupSub(''); }} className="ml-1 border rounded px-2 py-1 text-sm">
                <option value="">(không chọn)</option>
                {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">Phòng ban
              <select value={lookupSub} onChange={(e) => setLookupSub(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" disabled={!lookupDept}>
                <option value="">(không chọn)</option>
                {subList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">Chức vụ
              <select value={lookupPos} onChange={(e) => setLookupPos(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm">
                <option value="">(không chọn)</option>
                {((positions as any)?.data ?? positions ?? [] as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name ?? p.code}</option>)}
              </select>
            </label>
            <span className="text-xs text-gray-400 ml-2">Kết quả khớp server enforcement (tính trên {lookupData ? String((lookupData as any).identity?.effectiveRole ?? lookupRole) : '…'}).</span>
          </div>

          {lookupLoading ? <p className="text-sm text-gray-400">Đang tính quyền...</p>
            : lookupError ? <p className="text-sm text-red-500">Không tải được quyền.</p>
            : !lookupData ? <p className="text-sm text-gray-400">Chọn vai trò/bộ phận để xem quyền.</p>
            : (() => {
              const d: any = lookupData;
              return (
                <div className="space-y-3">
                  <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                    Suy diễn cho <span className="font-semibold">{d.identity.role}</span>
                    {d.identity.effectiveRole !== d.identity.role && <span> (vai trò thật <span className="font-semibold">{d.identity.effectiveRole}</span> do chức vụ {d.identity.positionName})</span>}
                    {d.identity.departments?.length ? <> · {d.identity.departments.map((x: any) => x.name).join(', ')}</> : ''}
                    {d.identity.subDepartments?.length ? <> · {d.identity.subDepartments.map((x: any) => x.name).join(', ')}</> : ''}
                    {' · '}Cột ✓/✗, huy hiệu = nguồn suy ra (Rule/baseline/ủy quyền).
                  </div>
                  <PermissionGrid actions={d.actions} groups={d.groups} />
                </div>
              );
            })()}
        </div>
      )}

      {/* Tab 2 — Theo người dùng (real user) */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="border rounded px-2 py-1.5 text-sm min-w-[280px]">
              <option value="">— Chọn người dùng —</option>
              {(Array.isArray(userList) ? userList : []).map((u: any) => (
                <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({u.email}) · {u.role}</option>
              ))}
            </select>
            <span className="text-xs text-gray-400">Suy diễn đúng như server (gồm secondary, ủy quyền, baseline).</span>
          </div>
          {!selectedUserId ? <p className="text-sm text-gray-400">Chọn người dùng để xem toàn bộ quyền của họ.</p>
            : userEffLoading ? <p className="text-sm text-gray-400">Đang tải quyền...</p>
            : !userEffData ? <p className="text-sm text-red-500">Không tải được.</p>
            : (() => {
              const d2: any = userEffData;
              return (
                <div className="space-y-3">
                  <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                    {d2.identity.name} · <span className="font-semibold">{d2.identity.role}</span>
                    {d2.identity.effectiveRole !== d2.identity.role && <> (thật {d2.identity.effectiveRole} do {d2.identity.positionName})</>}
                  </div>
                  <PermissionGrid actions={d2.actions} groups={d2.groups} />
                </div>
              );
            })()}
        </div>
      )}

      {/* Tab 3 — Danh sách Rule (CRUD) — now with human-readable names and filters */}
      {activeTab === 'rules' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên tài nguyên..." className="border rounded px-2 py-1 text-sm min-w-[180px]" />
            <select value={filterResource} onChange={(e) => setFilterResource(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">Tất cả resource</option>
              {(resources ?? []).map((r: any) => <option key={r.code} value={r.code}>{r.label} ({r.code})</option>)}
            </select>
            <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">Tất cả scope</option>
              <option value="GLOBAL">GLOBAL</option>
              <option value="DEPARTMENT">DEPARTMENT</option>
              <option value="SUB_DEPARTMENT">SUB_DEPARTMENT</option>
            </select>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">Mọi vai trò</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={() => setShowForm(!showForm)} className="ml-auto bg-blue-600 text-white px-3 py-1 rounded text-sm">+ Thêm Rule</button>
          </div>

          {showForm && (
            <div className="border rounded p-3 bg-gray-50 space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={(form as any).resourceCode} onChange={(e) => setForm({ ...form, resourceCode: e.target.value })} className="border rounded px-2 py-1 text-sm">
                  <option value="">-- Resource --</option>
                  {(resources ?? []).map((r: any) => <option key={r.code} value={r.code}>{r.label} ({r.code})</option>)}
                </select>
                <select value={(form as any).action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="border rounded px-2 py-1 text-sm">
                  {['CREATE','READ','UPDATE','DELETE','APPROVE','REJECT','EXPORT','IMPORT'].map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={(form as any).scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="border rounded px-2 py-1 text-sm">
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="DEPARTMENT">DEPARTMENT</option>
                  <option value="SUB_DEPARTMENT">SUB_DEPARTMENT</option>
                </select>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(form as any).allow} onChange={(e) => setForm({ ...form, allow: e.target.checked })} /> Allow</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select value={(form as any).role ?? ''} onChange={(e) => setForm({ ...form, role: e.target.value || null, positionId: null })} className="border rounded px-2 py-1 text-sm">
                  <option value="">-- Mọi vai trò (generic GLOBAL) --</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={(form as any).subDepartmentId ?? ''} onChange={(e) => setForm({ ...form, subDepartmentId: e.target.value || null, departmentId: null })} className="border rounded px-2 py-1 text-sm">
                  <option value="">-- Mọi phòng ban --</option>
                  {deptList.flatMap((d: any) => (d.subDepartments ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name} ({d.name})</option>))}
                </select>
                <select value={(form as any).positionId ?? ''} onChange={(e) => setForm({ ...form, positionId: e.target.value || null, role: null })} className="border rounded px-2 py-1 text-sm">
                  <option value="">-- Mọi chức vụ --</option>
                  {(((positions as any)?.data ?? positions ?? []) as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.name ?? p.code}</option>)}
                </select>
              </div>
              {(form as any).scope === 'DEPARTMENT' && (
                <select value={(form as any).departmentId ?? ''} onChange={(e) => setForm({ ...form, departmentId: e.target.value || null })} className="border rounded px-2 py-1 text-sm">
                  <option value="">-- Chọn bộ phận --</option>
                  {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                  <th className="px-2 py-1 text-left">Tài nguyên</th>
                  <th className="px-2 py-1 text-left">Action</th>
                  <th className="px-2 py-1 text-left">Scope</th>
                  <th className="px-2 py-1 text-left">Vai trò / Vị trí / Phòng ban</th>
                  <th className="px-2 py-1 text-left">Nguồn</th>
                  <th className="px-2 py-1 text-center">Allow</th>
                  <th className="px-2 py-1 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-gray-400">Không có rule khớp filter.</td></tr>}
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-2 py-1">
                      <div className="text-xs font-medium text-gray-800">{r.resourceLabel ?? r.resource?.label ?? r.resourceCode}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{r.resourceCode}</div>
                      <div className="text-[11px] text-blue-600 font-mono">{(r.endpoints ?? []).join(', ')}</div>
                    </td>
                    <td className="px-2 py-1"><span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">{r.action}</span></td>
                    <td className="px-2 py-1 text-xs">{r.scope}</td>
                    <td className="px-2 py-1 text-xs leading-tight">
                      {r.role && <div>Vai trò: <span className="font-medium">{r.role}</span></div>}
                      {r.positionName && <div>Chức vụ: {r.positionName}</div>}
                      {!r.role && !r.positionName && <span className="text-gray-400">Chung</span>}
                      {r.departmentName && <div>BP: {r.departmentName}</div>}
                      {r.subDepartmentName && <div>Phòng: {r.subDepartmentName}</div>}
                    </td>
                    <td className="px-2 py-1 text-xs">
                      {r.resource?.group && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px]">{r.resource.group}</span>}
                    </td>
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
            {(rules as any)?.pagination && (
              <div className="text-center text-xs text-gray-400 py-1">Trang {(rules as any).pagination.page} · {((rules as any).pagination.total ?? filtered.length)} rules</div>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'rules' && activeTab !== 'lookup' && activeTab !== 'users' && (
        <>
          {/* "Quyền của tôi" — flat list, grouped by resource group, with endpoints */}
          {(() => {
            const perms: any[] = (myPerms ?? []) as any[];
            if (!perms.length) return <p className="text-sm text-gray-400">Đang tải quyền của bạn...</p>;
            const byGroup = new Map<string, typeof perms>();
            for (const p of perms) { const g = p.group ?? 'other'; const a = byGroup.get(g) ?? []; a.push(p); byGroup.set(g, a); }
            return (
              <div className="space-y-3">
                {[...byGroup.entries()].map(([g, arr]) => (
                  <div key={g} className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600">{g} · {arr.length / 8} tài nguyên</div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr><th className="px-2 py-1 text-left">Resource</th><th className="px-2 py-1">Action</th><th className="px-2 py-1">Allow</th><th className="px-2 py-1">Source</th><th className="px-2 py-1">Endpoint</th></tr></thead>
                      <tbody>
                        {arr.slice(0, 200).map((p: any, i: number) => (
                          <tr key={i} className="border-t"><td className="px-2 py-1"><span className="font-medium">{p.resourceLabel ?? p.resourceCode}</span> <span className="text-gray-400 font-mono text-xs">{p.resourceCode}</span></td><td className="px-2 py-1 text-xs">{p.action}</td><td className="px-2 py-1 text-center"><CheckIcon allow={p.allow} /></td><td className="px-2 py-1"><span className={`px-1 py-0.5 rounded text-[11px] ${SOURCE_BADGE[p.source]?.cls ?? 'bg-gray-100 text-gray-500'}`}>{SOURCE_BADGE[p.source]?.label ?? p.source}</span></td><td className="px-2 py-1 font-mono text-[11px] text-blue-600">{(p.endpoints ?? []).join(', ')}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default RuleManagement;
