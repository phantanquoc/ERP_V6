import ProjectList from '../../components/ProjectList';

const TechnicalProjects = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dự án</h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý dự án và công việc của phòng kỹ thuật</p>
      </div>
      <ProjectList />
    </div>
  );
};

export default TechnicalProjects;
