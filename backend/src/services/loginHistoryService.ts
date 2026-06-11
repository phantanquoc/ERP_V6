import prisma from '@config/database';
import { getCursorPaginationParams, encodeCursor } from '@utils/helpers';
import type { CursorPaginatedResponse } from '@types';

export class LoginHistoryService {
  /**
   * Create a login history record
   */
  async createLoginHistory(data: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
    browser?: string;
    location?: string;
    status: 'success' | 'failed';
  }): Promise<any> {
    const loginHistory = await prisma.loginHistory.create({
      data: {
        userId: data.userId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        device: data.device,
        browser: data.browser,
        location: data.location,
        status: data.status,
      },
    });

    return loginHistory;
  }

  /**
   * Get login history for a specific user
   */
  async getUserLoginHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: any[]; total: number }> {
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    const [data, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where: { userId },
        orderBy: { loginAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          device: true,
          browser: true,
          location: true,
          status: true,
          loginAt: true,
        },
      }),
      prisma.loginHistory.count({
        where: { userId },
      }),
    ]);

    return { data, total };
  }

  /**
   * Get all login history (admin only)
   */
  async getAllLoginHistory(options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    status?: 'success' | 'failed';
  }): Promise<{ data: any[]; total: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const where: any = {};
    if (options?.userId) {
      where.userId = options.userId;
    }
    if (options?.status) {
      where.status = options.status;
    }

    const [data, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where,
        orderBy: { loginAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.loginHistory.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Delete old login history records (cleanup)
   */
  async deleteOldRecords(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.loginHistory.deleteMany({
      where: {
        loginAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  async getUserLoginHistoryCursor(
    userId: string,
    cursor?: string,
    limit?: number
  ): Promise<CursorPaginatedResponse<any>> {
    const { cursorPayload, take } = getCursorPaginationParams(cursor, limit);

    const where: any = { userId };

    if (cursorPayload) {
      where.OR = [
        { loginAt: { lt: new Date(cursorPayload.createdAt) } },
        { loginAt: new Date(cursorPayload.createdAt), id: { lt: cursorPayload.id } },
      ];
    }

    const rows = await prisma.loginHistory.findMany({
      where,
      orderBy: [{ loginAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        device: true,
        browser: true,
        location: true,
        status: true,
        loginAt: true,
      },
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.loginAt, last.id) : null;

    return { data, nextCursor, hasMore };
  }

  async getAllLoginHistoryCursor(options?: {
    cursor?: string;
    limit?: number;
    userId?: string;
    status?: 'success' | 'failed';
  }): Promise<CursorPaginatedResponse<any>> {
    const { cursorPayload, take } = getCursorPaginationParams(options?.cursor, options?.limit ?? 50);

    const where: any = {};
    if (options?.userId) where.userId = options.userId;
    if (options?.status) where.status = options.status;

    if (cursorPayload) {
      const cursorCondition = [
        { loginAt: { lt: new Date(cursorPayload.createdAt) } },
        { loginAt: new Date(cursorPayload.createdAt), id: { lt: cursorPayload.id } },
      ];
      where.OR = cursorCondition;
    }

    const rows = await prisma.loginHistory.findMany({
      where,
      orderBy: [{ loginAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.loginAt, last.id) : null;

    return { data, nextCursor, hasMore };
  }
}

export default new LoginHistoryService();

