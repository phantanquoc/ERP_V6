/**
 * Meeting Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Business logic for Meeting management.
 *
 * Responsibilities:
 *   • create()        — create meeting + participants, notify each participant
 *   • getAll()        — paginated list with filters
 *   • getById()       — full meeting detail with participants
 *   • update()        — creator/ADMIN only; notify on CANCELLED
 *   • delete()        — SCHEDULED meetings only; creator/ADMIN only
 *   • getMyMeetings() — meetings for a specific employee
 *   • confirmAttendance() — employee confirms/declines participation
 *   • checkUpcomingReminders() — scheduler: notify participants 15 min before
 *
 * ⚠️ Side effects: creates Notification records for all participants
 * ⚠️ Side effects: broadcasts MEETING_CHANGED after write operations
 * ─────────────────────────────────────────────────────────────────────────────
 */

import prisma from '@config/database';
import logger from '@config/logger';
import { broadcast } from './websocket';
import notificationService from './notificationService';
import { NotificationType } from '@types';
import { NotFoundError, ValidationError, AuthorizationError } from '@utils/errors';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface CreateMeetingInput {
  title: string;
  agenda?: string;
  meetingDate: Date;
  startTime: string;  // "HH:mm"
  endTime: string;    // "HH:mm"
  room?: string;
  notes?: string;
  departmentId?: string;
  participantIds: string[];  // employee IDs
}

export interface UpdateMeetingInput {
  title?: string;
  agenda?: string;
  meetingDate?: Date;
  startTime?: string;
  endTime?: string;
  room?: string;
  notes?: string;
  status?: string;
  participantIds?: string[];
}

export interface MeetingQuery {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────────────────────────────────────────

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

export class MeetingService {
  /**
   * Creates a new meeting, adds participants, and notifies them.
   *
   * @throws ValidationError — endTime ≤ startTime, or meetingDate in the past
   * @throws NotFoundError    — a participant employee does not exist
   */
  async create(input: CreateMeetingInput, createdByUserId: string): Promise<any> {
    const { title, agenda, meetingDate, startTime, endTime, room, notes, departmentId, participantIds } = input;

    // Validate time range
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (endMin <= startMin) {
      throw new ValidationError('Giờ kết thúc phải sau giờ bắt đầu');
    }

    // Validate date is today or in the future
    const meetingDateObj = new Date(meetingDate);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (meetingDateObj < todayStart) {
      throw new ValidationError('Ngày họp phải từ hôm nay trở đi');
    }

    // Validate participants exist
    if (participantIds.length > 0) {
      const count = await prisma.employee.count({ where: { id: { in: participantIds } } });
      if (count !== participantIds.length) {
        throw new NotFoundError('Một hoặc nhiều người tham gia không tồn tại');
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        agenda,
        meetingDate: meetingDateObj,
        startTime,
        endTime,
        room,
        notes,
        departmentId,
        createdBy: createdByUserId,
        participants: {
          create: participantIds.map((eid) => ({ employeeId: eid })),
        },
      },
      include: {
        participants: { include: { employee: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } } },
      },
    });

    // Notify each participant
    for (const p of meeting.participants) {
      const userId = p.employee.user.id;
      await notificationService.createNotification({
        userId,
        type: NotificationType.MEETING_CREATED,
        title: 'Bạn được mời tham cuộc họp',
        message: `Cuộc họp "${title}" vào ${meetingDateObj.toLocaleDateString('vi-VN')} lúc ${startTime}. Phòng: ${room || 'Không xác định'}.`,
        meetingId: meeting.id,
      });
    }

