import React from 'react';
import { Link } from 'react-router-dom';
import { shell } from './tokens';

/**
 * ChartCard — styled container for chart content.
 *
 * Expected chart heights (set by the consumer via ResponsiveContainer):
 * - donut: 200px
 * - line: 260px
 *
 * ChartCard itself does NOT set a hardcoded height; height is controlled
 * by the consumer's ResponsiveContainer so all charts stay consistent.
 */
interface ChartCardProps {
  title: string;
  to?: string;
  action?: React.ReactNode;
  variant?: 'light' | 'dark';
  children: React.ReactNode;
  className?: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  to,
  action,
  variant = 'light',
  children,
  className = '',
  headingLevel = 'h3',
}) => {
  const titleId = React.useId();
  const headingId = `${titleId}-title`;
  const Heading = headingLevel as 'h2' | 'h3' | 'h4';

  const titleNode = to ? (
    <Link to={to} className={variant === 'dark' ? 'hover:text-cyan-300 transition-colors' : 'hover:text-blue-600 transition-colors'}>
      {title}
    </Link>
  ) : (
    title
  );

  if (variant === 'dark') {
    return (
      <div role="region" aria-labelledby={headingId} className={`${shell.chartCardDark} ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <Heading id={headingId} className="text-sm font-semibold text-white">
            {titleNode}
          </Heading>
          {action}
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">{children}</div>
      </div>
    );
  }
  return (
    <div role="region" aria-labelledby={headingId} className={`${shell.chartCard} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Heading id={headingId} className="text-sm font-semibold text-gray-700">
          {titleNode}
        </Heading>
        {action}
      </div>
      {children}
    </div>
  );
};

export default ChartCard;
