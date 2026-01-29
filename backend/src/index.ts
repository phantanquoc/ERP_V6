import express, { Express } from 'express';
import cors from 'cors';
import { env } from '@config/env';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';
import authRoutes from '@routes/authRoutes';
import userRoutes from '@routes/userRoutes';
import employeeRoutes from '@routes/employeeRoutes';
import departmentRoutes from '@routes/departmentRoutes';
import positionRoutes from '@routes/positionRoutes';
import positionResponsibilityRoutes from '@routes/positionResponsibilityRoutes';
import positionLevelRoutes from '@routes/positionLevelRoutes';
import employeeEvaluationRoutes from '@routes/employeeEvaluationRoutes';
import payrollRoutes from '@routes/payrollRoutes';
import internalInspectionRoutes from '@routes/internalInspectionRoutes';
import attendanceRoutes from '@routes/attendanceRoutes';
import notificationRoutes from '@routes/notificationRoutes';
import internationalCustomerRoutes from '@routes/internationalCustomerRoutes';
import internationalProductRoutes from '@routes/internationalProductRoutes';
import quotationRequestRoutes from '@routes/quotationRequestRoutes';
import quotationRoutes from '@routes/quotationRoutes';
import materialStandardRoutes from '@routes/materialStandardRoutes';
import processRoutes from '@routes/processRoutes';
import productionProcessRoutes from '@routes/productionProcessRoutes';
import generalCostRoutes from '@routes/generalCostRoutes';
import exportCostRoutes from '@routes/exportCostRoutes';
import loginHistoryRoutes from '@routes/loginHistoryRoutes';
import quotationCalculatorRoutes from '@routes/quotationCalculatorRoutes';
import orderRoutes from '@routes/orderRoutes';
import taxReportRoutes from '@routes/taxReportRoutes';
import supplyRequestRoutes from '@routes/supplyRequestRoutes';
import warehouseRoutes from '@routes/warehouseRoutes';
import warehouseReceiptRoutes from '@routes/warehouseReceiptRoutes';
import warehouseIssueRoutes from '@routes/warehouseIssueRoutes';
import debtRoutes from '@routes/debtRoutes';
import machineActivityReportRoutes from '@routes/machineActivityReportRoutes';
import repairRequestRoutes from '@routes/repairRequestRoutes';
import machineSystemRoutes from '@routes/machineSystemRoutes';
import materialEvaluationRoutes from '@routes/materialEvaluationRoutes';
import materialEvaluationCriteriaRoutes from '@routes/materialEvaluationCriteriaRoutes';
import systemOperationRoutes from '@routes/systemOperationRoutes';
import machineRoutes from '@routes/machineRoutes';
import finishedProductRoutes from '@routes/finishedProductRoutes';
import qualityEvaluationRoutes from '@routes/qualityEvaluationRoutes';
import productionReportRoutes from '@routes/productionReportRoutes';
import dailyWorkReportRoutes from '@routes/dailyWorkReportRoutes';
import taskRoutes from '@routes/taskRoutes';
import privateFeedbackRoutes from '@routes/privateFeedbackRoutes';
import leaveRequestRoutes from '@routes/leaveRequestRoutes';
import customerFeedbackRoutes from '@routes/customerFeedbackRoutes';
import invoiceRoutes from '@routes/invoiceRoutes';
import purchaseRequestRoutes from '@routes/purchaseRequestRoutes';
import supplierRoutes from '@routes/supplierRoutes';
import acceptanceHandoverRoutes from '@routes/acceptanceHandoverRoutes';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/position-responsibilities', positionResponsibilityRoutes);
app.use('/api/position-levels', positionLevelRoutes);
app.use('/api/employee-evaluations', employeeEvaluationRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/internal-inspections', internalInspectionRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api', notificationRoutes);
app.use('/api/international-customers', internationalCustomerRoutes);
app.use('/api/international-products', internationalProductRoutes);
app.use('/api/quotation-requests', quotationRequestRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/material-standards', materialStandardRoutes);
app.use('/api/processes', processRoutes);
app.use('/api/production-processes', productionProcessRoutes);
app.use('/api/general-costs', generalCostRoutes);
app.use('/api/export-costs', exportCostRoutes);
app.use('/api/login-history', loginHistoryRoutes);
app.use('/api/quotation-calculators', quotationCalculatorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tax-reports', taxReportRoutes);
app.use('/api/supply-requests', supplyRequestRoutes);
app.use('/api', warehouseRoutes);
app.use('/api/warehouse-receipts', warehouseReceiptRoutes);
app.use('/api/warehouse-issues', warehouseIssueRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/machine-activity-reports', machineActivityReportRoutes);
app.use('/api/repair-requests', repairRequestRoutes);
app.use('/api/machine-systems', machineSystemRoutes);
app.use('/api/material-evaluations', materialEvaluationRoutes);
app.use('/api/material-evaluation-criteria', materialEvaluationCriteriaRoutes);
app.use('/api/system-operations', systemOperationRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/finished-products', finishedProductRoutes);
app.use('/api/quality-evaluations', qualityEvaluationRoutes);
app.use('/api/production-reports', productionReportRoutes);
app.use('/api/daily-work-reports', dailyWorkReportRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/private-feedbacks', privateFeedbackRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/customer-feedbacks', customerFeedbackRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/acceptance-handovers', acceptanceHandoverRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

export default app;

