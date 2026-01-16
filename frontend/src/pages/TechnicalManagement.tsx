import React, { useState } from 'react';
import {
  Wrench,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Thermometer,
  Gauge,
  Power,
  Activity,
  Plus,
  FileText
} from 'lucide-react';

// Component cho thẻ thống kê
const StatCard = ({
  title,
  value,
  valueClass = "text-blue-600",
  subtitle = ""
}: {
  title: string;
  value: string | number;
  valueClass?: string;
  subtitle?: string;
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="text-sm font-medium text-gray-600 mb-3">{title}</div>
    <div className={`text-3xl font-bold ${valueClass}`}>
      {typeof value === 'number' ? String(value).padStart(2, '0') : value}
    </div>
    {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
  </div>
);

// Component cho thẻ nồi chiên
const FryerCard = ({
  id,
  name,
  status,
  temperature,
  pressure,
  runtime,
  efficiency
}: {
  id: number;
  name: string;
  status: 'running' | 'idle' | 'maintenance' | 'error';
  temperature: number;
  pressure: number;
  runtime: string;
  efficiency: number;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 border-green-200';
      case 'idle': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'maintenance': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Đang hoạt động';
      case 'idle': return 'Chờ';
      case 'maintenance': return 'Bảo trì';
      case 'error': return 'Lỗi';
      default: return 'Không xác định';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4" />;
      case 'idle': return <Clock className="w-4 h-4" />;
      case 'maintenance': return <Settings className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Power className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
          {getStatusText(status)}
        </span>
      </div>

      {/* Thông số kỹ thuật */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-red-500" />
          <div>
            <div className="text-sm text-gray-600">Nhiệt độ</div>
            <div className="font-semibold text-gray-800">{temperature}°C</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-sm text-gray-600">Áp suất</div>
            <div className="font-semibold text-gray-800">{pressure} bar</div>
          </div>
        </div>
      </div>

      {/* Thời gian hoạt động và hiệu suất */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-500" />
          <div>
            <div className="text-sm text-gray-600">Thời gian</div>
            <div className="font-semibold text-gray-800">{runtime}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <div>
            <div className="text-sm text-gray-600">Hiệu suất</div>
            <div className="font-semibold text-gray-800">{efficiency}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TechnicalManagement = () => {
  // Dữ liệu sẽ được load từ API
  const fryerSystems: any[] = [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Wrench className="w-8 h-8 text-red-600 mr-3" />
            Kỹ thuật
          </h1>
          <p className="text-gray-600">Quản lý và giám sát hệ thống kỹ thuật</p>
        </div>

        {/* Thống kê tổng quan */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-1 h-6 bg-red-600 mr-3 rounded"></div>
            Kỹ thuật
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Kế hoạch bảo dưỡng"
              value="0"
              valueClass="text-blue-600"
              subtitle="Kế hoạch: 0"
            />
            <StatCard
              title="Kế hoạch thi công,lắp đặt"
              value="0"
              valueClass="text-gray-600"
              subtitle="Kế hoạch: 0"
            />
            <StatCard
              title="Danh sách dự án"
              value="0"
              valueClass="text-green-600"
              subtitle="Dự án: 0"
            />
            <StatCard
              title="Lỗi hệ thống"
              value="0"
              valueClass="text-red-600"
              subtitle="Lỗi vận hành: 0"
            />
          </div>
        </div>

        {/* Hệ thống nồi chiên chân không */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <div className="w-1 h-6 bg-red-600 mr-3 rounded"></div>
            Hệ thống nồi chiên chân không
          </h2>

          {/* Tổng quan hệ thống */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {fryerSystems.filter(f => f.status === 'running').length}
                </div>
                <div className="text-sm text-gray-600">Đang hoạt động</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {fryerSystems.filter(f => f.status === 'idle').length}
                </div>
                <div className="text-sm text-gray-600">Chờ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {fryerSystems.filter(f => f.status === 'maintenance').length}
                </div>
                <div className="text-sm text-gray-600">Bảo trì</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {fryerSystems.filter(f => f.status === 'error').length}
                </div>
                <div className="text-sm text-gray-600">Lỗi</div>
              </div>
            </div>
          </div>

          {/* Grid các nồi chiên */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {fryerSystems.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Chưa có dữ liệu nồi chiên</p>
              </div>
            ) : (
              fryerSystems.map((fryer) => (
                <FryerCard key={fryer.id} {...fryer} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalManagement;
