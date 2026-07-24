import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ClipboardList, Plus, Edit2, XCircle, ChevronDown, ChevronRight,
  Loader2, CheckCircle, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useSoakingPlans,
  usePlannableOrders,
  useCreateSoakingPlan,
  useUpdateSoakingPlan,
  useCancelSoakingPlan,
} from '../../hooks/useSoakingPlans';
import type { SoakingPlan, PlannableOrder, PlannableOrderItem } from '../../services/soakingPlanService';

// ─── Validation Schema ───────────────────────────────────────────────────────

const soakingPlanSchema = z.object({
  soLanNgam: z.number().min(1, 'Phải >= 1'),
  nhietDoNuocTruocNgam: z.number().min(0, 'Phải >= 0'),
  nhietDoNuocSauVot: z.number().min(0, 'Phải >= 0'),
  thoiGianNgam: z.number().min(1, 'Phải >= 1'),
  brixNuocNgam: z.number().min(0, 'Phải >= 0'),
  khoiLuong: z.number().min(0.01, 'Phải > 0'),
});

type SoakingPlanFormData = z.infer<typeof soakingPlanSchema>;

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  HIEU_LUC: { label: 'Hiệu lực', color: 'bg-emerald-100 text-emerald-700' },
  DA_DUNG: { label: 'Đã dùng', color: 'bg-blue-100 text-blue-700' },
  HUY: { label: 'Đã huỷ', color: 'bg-red-100 text-red-700' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const SoakingPlanManagement: React.FC = () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SoakingPlan | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PlannableOrder | null>(null);
  const [selectedItem, setSelectedItem] = useState<PlannableOrderItem | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: plansData, isLoading: loadingPlans } = useSoakingPlans({ page: 1, limit: 50 });
  const { data: ordersData, isLoading: loadingOrders } = usePlannableOrders(1, 50);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useCreateSoakingPlan();
  const updateMutation = useUpdateSoakingPlan();
  const cancelMutation = useCancelSoakingPlan();

  // ─── Form ───────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SoakingPlanFormData>({
    resolver: zodResolver(soakingPlanSchema),
    defaultValues: {
      soLanNgam: 1,
      nhietDoNuocTruocNgam: 0,
      nhietDoNuocSauVot: 0,
      thoiGianNgam: 0,
      brixNuocNgam: 0,
      khoiLuong: 0,
    },
  });

  const plans = plansData?.data ?? [];
  const orders = ordersData?.data ?? [];

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectItem = (order: PlannableOrder, item: PlannableOrderItem) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setShowForm(true);
    setEditingPlan(null);
    reset({
      soLanNgam: 1,
      nhietDoNuocTruocNgam: 0,
      nhietDoNuocSauVot: 0,
      thoiGianNgam: 0,
      brixNuocNgam: 0,
      khoiLuong: item.soLuong,
    });
  };

  const handleEdit = (plan: SoakingPlan) => {
    setEditingPlan(plan);
    setSelectedOrder(null);
    setSelectedItem(null);
    setShowForm(true);
    reset({
      soLanNgam: plan.soLanNgam,
      nhietDoNuocTruocNgam: plan.nhietDoNuocTruocNgam,
      nhietDoNuocSauVot: plan.nhietDoNuocSauVot,
      thoiGianNgam: plan.thoiGianNgam,
      brixNuocNgam: plan.brixNuocNgam,
      khoiLuong: plan.khoiLuong,
    });
  };

  const handleCancel = async (plan: SoakingPlan) => {
    if (!window.confirm('Xác nhận huỷ kế hoạch ngâm này?')) return;
    try {
      await cancelMutation.mutateAsync(plan.id);
      toast.success('Đã huỷ kế hoạch ngâm');
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi huỷ kế hoạch');
    }
  };

  const onSubmit = async (formData: SoakingPlanFormData) => {
    try {
      if (editingPlan) {
        await updateMutation.mutateAsync({ id: editingPlan.id, data: formData });
        toast.success('Cập nhật kế hoạch ngâm thành công');
      } else if (selectedOrder && selectedItem) {
        await createMutation.mutateAsync({
          orderId: selectedOrder.id,
          orderItemId: selectedItem.id,
          productId: selectedItem.productId,
          ...formData,
        });
        toast.success('Tạo kế hoạch ngâm thành công');
      }
      setShowForm(false);
      setEditingPlan(null);
      setSelectedOrder(null);
      setSelectedItem(null);
      reset();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi lưu kế hoạch ngâm');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    setSelectedOrder(null);
    setSelectedItem(null);
    reset();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-2 sm:px-4 lg:px-6 py-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Kế hoạch ngâm
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Lập thông số ngâm mục tiêu từ đơn hàng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Orders to plan */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Đơn hàng chờ lên kế hoạch
            </h2>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {loadingOrders ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
              </div>
            ) : orders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Không có đơn hàng nào chờ lên kế hoạch</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800">{order.maDonHang}</span>
                      <span className="text-xs text-gray-500 ml-2">{order.tenKhachHang}</span>
                    </div>
                    {expandedOrderId === order.id ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedOrderId === order.id && (
                    <div className="border-t border-gray-100 p-3 space-y-1.5">
                      {order.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(order, item)}
                          className="w-full flex items-center justify-between p-2 rounded hover:bg-blue-50 text-left transition-colors"
                        >
                          <div>
                            <span className="text-sm text-gray-700">{item.tenHangHoa}</span>
                            <span className="text-xs text-gray-400 ml-2">({item.maSanPham})</span>
                          </div>
                          <span className="text-xs text-gray-500">{item.soLuong} {item.donVi}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Existing plans */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Danh sách kế hoạch ngâm
            </h2>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
            {loadingPlans ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
              </div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có kế hoạch ngâm nào</p>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{plan.tenSanPham}</span>
                      <StatusBadge status={plan.trangThai} />
                    </div>
                    {plan.trangThai === 'HIEU_LUC' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCancel(plan)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                          title="Huỷ"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Đơn: {plan.order?.maDonHang} - {plan.order?.tenKhachHang}</p>
                    <p>
                      Ngâm {plan.soLanNgam} lần | {plan.thoiGianNgam} phút |
                      Brix {plan.brixNuocNgam} | KL {plan.khoiLuong} kg
                    </p>
                    <p>Nhiệt trước: {plan.nhietDoNuocTruocNgam}°C | Sau vớt: {plan.nhietDoNuocSauVot}°C</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                {editingPlan ? 'Sửa kế hoạch ngâm' : 'Tạo kế hoạch ngâm'}
              </h3>
              {!editingPlan && selectedOrder && selectedItem && (
                <p className="text-xs text-gray-500 mt-1">
                  Đơn: {selectedOrder.maDonHang} | SP: {selectedItem.tenHangHoa} ({selectedItem.maSanPham})
                </p>
              )}
              {editingPlan && (
                <p className="text-xs text-gray-500 mt-1">
                  SP: {editingPlan.tenSanPham} ({editingPlan.maSanPham})
                </p>
              )}
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lần ngâm</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('soLanNgam', { valueAsNumber: true })}
                  />
                  {errors.soLanNgam && <p className="text-xs text-red-500 mt-0.5">{errors.soLanNgam.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian ngâm (phút)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('thoiGianNgam', { valueAsNumber: true })}
                  />
                  {errors.thoiGianNgam && <p className="text-xs text-red-500 mt-0.5">{errors.thoiGianNgam.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ trước ngâm (°C)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('nhietDoNuocTruocNgam', { valueAsNumber: true })}
                  />
                  {errors.nhietDoNuocTruocNgam && <p className="text-xs text-red-500 mt-0.5">{errors.nhietDoNuocTruocNgam.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ sau vớt (°C)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('nhietDoNuocSauVot', { valueAsNumber: true })}
                  />
                  {errors.nhietDoNuocSauVot && <p className="text-xs text-red-500 mt-0.5">{errors.nhietDoNuocSauVot.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brix nước ngâm</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('brixNuocNgam', { valueAsNumber: true })}
                  />
                  {errors.brixNuocNgam && <p className="text-xs text-red-500 mt-0.5">{errors.brixNuocNgam.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối lượng (kg)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('khoiLuong', { valueAsNumber: true })}
                  />
                  {errors.khoiLuong && <p className="text-xs text-red-500 mt-0.5">{errors.khoiLuong.message}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingPlan ? 'Cập nhật' : 'Tạo kế hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoakingPlanManagement;
