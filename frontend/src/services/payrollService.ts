import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';
const API_BASE_URL = `${API_BASE}/payrolls`;

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
  private getAuthHeader() {
    const token = localStorage.getItem('accessToken');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getPayrollByMonthYear(month: number, year: number): Promise<PayrollItem[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}`, {
        params: { month, year },
        headers: this.getAuthHeader(),
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      throw error;
    }
  }

  async getPayrollDetail(payrollId: string): Promise<PayrollDetail> {
    try {
      const response = await axios.get(`${API_BASE_URL}/${payrollId}/detail`, {
        headers: this.getAuthHeader(),
      });
      return response.data.data;
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
      const response = await axios.post(
        `${API_BASE_URL}`,
        {
          employeeId,
          month,
          year,
          ...data,
        },
        {
          headers: this.getAuthHeader(),
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error creating/updating payroll:', error);
      throw error;
    }
  }

  async updatePayroll(payrollId: string, data: any): Promise<any> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/${payrollId}`, data, {
        headers: this.getAuthHeader(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating payroll:', error);
      throw error;
    }
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_URL}/payrolls/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
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

