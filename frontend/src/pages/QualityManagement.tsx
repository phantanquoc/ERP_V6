import { useState, useEffect } from 'react';
import { Users, Settings, ShieldCheck, ClipboardList } from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import qualityEvaluationService from '../services/qualityEvaluationService';
import { processService } from '../services/processService';
import internalInspectionService from '../services/internalInspectionService';
import employeeService from '../services/employeeService';

const PRODUCT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6'];
const INSPECTION_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];

const QualityManagement = () => {
  const [loading, setLoading] = useState(true);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [employeeActive, setEmployeeActive] = useState(0);
  const [processTotal, setProcessTotal] = useState(0);
  const [evalTotal, setEvalTotal] = useState(0);
  const [inspectionTotal, setInspectionTotal] = useState(0);
  const [avgRatios, setAvgRatios] = useState<{ name: string; value: number }[]>([]);
  const [inspectionByLevel, setInspectionByLevel] = useState<{ name: string; value: number }[]>([]);
  const [evalByMonth, setEvalByMonth] = useState<{ month: string; count: number }[]>([]);
  const [inspectionByMonth, setInspectionByMonth] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [empRes, procRes, evalRes, inspections] = await Promise.all([
          employeeService.getAllEmployees(1, 10000),
          processService.getAllProcesses(1, 10000),
          qualityEvaluationService.getAllQualityEvaluations(1, 10000),
          internalInspectionService.getAllInspections(),
        ]);

        // Employees
        const employees = empRes.data || [];
        setEmployeeTotal(employees.length);
        setEmployeeActive(employees.filter((e: any) => e.status === 'Đang làm việc').length);

        // Processes
        setProcessTotal(procRes.pagination?.total || procRes.data?.length || 0);

        // Quality evaluations
        const evals = evalRes.data || [];
        setEvalTotal(evalRes.pagination?.total || evals.length);

        // Average ratios
        if (evals.length > 0) {
          const fields = [
            { key: 'aTiLe', label: 'Loại A' },
            { key: 'bTiLe', label: 'Loại B' },
            { key: 'bDauTiLe', label: 'Loại B dầu' },
            { key: 'cTiLe', label: 'Loại C' },
            { key: 'vunLonTiLe', label: 'Vụn lớn' },
            { key: 'vunNhoTiLe', label: 'Vụn nhỏ' },
            { key: 'phePhamTiLe', label: 'Phế phẩm' },
            { key: 'uotTiLe', label: 'Ướt' },
          ];
          setAvgRatios(fields.map(f => ({
            name: f.label,
            value: Math.round((evals.reduce((sum: number, ev: any) => sum + (Number(ev[f.key]) || 0), 0) / evals.length) * 100) / 100,
          })));
        }

        // Eval by month (current year)
        const currentYear = new Date().getFullYear();
        const evalMonths = Array.from({ length: 12 }, (_, i) => ({ month: `T${i + 1}`, count: 0 }));
        evals.forEach((ev: any) => {
          const d = new Date(ev.createdAt);
          if (d.getFullYear() === currentYear) evalMonths[d.getMonth()].count++;
        });
        setEvalByMonth(evalMonths);

        // Inspections
        const insp = inspections || [];
        setInspectionTotal(insp.length);

        // Group by violationLevel
        const levelMap: Record<string, number> = {};
        insp.forEach((item: any) => {
          const lvl = item.violationLevel || 'Không xác định';
          levelMap[lvl] = (levelMap[lvl] || 0) + 1;
        });
        setInspectionByLevel(Object.entries(levelMap).map(([name, value]) => ({ name, value })));

        // Inspection by month (current year)
        const inspMonths = Array.from({ length: 12 }, (_, i) => ({ month: `T${i + 1}`, count: 0 }));
        insp.forEach((item: any) => {
          const d = new Date(item.inspectionDate);
          if (d.getFullYear() === currentYear) inspMonths[d.getMonth()].count++;
        });
        setInspectionByMonth(inspMonths);
      } catch (err) {
        console.error('Failed to fetch quality dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 font-medium">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Nhân viên', value: employeeTotal, sub: `Đang làm việc: ${employeeActive}`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Quy trình', value: processTotal, sub: 'Tổng quy trình', icon: Settings, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Đánh giá chất lượng', value: evalTotal, sub: 'Tổng đánh giá', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Kiểm tra nội bộ', value: inspectionTotal, sub: 'Tổng kiểm tra', icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bộ phận chất lượng</h1>
          <p className="text-gray-600">Quản lý và đảm bảo chất lượng sản phẩm, quy trình</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.bg} p-3 rounded-lg`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{card.label}</p>
              <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tỉ lệ thành phẩm trung bình</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={avgRatios} cx="50%" cy="50%" innerRadius={60} outerRadius={110} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}%`}>
                  {avgRatios.map((_, i) => (
                    <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Phân bổ kiểm tra nội bộ theo mức độ</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={inspectionByLevel} cx="50%" cy="50%" innerRadius={60} outerRadius={110} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                  {inspectionByLevel.map((_, i) => (
                    <Cell key={i} fill={INSPECTION_COLORS[i % INSPECTION_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Charts - Dark Theme */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-white mt-1">Đánh giá chất lượng theo tháng</h3>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evalByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name="Số đánh giá" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-white mt-1">Kiểm tra nội bộ theo tháng</h3>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={inspectionByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
                  <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 4 }} activeDot={{ r: 6 }} name="Số kiểm tra" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QualityManagement;

