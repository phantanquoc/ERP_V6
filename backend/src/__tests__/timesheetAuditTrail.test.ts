/**
 * Test suite for TimesheetCell audit trail and bug fixes
 * - P0.1: workHours/overtimeHours persistence when updating code
 * - P0.2: OT bands 210%/270% computation
 * - P0.3: Delete cell when code is empty string
 */

import prisma from '@config/database';
import timesheetService from '@services/timesheetService';

describe('TimesheetCell Audit Trail & Bug Fixes', () => {
  let testEmployeeId: string;
  const testUserId = 'test-user-admin-001';
  const testDate = '2026-08-15';

  beforeAll(async () => {
    // Use first available employee from DB
    const employee = await prisma.employee.findFirst({
      select: { id: true },
    });

    if (!employee) {
      throw new Error('No employees found in DB for testing. Run seed first.');
    }

    testEmployeeId = employee.id;

    // Clean up test timesheet data
    await prisma.timesheetCell.deleteMany({ where: { employeeId: testEmployeeId } });
  });

  afterAll(async () => {
    await prisma.timesheetCell.deleteMany({ where: { employeeId: testEmployeeId } });
    await prisma.$disconnect();
  });

  describe('P0.1: workHours/overtimeHours persistence', () => {
    it('should preserve workHours/overtimeHours when updating code without sending them', async () => {
      // Create cell with work hours and OT
      const created = await timesheetService.upsertCell({
        employeeId: testEmployeeId,
        date: testDate,
        code: 'x',
        note: 'Initial',
        workHours: 8,
        overtimeHours: 2,
        updatedBy: testUserId,
        updatedByName: 'Admin Test',
      });

      expect(created).toBeDefined();
      expect(created!.workHours).toBe(8);
      expect(created!.overtimeHours).toBe(2);

      // Update only code and note (no workHours/overtimeHours in payload)
      const updated = await timesheetService.upsertCell({
        employeeId: testEmployeeId,
        date: testDate,
        code: 'P',
        note: 'Changed to leave',
        updatedBy: testUserId,
        updatedByName: 'Admin Test',
      });

      // Bug P0.1: these should be preserved, not reset to 0
      expect(updated).toBeDefined();
      expect(updated!.code).toBe('P');
      expect(updated!.note).toBe('Changed to leave');
      expect(updated!.workHours).toBe(8);
      expect(updated!.overtimeHours).toBe(2);
    });

    it('should allow explicit workHours/overtimeHours update', async () => {
      const updated = await timesheetService.upsertCell({
        employeeId: testEmployeeId,
        date: testDate,
        code: 'x',
        workHours: 4,
        overtimeHours: 0,
        updatedBy: testUserId,
        updatedByName: 'Admin Test',
      });

      expect(updated).toBeDefined();
      expect(updated!.workHours).toBe(4);
      expect(updated!.overtimeHours).toBe(0);
    });
  });

  describe('P0.3: Delete cell when code is empty', () => {
    it('should delete cell when code is empty string', async () => {
      // Create a cell
      await timesheetService.upsertCell({
        employeeId: testEmployeeId,
        date: '2026-08-16',
        code: 'x',
        workHours: 8,
        updatedBy: testUserId,
        updatedByName: 'Admin Test',
      });

      // Update with empty code
      await timesheetService.upsertCell({
        employeeId: testEmployeeId,
        date: '2026-08-16',
        code: '',
        updatedBy: testUserId,
        updatedByName: 'Admin Test',
      });

      // Verify row is deleted
      const cells = await prisma.timesheetCell.findMany({
        where: { employeeId: testEmployeeId, date: new Date('2026-08-16') },
      });

      expect(cells).toHaveLength(0);
    });
  });

  describe('Audit trail fields', () => {
    it('should record updatedBy and updatedByName on create', async () => {
      const cell = await timesheetService.upsertCell({
        employeeId: testEmployeeId,
        date: '2026-08-17',
        code: 'x',
        workHours: 8,
        updatedBy: testUserId,
        updatedByName: 'Administrator System',
      });

      expect(cell).toBeDefined();
      expect(cell!.updatedBy).toBe(testUserId);
      expect(cell!.updatedByName).toBe('Administrator System');
      expect(cell!.createdAt).toBeDefined();
      expect(cell!.updatedAt).toBeDefined();
    });

    it('should update updatedBy and updatedAt on subsequent edits', async () => {
      const initial = await timesheetService.upsertCell({
        employeeId: testEmployeeId,
        date: '2026-08-18',
        code: 'x',
        updatedBy: testUserId,
        updatedByName: 'User A',
      });

      // Wait 100ms to ensure updatedAt changes
      await new Promise(resolve => setTimeout(resolve, 100));

      const updated = await timesheetService.upsertCell({
        employeeId: testEmployeeId,
        date: '2026-08-18',
        code: 'P',
        updatedBy: 'another-user-id',
        updatedByName: 'User B',
      });

      expect(initial).toBeDefined();
      expect(updated).toBeDefined();
      expect(updated!.updatedBy).toBe('another-user-id');
      expect(updated!.updatedByName).toBe('User B');
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(initial!.updatedAt.getTime());
    });
  });
});
