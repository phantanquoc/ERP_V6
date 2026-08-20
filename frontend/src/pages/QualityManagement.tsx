import { useState, useEffect, useCallback } from 'react';
import { Users, Settings, ShieldCheck, ClipboardList } from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import qualityEvaluationService from '../services/qualityEvaluationService';
import { processService } from '../services/processService';
import internalInspectionService from '../services/internalInspectionService';
import employeeService from '../services/employeeService';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { PageHeader } from '../design-system/PageHeader';
import { KpiCard } from '../design-system/KpiCard';
import { ChartCard } from '../design-system/ChartCard';
import { LoadingState, ErrorState, EmptyState } from '../design-system/States';
import { chartPalettes } from '../design-system/tokens';

const PRODUCT_COLORS = chartPalettes.product;
const INSPECTION_COLORS = chartPalettes.inspection;

const QualityManagement = () => {
  const { user } = useAuth();
  // /api/employees requires ADMIN | DEPARTMENT_HEAD | TEAM_LEAD
  const canViewEmployees = user?.role === UserRole.ADMIN
    || user?.role === UserRole.DEPARTMENT_HEAD
    || user?.role === UserRole.TEAM_LEAD;
  // /api/internal-inspections requires ADMIN | DEPARTMENT_HEAD
  const canViewInspections = user?.role === UserRole.ADMIN
    || user?.role === UserRole.DEPARTMENT_HEAD;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [employeeActive, setEmployeeActive] = useState(0);
  const [processTotal, setProcessTotal] = useState(0);
  const [evalTotal, setEvalTotal] = useState(0);
  const [inspectionTotal, setInspectionTotal] = useState(0);
  const [avgRatios, setAvgRatios] = useState<{ name: string; value: number }[]>([]);
  const [inspectionByLevel, setInspectionByLevel] = useState<{ name: string; value: number }[]>([]);
  const [evalByMonth, setEvalByMonth] = useState<{ month: string; count: number }[]>([]);
  const [inspectionByMonth, setInspectionByMonth] = useState<{ month: string; count: number }[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [empRes, procRes, evalRes, inspections] = await Promise.all([
        canViewEmployees
          ? employeeService.getAllEmployees(1, 10000)
          : Promise.resolve({ data: [] }),
        processService.getAllProcesses(1, 10000),
        qualityEvaluationService.getAllQualityEvaluations(1, 10000),
        canViewInspections
          ? internalInspectionService.getAllInspections()
          : Promise.resolve([]),
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
      } else {
        setAvgRatios([]);
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
      setError('Không thể tải dữ liệu tổng quan chất lượng');
    } finally {
      setLoading(false);
    }
  }, [canViewEmployees, canViewInspections]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Đang tải dữ liệu..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Bộ phận chất lượng"
          description="Quản lý và đảm bảo chất lượng sản phẩm, quy trình"
          icon={<ShieldCheck className="w-6 h-6 text-violet-500" />}
        />
        <ErrorState message={error} onRetry={fetchAll} />
      </div>
    );
  }

  const hasAvgRatios = avgRatios.length > 0 && avgRatios.some(r => r.value > 0);
  const hasInspectionByLevel = inspectionByLevel.length > 0 && inspectionByLevel.some(r => r.value > 0);

  return (
    <div className="space-y-5">
        <PageHeader
          title="Bộ phận chất lượng"
          description="Quản lý và đảm bảo chất lượng sản phẩm, quy trình"
          icon={<ShieldCheck className="w-6 h-6 text-violet-500" />}
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Nhân viên" value={employeeTotal} sub={`Đang làm việc: ${employeeActive}`} icon={<Users className="w-4 h-4" />} tone="blue" to="/quality/personnel" />
          <KpiCard label="Quy trình" value={processTotal} sub="Tổng quy trình" icon={<Settings className="w-4 h-4" />} tone="green" to="/quality/process" />
          <KpiCard label="Đánh giá chất lượng" value={evalTotal} sub="Tổng đánh giá" icon={<ShieldCheck className="w-4 h-4" />} tone="purple" to="/quality/production" />
          <KpiCard label="Kiểm tra nội bộ" value={inspectionTotal} sub="Tổng kiểm tra" icon={<ClipboardList className="w-4 h-4" />} tone="orange" to="/quality/office" />
        </div>

        {/* Pie Charts — 200px height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
          <ChartCard title="Tỉ lệ thành phẩm trung bình">
            {hasAvgRatios ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={avgRatios} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}%`}>
                    {avgRatios.map((_, i) => (
                      <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <EmptyState message="Chưa có dữ liệu đánh giá" description="Dữ liệu tỉ lệ thành phẩm sẽ hiển thị khi có đánh giá chất lượng." />
              </div>
            )}
          </ChartCard>

          <ChartCard title="Phân bổ kiểm tra nội bộ theo mức độ">
            {hasInspectionByLevel ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={inspectionByLevel} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                    {inspectionByLevel.map((_, i) => (
                      <Cell key={i} fill={INSPECTION_COLORS[i % INSPECTION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <EmptyState message="Chưa có dữ liệu kiểm tra" description="Dữ liệu phân bổ kiểm tra sẽ hiển thị khi có bản ghi kiểm tra nội bộ." />
              </div>
            )}
          </ChartCard>
        </div>

        {/* Line Charts — 260px height */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Đánh giá chất lượng theo tháng" variant="dark">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evalByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name="Số đánh giá" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Kiểm tra nội bộ theo tháng" variant="dark">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={inspectionByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
                <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 4 }} activeDot={{ r: 6 }} name="Số kiểm tra" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

    </div>
  );
};

export default QualityManagement;
