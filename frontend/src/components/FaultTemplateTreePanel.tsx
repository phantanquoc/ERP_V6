import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useDetailTree, useMachineSystems } from '../hooks/useMachineSystemDetails';
import { useTemplateCountsBySystem, faultTemplateKeys } from '../hooks/useFaultTemplates';
import faultTemplateService from '../services/faultTemplateService';
import type { MachineSystemDetail } from '../services/machineSystemService';

type TreeNode = MachineSystemDetail & { depth: number; children: string[] };

const buildTreeData = (items: MachineSystemDetail[] | undefined, expandedIds: Set<string>): TreeNode[] | null => {
  if (!items || items.length === 0) return null;
  const map = new Map<string, TreeNode>();
  items.forEach((item) => map.set(item.id, { ...item, depth: 0, children: [] }));
  const roots: string[] = [];
  items.forEach((item) => {
    if (item.parentDetailId && map.has(item.parentDetailId)) map.get(item.parentDetailId)!.children.push(item.id);
    else roots.push(item.id);
  });
  const setDepth = (id: string, depth: number) => {
    const node = map.get(id);
    if (!node) return;
    node.depth = depth;
    node.children.forEach((childId) => setDepth(childId, depth + 1));
  };
  roots.forEach((id) => setDepth(id, 0));
  const flatten = (ids: string[]): TreeNode[] => ids.flatMap((id) => {
    const node = map.get(id);
    if (!node) return [];
    return expandedIds.has(id) ? [node, ...flatten(node.children)] : [node];
  });
  return flatten(roots);
};

const DETAIL_TYPE_LABELS: Record<string, string> = {
  THIET_BI: 'Thiết bị', CUM: 'Cụm', LINH_KIEN: 'Linh kiện', DIEM_KIEM_TRA: 'Điểm kiểm tra',
};

