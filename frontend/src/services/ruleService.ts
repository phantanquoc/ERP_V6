import apiClient from './apiClient';

export interface Rule {
  id: string;
  resourceCode: string;
  action: string;
  scope: string;
  departmentId: string | null;
  subDepartmentId: string | null;
  positionId: string | null;
  role: string | null;
  allow: boolean;
  isActive: boolean;
}

export interface Resource {
  code: string;
  label: string;
  group: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MyPermission {
  resourceCode: string;
  action: string;
  allow: boolean;
  source: string;
}

class RuleService {
  async listRules(params?: Record<string, string>): Promise<Rule[]> {
    const res = await apiClient.get('/rules', { params });
    return res.data as Rule[];
  }

  async getRuleById(id: string): Promise<Rule> {
    const res = await apiClient.get(`/rules/${id}`);
    return res.data as Rule;
  }

  async createRule(data: Partial<Rule>): Promise<Rule> {
    const res = await apiClient.post('/rules', data);
    return res.data as Rule;
  }

  async updateRule(id: string, data: Partial<Rule>): Promise<Rule> {
    const res = await apiClient.patch(`/rules/${id}`, data);
    return res.data as Rule;
  }

  async deleteRule(id: string): Promise<void> {
    await apiClient.delete(`/rules/${id}`);
  }

  async getMatrix(params?: Record<string, string>): Promise<{ resources: Resource[]; rules: Rule[]; actions: string[] }> {
    const res = await apiClient.get('/rules/matrix', { params });
    return res.data as { resources: Resource[]; rules: Rule[]; actions: string[] };
  }

  async getMyPermissions(): Promise<MyPermission[]> {
    const res = await apiClient.get('/rules/my-permissions');
    return res.data as MyPermission[];
  }

  async listResources(): Promise<Resource[]> {
    const res = await apiClient.get('/rules/resources');
    return res.data as Resource[];
  }

  async listAuditLogs(params?: Record<string, string>): Promise<{ data: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const res = await apiClient.get('/rules/audit-log', { params });
    return res.data as never;
  }

  async listDelegations(params?: Record<string, string>): Promise<unknown[]> {
    const res = await apiClient.get('/rules/delegations', { params });
    return res.data as unknown[];
  }

  async createDelegation(data: Record<string, unknown>): Promise<unknown> {
    const res = await apiClient.post('/rules/delegations', data);
    return res.data as unknown;
  }

  async revokeDelegation(id: string): Promise<void> {
    await apiClient.patch(`/rules/delegations/${id}/revoke`);
  }
}

export default new RuleService();
