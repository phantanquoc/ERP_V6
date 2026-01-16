import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import processService, { ProcessFlowchartSection, ProcessFlowchartCost } from '../services/processService';

interface FlowchartEditorProps {
  processId: string;
  processName: string;
  onClose: () => void;
  onSave: () => void;
}

const FlowchartEditor: React.FC<FlowchartEditorProps> = ({ processId, processName, onClose, onSave }) => {
  const [sections, setSections] = useState<ProcessFlowchartSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchFlowchart();
  }, [processId]);

  const fetchFlowchart = async () => {
    try {
      setLoading(true);
      const response = await processService.getFlowchart(processId);
      if (response.data && response.data.sections) {
        setSections(response.data.sections);
        setIsEditMode(true);
      } else {
        // No flowchart exists, start with one empty section
        setSections([createEmptySection(1)]);
        setIsEditMode(false);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No flowchart exists, start with one empty section
        setSections([createEmptySection(1)]);
        setIsEditMode(false);
      } else {
        console.error('Error fetching flowchart:', error);
        alert('Lỗi khi tải lưu đồ');
      }
    } finally {
      setLoading(false);
    }
  };

  const createEmptySection = (stt: number): ProcessFlowchartSection => ({
    phanDoan: `Phân đoạn ${stt}`,
    tiepNhanNguyenLieu: '',
    noiDungCongViec: '',
    loaiChiPhi: '',
    stt,
    costs: [],
  });

  const createEmptyCost = (): ProcessFlowchartCost => ({
    tenChiPhi: '',
    dvt: '',
    nguoiCaiDoi: '',
    fileUrl: '',
  });

  const handleAddSection = () => {
    const newSection = createEmptySection(sections.length + 1);
    setSections([...sections, newSection]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length === 1) {
      alert('Phải có ít nhất 1 phân đoạn!');
      return;
    }
    const newSections = sections.filter((_, i) => i !== index);
    // Re-number sections
    newSections.forEach((section, i) => {
      section.phanDoan = `Phân đoạn ${i + 1}`;
      section.stt = i + 1;
    });
    setSections(newSections);
  };

  const handleSectionChange = (index: number, field: keyof ProcessFlowchartSection, value: string) => {
    const newSections = [...sections];
    (newSections[index] as any)[field] = value;
    setSections(newSections);
  };

  const handleAddCost = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].costs.push(createEmptyCost());
    setSections(newSections);
  };

  const handleRemoveCost = (sectionIndex: number, costIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].costs = newSections[sectionIndex].costs.filter((_, i) => i !== costIndex);
    setSections(newSections);
  };

  const handleCostChange = (sectionIndex: number, costIndex: number, field: keyof ProcessFlowchartCost, value: string) => {
    const newSections = [...sections];
    (newSections[sectionIndex].costs[costIndex] as any)[field] = value;
    setSections(newSections);
  };

  const handleFileUpload = async (sectionIndex: number, costIndex: number, file: File) => {
    // TODO: Implement file upload to server
    // For now, just store the file name
    const fileUrl = `/uploads/${file.name}`;
    handleCostChange(sectionIndex, costIndex, 'fileUrl', fileUrl);
    alert(`File "${file.name}" đã được chọn (chức năng upload sẽ được implement sau)`);
  };

  const handleSubmit = async () => {
    // Validation
    for (const section of sections) {
      if (!section.phanDoan) {
        alert('Vui lòng điền tên phân đoạn!');
        return;
      }
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await processService.updateFlowchart(processId, sections);
        alert('Cập nhật lưu đồ thành công!');
      } else {
        await processService.createFlowchart(processId, sections);
        alert('Tạo lưu đồ thành công!');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving flowchart:', error);
      alert(error.response?.data?.message || 'Lỗi khi lưu lưu đồ');
    } finally {
      setLoading(false);
    }
  };

  if (loading && sections.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-700">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Chỉnh sửa lưu đồ' : 'Tạo lưu đồ mới'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">Quy trình: {processName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Header "Lưu đồ" */}
          <div className="bg-green-100 border border-green-300 p-3 mb-4">
            <h4 className="text-lg font-bold text-gray-800">Lưu đồ</h4>
          </div>

          {/* Sections */}
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
              {/* Section Header */}
              <div className="bg-gray-100 p-3 flex items-center justify-between border-b border-gray-300">
                <input
                  type="text"
                  value={section.phanDoan}
                  onChange={(e) => handleSectionChange(sectionIndex, 'phanDoan', e.target.value)}
                  className="font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                  placeholder="Tên phân đoạn"
                />
                <button
                  onClick={() => handleRemoveSection(sectionIndex)}
                  className="text-red-600 hover:text-red-800"
                  title="Xóa phân đoạn"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Section Content */}
              <div className="p-4 space-y-4">
                {/* Tiếp nhận nguyên liệu */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 font-medium text-gray-700">Tiếp nhận nguyên liệu</div>
                  <div className="col-span-3">
                    <textarea
                      value={section.tiepNhanNguyenLieu || ''}
                      onChange={(e) => handleSectionChange(sectionIndex, 'tiepNhanNguyenLieu', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Nhập thông tin tiếp nhận nguyên liệu..."
                    />
                  </div>
                </div>

                {/* Nội dung công việc */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 font-medium text-gray-700">Nội dung công việc</div>
                  <div className="col-span-3">
                    <textarea
                      value={section.noiDungCongViec || ''}
                      onChange={(e) => handleSectionChange(sectionIndex, 'noiDungCongViec', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Nhập nội dung công việc..."
                    />
                  </div>
                </div>

                {/* Loại chi phí */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 font-medium text-gray-700">Loại chi phí</div>
                  <div className="col-span-3">
                    <select
                      value={section.loaiChiPhi || ''}
                      onChange={(e) => handleSectionChange(sectionIndex, 'loaiChiPhi', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn loại chi phí --</option>
                      <option value="Nhân công">Nhân công</option>
                      <option value="Vật tư">Vật tư</option>
                      <option value="Phụ liệu">Phụ liệu</option>
                    </select>
                  </div>
                </div>

                {/* Chi phí list */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700">+ Thêm (Nhân công/ phụ liệu/ vật tư)</span>
                    <button
                      onClick={() => handleAddCost(sectionIndex)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm chi phí
                    </button>
                  </div>

                  {/* Costs table */}
                  {section.costs.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Tên chi phí</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-24">ĐVT</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-32">Người/Cái/Đối</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-40">File đính kèm</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium w-16">Xóa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.costs.map((cost, costIndex) => (
                            <tr key={costIndex}>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="text"
                                  value={cost.tenChiPhi}
                                  onChange={(e) => handleCostChange(sectionIndex, costIndex, 'tenChiPhi', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Tên chi phí"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="text"
                                  value={cost.dvt || ''}
                                  onChange={(e) => handleCostChange(sectionIndex, costIndex, 'dvt', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="ĐVT"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="text"
                                  value={cost.nguoiCaiDoi || ''}
                                  onChange={(e) => handleCostChange(sectionIndex, costIndex, 'nguoiCaiDoi', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Người/Cái/Đối"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded cursor-pointer hover:bg-gray-200">
                                    <Upload className="w-3 h-3" />
                                    <span>Chọn file</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(sectionIndex, costIndex, file);
                                      }}
                                    />
                                  </label>
                                  {cost.fileUrl && (
                                    <span className="text-xs text-blue-600 truncate max-w-[100px]" title={cost.fileUrl}>
                                      {cost.fileUrl.split('/').pop()}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-center">
                                <button
                                  onClick={() => handleRemoveCost(sectionIndex, costIndex)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Section Button */}
          <button
            onClick={handleAddSection}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            + THÊM PHÂN ĐOẠN
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo lưu đồ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlowchartEditor;

