/**
 * Seed tiêu chí đánh giá theo vị trí (position_responsibilities)
 * Chạy: npx ts-node --transpile-only prisma/seed-position-responsibilities.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tiêu chí theo mã vị trí — weight tổng = 100 mỗi vị trí
const RESPONSIBILITIES_BY_CODE: Record<
  string,
  { title: string; description: string; weight: number }[]
> = {
  // Giám đốc
  POS_001: [
    { title: 'Lãnh đạo chiến lược', description: 'Định hướng chiến lược phát triển công ty dài hạn', weight: 30 },
    { title: 'Quản lý tài chính', description: 'Giám sát ngân sách, doanh thu và lợi nhuận toàn công ty', weight: 25 },
    { title: 'Phát triển kinh doanh', description: 'Mở rộng thị trường, xây dựng đối tác chiến lược', weight: 20 },
    { title: 'Quản lý nhân sự cấp cao', description: 'Tuyển dụng, phát triển đội ngũ lãnh đạo', weight: 15 },
    { title: 'Tuân thủ pháp lý', description: 'Đảm bảo công ty tuân thủ các quy định pháp luật', weight: 10 },
  ],
  // Phó Giám đốc
  POS_002: [
    { title: 'Hỗ trợ điều hành', description: 'Hỗ trợ Giám đốc trong điều hành hoạt động hàng ngày', weight: 30 },
    { title: 'Quản lý dự án lớn', description: 'Chủ trì các dự án chiến lược quan trọng', weight: 25 },
    { title: 'Phối hợp liên phòng', description: 'Điều phối hoạt động giữa các phòng ban', weight: 20 },
    { title: 'Báo cáo quản trị', description: 'Chuẩn bị báo cáo định kỳ cho Ban Giám đốc', weight: 15 },
    { title: 'Đại diện công ty', description: 'Đại diện công ty trong các cuộc họp và sự kiện', weight: 10 },
  ],
  // Trưởng phòng
  POS_003: [
    { title: 'Quản lý phòng ban', description: 'Điều phối công việc và quản lý nhân sự trong phòng', weight: 30 },
    { title: 'Thực hiện KPI phòng', description: 'Đảm bảo phòng ban hoàn thành chỉ tiêu đề ra', weight: 25 },
    { title: 'Phát triển nhân viên', description: 'Đào tạo và nâng cao năng lực cho nhân viên', weight: 20 },
    { title: 'Báo cáo lên cấp trên', description: 'Cung cấp báo cáo định kỳ cho Ban Giám đốc', weight: 15 },
    { title: 'Cải tiến quy trình', description: 'Đề xuất và triển khai cải tiến quy trình làm việc', weight: 10 },
  ],
  // Phó Trưởng phòng
  POS_004: [
    { title: 'Hỗ trợ trưởng phòng', description: 'Hỗ trợ trưởng phòng trong quản lý công việc hàng ngày', weight: 30 },
    { title: 'Theo dõi tiến độ', description: 'Giám sát tiến độ công việc của từng nhân viên', weight: 25 },
    { title: 'Giải quyết vấn đề', description: 'Xử lý các vướng mắc phát sinh trong phòng', weight: 20 },
    { title: 'Đào tạo nội bộ', description: 'Tổ chức các buổi chia sẻ kiến thức trong phòng', weight: 15 },
    { title: 'Phối hợp liên phòng', description: 'Làm cầu nối giữa phòng và các phòng ban khác', weight: 10 },
  ],
  // Nhân viên chính thức
  POS_005: [
    { title: 'Hoàn thành công việc được giao', description: 'Thực hiện đầy đủ nhiệm vụ trong phạm vi trách nhiệm', weight: 35 },
    { title: 'Chất lượng công việc', description: 'Đảm bảo chất lượng và độ chính xác của công việc', weight: 30 },
    { title: 'Tinh thần làm việc', description: 'Thái độ tích cực, hợp tác tốt với đồng nghiệp', weight: 20 },
    { title: 'Tuân thủ nội quy', description: 'Chấp hành đúng giờ giấc và quy định của công ty', weight: 15 },
  ],
  // Nhân viên thử việc
  POS_006: [
    { title: 'Học hỏi và thích nghi', description: 'Nhanh chóng nắm bắt quy trình và công việc mới', weight: 35 },
    { title: 'Hoàn thành nhiệm vụ', description: 'Thực hiện đúng và đủ các nhiệm vụ được giao', weight: 30 },
    { title: 'Tinh thần chủ động', description: 'Chủ động hỏi han, học hỏi và đề xuất ý kiến', weight: 20 },
    { title: 'Tuân thủ kỷ luật', description: 'Chấp hành nội quy, giờ giấc và quy định công ty', weight: 15 },
  ],
  // Kỹ sư chất lượng
  POS_007: [
    { title: 'Kiểm soát chất lượng sản phẩm', description: 'Kiểm tra và đảm bảo chất lượng sản phẩm sấy khô đúng tiêu chuẩn', weight: 30 },
    { title: 'Xây dựng tiêu chuẩn chất lượng', description: 'Phát triển và cập nhật tiêu chuẩn chất lượng cho từng loại sản phẩm', weight: 25 },
    { title: 'Xử lý sản phẩm không đạt', description: 'Phân tích nguyên nhân và xử lý các lô sản phẩm không đạt chuẩn', weight: 20 },
    { title: 'Audit nội bộ', description: 'Thực hiện kiểm tra nội bộ về quy trình đảm bảo chất lượng', weight: 15 },
    { title: 'Báo cáo chất lượng', description: 'Lập báo cáo chất lượng định kỳ và cải tiến liên tục', weight: 10 },
  ],
  // Kỹ sư sản xuất
  POS_008: [
    { title: 'Quản lý quy trình sản xuất', description: 'Giám sát và tối ưu hóa quy trình sấy khô trái cây', weight: 30 },
    { title: 'Năng suất sản xuất', description: 'Đảm bảo sản lượng đạt mục tiêu kế hoạch', weight: 25 },
    { title: 'Tiết kiệm nguyên liệu', description: 'Tối ưu tỉ lệ sử dụng nguyên liệu, giảm hao phí', weight: 20 },
    { title: 'An toàn lao động', description: 'Đảm bảo an toàn trong quá trình vận hành máy móc', weight: 15 },
    { title: 'Cải tiến quy trình', description: 'Đề xuất cải tiến quy trình để tăng hiệu quả sản xuất', weight: 10 },
  ],
  // Kỹ sư cơ khí
  POS_009: [
    { title: 'Bảo trì thiết bị cơ khí', description: 'Bảo trì định kỳ và sửa chữa các thiết bị cơ khí trong nhà máy', weight: 30 },
    { title: 'Thiết kế cải tiến', description: 'Thiết kế và cải tiến cơ cấu cơ khí tăng hiệu suất', weight: 25 },
    { title: 'Quản lý phụ tùng thay thế', description: 'Quản lý kho phụ tùng và lên kế hoạch mua sắm', weight: 20 },
    { title: 'An toàn thiết bị', description: 'Đảm bảo thiết bị hoạt động an toàn và đúng tiêu chuẩn', weight: 15 },
    { title: 'Ghi chép kỹ thuật', description: 'Lập hồ sơ kỹ thuật và nhật ký bảo trì thiết bị', weight: 10 },
  ],
  // Kỹ sư điện
  POS_010: [
    { title: 'Bảo trì hệ thống điện', description: 'Bảo trì và sửa chữa hệ thống điện trong toàn nhà máy', weight: 30 },
    { title: 'An toàn điện', description: 'Đảm bảo hệ thống điện đạt tiêu chuẩn an toàn', weight: 25 },
    { title: 'Hệ thống điều khiển', description: 'Vận hành và lập trình hệ thống điều khiển tự động', weight: 20 },
    { title: 'Tiết kiệm điện năng', description: 'Theo dõi và tối ưu tiêu thụ điện năng', weight: 15 },
    { title: 'Hồ sơ kỹ thuật điện', description: 'Cập nhật sơ đồ điện và hồ sơ thiết bị điện', weight: 10 },
  ],
  // Kỹ sư phần mềm
  POS_011: [
    { title: 'Phát triển tính năng mới', description: 'Thiết kế và lập trình các tính năng mới theo yêu cầu nghiệp vụ', weight: 35 },
    { title: 'Chất lượng code', description: 'Viết code sạch, có unit test và tuân theo chuẩn coding', weight: 25 },
    { title: 'Review code', description: 'Review code của đồng nghiệp và đưa ra nhận xét xây dựng', weight: 20 },
    { title: 'Xử lý bug', description: 'Phân tích và sửa lỗi kịp thời, đảm bảo hệ thống ổn định', weight: 20 },
  ],
  // Lập trình viên
  POS_012: [
    { title: 'Thực hiện task lập trình', description: 'Hoàn thành các task lập trình được giao đúng tiến độ', weight: 35 },
    { title: 'Chất lượng code', description: 'Đảm bảo code rõ ràng, dễ đọc và ít bug', weight: 30 },
    { title: 'Học hỏi công nghệ mới', description: 'Chủ động học hỏi và áp dụng công nghệ phù hợp', weight: 20 },
    { title: 'Hợp tác nhóm', description: 'Làm việc tốt với các thành viên trong nhóm phát triển', weight: 15 },
  ],
  // Nhân viên IT
  POS_013: [
    { title: 'Hỗ trợ kỹ thuật', description: 'Hỗ trợ và giải quyết sự cố kỹ thuật cho người dùng nội bộ', weight: 35 },
    { title: 'Quản lý hạ tầng IT', description: 'Duy trì và quản lý máy chủ, mạng và thiết bị IT', weight: 25 },
    { title: 'Bảo mật hệ thống', description: 'Thực thi các biện pháp bảo mật và phòng chống xâm nhập', weight: 20 },
    { title: 'Backup dữ liệu', description: 'Đảm bảo dữ liệu được sao lưu định kỳ và an toàn', weight: 20 },
  ],
  // Quản lý dự án
  POS_014: [
    { title: 'Lập kế hoạch dự án', description: 'Xây dựng kế hoạch, timeline và phân công nguồn lực', weight: 25 },
    { title: 'Theo dõi tiến độ', description: 'Giám sát tiến độ, phát hiện rủi ro và điều chỉnh kịp thời', weight: 25 },
    { title: 'Quản lý ngân sách', description: 'Kiểm soát chi phí dự án trong phạm vi ngân sách duyệt', weight: 20 },
    { title: 'Giao tiếp với stakeholder', description: 'Báo cáo tiến độ và quản lý kỳ vọng của các bên liên quan', weight: 15 },
    { title: 'Chất lượng đầu ra', description: 'Đảm bảo sản phẩm bàn giao đáp ứng yêu cầu chất lượng', weight: 15 },
  ],
  // Nhân viên kinh doanh
  POS_015: [
    { title: 'Tìm kiếm khách hàng mới', description: 'Phát triển và mở rộng tệp khách hàng tiềm năng', weight: 30 },
    { title: 'Đạt chỉ tiêu doanh số', description: 'Hoàn thành chỉ tiêu doanh số được giao hàng tháng', weight: 30 },
    { title: 'Chăm sóc khách hàng', description: 'Duy trì quan hệ tốt và giải quyết khiếu nại khách hàng', weight: 20 },
    { title: 'Báo cáo kinh doanh', description: 'Nộp báo cáo hoạt động kinh doanh định kỳ', weight: 20 },
  ],
  // Nhân viên bán hàng
  POS_016: [
    { title: 'Doanh số bán hàng', description: 'Đạt hoặc vượt chỉ tiêu doanh số được giao', weight: 35 },
    { title: 'Tư vấn sản phẩm', description: 'Tư vấn chính xác thông tin sản phẩm cho khách hàng', weight: 25 },
    { title: 'Chăm sóc hậu mãi', description: 'Theo dõi và hỗ trợ khách hàng sau bán hàng', weight: 20 },
    { title: 'Quản lý đơn hàng', description: 'Xử lý đơn hàng chính xác và đúng thời hạn', weight: 20 },
  ],
  // Nhân viên marketing
  POS_017: [
    { title: 'Triển khai chiến dịch marketing', description: 'Lên kế hoạch và thực hiện các chiến dịch quảng bá sản phẩm', weight: 30 },
    { title: 'Quản lý nội dung số', description: 'Sản xuất và quản lý nội dung trên các kênh truyền thông', weight: 25 },
    { title: 'Phân tích hiệu quả', description: 'Theo dõi và báo cáo hiệu quả các hoạt động marketing', weight: 20 },
    { title: 'Phối hợp với sales', description: 'Hỗ trợ đội ngũ bán hàng với tài liệu và công cụ marketing', weight: 15 },
    { title: 'Nghiên cứu thị trường', description: 'Theo dõi xu hướng thị trường và đối thủ cạnh tranh', weight: 10 },
  ],
  // Nhân viên kế toán
  POS_018: [
    { title: 'Hạch toán kế toán', description: 'Ghi chép và hạch toán các nghiệp vụ kế toán chính xác', weight: 35 },
    { title: 'Lập báo cáo tài chính', description: 'Chuẩn bị báo cáo tài chính định kỳ theo quy định', weight: 25 },
    { title: 'Quản lý công nợ', description: 'Theo dõi và đối chiếu công nợ phải thu, phải trả', weight: 20 },
    { title: 'Tuân thủ thuế', description: 'Kê khai thuế đúng hạn và đúng quy định pháp luật', weight: 20 },
  ],
  // Kế toán trưởng
  POS_019: [
    { title: 'Quản lý tài chính', description: 'Giám sát tài chính, dòng tiền và báo cáo tài chính công ty', weight: 30 },
    { title: 'Tuân thủ chuẩn mực kế toán', description: 'Đảm bảo mọi ghi nhận kế toán tuân thủ chuẩn mực VAS', weight: 25 },
    { title: 'Quản lý đội kế toán', description: 'Hướng dẫn và kiểm tra công việc của nhân viên kế toán', weight: 20 },
    { title: 'Kiểm soát thuế', description: 'Đảm bảo tuân thủ nghĩa vụ thuế và các quy định tài chính', weight: 15 },
    { title: 'Tư vấn tài chính', description: 'Tư vấn Ban Giám đốc về các quyết định tài chính', weight: 10 },
  ],
  // Nhân viên thu mua
  POS_020: [
    { title: 'Tìm kiếm nhà cung cấp', description: 'Tìm kiếm và đánh giá nhà cung cấp nguyên liệu phù hợp', weight: 25 },
    { title: 'Đàm phán hợp đồng', description: 'Thương lượng giá và điều khoản hợp đồng mua hàng', weight: 25 },
    { title: 'Quản lý đơn mua hàng', description: 'Xử lý và theo dõi tiến độ các đơn đặt hàng', weight: 25 },
    { title: 'Kiểm soát chất lượng đầu vào', description: 'Phối hợp kiểm tra chất lượng nguyên liệu nhập về', weight: 15 },
    { title: 'Báo cáo mua hàng', description: 'Lập báo cáo tình hình mua hàng định kỳ', weight: 10 },
  ],
  // Nhân viên QC
  POS_QC_STAFF: [
    { title: 'Kiểm tra chất lượng nguyên liệu', description: 'Kiểm tra và đánh giá chất lượng nguyên liệu trái cây đầu vào', weight: 30 },
    { title: 'Kiểm tra chất lượng thành phẩm', description: 'Kiểm tra chất lượng sản phẩm sấy khô trước khi đóng gói', weight: 30 },
    { title: 'Ghi chép nhật ký QC', description: 'Ghi đầy đủ nhật ký kiểm tra chất lượng theo quy định', weight: 20 },
    { title: 'Báo cáo lỗi sản phẩm', description: 'Phát hiện và báo cáo kịp thời các vấn đề chất lượng', weight: 20 },
  ],
};

async function main(): Promise<void> {
  console.log('🌱 Seeding position responsibilities...\n');

  const positions = await prisma.position.findMany({ select: { id: true, code: true, name: true } });
  console.log(`Found ${positions.length} positions`);

  let totalCreated = 0;

  for (const position of positions) {
    const responsibilitiesData = RESPONSIBILITIES_BY_CODE[position.code];
    if (!responsibilitiesData) {
      console.log(`  ⚠️  No responsibilities defined for ${position.name} (${position.code}) — skipping`);
      continue;
    }

    // Check if already seeded
    const existing = await prisma.positionResponsibility.count({ where: { positionId: position.id } });
    if (existing > 0) {
      console.log(`  ✓  ${position.name}: already has ${existing} responsibilities — skipping`);
      continue;
    }

    await prisma.positionResponsibility.createMany({
      data: responsibilitiesData.map(r => ({
        positionId: position.id,
        title: r.title,
        description: r.description,
        weight: r.weight,
      })),
    });

    totalCreated += responsibilitiesData.length;
    console.log(`  ✅ ${position.name}: created ${responsibilitiesData.length} responsibilities`);
  }

  console.log(`\n✅ Done: ${totalCreated} responsibilities created`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
