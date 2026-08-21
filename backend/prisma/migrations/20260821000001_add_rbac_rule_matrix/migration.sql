-- Migration for RBAC Rule Matrix (applied via db push, not migrate dev, due to baseline drift)
-- Tables: resources, rules, rule_audit_logs, delegations; columns: positions.defaultRole, user_secondary_departments.positionId
-- This file is for record-keeping; actual DB sync was done via prisma db push.
SELECT 1;
