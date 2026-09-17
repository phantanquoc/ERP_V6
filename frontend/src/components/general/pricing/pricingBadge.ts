export function getPricingPriorityBadge(priority: string): { label: string; class: string } {
  const raw = String(priority ?? '').trim();
  const key = raw.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  // Khan cap / Khẩn cấp -> red
  if (key === 'khan cap' || key === 'khẩn cấp') {
    return { label: 'Khẩn cấp', class: 'bg-red-100 text-red-800' };
  }
  // Cao
  if (key === 'cao') {
    return { label: 'Cao', class: 'bg-red-100 text-red-800' };
  }
  // Trung binh / Trung bình
  if (key === 'trung binh' || key === 'trung bình') {
    return { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-800' };
  }
  // Thap / Thấp
  if (key === 'thap' || key === 'thấp') {
    return { label: 'Thấp', class: 'bg-gray-100 text-gray-700' };
  }
  // Explicit TRUNG_BINH normalized is "trung binh" already handled; fallback
  return { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-800' };
}

export function getPricingStatusBadge(status: string): { label: string; class: string } {
  const raw = String(status ?? '').trim();
  const key = raw.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  if (key === 'cho duyet' || key === 'chờ duyệt') {
    return { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-800' };
  }
  if (key === 'da duyet' || key === 'đã duyệt') {
    return { label: 'Đã duyệt', class: 'bg-green-100 text-green-800' };
  }
  if (key === 'tu choi' || key === 'từ chối') {
    return { label: 'Từ chối', class: 'bg-red-100 text-red-800' };
  }
  if (key === 'hoan thanh' || key === 'hoàn thành') {
    return { label: 'Hoàn thành', class: 'bg-blue-100 text-blue-700' };
  }
  if (key === 'huy' || key === 'hủy' || key === 'đã hủy' || key === 'da huy') {
    return { label: 'Hủy', class: 'bg-gray-100 text-gray-700' };
  }
  return { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-800' };
}
