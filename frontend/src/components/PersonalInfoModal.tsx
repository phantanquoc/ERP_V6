import React, { useState, useEffect } from 'react';
import {
  X, User, Mail, Phone, MapPin, CheckCircle, AlertCircle, Save, CreditCard,
  Briefcase, Calendar, Weight, Ruler, Shirt, DollarSign, Award, TrendingUp, Edit2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDepartmentDisplayName } from '../utils/permissions';
import Modal from './Modal';
import userService from '../services/userService';

interface PersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PersonalInfoModal: React.FC<PersonalInfoModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    bankAccount: '',
    lockerNumber: '',
    weight: '',
    height: '',
    shirtSize: '',
    pantSize: '',
    shoeSize: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        bankAccount: user.bankAccount || '',
        lockerNumber: user.lockerNumber || '',
        weight: user.weight?.toString() || '',
        height: user.height?.toString() || '',
        shirtSize: user.shirtSize || '',
        pantSize: user.pantSize || '',
        shoeSize: user.shoeSize || ''
      });
      setIsEditing(false);
      setActiveTab('basic');
    }
  }, [user, isOpen]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (activeTab === 'basic') {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'Vui lòng nhập tên';
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Vui lòng nhập họ';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Vui lòng nhập email';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Email không hợp lệ';
      }

      if (formData.phoneNumber && !validatePhone(formData.phoneNumber)) {
        newErrors.phoneNumber = 'Số điện thoại phải có 10-11 chữ số';
      }
    }

    if (activeTab === 'physical') {
      if (formData.weight && (isNaN(Number(formData.weight)) || Number(formData.weight) <= 0)) {
        newErrors.weight = 'Cân nặng phải là số dương';
      }

      if (formData.height && (isNaN(Number(formData.height)) || Number(formData.height) <= 0)) {
        newErrors.height = 'Chiều cao phải là số dương';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        bankAccount: formData.bankAccount,
        lockerNumber: formData.lockerNumber,
      };

      // Add physical data if present
      if (formData.weight) {
        updateData.weight = Number(formData.weight);
      }
      if (formData.height) {
        updateData.height = Number(formData.height);
      }
      if (formData.shirtSize) {
        updateData.shirtSize = formData.shirtSize;
      }
      if (formData.pantSize) {
        updateData.pantSize = formData.pantSize;
      }
      if (formData.shoeSize) {
        updateData.shoeSize = formData.shoeSize;
      }

      await userService.updateProfile(updateData);

      // Update user in AuthContext and localStorage
      updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        bankAccount: formData.bankAccount,
        lockerNumber: formData.lockerNumber,
        weight: formData.weight ? Number(formData.weight) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        shirtSize: formData.shirtSize || undefined,
        pantSize: formData.pantSize || undefined,
        shoeSize: formData.shoeSize || undefined,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsEditing(false);
      }, 2000);
    } catch (error: any) {
      setErrors({
        email: error?.message || 'Có lỗi xảy ra khi cập nhật thông tin'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const departmentName = user ? getDepartmentDisplayName(user.department) : '';

  const tabs = [
    { id: 'basic', name: 'Cơ bản', icon: <User className="w-4 h-4" /> },
    { id: 'physical', name: 'Vật lý', icon: <Ruler className="w-4 h-4" /> },
    { id: 'work', name: 'Công việc', icon: <Briefcase className="w-4 h-4" /> }
  ];

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-green-100 text-sm">{user.position}</p>
                <div className="flex items-center space-x-2 mt-1">
                  {user.employeeCode && (
                    <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
                      {user.employeeCode}
                    </span>
                  )}
                  {user.employeeStatus && (
                    <span className="px-2 py-1 bg-white bg-opacity-20 text-white rounded-full text-xs font-medium">
                      {user.employeeStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {submitSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cập nhật thành công!
              </h3>
              <p className="text-gray-600">
                Thông tin của bạn đã được cập nhật
              </p>
            </div>
          ) : (
            <>
              {/* Basic Tab */}
              {activeTab === 'basic' && !isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Họ và tên</p>
                        <p className="text-sm text-gray-600">{user.firstName} {user.lastName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Giới tính</p>
                        <p className="text-sm text-gray-600">{user.gender || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Bộ phận</p>
                        <p className="text-sm text-gray-600">{departmentName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phòng ban</p>
                        <p className="text-sm text-gray-600">{user.subDepartment || 'Chưa phân công'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Số điện thoại</p>
                        <p className="text-sm text-gray-600">{user.phoneNumber || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Tài khoản ngân hàng</p>
                        <p className="text-sm text-gray-600">{user.bankAccount || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Số tủ cá nhân</p>
                        <p className="text-sm text-gray-600">{user.lockerNumber || 'Chưa phân bổ'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Ngày tham gia</p>
                        <p className="text-sm text-gray-600">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Tab - Edit Mode */}
              {activeTab === 'basic' && isEditing && (
                <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nhập họ"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nhập tên"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.firstName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="example@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại cá nhân
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0123456789"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tài khoản ngân hàng
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Số tài khoản ngân hàng"
                  />
                </div>
              </div>

              {/* Locker Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số tủ cá nhân
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.lockerNumber}
                    onChange={(e) => setFormData({ ...formData, lockerNumber: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Số tủ"
                  />
                </div>
              </div>

                  {/* Info Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Lưu ý:</strong> Một số thông tin như chức vụ, phòng ban chỉ có thể được cập nhật bởi quản trị viên.
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      disabled={isSubmitting}
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Physical Tab - View Mode */}
              {activeTab === 'physical' && !isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Weight className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Cân nặng</p>
                        <p className="text-sm text-gray-600">{user.weight ? `${user.weight} kg` : 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Ruler className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Chiều cao</p>
                        <p className="text-sm text-gray-600">{user.height ? `${user.height} cm` : 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Shirt className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Size áo</p>
                        <p className="text-sm text-gray-600">{user.shirtSize || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Shirt className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Size quần</p>
                        <p className="text-sm text-gray-600">{user.pantSize || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Shirt className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Size giày/dép</p>
                        <p className="text-sm text-gray-600">{user.shoeSize || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Physical Tab - Edit Mode */}
              {activeTab === 'physical' && isEditing && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weight */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cân nặng (kg)
                      </label>
                      <div className="relative">
                        <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          step="0.1"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            errors.weight ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Nhập cân nặng"
                        />
                      </div>
                      {errors.weight && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.weight}
                        </p>
                      )}
                    </div>

                    {/* Height */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chiều cao (cm)
                      </label>
                      <div className="relative">
                        <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          step="0.1"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            errors.height ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Nhập chiều cao"
                        />
                      </div>
                      {errors.height && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.height}
                        </p>
                      )}
                    </div>

                    {/* Shirt Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size áo
                      </label>
                      <div className="relative">
                        <Shirt className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={formData.shirtSize}
                          onChange={(e) => setFormData({ ...formData, shirtSize: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="">Chọn size áo</option>
                          <option value="XS">XS</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                          <option value="XXXL">XXXL</option>
                        </select>
                      </div>
                    </div>

                    {/* Pant Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size quần
                      </label>
                      <div className="relative">
                        <Shirt className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.pantSize}
                          onChange={(e) => setFormData({ ...formData, pantSize: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Nhập size quần (vd: 29, 30, 31...)"
                        />
                      </div>
                    </div>

                    {/* Shoe Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size giày/dép
                      </label>
                      <div className="relative">
                        <Shirt className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.shoeSize}
                          onChange={(e) => setFormData({ ...formData, shoeSize: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Nhập size giày (vd: 38, 39, 40...)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Lưu ý:</strong> Thông tin vật lý giúp công ty chuẩn bị đồng phục và trang thiết bị phù hợp.
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      disabled={isSubmitting}
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Work Tab */}
              {activeTab === 'work' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Lương cơ bản</p>
                        <p className="text-sm text-gray-600">
                          {user.baseSalary ? `${(user.baseSalary / 1000000).toFixed(1)}M VND` : 'Chưa cập nhật'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Lương KPI</p>
                        <p className="text-sm text-gray-600">
                          {user.kpiLevel ? `${(user.kpiLevel / 1000000).toFixed(1)}M VND` : 'Chưa cập nhật'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Award className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Điểm đánh giá</p>
                        <p className="text-sm text-gray-600">
                          {user.evaluationScore ? user.evaluationScore.toFixed(1) : 'Chưa có'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Briefcase className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Mã trách nhiệm</p>
                        <p className="text-sm text-gray-600">{user.responsibilityCode || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Trạng thái</p>
                        <p className="text-sm text-gray-600">{user.employeeStatus || 'Đang làm việc'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitSuccess && !isEditing && (activeTab === 'basic' || activeTab === 'physical') && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>Chỉnh sửa thông tin</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PersonalInfoModal;

