import { Express } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '@config/logger';

// Explicit route path mapping: filename (without "Routes.ts") → API path
const ROUTE_MAP: Record<string, string> = {
  auth: '/api/auth',
  user: '/api/users',
  employee: '/api/employees',
  department: '/api/departments',
  position: '/api/positions',
  positionResponsibility: '/api/position-responsibilities',
  positionLevel: '/api/position-levels',
  employeeEvaluation: '/api/employee-evaluations',
  payroll: '/api/payrolls',
  internalInspection: '/api/internal-inspections',
  attendance: '/api/attendances',
  notification: '/api/notifications',
  internationalCustomer: '/api/international-customers',
  internationalProduct: '/api/international-products',
  quotationRequest: '/api/quotation-requests',
  quotation: '/api/quotations',
  materialStandard: '/api/material-standards',
  process: '/api/processes',
  productionProcess: '/api/production-processes',
  generalCost: '/api/general-costs',
  exportCost: '/api/export-costs',
  loginHistory: '/api/login-history',
  quotationCalculator: '/api/quotation-calculators',
  order: '/api/orders',
  taxReport: '/api/tax-reports',
  supplyRequest: '/api/supply-requests',
  warehouse: '/api/warehouses',
  lot: '/api/lots',
  lotProduct: '/api/lot-products',
  warehouseReceipt: '/api/warehouse-receipts',
  warehouseIssue: '/api/warehouse-issues',
  debt: '/api/debts',
  machineActivityReport: '/api/machine-activity-reports',
  repairRequest: '/api/repair-requests',
  machineSystem: '/api/machine-systems',
  materialEvaluation: '/api/material-evaluations',
  materialEvaluationCriteria: '/api/material-evaluation-criteria',
  systemOperation: '/api/system-operations',
  machine: '/api/machines',
  finishedProduct: '/api/finished-products',
  qualityEvaluation: '/api/quality-evaluations',
  productionReport: '/api/production-reports',
  dailyWorkReport: '/api/daily-work-reports',
  task: '/api/tasks',
  workPlan: '/api/work-plans',
  privateFeedback: '/api/private-feedbacks',
  leaveRequest: '/api/leave-requests',
  customerFeedback: '/api/customer-feedbacks',
  invoice: '/api/invoices',
  purchaseRequest: '/api/purchase-requests',
  supplier: '/api/suppliers',
  acceptanceHandover: '/api/acceptance-handovers',
  workShift: '/api/work-shifts',
};

export const registerRoutes = (app: Express): void => {
  const routesDir = __dirname;
  const files = fs.readdirSync(routesDir).filter(
    (file) => file.endsWith('Routes.ts') || file.endsWith('Routes.js')
  );

  let registered = 0;

  for (const file of files) {
    const routeName = file.replace(/Routes\.(ts|js)$/, '');
    const apiPath = ROUTE_MAP[routeName];

    if (!apiPath) {
      logger.warn(`No route mapping found for: ${file}, skipping`);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const routeModule = require(path.join(routesDir, file));
    const router = routeModule.default || routeModule;
    app.use(apiPath, router);
    registered++;
  }

  logger.info(`Registered ${registered} API routes`);
};

