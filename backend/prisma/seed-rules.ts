/**
 * seed-rules.ts — Group 4 task 4.2 / 4.3
 *
 * Sinh Rule baseline explicit per Department×Resource (scope=DEPARTMENT).
 *
 * ## Quyết định thiết kế (đã doc theo yêu cầu)
 *
 * - **Không sinh full cross product Position×Resource** (53 × 78 × 8 ≈ 33k rows).
 *   Thay vào đó sinh **1 rule per resource/action per department** với `scope=DEPARTMENT`,
 *   `positionId=null`. Phân tầng chức vụ được biểu diễn qua cột `role`:
 *     - CREATE/READ/UPDATE/EXPORT/IMPORT → role=null (mọi role trong dept được phép)
 *     - APPROVE/REJECT                   → role=TEAM_LEAD (và cao hơn kế thừa via baseline)
 *     - DELETE                           → role=DEPARTMENT_HEAD
 *   `ADMIN` bypass mọi check ở middleware, không cần Rule.
 *
 * - SubDepartment overrides: phase 1 skip (doc lại). Chỉ seed cấp DEPARTMENT.
 *   Nếu cần override ở cấp sub-dept, thêm Rule scope=SUB_DEPARTMENT sau này.
 *
 * - Idempotent: upsert theo unique key
 *   (resourceCode, action, scope, departmentId, subDepartmentId, positionId, role).
 *   Do Postgres `NULL != NULL`, GLOBAL dedup là app-level; ở đây chỉ seed DEPARTMENT
 *   nên không đụng case đó — nhưng vẫn dùng findFirst với IS NULL semantics.
 *
 * - Transaction: gom toàn bộ upsert vào `prisma.$transaction` khi không dry-run.
 *
 * - DRY_RUN: `SEED_RULES_DRY_RUN=1` hoặc `--dry-run` — chỉ in ra số lượng, không ghi DB.
 *
 * - Uncovered resources: resources trong bảng Resource mà không thuộc group nào
 *   trong DEPARTMENT_GROUP_MAP sẽ được báo cáo.
 *
 * Cách chạy:
 *   npx ts-node prisma/seed-rules.ts --dry-run
 *   SEED_RULES_DRY_RUN=1 npx ts-node prisma/seed-rules.ts
 *   npx ts-node prisma/seed-rules.ts   (ghi thật, có transaction)
 */

import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// 7 Departments + 15 SubDepartments — mirror constants in seed.ts
// ---------------------------------------------------------------------------
const DEPARTMENTS = [
  { code: 'DEPT_GENERAL', name: 'Bộ phận tổng hợp' },
  { code: 'DEPT_QUALITY', name: 'Bộ phận chất lượng' },
  { code: 'DEPT_BUSINESS', name: 'Bộ phận kinh doanh' },
  { code: 'DEPT_ACCOUNTING', name: 'Bộ phận kế toán' },
  { code: 'DEPT_PURCHASING', name: 'Bộ phận thu mua' },
  { code: 'DEPT_PRODUCTION', name: 'Bộ phận sản xuất' },
  { code: 'DEPT_TECHNICAL', name: 'Bộ phận kỹ thuật' },
] as const;

// SubDepartment — documented, phase 1 skip (no rules generated at this scope).
// Kept as constant for traceability; phase 2 will add SUB_DEPARTMENT scoped overrides.
const _SUB_DEPARTMENTS = [
  { code: 'SUBDEPT_GENERAL_PRICING', deptCode: 'DEPT_GENERAL' },
  { code: 'SUBDEPT_GENERAL_PARTNERS', deptCode: 'DEPT_GENERAL' },
  { code: 'SUBDEPT_QUALITY_PERSONNEL', deptCode: 'DEPT_QUALITY' },
  { code: 'SUBDEPT_QUALITY_PROCESS', deptCode: 'DEPT_QUALITY' },
  { code: 'SUBDEPT_BUSINESS_INTERNATIONAL', deptCode: 'DEPT_BUSINESS' },
  { code: 'SUBDEPT_BUSINESS_DOMESTIC', deptCode: 'DEPT_BUSINESS' },
  { code: 'SUBDEPT_ACCOUNTING_ADMIN', deptCode: 'DEPT_ACCOUNTING' },
  { code: 'SUBDEPT_ACCOUNTING_TAX', deptCode: 'DEPT_ACCOUNTING' },
  { code: 'SUBDEPT_PURCHASING_MATERIALS', deptCode: 'DEPT_PURCHASING' },
  { code: 'SUBDEPT_PURCHASING_EQUIPMENT', deptCode: 'DEPT_PURCHASING' },
  { code: 'SUBDEPT_PRODUCTION_MANAGEMENT', deptCode: 'DEPT_PRODUCTION' },
  { code: 'SUBDEPT_PRODUCTION_WAREHOUSE', deptCode: 'DEPT_PRODUCTION' },
  { code: 'SUBDEPT_PRODUCTION_DATA', deptCode: 'DEPT_PRODUCTION' },
  { code: 'SUBDEPT_TECHNICAL_QUALITY', deptCode: 'DEPT_TECHNICAL' },
  { code: 'SUBDEPT_TECHNICAL_PROJECTS', deptCode: 'DEPT_TECHNICAL' },
] as const;
void _SUB_DEPARTMENTS;

