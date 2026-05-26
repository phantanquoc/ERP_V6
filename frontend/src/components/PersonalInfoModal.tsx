import React, { useState, useEffect } from 'react';
import {
  X, User, Mail, Phone, MapPin, CheckCircle, AlertCircle, Save, CreditCard,
  Briefcase, Calendar, Weight, Ruler, Shirt, DollarSign, Award, TrendingUp, Edit2,
  BookOpen, Star, FileText, Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDepartmentDisplayName } from '../utils/permissions';
import Modal from './Modal';
import userService from '../services/userService';
import { parseNumberInputStr } from '../utils/numberInput';

interface PersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONTRACT_TYPE_MAP: Record<string, string> = {
  PROBATION:      'Thử việc',
  FIXED_TERM:     'Có thời hạn',
  INDEFINITE:     'Không thời hạn',
  PART_TIME:      'Bán thời gian',
  SEASONAL:       'Thời vụ',
  INTERNSHIP:     'Thực tập',
};

const EDUCATION_MAP: Record<string, string> = {
  PRIMARY:        'Tiểu học',
  SECONDARY:      'THCS',
  HIGH_SCHOOL:    'THPT',
  VOCATIONAL:     'Trung cấp',
  COLLEGE:        'Cao đẳng',
  BACHELOR:       'Đại học',
  MASTER:         'Thạc sĩ',
  DOCTOR:         'Tiến sĩ',
};

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
    gender: '',
    weight: '',
    height: '',
    shirtSize: '',
    pantSize: '',
    shoeSize: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Display helpers
  const getGenderValue = (gender?: string): string => {
    if (!gender) return '';
    switch (gender.toUpperCase()) {
      case 'MALE': return 'MALE';
      case 'FEMALE': return 'FEMALE';
      case 'OTHER': return 'OTHER';
      default: return gender;
    }
  };

  const getGenderDisplay = (gender?: string): string => {
    if (!gender) return 'Chưa cập nhật';
    switch (gender.toUpperCase()) {
      case 'MALE':   return 'Nam';
      case 'FEMALE': return 'Nữ';
      case 'OTHER':  return 'Khác';
      // Already mapped to Vietnamese (Nam/Nữ/Khác) from backend
      default: return gender;
    }
  };

  const formatDate = (value?: string | Date | null): string => {
    if (!value) return 'N/A';
    try {
      return new Date(value as string).toLocaleDateString('vi-VN');
    } catch {
      return 'N/A';
    }
  };

  const mapContractType = (ct?: string): string => {
    if (!ct) return 'Chưa cập nhật';
    return CONTRACT_TYPE_MAP[ct] ?? ct;
  };

  const mapEducationLevel = (el?: string): string => {
    if (!el) return 'Chưa cập nhật';
    return EDUCATION_MAP[el] ?? el;
  };

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        bankAccount: user.bankAccount || '',
        lockerNumber: user.lockerNumber || '',
        gender: getGenderValue(user.gender),
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

  const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string): boolean => /^[0-9]{10,11}$/.test(phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (activeTab === 'basic') {
      if (!formData.firstName.trim()) newErrors.firstName = 'Vui lòng nhập tên';
      if (!formData.lastName.trim())  newErrors.lastName  = 'Vui lòng nhập họ';
      if (!formData.email.trim())     newErrors.email     = 'Vui lòng nhập email';
      else if (!validateEmail(formData.email)) newErrors.email = 'Email không hợp lệ';
      if (formData.phoneNumber && !validatePhone(formData.phoneNumber))
        newErrors.phoneNumber = 'Số điện thoại phải có 10-11 chữ số';
    }
    if (activeTab === 'physical') {
      if (formData.weight && (isNaN(Number(formData.weight)) || Number(formData.weight) <= 0))
        newErrors.weight = 'Cân nặng phải là số dương';
      if (formData.height && (isNaN(Number(formData.height)) || Number(formData.height) <= 0))
        newErrors.height = 'Chiều cao phải là số dương';
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        firstName: formData.firstName,
        lastName:  formData.lastName,
        email:     formData.email,
        phoneNumber: formData.phoneNumber,
        bankAccount: formData.bankAccount,
        lockerNumber: formData.lockerNumber,
      };
      if (formData.gender)    updateData.gender    = formData.gender;
      if (formData.weight)    updateData.weight    = Number(formData.weight);
      if (formData.height)    updateData.height    = Number(formData.height);
      if (formData.shirtSize) updateData.shirtSize = formData.shirtSize;
      if (formData.pantSize)  updateData.pantSize  = formData.pantSize;
      if (formData.shoeSize)  updateData.shoeSize  = formData.shoeSize;

      await userService.updateProfile(updateData);

      updateUser({
        firstName:   formData.firstName,
        lastName:    formData.lastName,
        email:       formData.email,
        phoneNumber: formData.phoneNumber,
        bankAccount: formData.bankAccount,
        lockerNumber: formData.lockerNumber,
        gender:    formData.gender as 'Nam' | 'Nữ' | 'Khác' | undefined,
        weight:    formData.weight ? Number(formData.weight) : undefined,
        height:    formData.height ? Number(formData.height) : undefined,
        shirtSize: formData.shirtSize || undefined,
        pantSize:  formData.pantSize  || undefined,
        shoeSize:  formData.shoeSize  || undefined,
      });

      setSubmitSuccess(true);
      setTimeout(() => { setSubmitSuccess(false); setIsEditing(false); }, 2000);
    } catch (error: any) {
      setErrors({ email: error?.message || 'Có lỗi xảy ra khi cập nhật thông tin' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const departmentName = user
    ? (user.departmentName || getDepartmentDisplayName(user.department))
    : '';

  const tabs = [
    { id: 'basic',    name: 'Cơ bản',     icon: <User      className="w-4 h-4" /> },
    { id: 'physical', name: 'Vật lý',     icon: <Ruler     className="w-4 h-4" /> },
    { id: 'work',     name: 'Công việc',  icon: <Briefcase className="w-4 h-4" /> },
  ];

  if (!user) return null;

  // ─── Info row helper ────────────────────────────────────────────────────────
  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) => (
    <div className="flex items-start space-x-3">
      <span className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{value ?? 'Chưa cập nhật'}</p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">

        {/* ── Header ── */}
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
                <p className="text-green-100 text-sm">{user.position || 'Chưa có chức vụ'}</p>
                <div className="flex items-center flex-wrap gap-1 mt-1">
                  {user.employeeCode && (
                    <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-medium">
                      {user.employeeCode}
                    </span>
                  )}
                  {user.employeeStatus && (
                    <span className="px-2 py-0.5 bg-white bg-opacity-20 text-white rounded-full text-xs font-medium">
                      {user.employeeStatus}
                    </span>
                  )}
                  {user.positionLevelName && (
                    <span className="px-2 py-0.5 bg-teal-500 text-white rounded-full text-xs font-medium">
                      {user.positionLevelName}
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

        {/* ── Tabs ── */}
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

        {/* ── Content ── */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {submitSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cập nhật thành công!</h3>
              <p className="text-gray-600">Thông tin của bạn đã được cập nhật</p>
            </div>
          ) : (
            <>
              {/* ════════════════════════════════════════════
                  TAB: CƠ BẢN — VIEW MODE
              ════════════════════════════════════════════ */}
              {activeTab === 'basic' && !isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <InfoRow icon={<User    className="w-5 h-5" />} label="Họ và tên"
                      value={`${user.firstName} ${user.lastName}`} />
                    <InfoRow icon={<User    className="w-5 h-5" />} label="Giới tính"
                      value={getGenderDisplay(user.gender)} />
                    <InfoRow icon={<Calendar className="w-5 h-5" />} label="Ngày sinh"
                      value={formatDate(user.dateOfBirth)} />
                    <InfoRow icon={<Mail    className="w-5 h-5" />} label="Email"
                      value={user.email} />
                    <InfoRow icon={<Phone   className="w-5 h-5" />} label="Số điện thoại"
                      value={user.phoneNumber || 'Chưa cập nhật'} />
                    <InfoRow icon={<MapPin  className="w-5 h-5" />} label="Địa chỉ"
                      value={user.address || 'Chưa cập nhật'} />
                  </div>
                  <div className="space-y-4">
                    <InfoRow icon={<Building2 className="w-5 h-5" />} label="Bộ phận"
                      value={departmentName || 'Chưa phân công'} />
                    <InfoRow icon={<MapPin  className="w-5 h-5" />} label="Phòng ban"
                      value={user.subDepartmentName || user.subDepartment || 'Chưa phân công'} />
                    <InfoRow icon={<CreditCard className="w-5 h-5" />} label="Tài khoản ngân hàng"
                      value={user.bankAccount || 'Chưa cập nhật'} />
                    <InfoRow icon={<MapPin  className="w-5 h-5" />} label="Số tủ cá nhân"
                      value={user.lockerNumber || 'Chưa phân bổ'} />
                    <InfoRow icon={<Calendar className="w-5 h-5" />} label="Ngày tham gia"
                      value={formatDate(user.hireDate ?? (user.createdAt as any))} />
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════
                  TAB: CƠ BẢN — EDIT MODE
              ════════════════════════════════════════════ */}
              {activeTab === 'basic' && isEditing && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Họ <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Nhập họ" />
                      </div>
                      {errors.lastName && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.lastName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tên <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Nhập tên" />
                      </div>
                      {errors.firstName && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.firstName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="email" value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="example@email.com" />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white">
                        <option value="">Chọn giới tính</option>
                        <option value="MALE">Nam</option>
                        <option value="FEMALE">Nữ</option>
                        <option value="OTHER">Khác</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="tel" value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="0123456789" />
                    </div>
                    {errors.phoneNumber && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.phoneNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tài khoản ngân hàng</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="text" value={formData.bankAccount}
                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Số tài khoản ngân hàng" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số tủ cá nhân</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="text" value={formData.lockerNumber}
                        onChange={(e) => setFormData({ ...formData, lockerNumber: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Số tủ" />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Lưu ý:</strong> Một số thông tin như chức vụ, phòng ban, ngày sinh chỉ có thể được cập nhật bởi quản trị viên.
                    </p>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={isSubmitting}>Hủy</button>
                    <button type="submit"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      disabled={isSubmitting}>
                      <Save className="w-4 h-4" />
                      <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ════════════════════════════════════════════
                  TAB: VẬT LÝ — VIEW MODE
              ════════════════════════════════════════════ */}
              {activeTab === 'physical' && !isEditing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <InfoRow icon={<Weight className="w-5 h-5" />} label="Cân nặng"
                      value={user.weight ? `${user.weight} kg` : 'Chưa cập nhật'} />
                    <InfoRow icon={<Ruler  className="w-5 h-5" />} label="Chiều cao"
                      value={user.height ? `${user.height} cm` : 'Chưa cập nhật'} />
                    <InfoRow icon={<Shirt  className="w-5 h-5" />} label="Size áo"
                      value={user.shirtSize || 'Chưa cập nhật'} />
                  </div>
                  <div className="space-y-4">
                    <InfoRow icon={<Shirt  className="w-5 h-5" />} label="Size quần"
                      value={user.pantSize || 'Chưa cập nhật'} />
                    <InfoRow icon={<Shirt  className="w-5 h-5" />} label="Size giày/dép"
                      value={user.shoeSize || 'Chưa cập nhật'} />
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════
                  TAB: VẬT LÝ — EDIT MODE
              ════════════════════════════════════════════ */}
              {activeTab === 'physical' && isEditing && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cân nặng (kg)</label>
                      <div className="relative">
                        <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="number" step="0.1" value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: parseNumberInputStr(e.target.value) })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.weight ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Nhập cân nặng" />
                      </div>
                      {errors.weight && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.weight}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Chiều cao (cm)</label>
                      <div className="relative">
                        <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="number" step="0.1" value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: parseNumberInputStr(e.target.value) })}
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.height ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Nhập chiều cao" />
                      </div>
                      {errors.height && <p className="mt-1 text-sm text-red-600 flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{errors.height}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Size áo</label>
                      <div className="relative">
                        <Shirt className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select value={formData.shirtSize}
                          onChange={(e) => setFormData({ ...formData, shirtSize: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                          <option value="">Chọn size áo</option>
                          {['XS','S','M','L','XL','XXL','XXXL'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Size quần</label>
                      <div className="relative">
                        <Shirt className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={formData.pantSize}
                          onChange={(e) => setFormData({ ...formData, pantSize: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="vd: 29, 30, 31..." />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Size giày/dép</label>
                      <div className="relative">
                        <Shirt className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={formData.shoeSize}
                          onChange={(e) => setFormData({ ...formData, shoeSize: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="vd: 38, 39, 40..." />
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Lưu ý:</strong> Thông tin vật lý giúp công ty chuẩn bị đồng phục và trang thiết bị phù hợp.
                    </p>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={isSubmitting}>Hủy</button>
                    <button type="submit"
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      disabled={isSubmitting}>
                      <Save className="w-4 h-4" />
                      <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ════════════════════════════════════════════
                  TAB: CÔNG VIỆC (read-only)
              ════════════════════════════════════════════ */}
              {activeTab === 'work' && (
                <div className="space-y-6">
                  {/* ── Chức vụ & Hợp đồng ── */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Chức vụ &amp; Hợp đồng</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoRow icon={<Briefcase className="w-5 h-5" />} label="Chức vụ"
                        value={user.position || 'Chưa cập nhật'} />
                      <InfoRow icon={<Star className="w-5 h-5" />} label="Cấp chức vụ"
                        value={user.positionLevelName || 'Chưa cập nhật'} />
                      <InfoRow icon={<FileText className="w-5 h-5" />} label="Loại hợp đồng"
                        value={mapContractType(user.contractType)} />
                      <InfoRow icon={<Calendar className="w-5 h-5" />} label="Ngày vào làm"
                        value={formatDate(user.hireDate)} />
                      <InfoRow icon={<User className="w-5 h-5" />} label="Trạng thái"
                        value={user.employeeStatus || 'Đang làm việc'} />
                      <InfoRow icon={<FileText className="w-5 h-5" />} label="Mã trách nhiệm"
                        value={user.responsibilityCode || 'Chưa cập nhật'} />
                    </div>
                  </div>

                  {/* ── Học vấn & Kỹ năng ── */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Học vấn &amp; Kỹ năng</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoRow icon={<BookOpen className="w-5 h-5" />} label="Trình độ học vấn"
                        value={mapEducationLevel(user.educationLevel)} />
                      <InfoRow icon={<BookOpen className="w-5 h-5" />} label="Chuyên ngành"
                        value={user.specialization || 'Chưa cập nhật'} />
                      {user.specialSkills && (
                        <div className="md:col-span-2">
                          <InfoRow icon={<Star className="w-5 h-5" />} label="Kỹ năng đặc biệt"
                            value={user.specialSkills} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Lương & KPI ── */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Lương &amp; Đánh giá</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoRow icon={<DollarSign className="w-5 h-5" />} label="Lương cơ bản"
                        value={user.baseSalary ? `${user.baseSalary.toLocaleString('vi-VN')} VND` : 'Chưa cập nhật'} />
                      <InfoRow icon={<TrendingUp className="w-5 h-5" />} label="Lương KPI"
                        value={user.kpiLevel ? `${user.kpiLevel.toLocaleString('vi-VN')} VND` : 'Chưa cập nhật'} />
                      <InfoRow icon={<Award className="w-5 h-5" />} label="Điểm đánh giá"
                        value={user.evaluationScore != null ? user.evaluationScore.toFixed(1) : 'Chưa có'} />
                    </div>
                  </div>

                  {/* ── Bộ phận kiêm nhiệm ── */}
                  {user.secondaryDepartments && user.secondaryDepartments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Bộ phận kiêm nhiệm</h3>
                      <div className="space-y-2">
                        {user.secondaryDepartments.map((s, i) => (
                          <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {s.departmentName || getDepartmentDisplayName(s.departmentCode)}
                                {s.subDepartmentName && (
                                  <span className="text-gray-500"> / {s.subDepartmentName}</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {s.role === 'department_head' ? 'Trưởng bộ phận'
                                  : s.role === 'team_lead' ? 'Tổ trưởng'
                                  : 'Nhân viên'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Ghi chú ── */}
                  {user.notes && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Ghi chú</h3>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-line">{user.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
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
