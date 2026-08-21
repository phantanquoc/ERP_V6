import React from 'react';
import { Link } from 'react-router-dom';
import { shell, typography } from './tokens';

export type NavCardTone = 'cyan' | 'blue' | 'violet' | 'emerald' | 'amber' | 'gray' | 'orange';

export interface NavCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  to: string;
  /** Accent tone for icon bg/text and hover border/ring. Defaults to 'cyan'. */
  tone?: NavCardTone;
}

const toneClasses: Record<NavCardTone, { iconWrap: string; iconText: string; hoverBorder: string; hoverArrow: string; ring: string }> = {
  cyan: { iconWrap: 'bg-cyan-50 group-hover:bg-cyan-100', iconText: 'text-cyan-600', hoverBorder: 'hover:border-cyan-300', hoverArrow: 'group-hover:text-cyan-500', ring: 'focus-visible:ring-cyan-500' },
  blue: { iconWrap: 'bg-blue-50 group-hover:bg-blue-100', iconText: 'text-blue-600', hoverBorder: 'hover:border-blue-300', hoverArrow: 'group-hover:text-blue-500', ring: 'focus-visible:ring-blue-500' },
  violet: { iconWrap: 'bg-violet-50 group-hover:bg-violet-100', iconText: 'text-violet-600', hoverBorder: 'hover:border-violet-300', hoverArrow: 'group-hover:text-violet-500', ring: 'focus-visible:ring-violet-500' },
  emerald: { iconWrap: 'bg-emerald-50 group-hover:bg-emerald-100', iconText: 'text-emerald-600', hoverBorder: 'hover:border-emerald-300', hoverArrow: 'group-hover:text-emerald-500', ring: 'focus-visible:ring-emerald-500' },
  amber: { iconWrap: 'bg-amber-50 group-hover:bg-amber-100', iconText: 'text-amber-600', hoverBorder: 'hover:border-amber-300', hoverArrow: 'group-hover:text-amber-500', ring: 'focus-visible:ring-amber-500' },
  orange: { iconWrap: 'bg-orange-50 group-hover:bg-orange-100', iconText: 'text-orange-600', hoverBorder: 'hover:border-orange-300', hoverArrow: 'group-hover:text-orange-500', ring: 'focus-visible:ring-orange-500' },
  gray: { iconWrap: 'bg-gray-50 group-hover:bg-gray-100', iconText: 'text-gray-600', hoverBorder: 'hover:border-gray-300', hoverArrow: 'group-hover:text-gray-500', ring: 'focus-visible:ring-gray-400' },
};

/**
 * NavCard — linked card for dashboard navigation.
 * Uses react-router Link (SPA navigation, no full reload) and shell.card token.
 * Tone controls accent color; default cyan preserves existing dashboard look.
 */
export const NavCard: React.FC<NavCardProps> = ({ title, desc, icon, to, tone = 'cyan' }) => {
  const t = toneClasses[tone] ?? toneClasses.cyan;
  return (
    <Link
      to={to}
      className={`${shell.card} p-4 ${t.hoverBorder} hover:shadow-md transition-all duration-200 text-left w-full group flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 ${t.ring} focus-visible:ring-offset-2`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className={`p-2 rounded-lg shrink-0 transition-colors ${t.iconWrap} ${t.iconText}`}>{icon}</span>
        <span className="min-w-0 text-left">
          <span className={`${typography.sectionTitle} block truncate`}>{title}</span>
          <span className={`${typography.cardSub} block truncate`}>{desc}</span>
        </span>
      </span>
      <span className={`text-gray-300 ${t.hoverArrow} transition-colors shrink-0 ml-2`} aria-hidden="true">→</span>
    </Link>
  );
};

export default NavCard;
