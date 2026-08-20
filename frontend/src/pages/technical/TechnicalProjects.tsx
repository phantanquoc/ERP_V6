import { FolderKanban } from 'lucide-react';
import ProjectList from '../../components/ProjectList';
import PageHeader from '../../design-system/PageHeader';
import SectionCard from '../../design-system/SectionCard';

const TechnicalProjects = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Phòng phát triển"
        description="Quản lý dự án và công việc phát triển"
        icon={<FolderKanban className="w-6 h-6 text-cyan-500" />}
      />
      <SectionCard bodyClassName="">
        <ProjectList />
      </SectionCard>
    </div>
  );
};

export default TechnicalProjects;
