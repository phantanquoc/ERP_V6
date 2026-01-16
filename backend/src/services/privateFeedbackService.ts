import { PrismaClient, FeedbackType, FeedbackStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface CreatePrivateFeedbackData {
  type: FeedbackType;
  userId: string;
  date?: Date;
  content: string;
  notes?: string;
  purpose?: string; // Chỉ cho GOP_Y
  solution?: string; // Chỉ cho NEU_KHO_KHAN
  attachments?: string[];
}

interface UpdatePrivateFeedbackData {
  content?: string;
  notes?: string;
  purpose?: string;
  solution?: string;
  attachments?: string[];
  status?: FeedbackStatus;
  response?: string;
  respondedBy?: string;
  respondedAt?: Date;
}

interface GetAllParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  userId?: string;
}

export const privateFeedbackService = {
  // Tạo mã tự động
  async generateCode(type: FeedbackType): Promise<string> {
    const prefix = type === 'GOP_Y' ? 'GY' : 'KK';
    
    const lastFeedback = await prisma.privateFeedback.findFirst({
      where: { type },
      orderBy: { createdAt: 'desc' },
      select: { code: true }
    });

    let nextNumber = 1;
    if (lastFeedback?.code) {
      const match = lastFeedback.code.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  },

  // Lấy tất cả feedback với phân trang và filter
  async getAll(params: GetAllParams) {
    const { page = 1, limit = 10, search, type, status, userId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [feedbacks, total] = await Promise.all([
      prisma.privateFeedback.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.privateFeedback.count({ where })
    ]);

    return {
      data: feedbacks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Lấy feedback theo ID
  async getById(id: string) {
    const feedback = await prisma.privateFeedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!feedback) {
      throw new Error('Không tìm thấy feedback');
    }

    return feedback;
  },

  // Lấy feedback theo code
  async getByCode(code: string) {
    const feedback = await prisma.privateFeedback.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!feedback) {
      throw new Error('Không tìm thấy feedback');
    }

    return feedback;
  },

  // Tạo feedback mới
  async create(data: CreatePrivateFeedbackData) {
    const code = await this.generateCode(data.type);

    const feedback = await prisma.privateFeedback.create({
      data: {
        code,
        type: data.type,
        userId: data.userId,
        date: data.date || new Date(),
        content: data.content,
        notes: data.notes,
        purpose: data.purpose,
        solution: data.solution,
        attachments: data.attachments || []
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return feedback;
  },

  // Cập nhật feedback
  async update(id: string, data: UpdatePrivateFeedbackData) {
    const feedback = await prisma.privateFeedback.update({
      where: { id },
      data: {
        content: data.content,
        notes: data.notes,
        purpose: data.purpose,
        solution: data.solution,
        attachments: data.attachments,
        status: data.status,
        response: data.response,
        respondedBy: data.respondedBy,
        respondedAt: data.respondedAt
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return feedback;
  },

  // Xóa feedback
  async delete(id: string) {
    await prisma.privateFeedback.delete({
      where: { id }
    });
  },

  // Thống kê
  async getStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, pending, inProgress, resolved, gopY, neuKhoKhan] = await Promise.all([
      prisma.privateFeedback.count({ where }),
      prisma.privateFeedback.count({ where: { ...where, status: 'PENDING' } }),
      prisma.privateFeedback.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.privateFeedback.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.privateFeedback.count({ where: { ...where, type: 'GOP_Y' } }),
      prisma.privateFeedback.count({ where: { ...where, type: 'NEU_KHO_KHAN' } })
    ]);

    return {
      total,
      byStatus: {
        pending,
        inProgress,
        resolved
      },
      byType: {
        gopY,
        neuKhoKhan
      }
    };
  }
};
