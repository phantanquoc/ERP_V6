import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, icon, actions, breadcrumb }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 gap-y-2 mb-5">
    <div className="min-w-0">
      {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
      <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="line-clamp-2 break-words">{title}</span>
      </h1>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
    {actions && <div className="shrink-0 flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export default PageHeader;
