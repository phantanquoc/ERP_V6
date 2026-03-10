import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '@config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ERP System API',
      version: '1.0.0',
      description: 'API documentation cho hệ thống ERP - Quản lý doanh nghiệp sản xuất',
      contact: {
        name: 'ERP Team',
      },
    },
    servers: [
      {
        url: env.API_URL,
        description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT token. Ví dụ: "eyJhbGciOiJIUzI1NiIs..."',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Lỗi xảy ra' },
            error: { type: 'string' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 100 },
                totalPages: { type: 'integer', example: 10 },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Xác thực & Đăng nhập' },
      { name: 'Users', description: 'Quản lý tài khoản người dùng' },
      { name: 'Employees', description: 'Quản lý nhân viên' },
      { name: 'Departments', description: 'Quản lý phòng ban' },
      { name: 'Positions', description: 'Quản lý chức vụ' },
      { name: 'Position Responsibilities', description: 'Quản lý trách nhiệm chức vụ' },
      { name: 'Position Levels', description: 'Quản lý cấp bậc chức vụ' },
      { name: 'Employee Evaluations', description: 'Đánh giá nhân viên' },
      { name: 'Payrolls', description: 'Quản lý bảng lương' },
      { name: 'Attendances', description: 'Quản lý chấm công' },
      { name: 'Leave Requests', description: 'Quản lý nghỉ phép' },
      { name: 'Notifications', description: 'Hệ thống thông báo' },
      { name: 'Login History', description: 'Lịch sử đăng nhập' },
      { name: 'Daily Work Reports', description: 'Báo cáo công việc hàng ngày' },
      { name: 'Tasks', description: 'Quản lý nhiệm vụ' },
      { name: 'Work Plans', description: 'Kế hoạch công việc' },
      { name: 'Private Feedbacks', description: 'Góp ý riêng' },
      { name: 'Internal Inspections', description: 'Kiểm tra nội bộ (Chất lượng)' },
      { name: 'Material Standards', description: 'Tiêu chuẩn vật liệu (Chất lượng)' },
      { name: 'Material Evaluations', description: 'Đánh giá vật liệu (Chất lượng)' },
      { name: 'Material Evaluation Criteria', description: 'Tiêu chí đánh giá vật liệu' },
      { name: 'Processes', description: 'Quản lý quy trình (Chất lượng)' },
      { name: 'Production Processes', description: 'Quy trình sản xuất (Chất lượng)' },
      { name: 'Quality Evaluations', description: 'Đánh giá chất lượng' },
      { name: 'System Operations', description: 'Thông số vận hành' },
      { name: 'International Customers', description: 'Khách hàng quốc tế (Kinh doanh)' },
      { name: 'International Products', description: 'Sản phẩm quốc tế (Kinh doanh)' },
      { name: 'Quotation Requests', description: 'Yêu cầu báo giá (Kinh doanh)' },
      { name: 'Quotations', description: 'Báo giá (Kinh doanh)' },
      { name: 'Quotation Calculators', description: 'Tính giá (Kinh doanh)' },
      { name: 'Orders', description: 'Quản lý đơn hàng (Kinh doanh)' },
      { name: 'Customer Feedbacks', description: 'Phản hồi khách hàng (Kinh doanh)' },
      { name: 'Invoices', description: 'Quản lý hóa đơn (Kế toán)' },
      { name: 'Debts', description: 'Quản lý công nợ (Kế toán)' },
      { name: 'Tax Reports', description: 'Báo cáo thuế (Kế toán)' },
      { name: 'General Costs', description: 'Chi phí chung (Kế toán)' },
      { name: 'Export Costs', description: 'Chi phí xuất khẩu (Kế toán)' },
      { name: 'Purchase Requests', description: 'Yêu cầu mua hàng (Mua hàng)' },
      { name: 'Suppliers', description: 'Quản lý nhà cung cấp (Mua hàng)' },
      { name: 'Supply Requests', description: 'Yêu cầu cung ứng (Mua hàng)' },
      { name: 'Production Reports', description: 'Báo cáo sản xuất' },
      { name: 'Finished Products', description: 'Sản phẩm hoàn thành (Sản xuất)' },
      { name: 'Warehouses', description: 'Quản lý kho (Sản xuất)' },
      { name: 'Warehouse Receipts', description: 'Phiếu nhập kho (Sản xuất)' },
      { name: 'Warehouse Issues', description: 'Phiếu xuất kho (Sản xuất)' },
      { name: 'Lots', description: 'Quản lý lô hàng (Sản xuất)' },
      { name: 'Lot Products', description: 'Sản phẩm trong lô (Sản xuất)' },
      { name: 'Machines', description: 'Quản lý máy móc (Kỹ thuật)' },
      { name: 'Machine Activity Reports', description: 'Báo cáo hoạt động máy (Kỹ thuật)' },
      { name: 'Machine Systems', description: 'Hệ thống máy (Kỹ thuật)' },
      { name: 'Repair Requests', description: 'Yêu cầu sửa chữa (Kỹ thuật)' },
      { name: 'Acceptance Handovers', description: 'Nghiệm thu bàn giao (Kỹ thuật)' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

