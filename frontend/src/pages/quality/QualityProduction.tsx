import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../design-system/PageHeader';
import { SectionCard } from '../../design-system/SectionCard';
import { EmptyState } from '../../design-system/States';

const QualityProduction = () => {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Chất lượng khối sản xuất"
        description="Quản lý chất lượng khối sản xuất"
        icon={<ShieldCheck className="w-6 h-6 text-violet-500" />}
      />
      <SectionCard>
        <EmptyState
          message="Chức năng đang được phát triển"
          description="Nội dung quản lý chất lượng khối sản xuất sẽ được hiển thị ở đây."
        />
      </SectionCard>
    </div>
  );
};

export default QualityProduction;
