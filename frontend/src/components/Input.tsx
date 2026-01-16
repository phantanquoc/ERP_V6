import React, { forwardRef } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: 'user' | 'email' | 'password';
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    icon, 
    showPasswordToggle, 
    onTogglePassword, 
    showPassword, 
    className = '', 
    ...props 
  }, ref) => {
    const getIcon = () => {
      switch (icon) {
        case 'user':
          return <User className="w-5 h-5 text-gray-400" />;
        case 'email':
          return <Mail className="w-5 h-5 text-gray-400" />;
        case 'password':
          return <Lock className="w-5 h-5 text-gray-400" />;
        default:
          return null;
      }
    };

    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {getIcon()}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${icon ? 'pl-12' : ''}
              ${showPasswordToggle ? 'pr-12' : ''}
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
              ${className}
            `}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={onTogglePassword}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
