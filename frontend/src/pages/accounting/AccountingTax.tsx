import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, FileText, DollarSign } from 'lucide-react';
import TaxReportTab from '../../components/TaxReportTab';
import taxReportService, { TaxReport, TaxReportStatus } from '../../services/taxReportService';

const AccountingTax = () => {
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Month/Year filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadTaxReports();
  }, [selectedMonth, selectedYear]);

  const loadTaxReports = async () => {
    try {
      setLoading(true);
      const response = await taxReportService.getAllTaxReports(1, 1000, undefined, selectedMonth, selectedYear);
      setTaxReports(response.data);
    } catch (error) {
      console.error('Error loading tax reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalReports = taxReports.length;
  const notReportedCount = taxReports.filter(r => r.trangThai === TaxReportStatus.CHUA_BAO_CAO).length;
  const updatingCount = taxReports.filter(r => r.trangThai === TaxReportStatus.DANG_CAP_NHAT_HO_SO).length;
  const completeDocsCount = taxReports.filter(r => r.trangThai === TaxReportStatus.DA_DAY_DU_HO_SO).length;
  const reportedCount = taxReports.filter(r => r.trangThai === TaxReportStatus.DA_BAO_CAO).length;
  const settledCount = taxReports.filter(r => r.trangThai === TaxReportStatus.DA_QUYET_TOAN).length;

  // Tax amount statistics
  const totalGiaTriDonHang = taxReports.reduce((sum, r) => sum + (r.giaTriDonHang || 0), 0);
  const totalSoTienDongThue = taxReports.reduce((sum, r) => sum + (r.soTienDongThue || 0), 0);
  const tyLeThue = totalGiaTriDonHang > 0 ? (totalSoTienDongThue / totalGiaTriDonHang * 100) : 0;

  const formatCompact = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value);


  return (
    <div>
      <div>
        {/* Header with Month/Year filter */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
              <Calculator className="w-8 h-8 text-red-600 mr-3" />
              Phòng KT thuế
            </h1>
            <p className="text-gray-600">Quản lý báo cáo thuế</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Tổng quan báo cáo thuế */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan báo cáo thuế
              </h3>
            </div>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng số báo cáo</span>
                    <span className="text-2xl font-bold text-blue-600">{totalReports}</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2 text-center border-2 border-gray-300">
                    <div className="text-xl font-bold text-gray-800">{notReportedCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Chưa báo cáo</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center border-2 border-gray-300">
                    <div className="text-xl font-bold text-gray-800">{updatingCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đang cập nhật</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center border-2 border-gray-300">
                    <div className="text-xl font-bold text-gray-800">{completeDocsCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đủ hồ sơ</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center border-2 border-gray-300">
                    <div className="text-xl font-bold text-gray-800">{reportedCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đã báo cáo</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center border-2 border-gray-300">
                    <div className="text-xl font-bold text-gray-800">{settledCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đã quyết toán</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Tổng quan tiền thuế */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Tổng quan tiền thuế
              </h3>
            </div>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 rounded-lg p-3 text-center border-2 border-blue-300">
                    <div className="text-lg font-bold text-blue-600">{formatCompact(totalGiaTriDonHang)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Tổng giá trị đơn hàng</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center border-2 border-red-300">
                    <div className="text-lg font-bold text-red-600">{formatCompact(totalSoTienDongThue)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Tổng tiền thuế</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center border-2 border-green-300">
                    <div className="text-lg font-bold text-green-600">{tyLeThue.toFixed(1)}%</div>
                    <div className="text-xs text-gray-600 mt-0.5">Tỷ lệ thuế TB</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Header */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              <button className="py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 border-red-500 text-red-600">
                <TrendingUp className="w-4 h-4" />
                Báo cáo thuế
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>
          <TaxReportTab month={selectedMonth} year={selectedYear} />
        </div>
      </div>
    </div>
  );
};

export default AccountingTax;