export default function FaultTemplateTreePanel() {
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [tplNode, setTplNode] = useState<MachineSystemDetail | null>(null);
  const [tplForm, setTplForm] = useState({ tenMauLoi: '', moTa: '', mucDo: 'TRUNG_BINH' });
  const [tplSaving, setTplSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const queryClient = useQueryClient();

  const systemsQ = useMachineSystems({ page: 1, limit: 200, hoatDong: true });
  const systems = systemsQ.data?.data ?? [];
  const detailTreeQ = useDetailTree(selectedSystemId || undefined);
  const countsQ = useTemplateCountsBySystem(selectedSystemId || undefined);
  const countsMap = useMemo(() => new Map((countsQ.data?.data ?? []).map((c) => [c.detailId, c])), [countsQ.data]);
  const treeItems = detailTreeQ.data?.data;

  // Filter by search before building tree
  const filteredItems = useMemo(() => {
    if (!treeItems) return undefined;
    if (!search.trim()) return treeItems;
    const q = search.trim().toLowerCase();
    return treeItems.filter((d) => d.tenChiTiet.toLowerCase().includes(q) || d.maChiTiet.toLowerCase().includes(q));
  }, [treeItems, search]);

  const treeData = useMemo(() => buildTreeData(filteredItems, expandedIds), [filteredItems, expandedIds]);

  const toggleExpand = (id: string) => setExpandedIds((prev) => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });
  const expandAll = () => {
    if (!filteredItems) return;
    setExpandedIds(new Set(filteredItems.filter((i) => i.childDetails?.length).map((i) => i.id)));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button type="button" onClick={() => setCollapsed((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Cây hệ thống → tạo mẫu lỗi</h3>
          <p className="text-xs text-gray-500">Chọn hệ thống để xem cây chi tiết và tạo mẫu nhanh. Hiển thị cả nút có 0 mẫu.</p>
        </div>
        {collapsed ? <ChevronRight className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {!collapsed && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={selectedSystemId} onChange={(e) => { setSelectedSystemId(e.target.value); setExpandedIds(new Set()); setSearch(''); }} className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm">
              <option value="">Chọn hệ thống</option>
              {systems.map((s) => <option key={s.id} value={s.id}>{s.maHeThong} - {s.tenHeThong}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm linh kiện / điểm kiểm tra" className="h-9 w-full rounded-md border border-gray-300 pl-8 pr-3 text-sm" disabled={!selectedSystemId} />
            </div>
            {selectedSystemId && (
              <>
                <button type="button" onClick={expandAll} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"><ChevronsUpDown className="h-3.5 w-3.5" /> Mở</button>
                <button type="button" onClick={() => setExpandedIds(new Set())} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"><ChevronsDownUp className="h-3.5 w-3.5" /> Gọn</button>
              </>
            )}
          </div>

          {!selectedSystemId ? (
            <p className="py-6 text-center text-sm text-gray-400">Chọn hệ thống để xem cây và tạo mẫu</p>
          ) : detailTreeQ.isLoading ? (
            <p className="py-6 text-center text-sm text-gray-400">Đang tải...</p>
          ) : !treeData || treeData.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{search ? 'Không tìm thấy chi tiết phù hợp.' : 'Hệ thống này chưa có cây linh kiện.'}</p>
          ) : (
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Tên chi tiết</th>
                    <th className="border-b px-3 py-2 text-left">Mã</th>
                    <th className="border-b px-3 py-2 text-left">Loại</th>
                    <th className="border-b px-3 py-2 text-left">Mẫu lỗi</th>
                    <th className="border-b px-3 py-2 text-right">Tạo mẫu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {treeData.map((node) => {
                    const c = countsMap.get(node.id);
                    return (
                      <tr key={node.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center" style={{ paddingLeft: `${node.depth * 20}px` }}>
                            {node.children.length > 0 ? (
                              <button type="button" onClick={() => toggleExpand(node.id)} className="mr-1 rounded p-0.5 text-gray-400 hover:text-gray-700">
                                {expandedIds.has(node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            ) : <span className="mr-1 inline-block w-5" />}
                            <span className="font-medium text-gray-900">{node.tenChiTiet}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-blue-700">{node.maChiTiet}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{DETAIL_TYPE_LABELS[node.loaiChiTiet] ?? node.loaiChiTiet}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">{c ? `${c.directCount} / ${c.subtreeCount}` : '0 / 0'}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => { setTplNode(node); setTplForm({ tenMauLoi: '', moTa: '', mucDo: 'TRUNG_BINH' }); }} className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">+ Mau</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tplNode && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTplNode(null)} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Thêm mẫu lỗi — {tplNode.tenChiTiet}</h3>
            <p className="mt-1 text-xs text-gray-500">{tplNode.maChiTiet}</p>
            <div className="mt-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-700">Tên mẫu</label><input value={tplForm.tenMauLoi} onChange={(e) => setTplForm((p) => ({ ...p, tenMauLoi: e.target.value }))} placeholder="VD: Rò rỉ dầu" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-700">Mô tả</label><textarea value={tplForm.moTa} onChange={(e) => setTplForm((p) => ({ ...p, moTa: e.target.value }))} rows={3} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-700">Mức độ</label><select value={tplForm.mucDo} onChange={(e) => setTplForm((p) => ({ ...p, mucDo: e.target.value }))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"><option value="NHE">Nhẹ</option><option value="TRUNG_BINH">Trung bình</option><option value="NANG">Nặng</option><option value="NGHIEM_TRONG">Nghiêm trọng</option></select></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setTplNode(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
              <button type="button" disabled={tplSaving || !tplForm.tenMauLoi.trim() || !tplForm.moTa.trim()} onClick={async () => {
                if (!tplNode) return; setTplSaving(true);
                try {
                  await faultTemplateService.create({ tenMauLoi: tplForm.tenMauLoi.trim(), moTa: tplForm.moTa.trim(), mucDo: tplForm.mucDo, machineSystemId: tplNode.machineSystemId, machineSystemDetailId: tplNode.id });
                  queryClient.invalidateQueries({ queryKey: faultTemplateKeys.lists() });
                  queryClient.invalidateQueries({ queryKey: faultTemplateKeys.counts(tplNode.machineSystemId) });
                  toast.success('Đã tạo mẫu lỗi');
                  setTplNode(null);
                } catch (e: any) { toast.error(e?.response?.data?.message || e?.message || 'Không tạo được mẫu'); } finally { setTplSaving(false); }
              }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{tplSaving ? 'Đang lưu...' : 'Tạo mẫu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