// ---------------------------------------------------------------------------
// Department → Resource.group mapping
// Covers all 10 groups present in seed-resources.ts so that "uncovered"
// should be 0 unless a new group is added without updating this map.
// ---------------------------------------------------------------------------
const DEPARTMENT_GROUP_MAP: Record<string, string[]> = {
  DEPT_GENERAL: ['system', 'hr'],
  DEPT_QUALITY: ['quality'],
  DEPT_BUSINESS: ['business'],
  DEPT_ACCOUNTING: ['finance'],
  DEPT_PURCHASING: ['purchasing'],
  DEPT_PRODUCTION: ['production', 'warehouse'],
  DEPT_TECHNICAL: ['technical', 'project'],
};

// Fallback RESOURCES (mirrors seed-resources.ts) — used when DB is unreachable
// or for dry-run without DB. Keeps script runnable offline.
const FALLBACK_RESOURCES: Array<{ code: string; group: string }> = [
  { code: 'auth', group: 'system' }, { code: 'users', group: 'system' },
  { code: 'employees', group: 'hr' }, { code: 'departments', group: 'hr' },
  { code: 'positions', group: 'hr' }, { code: 'position-responsibilities', group: 'hr' },
  { code: 'position-levels', group: 'hr' }, { code: 'employee-evaluations', group: 'hr' },
  { code: 'payrolls', group: 'hr' }, { code: 'attendances', group: 'hr' },
  { code: 'attendance-codes', group: 'hr' }, { code: 'holidays', group: 'hr' },
  { code: 'timesheet', group: 'hr' }, { code: 'work-shifts', group: 'hr' },
  { code: 'overtime-plans', group: 'hr' }, { code: 'face-attendance', group: 'hr' },
  { code: 'internal-inspections', group: 'quality' },
  { code: 'material-standards', group: 'production' }, { code: 'processes', group: 'production' },
  { code: 'process-types', group: 'production' }, { code: 'production-processes', group: 'production' },
  { code: 'system-operations', group: 'production' }, { code: 'material-evaluations', group: 'production' },
  { code: 'material-evaluation-criteria', group: 'production' }, { code: 'finished-products', group: 'production' },
  { code: 'quality-evaluations', group: 'production' }, { code: 'production-reports', group: 'production' },
  { code: 'general-costs', group: 'finance' }, { code: 'export-costs', group: 'finance' },
  { code: 'invoices', group: 'finance' }, { code: 'debts', group: 'finance' },
  { code: 'tax-reports', group: 'finance' },
  { code: 'orders', group: 'business' }, { code: 'international-customers', group: 'business' },
  { code: 'international-products', group: 'business' }, { code: 'quotation-requests', group: 'business' },
  { code: 'quotations', group: 'business' }, { code: 'quotation-calculators', group: 'business' },
  { code: 'supply-requests', group: 'purchasing' }, { code: 'purchase-requests', group: 'purchasing' },
  { code: 'suppliers', group: 'purchasing' },
  { code: 'warehouses', group: 'warehouse' }, { code: 'lots', group: 'warehouse' },
  { code: 'lot-products', group: 'warehouse' }, { code: 'warehouse-receipts', group: 'warehouse' },
  { code: 'warehouse-issues', group: 'warehouse' }, { code: 'warehouse-stock', group: 'warehouse' },
  { code: 'inventory', group: 'warehouse' }, { code: 'reorder-rules', group: 'warehouse' },
  { code: 'machine-status-logs', group: 'technical' }, { code: 'repair-requests', group: 'technical' },
  { code: 'machine-systems', group: 'technical' }, { code: 'machine-system-details', group: 'technical' },
  { code: 'fault-templates', group: 'technical' }, { code: 'fault-records', group: 'technical' },
  { code: 'daily-work-reports', group: 'project' }, { code: 'tasks', group: 'project' },
  { code: 'work-plans', group: 'project' }, { code: 'projects', group: 'project' },
  { code: 'maintenance-templates', group: 'technical' }, { code: 'maintenance-plans', group: 'technical' },
  { code: 'maintenance-records', group: 'technical' }, { code: 'spare-parts', group: 'technical' },
  { code: 'acceptance-handovers', group: 'technical' },
  { code: 'private-feedbacks', group: 'system' }, { code: 'leave-requests', group: 'hr' },
  { code: 'customer-feedbacks', group: 'business' }, { code: 'notifications', group: 'system' },
  { code: 'login-history', group: 'system' }, { code: 'audit-logs', group: 'system' },
  { code: 'docs', group: 'system' }, { code: 'system-settings', group: 'system' },
  { code: 'technical-summary', group: 'technical' }, { code: 'data-entry-page-positions', group: 'system' },
  { code: 'lookups', group: 'system' }, { code: 'pricing-overview', group: 'finance' },
  { code: 'rules', group: 'system' }, { code: 'kiosk', group: 'system' },
];