    broadcast({ type: 'MEETING_CHANGED' });
    return meeting;
  }

  /**
   * Builds a where-clause from query filters (shared between getAll / getMyMeetings).
   */
  private buildWhere(query: MeetingQuery): any {
    const where: any = {};
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.startDate) where.meetingDate = { ...where.meetingDate, gte: new Date(query.startDate) };
    if (query.endDate) where.meetingDate = { ...where.meetingDate, lte: new Date(query.endDate + 'T23:59:59') };
    return where;
  }

  /**
   * Batch-fetches creator user info for a list of meetings.
   */
  private async batchFetchCreators(createdByIds: string[]): Promise<Record<string, { firstName: string; lastName: string }>> {
    const unique = [...new Set(createdByIds)];
    if (unique.length === 0) return {};
    const users = await (prisma as any).user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true },
    });
    return Object.fromEntries(users.map((u: any) => [u.id, { firstName: u.firstName, lastName: u.lastName }]));
  }

  /**
   * Maps a raw Prisma meeting record to the public DTO.
   */
  private mapMeetingDto(m: any, creatorMap: Record<string, { firstName: string; lastName: string }>): any {
    return {
      id: m.id,
      title: m.title,
      agenda: m.agenda,
      meetingDate: m.meetingDate,
      startTime: m.startTime,
      endTime: m.endTime,
      room: m.room,
      notes: m.notes,
      status: m.status,
      departmentId: m.departmentId,
      createdBy: m.createdBy,
      creator: creatorMap[m.createdBy] || null,
      participants: (m.participants || []).map((p: any) => ({
        id: p.id,
        employeeId: p.employeeId,
        isConfirmed: p.isConfirmed,
        employee: {
          id: p.employee?.id,
          employeeCode: p.employee?.employeeCode,
          user: {
            firstName: p.employee?.user?.firstName || '',
            lastName: p.employee?.user?.lastName || '',
          },
        },
      })),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }

  /**
   * Paginated list of meetings with optional filters.
   */
  async getAll(query: MeetingQuery): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const pageNum = Math.max(1, parseInt(String(query.page || 1), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(query.limit || 10), 10)));
    const skip = (pageNum - 1) * limitNum;
    const where = this.buildWhere(query);

    const [total, meetings] = await Promise.all([
      prisma.meeting.count({ where }),
      prisma.meeting.findMany({
        where,
        include: {
          participants: {
            include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
        orderBy: { meetingDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const creatorMap = await this.batchFetchCreators(meetings.map((m) => m.createdBy));
    const data = meetings.map((m) => this.mapMeetingDto(m, creatorMap));

    return { data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  /**
   * Full meeting detail including participant list.
   *
   * @throws NotFoundError — meeting does not exist
   */
  async getById(id: string): Promise<any> {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            employee: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                subDepartment: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundError('Không tìm thấy cuộc họp');
    }

    return {
      ...meeting,
      participants: meeting.participants.map((p) => ({
        id: p.id,
        employeeId: p.employeeId,
        employeeCode: p.employee.employeeCode,
        employeeName: `${p.employee.user.firstName} ${p.employee.user.lastName}`.trim(),
        subDepartmentName: p.employee.subDepartment?.name || '',
        isConfirmed: p.isConfirmed,
      })),
    };
  }

  /**
   * Updates a meeting. Only creator or ADMIN can update.
   * If status changes to CANCELLED, notifies all participants.
   */
  async update(id: string, input: UpdateMeetingInput, userId: string, userRole: string): Promise<any> {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundError('Không tìm thấy cuộc họp');

    const isCreator = meeting.createdBy === userId;
    const isAdmin = userRole === 'ADMIN';
    if (!isCreator && !isAdmin) {
      throw new AuthorizationError('Chỉ người tạo hoặc Admin mới có quyền cập nhật cuộc họp');
    }

    const wasCancelled = meeting.status === 'CANCELLED';
    if (wasCancelled) {
      throw new ValidationError('Không thể cập nhật cuộc họp đã bị hủy');
    }

    // Validate time if both provided
    const startTime = input.startTime ?? meeting.startTime;
    const endTime = input.endTime ?? meeting.endTime;
    if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
      throw new ValidationError('Giờ kết thúc phải sau giờ bắt đầu');
    }

    const updateData: any = { ...input };
    delete updateData.participantIds; // handle separately

    // Handle participant list update
    if (input.participantIds !== undefined) {
      // Remove existing and recreate
      await prisma.meetingParticipant.deleteMany({ where: { meetingId: id } });
      await prisma.meetingParticipant.createMany({
        data: input.participantIds.map((eid) => ({ meetingId: id, employeeId: eid })),
      });
    }

    const updated = await prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        participants: {
          include: { employee: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
        },
      },
    });

    // Notify if cancelled
    if (input.status === 'CANCELLED') {
      for (const p of updated.participants) {
        await notificationService.createNotification({
          userId: p.employee.user.id,
          type: NotificationType.MEETING_CANCELLED,
          title: 'Cuộc họp đã bị hủy',
          message: `Cuộc họp "${updated.title}" đã bị hủy.`,
          meetingId: id,
        });
      }
    } else {
      // Notify all participants of update
      for (const p of updated.participants) {
        await notificationService.createNotification({
          userId: p.employee.user.id,
          type: NotificationType.MEETING_UPDATED,
          title: 'Cuộc họp đã được cập nhật',
          message: `Cuộc họp "${updated.title}" đã được cập nhật thông tin.`,
          meetingId: id,
        });
      }
    }

    broadcast({ type: 'MEETING_CHANGED' });
    return updated;
  }

  /**
   * Deletes a meeting. Only SCHEDULED meetings can be deleted, by creator or ADMIN.
   */
  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundError('Không tìm thấy cuộc họp');

    if (meeting.status !== 'SCHEDULED') {
      throw new ValidationError('Chỉ có thể xóa cuộc họp ở trạng thái SCHEDULED');
    }

    const isCreator = meeting.createdBy === userId;
    const isAdmin = userRole === 'ADMIN';
    if (!isCreator && !isAdmin) {
      throw new AuthorizationError('Chỉ người tạo hoặc Admin mới có quyền xóa cuộc họp');
    }

    await prisma.meeting.delete({ where: { id } });
    broadcast({ type: 'MEETING_CHANGED' });
  }

  /**
   * Returns meetings where the given employee is a participant.
   */
  async getMyMeetings(
    employeeId: string,
    query: MeetingQuery
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const pageNum = Math.max(1, parseInt(String(query.page || 1), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(query.limit || 10), 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { participants: { some: { employeeId } } };
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
    if (query.status) where.status = query.status;
    if (query.startDate) where.meetingDate = { ...where.meetingDate, gte: new Date(query.startDate) };
    if (query.endDate) where.meetingDate = { ...where.meetingDate, lte: new Date(query.endDate + 'T23:59:59') };

    const [total, meetings] = await Promise.all([
      prisma.meeting.count({ where }),
      prisma.meeting.findMany({
        where,
        include: {
          participants: {
            include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
        orderBy: { meetingDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const creatorMap = await this.batchFetchCreators(meetings.map((m) => m.createdBy));
    const data = meetings.map((m) => this.mapMeetingDto(m, creatorMap));

    return { data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  /**
   * Employee confirms or declines participation.
   */
  async confirmAttendance(meetingId: string, employeeId: string, isConfirmed: boolean): Promise<any> {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundError('Không tìm thấy cuộc họp');

    const participant = await prisma.meetingParticipant.findUnique({
      where: { meetingId_employeeId: { meetingId, employeeId } },
    });
    if (!participant) throw new NotFoundError('Bạn không có trong danh sách tham dự cuộc họp này');

    const updated = await prisma.meetingParticipant.update({
      where: { meetingId_employeeId: { meetingId, employeeId } },
      data: { isConfirmed },
    });

    broadcast({ type: 'MEETING_CHANGED' });
    return updated;
  }

  /**
   * Scheduler job: find meetings starting in the next ~15 minutes where reminder
   * has not been sent yet, notify participants, and mark reminderSentAt.
   *
   * Runs every minute via setInterval in index.ts.
   */
  async checkUpcomingReminders(): Promise<void> {
    const now = new Date();
    const in15Min = new Date(now.getTime() + 16 * 60 * 1000); // check meetings in next 16 min
    const in1Min = new Date(now.getTime() + 1 * 60 * 1000);

    try {
      const meetings = await prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          reminderSentAt: null,
          meetingDate: { gte: in1Min, lte: in15Min },
        },
        include: {
          participants: {
            include: { employee: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
          },
        },
      });

      for (const meeting of meetings) {
        // Parse meeting start time to check if it really starts within 15 min
        const [h, m] = meeting.startTime.split(':').map(Number);
        const startDateTime = new Date(meeting.meetingDate);
        startDateTime.setHours(h, m, 0, 0);

        const diffMin = (startDateTime.getTime() - now.getTime()) / 60_000;
        if (diffMin < 14 || diffMin > 16) continue; // skip if not within reminder window

        for (const p of meeting.participants) {
          await notificationService.createNotification({
            userId: p.employee.user.id,
            type: NotificationType.MEETING_REMINDER,
            title: '🔔 Nhắc nhở: Cuộc họp sắp bắt đầu',
            message: `Cuộc họp "${meeting.title}" bắt đầu sau khoảng 15 phút. Phòng: ${meeting.room || 'Không xác định'}.`,
            meetingId: meeting.id,
          });
        }

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { reminderSentAt: now },
        });

        logger.info(`Meeting reminder sent for meeting: ${meeting.id}`);
      }
    } catch (error) {
      logger.error('Error in checkUpcomingReminders:', error);
    }
  }
}

export default new MeetingService();
