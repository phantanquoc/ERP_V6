import React from 'react';
import { shell, typography } from './tokens';

interface SectionCardProps {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** When false, removes outer p-3 sm:p-4 so tables/lists can be edge-to-edge; use bodyClassName to control inner padding. Default true. */
  padded?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  action,
  children,
  className = '',
  bodyClassName = '',
  padded = true,
}) => (
  <div className={`${shell.card} ${padded ? 'p-3 sm:p-4' : ''} ${className}`}>
    {(title || action || icon) && (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          {title && <h3 className={typography.sectionTitle}>{title}</h3>}
        </div>
        {action}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </div>
);

export default SectionCard;