// Action tiers
const TIER_ALL = ['CREATE', 'READ', 'UPDATE', 'EXPORT', 'IMPORT'] as const;
const TIER_LEAD = ['APPROVE', 'REJECT'] as const;
const TIER_HEAD = ['DELETE'] as const;

type TierRole = string | null;
function roleForAction(action: string): TierRole {
  if ((TIER_ALL as readonly string[]).includes(action)) return null;
  if ((TIER_LEAD as readonly string[]).includes(action)) return 'TEAM_LEAD';
  if ((TIER_HEAD as readonly string[]).includes(action)) return 'DEPARTMENT_HEAD';
  return null;
}

export interface SeedRulesOptions {
  dryRun?: boolean;
  prisma?: PrismaClient;
}

export interface SeedRulesResult {
  dryRun: boolean;
  totalRules: number;
  created: number;
  updated: number;
  skipped: number;
  uncoveredResources: Array<{ code: string; group: string }>;
  byDepartment: Array<{ deptCode: string; deptName: string; resourceCount: number; ruleCount: number }>;
}

/**
 * Idempotent seed — upsert Rule baseline per Department×Resource×Action.
 * Exported for use from seed.ts or standalone. Pass dryRun=true to avoid DB writes.
 */
export async function seedRules(opts: SeedRulesOptions = {}): Promise<SeedRulesResult> {
  const dryRun = opts.dryRun ?? false;
  const prisma = opts.prisma ?? new PrismaClient();

  // Resolve departments (DB if reachable, else fallback to constants)
  let deptRows: Array<{ id: string; code: string; name: string }> = [];
  let resourceRows: Array<{ code: string; group: string }> = [];
  let dbReachable = true;

  try {
    const [depts, resources] = await Promise.all([
      prisma.department.findMany({ select: { id: true, code: true, name: true } }),
      prisma.resource.findMany({ select: { code: true, group: true } }),
    ]);
    if (depts.length > 0) deptRows = depts;
    else throw new Error('No departments in DB — using fallback constants');
    resourceRows = resources.length > 0 ? resources : FALLBACK_RESOURCES;
  } catch {
    dbReachable = false;
    // Fallback: synthesize dept rows from constants with placeholder ids
    deptRows = DEPARTMENTS.map((d) => ({ id: `__${d.code}__`, code: d.code, name: d.name }));
    resourceRows = FALLBACK_RESOURCES;
    if (!dryRun) {
      console.warn('[seed-rules] DB unreachable — dry-run simulation with fallback data');
    }
  }

  // Build planned rules
  interface PlannedRule {
    resourceCode: string;
    action: string;
    scope: 'DEPARTMENT';
    departmentId: string;
    deptCode: string;
    role: string | null;
  }

  const planned: PlannedRule[] = [];
  const allActions = [...TIER_ALL, ...TIER_LEAD, ...TIER_HEAD] as string[];

  for (const dept of deptRows) {
    const groups = DEPARTMENT_GROUP_MAP[dept.code] ?? [];
    const deptResources = resourceRows.filter((r) => groups.includes(r.group));
    for (const res of deptResources) {
      for (const action of allActions) {
        planned.push({
          resourceCode: res.code,
          action,
          scope: 'DEPARTMENT',
          departmentId: dept.id,
          deptCode: dept.code,
          role: roleForAction(action),
        });
      }
    }
  }

  // Uncovered resources
  const allMappedGroups = new Set(Object.values(DEPARTMENT_GROUP_MAP).flat());
  const uncoveredResources = resourceRows.filter((r) => !allMappedGroups.has(r.group));

  // By-department summary
  const byDepartment = deptRows.map((dept) => {
    const groups = DEPARTMENT_GROUP_MAP[dept.code] ?? [];
    const rc = resourceRows.filter((r) => groups.includes(r.group)).length;
    return {
      deptCode: dept.code,
      deptName: dept.name,
      resourceCount: rc,
      ruleCount: rc * allActions.length,
    };
  });

  if (dryRun || !dbReachable) {
    const result: SeedRulesResult = {
      dryRun: true,
      totalRules: planned.length,
      created: planned.length,
      updated: 0,
      skipped: 0,
      uncoveredResources,
      byDepartment,
    };
    printReport(result, planned);
    if (!opts.prisma) await prisma.$disconnect();
    return result;
  }

  // Real upsert inside a single interactive transaction (atomic, idempotent).
  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const p of planned) {
      const existing = await tx.rule.findFirst({
        where: {
          resourceCode: p.resourceCode,
          action: p.action as never,
          scope: p.scope as never,
          departmentId: p.departmentId,
          subDepartmentId: null,
          positionId: null,
          role: p.role as never,
        },
      });
      if (existing) {
        if (existing.allow !== true || existing.isActive !== true) {
          await tx.rule.update({ where: { id: existing.id }, data: { allow: true, isActive: true } });
        }
        updated += 1;
      } else {
        await tx.rule.create({
          data: {
            resourceCode: p.resourceCode,
            action: p.action as never,
            scope: p.scope as never,
            departmentId: p.departmentId,
            subDepartmentId: null,
            positionId: null,
            role: p.role as never,
            allow: true,
            isActive: true,
          },
        });
        created += 1;
      }
    }
  });

  const result: SeedRulesResult = {
    dryRun: false,
    totalRules: planned.length,
    created,
    updated,
    skipped: 0,
    uncoveredResources,
    byDepartment,
  };
  printReport(result, planned);
  if (!opts.prisma) await prisma.$disconnect();
  return result;
}

