import prisma from '@config/database';
import { NotificationType } from '@types';
import { ValidationError } from '@utils/errors';

const VALID_NOTIFICATION_TYPES = new Set<string>(Object.values(NotificationType));

export class NotificationPreferencesService {
  /**
   * Get all notification preferences for a user, ordered by type.
   */
  async getForUser(userId: string) {
    return prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { notificationType: 'asc' },
    });
  }

  /**
   * Upsert multiple notification preferences for a user.
   * Validates each notificationType against known values.
   * Returns the updated list.
   */
  async updateMany(
    userId: string,
    items: Array<{ notificationType: string; muted: boolean }>
  ) {
    // Validate all types before any DB writes
    for (const item of items) {
      if (!VALID_NOTIFICATION_TYPES.has(item.notificationType)) {
        throw new ValidationError(
          `Loại thông báo không hợp lệ: ${item.notificationType}`
        );
      }
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.notificationPreference.upsert({
          where: {
            userId_notificationType: {
              userId,
              notificationType: item.notificationType,
            },
          },
          update: { muted: item.muted },
          create: {
            userId,
            notificationType: item.notificationType,
            muted: item.muted,
          },
        })
      )
    );

    return this.getForUser(userId);
  }
}

export default new NotificationPreferencesService();
