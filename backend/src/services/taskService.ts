import prisma from '@config/database';
import logger from '@config/logger';
import { CreateTaskRequest, UpdateTaskRequest, TaskListQuery, TaskPriority, TaskAcceptanceStatus, AcceptTaskRequest } from '@types';
import { ApiError, NotFoundError, ValidationError } from '@utils/errors';
import { Task } from '@prisma/client';
import notificationService from './notificationService';
import { broadcast } from './websocket';

class TaskService {
  // Helper function to populate task with user information
  private async populateTaskWithUsers(task: Task): Promise<any> {
    try {
      // Get người giao info
      const nguoiGiao = await prisma.user.findUnique({
        where: { id: task.nguoiGiaoId },
        include: { employees: true },
      });

      // Get người nhận info
      const nguoiNhanUsers = await prisma.user.findMany({
        where: { id: { in: task.nguoiNhanIds } },
        include: { employees: true },
      });

      return {
        ...task,
        nguoiGiao: nguoiGiao ? {
          id: nguoiGiao.id,
          firstName: nguoiGiao.firstName,
          lastName: nguoiGiao.lastName,
          employeeCode: nguoiGiao.employees?.employeeCode || '',
          department: nguoiGiao.departmentId || '',
        } : null,
        nguoiNhan: nguoiNhanUsers.map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeCode: user.employees?.employeeCode || '',
          department: user.departmentId || '',
        })),
      };
    } catch (error) {
      logger.error('❌ Error populating task with users:', error);
      // Return task with minimal info if population fails
      return {
        ...task,
        nguoiGiao: null,
        nguoiNhan: [],
      };
    }
  }

  async createTask(data: CreateTaskRequest, nguoiGiaoId: string, files?: string[]): Promise<Task> {
    // Validate người giao exists and get their info
    const nguoiGiao = await prisma.user.findUnique({
      where: { id: nguoiGiaoId },
      include: { employees: true },
    });
    if (!nguoiGiao) {
      throw new NotFoundError('Người giao nhiệm vụ không tồn tại');
    }

    // Validate người nhận exists (data.nguoiNhan contains employee IDs)
    logger.debug('🔍 Received nguoiNhan IDs:', data.nguoiNhan);

    const nguoiNhanEmployees = await prisma.employee.findMany({
      where: { id: { in: data.nguoiNhan } },
      select: { id: true, userId: true },
    });

    logger.debug('✅ Found employees:', nguoiNhanEmployees);

    if (nguoiNhanEmployees.length !== data.nguoiNhan.length) {
      logger.debug(`❌ Mismatch: Expected ${data.nguoiNhan.length}, found ${nguoiNhanEmployees.length}`);
      throw new NotFoundError('Một hoặc nhiều người nhận nhiệm vụ không tồn tại');
    }

    // Extract user IDs from employees
    const nguoiNhanUserIds = nguoiNhanEmployees.map(emp => emp.userId);
    logger.debug('👥 Extracted user IDs:', nguoiNhanUserIds);

    // Validate thời hạn hoàn thành
    const thoiHan = new Date(data.thoiHanHoanThanh);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day

    if (thoiHan < today) {
      throw new ValidationError('Thời hạn hoàn thành phải từ ngày hôm nay trở đi');
    }

    // Initialize trangThaiTiepNhan for all recipients
    const trangThaiTiepNhan: Record<string, string> = {};
    nguoiNhanUserIds.forEach(uid => {
      trangThaiTiepNhan[uid] = TaskAcceptanceStatus.CHUA_TIEP_NHAN;
    });

    const task = await prisma.task.create({
      data: {
        nguoiGiaoId,
        nguoiNhanIds: nguoiNhanUserIds, // Use user IDs instead of employee IDs
        noiDung: data.noiDung,
        thoiHanHoanThanh: thoiHan,
        ghiChu: data.ghiChu,
        files: files || [],
        mucDoUuTien: data.mucDoUuTien as TaskPriority,
        trangThaiTiepNhan,
      },
    });

    // Send notifications to all recipients
    try {
      const assignerName = `${nguoiGiao.firstName} ${nguoiGiao.lastName}`;
      const nguoiNhanEmployeeIds = nguoiNhanEmployees.map(emp => emp.id);

      await notificationService.createTaskNotifications(
        nguoiNhanEmployeeIds,
        task.id,
        data.noiDung,
        assignerName
      );

      // Notify all admins (except the assigner if they're also admin)
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' as any, isActive: true, id: { not: nguoiGiaoId } },
        select: { id: true, employees: { select: { id: true } } },
      });
      const adminEmployeeIds = admins
        .map((a: { id: string; employees: { id: string } | null }) => a.employees?.id)
        .filter((id): id is string => !!id);
      if (adminEmployeeIds.length > 0) {
        await notificationService.createAdminTaskNotification(
          adminEmployeeIds,
          task.id,
          data.noiDung,
          assignerName
        );
      }

      logger.info(`✅ Sent notifications to ${nguoiNhanEmployeeIds.length} recipients, ${adminEmployeeIds.length} admins`);
    } catch (error) {
      logger.error('❌ Error sending task notifications:', error);
      // Don't fail the task creation if notification fails
    }

    // Broadcast to all connected clients so task lists refresh
    broadcast({ type: 'TASK_CHANGED' });

    return task;
  }

  async getAllTasks(query: TaskListQuery): Promise<{ tasks: Task[]; total: number; page: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.noiDung = { contains: query.search, mode: 'insensitive' };
    }

    if (query.mucDoUuTien) {
      where.mucDoUuTien = query.mucDoUuTien;
    }

    if (query.nguoiGiao) {
      where.nguoiGiaoId = query.nguoiGiao;
    }

    if (query.nguoiNhan) {
      where.nguoiNhanIds = { has: query.nguoiNhan };
    }

    // Filter by department
    if (query.department) {
      const usersInDept = await prisma.user.findMany({
        where: { departmentId: query.department },
        select: { id: true },
      });
      const userIds = usersInDept.map(u => u.id);
      where.OR = [
        { nguoiGiaoId: { in: userIds } },
        { nguoiNhanIds: { hasSome: userIds } }
      ];
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { ngayGiao: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Populate tasks with user information
    const populatedTasks = await Promise.all(
      tasks.map(task => this.populateTaskWithUsers(task))
    );

    return {
      tasks: populatedTasks as any,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskById(id: string): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundError('Không tìm thấy nhiệm vụ');
    }

    return this.populateTaskWithUsers(task);
  }

  async updateTask(id: string, data: UpdateTaskRequest, userId: string, files?: string[]): Promise<Task> {
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundError('Không tìm thấy nhiệm vụ');
    }

    // Only người giao can update task details
    if (task.nguoiGiaoId !== userId) {
      // Người nhận cannot update task
      if (!task.nguoiNhanIds.includes(userId)) {
        throw new ApiError(403, 'Bạn không có quyền cập nhật nhiệm vụ này');
      }
      // Người nhận cannot update task anymore
      throw new ApiError(403, 'Chỉ người giao nhiệm vụ mới có quyền cập nhật');
    }

    // Track newly added assignees before update
    const previousAssigneeIds: string[] = task.nguoiNhanIds;
    const newAssigneeIds: string[] = data.nguoiNhan ?? previousAssigneeIds;
    const addedAssigneeUserIds = newAssigneeIds.filter(uid => !previousAssigneeIds.includes(uid));

    // Người giao can update all fields
    const updateData: any = {};
    if (data.nguoiNhan) updateData.nguoiNhanIds = data.nguoiNhan;
    if (data.noiDung) updateData.noiDung = data.noiDung;
    if (data.thoiHanHoanThanh) updateData.thoiHanHoanThanh = new Date(data.thoiHanHoanThanh);
    if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu;
    if (data.mucDoUuTien) updateData.mucDoUuTien = data.mucDoUuTien;
    if (files && files.length > 0) {
      updateData.files = [...task.files, ...files];
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    // Broadcast to all connected clients so task lists refresh
    broadcast({ type: 'TASK_CHANGED' });

    // Notify newly added assignees
    if (addedAssigneeUserIds.length > 0) {
      try {
        const assigner = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Hệ thống';

        const newAssigneeEmployees = await prisma.employee.findMany({
          where: { userId: { in: addedAssigneeUserIds } },
          select: { id: true },
        });
        const newAssigneeEmployeeIds = newAssigneeEmployees.map(e => e.id);

        if (newAssigneeEmployeeIds.length > 0) {
          await notificationService.createTaskNotifications(
            newAssigneeEmployeeIds,
            updatedTask.id,
            updatedTask.noiDung,
            assignerName
          );
        }
      } catch (error) {
        logger.error('❌ Error sending task update notifications:', error);
      }
    }

    return updatedTask;
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundError('Không tìm thấy nhiệm vụ');
    }

    // Only người giao can delete task
    if (task.nguoiGiaoId !== userId) {
      throw new ApiError(403, 'Chỉ người giao nhiệm vụ mới có quyền xóa');
    }

    await prisma.task.delete({
      where: { id },
    });

    // Broadcast to all connected clients so task lists refresh
    broadcast({ type: 'TASK_CHANGED' });
  }

  async getMyTasks(userId: string, query: TaskListQuery): Promise<{ tasks: Task[]; total: number; page: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { nguoiGiaoId: userId },
        { nguoiNhanIds: { has: userId } }
      ]
    };

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { ngayGiao: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Populate tasks with user information
    const populatedTasks = await Promise.all(
      tasks.map(task => this.populateTaskWithUsers(task))
    );

    return {
      tasks: populatedTasks as any,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async acceptTask(taskId: string, userId: string, data: AcceptTaskRequest): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Không tìm thấy nhiệm vụ');
    }

    // Only người nhận can accept/reject
    if (!task.nguoiNhanIds.includes(userId)) {
      throw new ApiError(403, 'Bạn không phải người nhận nhiệm vụ này');
    }

    const currentStatus = (task.trangThaiTiepNhan as Record<string, string>) || {};
    currentStatus[userId] = data.trangThai;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { trangThaiTiepNhan: currentStatus },
    });

    // Broadcast to all connected clients so task lists refresh
    broadcast({ type: 'TASK_CHANGED' });

    // Notify the assigner (nguoiGiao) about acceptance/rejection
    try {
      const [assignee, assignerEmployee] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        }),
        prisma.employee.findFirst({
          where: { userId: task.nguoiGiaoId },
          select: { id: true },
        }),
      ]);

      if (assignerEmployee && assignee) {
        const assigneeName = `${assignee.firstName} ${assignee.lastName}`;
        await notificationService.createTaskAcceptanceNotification(
          assignerEmployee.id,
          taskId,
          task.noiDung,
          assigneeName,
          data.trangThai
        );
      }
    } catch (error) {
      logger.error('❌ Error sending task acceptance notification:', error);
    }

    return this.populateTaskWithUsers(updatedTask);
  }
}

export default new TaskService();

