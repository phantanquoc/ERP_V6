import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, FileText, ClipboardList, CheckCircle, FileCheck, FileSpreadsheet } from 'lucide-react';
import TaxReportTab from '../../components/TaxReportTab';
import taxReportService, { TaxReport, TaxReportStatus } from '../../services/taxReportService';

const AccountingTax = () => {
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaxReports();
  }, []);

  const loadTaxReports = async () => {
    try {
      setLoading(true);
      const response = await taxReportService.getAllTaxReports(1, 1000);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Calculator className="w-8 h-8 text-red-600 mr-3" />
            Phòng KT thuế
          </h1>
          <p className="text-gray-600">Quản lý báo cáo thuế</p>
        </div>

        {/* Overview Card */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
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
                {/* Main stat */}
                <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng số báo cáo</span>
                    <span className="text-2xl font-bold text-blue-600">{totalReports}</span>
                  </div>
                </div>
                {/* Sub stats */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-gray-800">{notReportedCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Chưa báo cáo</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-gray-800">{updatingCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đang cập nhật</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-gray-800">{completeDocsCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đủ hồ sơ</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-gray-800">{reportedCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đã báo cáo</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-gray-800">{settledCount}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đã quyết toán</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Header */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button className="py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 border-red-500 text-red-600">
                <TrendingUp className="w-4 h-4" />
                Báo cáo thuế
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>
          <TaxReportTab />
        </div>
      </div>
    </div>
  );
};

export default AccountingTax;
