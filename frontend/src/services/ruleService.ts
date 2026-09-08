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
  resourceLabel?: string;
  group?: string;
  endpoints?: string[];
}

export interface EffectivePermissionsResult {
  identity: {
    userId?: string;
    name?: string;
    role: string;
    effectiveRole: string;
    roleRaised: boolean;
    positionName: string | null;
    positionDefaultRole: string | null;
    departments: Array<{ id: string; name: string }>;
    subDepartments: Array<{ id: string; name: string }>;
  };
  actions: string[];
  groups: Array<{
    group: string;
    groupName: string;
    resources: Array<{
      code: string;
      label: string;
      endpoints: string[];
      actions: Record<string, { allow: boolean; source: string }>;
    }>;
  }>;
  groupLabels: Record<string, string>;
}

class RuleService {
  async listRules(params?: Record<string, string>): Promise<Rule[]> {
    const res: any = await apiClient.get('/rules', { params });
    // Controller now returns { success, data, pagination } so res.data is the data array
    if (Array.isArray(res.data)) return res.data as Rule[];
    // Paginated envelope (future callers may pass page/limit)
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data as Rule[];
    return res.data as Rule[];
  }

  async listRulesPaginated(params?: Record<string, string>): Promise<{ data: Rule[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
    const res: any = await apiClient.get('/rules', { params });
    if (res.data?.data && Array.isArray(res.data.data)) return res.data as { data: Rule[]; pagination?: { page: number; limit: number; total: number; totalPages: number } };
    return { data: (res.data as Rule[]) ?? [], pagination: (res as any).pagination };
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

  async getEffectivePermissions(params?: Record<string, string>): Promise<EffectivePermissionsResult> {
    const res = await apiClient.get('/rules/effective-permissions', { params });
    return (res as any).data as EffectivePermissionsResult;
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
