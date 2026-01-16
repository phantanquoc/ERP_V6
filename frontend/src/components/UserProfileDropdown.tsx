import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, Shield, History, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PersonalInfoModal from './PersonalInfoModal';
import LoginHistoryModal from './LoginHistoryModal';
import ChangePasswordModal from './ChangePasswordModal';

const UserProfileDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      await logout();
    }
    setIsOpen(false);
  };

  const handleMenuClick = (action: string) => {
    setIsOpen(false);
    // Handle different menu actions
    switch (action) {
      case 'profile':
        setIsPersonalInfoOpen(true);
        break;
      case 'history':
        setIsLoginHistoryOpen(true);
        break;
      case 'password':
        setIsChangePasswordOpen(true);
        break;
      default:
        break;
    }
  };

  if (!user) return null;

  // Get user initials for avatar
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {/* User Avatar */}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md">
          {getInitials(user.firstName, user.lastName)}
        </div>
        
        {/* User Info */}
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-gray-500">
            {user.role === 'admin' ? 'Admin System' : user.position}
          </div>
        </div>
        
        {/* Dropdown Arrow */}
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
          {/* User Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-white font-bold">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div>
                <div className="font-semibold text-lg">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-blue-100 text-sm">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Thông tin cá nhân */}
            <button
              onClick={() => handleMenuClick('profile')}
              className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Thông tin cá nhân</div>
                <div className="text-xs text-gray-500">Cài đặt thông tin tài khoản</div>
              </div>
            </button>

            {/* Lịch sử đăng nhập */}
            <button
              onClick={() => handleMenuClick('history')}
              className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <History className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Lịch sử đăng nhập</div>
                <div className="text-xs text-gray-500">Lịch sử đăng nhập gần đây của tài khoản</div>
              </div>
            </button>

            {/* Đổi mật khẩu */}
            <button
              onClick={() => handleMenuClick('password')}
              className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                <Shield className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Đổi mật khẩu</div>
                <div className="text-xs text-gray-500">Cài đặt thông báo bảo mật</div>
              </div>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 my-2"></div>

            {/* Đăng xuất */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-150"
            >
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <LogOut className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Đăng xuất</div>
                <div className="text-xs text-red-400">Thoát khỏi hệ thống</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <PersonalInfoModal
        isOpen={isPersonalInfoOpen}
        onClose={() => setIsPersonalInfoOpen(false)}
      />
      <LoginHistoryModal
        isOpen={isLoginHistoryOpen}
        onClose={() => setIsLoginHistoryOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default UserProfileDropdown;
