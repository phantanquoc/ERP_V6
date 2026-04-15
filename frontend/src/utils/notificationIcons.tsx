import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Target,
  ClipboardList,
  DollarSign,
  PackageCheck,
  CalendarDays,
  ShoppingCart,
  Truck,
  PackageOpen,
  KeyRound,
  MessageSquare,
  FileText,
} from 'lucide-react';

export const getNotificationIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'EVALUATION':
      return <ClipboardList className="w-4 h-4 text-orange-600" />;
    case 'EVALUATION_SUPERVISOR1':
    case 'EVALUATION_SUPERVISOR2':
      return <Clock className="w-4 h-4 text-blue-600" />;
    case 'EVALUATION_COMPLETED':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'TASK':
      return <Target className="w-4 h-4 text-indigo-600" />;
    case 'TASK_ADMIN':
      return <Target className="w-4 h-4 text-indigo-600" />;
    case 'PAYROLL':
      return <DollarSign className="w-4 h-4 text-green-600" />;
    case 'ACCEPTANCE_HANDOVER':
      return <PackageCheck className="w-4 h-4 text-teal-600" />;
    case 'LEAVE_REQUEST':
      return <CalendarDays className="w-4 h-4 text-purple-600" />;
    case 'LEAVE_REQUEST_RESPONSE':
      return <CalendarDays className="w-4 h-4 text-purple-600" />;
    case 'OVERTIME_PLAN':
    case 'OVERTIME_PLAN_APPROVAL':
      return <Clock className="w-4 h-4 text-orange-600" />;
    case 'SUPPLY_REQUEST':
      return <ShoppingCart className="w-4 h-4 text-teal-600" />;
    case 'SUPPLY_REQUEST_PROCESSING':
      return <Clock className="w-4 h-4 text-yellow-600" />;
    case 'SUPPLY_REQUEST_APPROVED':
      return <Truck className="w-4 h-4 text-blue-600" />;
    case 'SUPPLY_REQUEST_FULFILLED':
      return <PackageOpen className="w-4 h-4 text-green-600" />;
    case 'PASSWORD_RESET':
      return <KeyRound className="w-4 h-4 text-red-600" />;
    case 'PRIVATE_FEEDBACK':
      return <MessageSquare className="w-4 h-4 text-orange-600" />;
    case 'DAILY_WORK_REPORT':
      return <FileText className="w-4 h-4 text-teal-600" />;
    case 'WORK_PLAN':
      return <CalendarDays className="w-4 h-4 text-purple-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-600" />;
  }
};
