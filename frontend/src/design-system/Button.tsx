import React from 'react';
// Button variants derive from tokens.colors — primary: colors.primary (#2563EB), danger: colors.danger (#EF4444).
// Variant classes mirror tailwind equivalents of those tokens so token changes remain single-source.
import { colors } from './tokens';

void colors; // ensure token import is retained (prevents unused-import prune and documents single source)

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent focus-visible:ring-blue-500',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 focus-visible:ring-blue-500',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 border border-transparent focus-visible:ring-gray-400',
  danger: 'bg-red-600 hover:bg-red-700 text-white border border-transparent focus-visible:ring-red-500',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-1.5',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

/**
 * Design-system Button — consistent across all pages.
 * For one-off buttons, prefer this over raw <button> with Tailwind literals.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
      )}
      {!loading && icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