function printReport(result: SeedRulesResult, _planned?: Array<{ resourceCode: string; action: string; deptCode: string; role: string | null }>): void {
  void _planned;
  const tag = result.dryRun ? 'DRY-RUN' : 'SEED';
  console.log(`\n[${tag}] Rule baseline — ${result.totalRules} rules planned`);
  console.log(`  Departments: ${result.byDepartment.length} | Actions per resource: 8 (CREATE/READ/UPDATE/EXPORT/IMPORT + APPROVE/REJECT + DELETE)`);
  for (const d of result.byDepartment) {
    console.log(`  - ${d.deptCode} (${d.deptName}): ${d.resourceCount} resources → ${d.ruleCount} rules`);
  }
  if (!result.dryRun) {
    console.log(`  Created: ${result.created} | Updated: ${result.updated}`);
  }
  if (result.uncoveredResources.length > 0) {
    console.log(`  ⚠ Uncovered resources (${result.uncoveredResources.length}):`);
    for (const r of result.uncoveredResources) console.log(`    - ${r.code} (group=${r.group})`);
  } else {
    console.log('  Uncovered resources: 0');
  }
  console.log('  Tier mapping: CREATE/READ/UPDATE/EXPORT/IMPORT → role=null (all) | APPROVE/REJECT → TEAM_LEAD | DELETE → DEPARTMENT_HEAD');
  console.log('  SubDepartment overrides: skipped (phase 1) — see SUB_DEPARTMENTS doc above');
  if (result.dryRun) console.log('  (dry-run — no DB writes)\n');
}

// CLI entry
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run') || process.env.SEED_RULES_DRY_RUN === '1';
  seedRules({ dryRun })
    .then((r) => {
      console.log(`\nDone. Total: ${r.totalRules} | dryRun=${r.dryRun}`);
    })
    .catch((e) => {
      console.error('seed-rules failed', e);
      process.exit(1);
    });
}
