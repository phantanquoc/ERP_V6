import { Users, ClipboardList, Factory, Truck } from 'lucide-react';
import { PageHeader } from '../../design-system/PageHeader';
import { SectionCard } from '../../design-system/SectionCard';
import { EmptyState } from '../../design-system/States';

const GeneralPartners = () => {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Phòng chăm sóc đối tác"
        description="Quản lý khách hàng, nhà cung cấp và dịch vụ logistics"
        icon={<Users className="w-6 h-6 text-blue-600" aria-hidden="true" />}
      />

      <SectionCard>
        <EmptyState
          message="Chưa có dữ liệu đối tác"
          description="Chức năng quản lý đối tác đang được hoàn thiện và sẽ sớm ra mắt. Hệ thống sẽ hỗ trợ quản lý khách hàng, nhà cung cấp và đối tác logistics trên cùng một giao diện tập trung."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto mt-2">
          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-2.5">
              <ClipboardList className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700">Khách hàng</p>
            <p className="text-xs text-gray-500 mt-1">Quản lý thông tin và lịch sử giao dịch</p>
          </div>

          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-2.5">
              <Factory className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700">Nhà cung cấp</p>
            <p className="text-xs text-gray-500 mt-1">Quản lý nhà cung cấp nguyên liệu</p>
          </div>

          <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-2.5">
              <Truck className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-700">Logistics</p>
            <p className="text-xs text-gray-500 mt-1">Quản lý đối tác vận chuyển</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default GeneralPartners;
