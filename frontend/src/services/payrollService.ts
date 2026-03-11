import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';

export interface PayrollItem {
  stt: number;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  month: number;
  year: number;
  baseSalary: number;
  kpiBonus: number;
  positionAllowance: number;
  otherAllowances: number;
  totalIncome: number;
  socialInsurance: number;
  healthInsurance: number;
  unemploymentInsurance: number;
  personalIncomeTax: number;
  kpiDeduction: number;
  leaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  workDays: number;
  leaveDays: number;
  overtimeHours: number;
  payrollId: string | null;
}

export interface PayrollDetail {
  id?: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  month: number;
  year: number;
  baseSalary: number;
  kpiBonus: number;
  positionAllowance: number;
  otherAllowances: number;
  totalIncome: number;
  socialInsurance: number;
  healthInsurance: number;
  unemploymentInsurance: number;
  personalIncomeTax: number;
  kpiDeduction: number;
  leaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  workDays: number;
  leaveDays: number;
  overtimeHours: number;
}

class PayrollService {
  async getPayrollByMonthYear(month: number, year: number): Promise<PayrollItem[]> {
    try {
      const response = await apiClient.get('/payrolls', {
        params: { month, year },
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      throw error;
    }
  }

  async getPayrollDetail(payrollId: string): Promise<PayrollDetail> {
    try {
      const response = await apiClient.get(`/payrolls/${payrollId}/detail`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payroll detail:', error);
      throw error;
    }
  }

  async createOrUpdatePayroll(
    employeeId: string,
    month: number,
    year: number,
    data: any
  ): Promise<any> {
    try {
      const response = await apiClient.post('/payrolls', {
        employeeId,
        month,
        year,
        ...data,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating/updating payroll:', error);
      throw error;
    }
  }

  async updatePayroll(payrollId: string, data: any): Promise<any> {
    try {
      const response = await apiClient.patch(`/payrolls/${payrollId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating payroll:', error);
      throw error;
    }
  }

  async exportToExcel(filters?: { search?: string; month?: number; year?: number }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    const url = `${API_BASE_URL}/payrolls/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `bang-luong-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new PayrollService();

