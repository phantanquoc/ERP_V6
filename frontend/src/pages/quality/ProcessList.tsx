import React, { useState } from 'react';
import { Plus, X, Edit, Trash2, Eye } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Danh sách quy trình</h1>
          <p className="text-gray-600">Quản lý danh sách quy trình sản xuất</p>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Tạo quy trình mới
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-100 border-b-2 border-blue-300">
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800 border-r border-blue-300">STT</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800 border-r border-blue-300">LƯU ĐỒ</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800 border-r border-blue-300">NỘI DUNG CÔNG VIỆC</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800 border-r border-blue-300">LOẠI CHI PHÍ</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800 border-r border-blue-300">TÊN CHI PHÍ</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800 border-r border-blue-300">ĐVT</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-800">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((process, index) => (
                  <tr key={process.id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">{process.stt}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">{process.luuDo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 max-w-xs">{process.noiDungCongViec}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">{process.loaiChiPhi}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">{process.tenChiPhi}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">{process.dvt}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center justify-center gap-3">
                        <button className="text-blue-600 hover:text-blue-800" title="Xem chi tiết">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-800" title="Chỉnh sửa">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(process.id)}
                          className="text-red-600 hover:text-red-800"
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
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">Tạo quy trình mới</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lưu đồ</label>
                  <input
                    type="text"
                    name="luuDo"
                    value={formData.luuDo}
                    onChange={handleInputChange}
                    placeholder="Nhập lưu đồ"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung công việc</label>
                  <textarea
                    name="noiDungCongViec"
                    value={formData.noiDungCongViec}
                    onChange={handleInputChange}
                    placeholder="Nhập nội dung công việc"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại chi phí</label>
                    <select
                      name="loaiChiPhi"
                      value={formData.loaiChiPhi}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên chi phí</label>
                    <input
                      type="text"
                      name="tenChiPhi"
                      value={formData.tenChiPhi}
                      onChange={handleInputChange}
                      placeholder="Nhập tên chi phí"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị tính</label>
                  <input
                    type="text"
                    name="dvt"
                    value={formData.dvt}
                    onChange={handleInputChange}
                    placeholder="Nhập đơn vị tính"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Tạo quy trình
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessList;

