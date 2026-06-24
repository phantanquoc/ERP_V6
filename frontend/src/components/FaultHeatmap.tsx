import { useFaultHeatmap } from '../hooks/useFaultRecords';

interface FaultHeatmapProps {
  machineSystemId?: string;
  enabled?: boolean;
}

const FaultHeatmap = ({ machineSystemId, enabled = true }: FaultHeatmapProps) => {
  const { data, isLoading } = useFaultHeatmap(machineSystemId, { enabled });

  if (!enabled) return null;

  if (isLoading) {
    return (
      <div className="h-24 animate-pulse rounded bg-gray-100" />
    );
  }

  const cells = data?.data ?? [];

  if (cells.length === 0) {
    return (
      <p className="text-sm text-gray-400">Chưa có dữ liệu bản đồ nhiệt.</p>
    );
  }

  // Collect unique machines (rows) and fault templates (columns)
  const machineMap = new Map<string, string>(); // id → tenHeThong
  const templateMap = new Map<string, string>(); // id → tenMauLoi
  for (const cell of cells) {
    machineMap.set(cell.machineSystemId, cell.tenHeThong);
    templateMap.set(cell.faultTemplateId, cell.tenMauLoi);
  }

  const machines = Array.from(machineMap.entries()); // [id, name]
  const templates = Array.from(templateMap.entries()); // [id, name]

  // Build lookup: `${machineId}::${templateId}` → count
  const lookup = new Map<string, number>();
  for (const cell of cells) {
    lookup.set(`${cell.machineSystemId}::${cell.faultTemplateId}`, cell.count);
  }

  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  const intensity = (count: number | undefined): string => {
    if (!count) return 'bg-gray-50 text-gray-300';
    const ratio = count / maxCount;
    if (ratio >= 0.75) return 'bg-red-500 text-white';
    if (ratio >= 0.5) return 'bg-orange-400 text-white';
    if (ratio >= 0.25) return 'bg-yellow-300 text-gray-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-max text-xs border-collapse">
        <thead>
          <tr>
            {/* empty corner */}
            <th className="w-32 min-w-[8rem] px-2 py-1.5 text-left font-medium text-gray-500 border border-gray-200 bg-gray-50">Hệ thống \ Mẫu lỗi</th>
            {templates.map(([tid, name]) => (
              <th
                key={tid}
                className="px-2 py-1.5 font-medium text-gray-600 border border-gray-200 bg-gray-50 max-w-[100px] truncate"
                title={name}
              >
                {name.length > 12 ? `${name.slice(0, 12)}…` : name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {machines.map(([mid, mName]) => (
            <tr key={mid}>
              <td className="px-2 py-1.5 font-medium text-gray-700 border border-gray-200 bg-gray-50 max-w-[8rem] truncate" title={mName}>
                {mName.length > 16 ? `${mName.slice(0, 16)}…` : mName}
              </td>
              {templates.map(([tid]) => {
                const count = lookup.get(`${mid}::${tid}`);
                return (
                  <td
                    key={tid}
                    className={`px-2 py-1.5 text-center border border-gray-200 font-medium ${intensity(count)}`}
                    title={count ? `${count} lần` : undefined}
                  >
                    {count ?? ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-gray-400">
        Màu đậm hơn = nhiều lỗi hơn. Tối đa 10 hệ thống × 10 mẫu lỗi.
      </p>
    </div>
  );
};

export default FaultHeatmap;
