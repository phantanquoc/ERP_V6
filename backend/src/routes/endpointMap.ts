/**
 * Resource → API endpoint(s) map.
 *
 * Derived from ROUTE_MAP in routes/index.ts so the permission UI can show
 * WHICH HTTP paths a resource governs. Kept in its own module to avoid a
 * circular import (routes/index.ts imports controllers which import services).
 *
 * Keys are `Resource.code` (auth.resources). Values are the base paths;
 * sub-paths (/:id, /export/excel, …) are implied.
 */
export const RESOURCE_ENDPOINTS: Record<string, string[]> = {
  // system
  'auth': ['/api/auth'],
  'users': ['/api/users'],
  'notifications': ['/api/notifications'],
  'login-history': ['/api/login-history'],
  'audit-logs': ['/api/audit-logs'],
  'docs': ['/api/docs'],
  'system-settings': ['/api/system-settings'],
  'private-feedbacks': ['/api/private-feedbacks'],
  'lookups': ['/api/lookups'],
  'rules': ['/api/rules'],
  'kiosk': ['/api/kiosk'],
  'data-entry-page-positions': ['/api/data-entry-page-positions'],
  // hr
  'employees': ['/api/employees'],
  'departments': ['/api/departments'],
  'positions': ['/api/positions'],
  'position-responsibilities': ['/api/position-responsibilities'],
  'position-levels': ['/api/position-levels'],
  'employee-evaluations': ['/api/employee-evaluations'],
  'payrolls': ['/api/payrolls'],
  'attendances': ['/api/attendances'],
  'attendance-codes': ['/api/attendance-codes'],
  'holidays': ['/api/holidays'],
  'timesheet': ['/api/timesheet'],
  'work-shifts': ['/api/work-shifts'],
  'overtime-plans': ['/api/overtime-plans'],
  'face-attendance': ['/api/face-attendance'],
  'leave-requests': ['/api/leave-requests'],
  // quality
  'internal-inspections': ['/api/internal-inspections'],
  // production
  'material-standards': ['/api/material-standards'],
  'processes': ['/api/processes'],
  'process-types': ['/api/process-types'],
  'production-processes': ['/api/production-processes'],
  'system-operations': ['/api/system-operations'],
  'material-evaluations': ['/api/material-evaluations'],
  'material-evaluation-criteria': ['/api/material-evaluation-criteria'],
  'finished-products': ['/api/finished-products'],
  'quality-evaluations': ['/api/quality-evaluations'],
  'production-reports': ['/api/production-reports'],
  // finance
  'general-costs': ['/api/general-costs'],
  'export-costs': ['/api/export-costs'],
  'invoices': ['/api/invoices'],
  'debts': ['/api/debts'],
  'tax-reports': ['/api/tax-reports'],
  'pricing-overview': ['/api/pricing/overview'],
  // business
  'orders': ['/api/orders'],
  'international-customers': ['/api/international-customers'],
  'international-products': ['/api/international-products'],
  'quotation-requests': ['/api/quotation-requests'],
  'quotations': ['/api/quotations'],
  'quotation-calculators': ['/api/quotation-calculators'],
  'customer-feedbacks': ['/api/customer-feedbacks'],
  // purchasing
  'supply-requests': ['/api/supply-requests'],
  'purchase-requests': ['/api/purchase-requests'],
  'suppliers': ['/api/suppliers'],
  // warehouse
  'warehouses': ['/api/warehouses'],
  'lots': ['/api/lots'],
  'lot-products': ['/api/lot-products'],
  'warehouse-receipts': ['/api/warehouse-receipts'],
  'warehouse-issues': ['/api/warehouse-issues'],
  'warehouse-stock': ['/api/warehouse-stock'],
  'inventory': ['/api/inventory'],
  'reorder-rules': ['/api/reorder-rules'],
  // technical
  'machine-status-logs': ['/api/machine-status-logs'],
  'repair-requests': ['/api/repair-requests'],
  'machine-systems': ['/api/machine-systems'],
  'machine-system-details': ['/api/machine-system-details'],
  'fault-templates': ['/api/fault-templates'],
  'fault-records': ['/api/fault-records'],
  'maintenance-templates': ['/api/maintenance-templates'],
  'maintenance-plans': ['/api/maintenance-plans'],
  'maintenance-records': ['/api/maintenance-records'],
  'spare-parts': ['/api/spare-parts'],
  'acceptance-handovers': ['/api/acceptance-handovers'],
  'technical-summary': ['/api/technical-summary'],
  // project
  'daily-work-reports': ['/api/daily-work-reports'],
  'tasks': ['/api/tasks'],
  'work-plans': ['/api/work-plans'],
  'projects': ['/api/projects'],
};

/** Vietnamese label per resource group (for the permission grid section headers). */
export const GROUP_LABELS: Record<string, string> = {
  system: 'Hệ thống',
  hr: 'Nhân sự',
  quality: 'Chất lượng',
  production: 'Sản xuất',
  finance: 'Tài chính',
  business: 'Kinh doanh',
  purchasing: 'Thu mua',
  warehouse: 'Kho',
  technical: 'Kỹ thuật',
  project: 'Dự án & Công việc',
};

export function endpointsFor(resourceCode: string): string[] {
  return RESOURCE_ENDPOINTS[resourceCode] ?? [];
}
