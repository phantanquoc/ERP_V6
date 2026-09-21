-- D13: Add composite (planId, createdAt DESC) index for log history queries.
-- Single-column indexes on inboundPlanId/outboundPlanId already exist from
-- 20260918100000; this adds the composite so ORDER BY createdAt DESC can use
-- an index scan instead of sort. No data change, safe to apply.

CREATE INDEX "inbound_plan_logs_inboundPlanId_createdAt_idx" ON "business"."inbound_plan_logs"("inboundPlanId", "createdAt" DESC);
CREATE INDEX "outbound_plan_logs_outboundPlanId_createdAt_idx" ON "business"."outbound_plan_logs"("outboundPlanId", "createdAt" DESC);
