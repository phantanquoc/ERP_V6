import React, { useState } from 'react';
import { Plus, X, Edit, Trash2, Eye, ListOrdered } from 'lucide-react';
import { PageHeader } from '../../design-system/PageHeader';
import { SectionCard } from '../../design-system/SectionCard';

interface Process {
  id: number;
  stt: number;
  luuDo: string;
  noiDungCongViec: string;
  loaiChiPhi: string;
  tenChiPhi: string;
  dvt: string;
}

const ProcessList = () => {
  const [processes, setProcesses] = useState<Process[]>([
    {
      id: 1,
      stt: 1,
      luuDo: 'Tập nhân nguyên liệu',
      noiDungCongViec: 'Nhân viên vào kho xuất kho lấy nguyên liệu, thực hiện công việc chặn nguyên liệu',
      loaiChiPhi: 'Nhân công',
      tenChiPhi: 'NV Vận hành máy rửa',
      dvt: 'Người'
    },
    {
      id: 2,
      stt: 2,
      luuDo: 'Chuẩn bị kho ngăn',
      noiDungCongViec: 'NV chuẩn bị kho ngăn, phân công + mách nhân, Sơ đồ gia chính',
      loaiChiPhi: 'Nhân công',
      tenChiPhi: 'Mách nhân',
      dvt: 'Kỹ'
    },
    {
      id: 3,
      stt: 3,
      luuDo: 'Tập kỹ năng lâu kho vật dụng đến kho vật dụng',
      noiDungCongViec: 'Nhân viên tập kỹ năng lâu kho vật dụng đến kho vật dụng để chuẩn bị để kho vật dụng',
      loaiChiPhi: 'Nhân công',
      tenChiPhi: 'NV Vận hành máy rửa',
      dvt: 'Người'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    luuDo: '',
    noiDungCongViec: '',
    loaiChiPhi: '',
    tenChiPhi: '',
    dvt: ''
  });

  const handleOpenModal = () => {
    setFormData({
      luuDo: '',
      noiDungCongViec: '',
      loaiChiPhi: '',
      tenChiPhi: '',
      dvt: ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newProcess: Process = {
      id: Math.max(...processes.map(p => p.id), 0) + 1,
      stt: processes.length + 1,
      ...formData
    };

    setProcesses([...processes, newProcess]);
    handleCloseModal();
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa quy trình này?')) {
      setProcesses(processes.filter(p => p.id !== id).map((p, idx) => ({
        ...p,
        stt: idx + 1
      })));
    }
  };

  return (
    <div className="space-y-5">
        <PageHeader
          title="Danh sách quy trình"
          description="Quản lý danh sách quy trình sản xuất"
          icon={<ListOrdered className="w-6 h-6 text-violet-500" />}
          actions={
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Tạo quy trình mới
            </button>
          }
        />

        {/* Table */}
        <SectionCard bodyClassName="overflow-hidden -m-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-r border-gray-200">STT</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-r border-gray-200">Lưu đồ</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-r border-gray-200">Nội dung công việc</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-r border-gray-200">Loại chi phí</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-r border-gray-200">Tên chi phí</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-r border-gray-200">ĐVT</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((process, index) => (
                  <tr key={process.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                    <td className="px-3 py-2.5 text-sm text-gray-700 border-r border-gray-100">{process.stt}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 border-r border-gray-100">{process.luuDo}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 border-r border-gray-100 max-w-xs truncate">{process.noiDungCongViec}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 border-r border-gray-100">{process.loaiChiPhi}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 border-r border-gray-100">{process.tenChiPhi}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 border-r border-gray-100">{process.dvt}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700">
                      <div className="flex items-center justify-center gap-1.5">
                        <button className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Xem chi tiết">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Chỉnh sửa">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(process.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-sm max-w-2xl w-full">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-800">Tạo quy trình mới</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Lưu đồ</label>
                  <input
                    type="text"
                    name="luuDo"
                    value={formData.luuDo}
                    onChange={handleInputChange}
                    placeholder="Nhập lưu đồ"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung công việc</label>
                  <textarea
                    name="noiDungCongViec"
                    value={formData.noiDungCongViec}
                    onChange={handleInputChange}
                    placeholder="Nhập nội dung công việc"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại chi phí</label>
                    <select
                      name="loaiChiPhi"
                      value={formData.loaiChiPhi}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Chọn loại chi phí</option>
                      <option value="Nhân công">Nhân công</option>
                      <option value="Vật liệu">Vật liệu</option>
                      <option value="Máy móc">Máy móc</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên chi phí</label>
                    <input
                      type="text"
                      name="tenChiPhi"
                      value={formData.tenChiPhi}
                      onChange={handleInputChange}
                      placeholder="Nhập tên chi phí"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Đơn vị tính</label>
                  <input
                    type="text"
                    name="dvt"
                    value={formData.dvt}
                    onChange={handleInputChange}
                    placeholder="Nhập đơn vị tính"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Tạo quy trình
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default ProcessList;
