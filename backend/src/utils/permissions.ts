import prisma from '@config/database';
import { AuthorizationError } from '@utils/errors';
import type { AuthenticatedRequest } from '@types';

/**
 * Assert that the requesting user belongs to one of the allowed departments
 * (by department `code`, e.g. 'DEPT_QUALITY').
 *
 * - ADMIN bypasses the check.
 * - When the user has no `departmentId`, request is rejected.
 * - Resolves `departmentCode` via a DB lookup on `Department.id`, because
 *   the JWT payload only carries `departmentId` (design.md Decision 4).
 */
export async function assertDepartment(
  req: AuthenticatedRequest,
  allowedCodes: string[]
): Promise<void> {
  const user = req.user;
  if (!user) {
    throw new AuthorizationError('Chưa xác thực');
  }

  if (user.role === 'ADMIN') {
    return;
  }

  if (!user.departmentId) {
    throw new AuthorizationError('Không có quyền truy cập: người dùng chưa được gán bộ phận');
  }

  const department = await prisma.department.findUnique({
    where: { id: user.departmentId },
    select: { code: true },
  });

  if (!department || !allowedCodes.includes(department.code)) {
    throw new AuthorizationError('Không có quyền truy cập: bộ phận không được phép thao tác');
  }
}

/**
 * Slugify a Vietnamese name to an uppercase code suitable for enum-like columns.
 * Strips diacritics via NFD normalization, replaces non-alphanumeric characters
 * with underscore, uppercases the whole string, and prefixes with `${prefix}_`.
 *
 * @example slugifyToUpperCode('Kiểm định chất lượng', 'PROCTYPE') // 'PROCTYPE_KIEM_DINH_CHAT_LUONG'
 */
export function slugifyToUpperCode(name: string, prefix: string): string {
  if (!name || !name.trim()) {
    throw new Error('slugifyToUpperCode: name is required');
  }
  if (!prefix || !prefix.trim()) {
    throw new Error('slugifyToUpperCode: prefix is required');
  }

  const stripped = name
    .normalize('NFD')
    // Combining diacritics range
    .replace(/[̀-ͯ]/g, '')
    // Vietnamese-specific đ/Đ
    .replace(/[đĐ]/g, 'd');

  const slug = stripped
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  if (!slug) {
    throw new Error('slugifyToUpperCode: name produced empty slug');
  }

  return `${prefix}_${slug}`;
}
