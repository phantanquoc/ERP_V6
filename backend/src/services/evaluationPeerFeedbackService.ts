/**
 * evaluationPeerFeedbackService.ts
 *
 * Anonymous peer feedback for employee evaluations.
 * Invites: TEAM_LEAD+ only, same subDepartment, 2-3 invitees per evaluation.
 * Submissions are anonymous (no author FK on EvaluationPeerFeedback).
 * Aggregate is only exposed after all invites are resolved and ≥2 submitted.
 */

import crypto from 'crypto';
import prisma from '@config/database';
import logger from '@config/logger';
import { NotFoundError, ValidationError, AuthorizationError } from '@utils/errors';
import { logChange, EvaluationAuditAction } from './evaluationAuditService';
import { UserRole } from '@types';

const PEER_INVITE_EXPIRY_DAYS = 21;
const MIN_INVITES = 2;
const MAX_INVITES = 3;
const MIN_SUBMITTED_FOR_AGGREGATE = 2;

// Opaque 32-byte base64url token
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export class EvaluationPeerFeedbackService {

  // ─── invitePeers ─────────────────────────────────────────────────────────

  async invitePeers(
    evaluationId: string,
    inviteeUserIds: string[],
    invitedByUserId: string
  ): Promise<any[]> {
    // Access: TEAM_LEAD and above only
    const caller = await prisma.user.findUnique({
      where: { id: invitedByUserId },
      select: { role: true, subDepartmentId: true },
    });

    if (!caller) throw new NotFoundError('Không tìm thấy người dùng');

    const allowedRoles = [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD];
    if (!allowedRoles.includes(caller.role as any)) {
      throw new AuthorizationError('Chỉ TEAM_LEAD trở lên mới có thể mời đánh giá đồng nghiệp');
    }

    if (inviteeUserIds.length < MIN_INVITES || inviteeUserIds.length > MAX_INVITES) {
      throw new ValidationError(`Số lượng người được mời phải từ ${MIN_INVITES} đến ${MAX_INVITES}`);
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: {
            user: { select: { id: true, subDepartmentId: true } },
          },
        },
      },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    // Get subject user's subDepartmentId
    const subjectSubDeptId = evaluation.employee.user.subDepartmentId;

    // Validate invitees are same subDepartment
    const invitees = await prisma.user.findMany({
      where: { id: { in: inviteeUserIds } },
      select: { id: true, subDepartmentId: true },
    });

    for (const invitee of invitees) {
      if (invitee.subDepartmentId !== subjectSubDeptId) {
        throw new ValidationError(
          `Người được mời phải thuộc cùng phòng ban con với nhân viên được đánh giá`
        );
      }
    }

    // Check for duplicate invites
    const existing = await prisma.peerFeedbackInvite.findMany({
      where: { evaluationId, inviteeUserId: { in: inviteeUserIds } },
    });
    if (existing.length > 0) {
      throw new ValidationError('Một số người dùng đã được mời cho đánh giá này');
    }

    // Create invites inside transaction with audit log
    return prisma.$transaction(async (tx) => {
      const invites = await Promise.all(
        inviteeUserIds.map(inviteeUserId =>
          tx.peerFeedbackInvite.create({
            data: {
              evaluationId,
              inviteeUserId,
              invitedByUserId,
              status: 'PENDING',
              token: generateInviteToken(),
            },
          })
        )
      );

      await logChange(tx, {
        evaluationId,
        changedByUserId: invitedByUserId,
        action: EvaluationAuditAction.PEER_INVITE,
        field: 'peerInvites',
        oldValue: null,
        newValue: JSON.stringify({ inviteeCount: inviteeUserIds.length }),
      });

      return invites;
    });
  }

  // ─── submitPeerFeedback ────────────────────────────────────────────────────

  async submitPeerFeedback(
    token: string,
    data: { strength: string; weakness: string; suggestion: string },
    _callerUserId: string
  ): Promise<any> {
    const invite = await prisma.peerFeedbackInvite.findUnique({
      where: { token },
    });

    if (!invite) throw new NotFoundError('Không tìm thấy lời mời đánh giá');

    if (invite.status !== 'PENDING') {
      throw new ValidationError(
        invite.status === 'EXPIRED'
          ? 'Lời mời đã hết hạn'
          : invite.status === 'SUBMITTED'
          ? 'Bạn đã gửi phản hồi cho lời mời này rồi'
          : 'Lời mời không còn hiệu lực'
      );
    }

    // Check expiry (PEER_INVITE_EXPIRY_DAYS days from createdAt)
    const daysOld = (Date.now() - invite.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld > PEER_INVITE_EXPIRY_DAYS) {
      // Expire it and throw
      await prisma.peerFeedbackInvite.update({
        where: { token },
        data: { status: 'EXPIRED' },
      });
      throw new ValidationError('Lời mời đã hết hạn');
    }

    return prisma.$transaction(async (tx) => {
      // Create anonymous feedback (no author FK)
      const feedback = await tx.evaluationPeerFeedback.create({
        data: {
          evaluationId: invite.evaluationId,
          strength: data.strength,
          weakness: data.weakness,
          suggestion: data.suggestion,
        },
      });

      // Mark invite as SUBMITTED
      await tx.peerFeedbackInvite.update({
        where: { token },
        data: { status: 'SUBMITTED', respondedAt: new Date() },
      });

      // Audit log with null changedByUserId (anonymous)
      await logChange(tx, {
        evaluationId: invite.evaluationId,
        changedByUserId: null,
        action: EvaluationAuditAction.PEER_SUBMIT,
        field: 'peerFeedback',
        oldValue: null,
        newValue: JSON.stringify({ feedbackId: feedback.id }),
      });

      return feedback;
    });
  }

  // ─── declineInvite ─────────────────────────────────────────────────────────

  async declineInvite(token: string, _callerUserId: string): Promise<any> {
    const invite = await prisma.peerFeedbackInvite.findUnique({ where: { token } });

    if (!invite) throw new NotFoundError('Không tìm thấy lời mời đánh giá');

    if (invite.status !== 'PENDING') {
      throw new ValidationError('Lời mời không còn ở trạng thái chờ');
    }

    return prisma.peerFeedbackInvite.update({
      where: { token },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });
  }

  // ─── expirePendingInvites ──────────────────────────────────────────────────

  async expirePendingInvites(): Promise<{ expired: number }> {
    const cutoff = new Date(Date.now() - PEER_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const result = await prisma.peerFeedbackInvite.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      logger.info(`Expired ${result.count} peer feedback invites`);
    }

    return { expired: result.count };
  }

  // ─── getPeerAggregate ─────────────────────────────────────────────────────

  async getPeerAggregate(evaluationId: string, userId: string): Promise<any> {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        employee: {
          include: { user: { select: { id: true, supervisor2Id: true } } },
        },
        peerInvites: true,
        peerFeedbacks: true,
      },
    });

    if (!evaluation) throw new NotFoundError('Không tìm thấy đánh giá');

    // Access: ADMIN / DEPARTMENT_HEAD / supervisor2 of subject / subject employee themselves
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const subjUser = evaluation.employee.user;
    const isSubjectEmployee = evaluation.employee.userId === userId;

    if (
      currentUser?.role !== UserRole.ADMIN &&
      currentUser?.role !== UserRole.DEPARTMENT_HEAD &&
      !isSubjectEmployee
    ) {
      // Check if caller is supervisor2 of the subject employee
      if (subjUser.supervisor2Id !== userId) {
        throw new AuthorizationError('Không có quyền xem tổng hợp đánh giá đồng nghiệp');
      }
    }

    const invites = evaluation.peerInvites;
    const feedbacks = evaluation.peerFeedbacks;

    // Check threshold: all invites must be resolved (not PENDING) AND ≥2 submitted
    const pendingCount = invites.filter((i: any) => i.status === 'PENDING').length;
    const submittedCount = invites.filter((i: any) => i.status === 'SUBMITTED').length;

    if (pendingCount > 0 || submittedCount < MIN_SUBMITTED_FOR_AGGREGATE) {
      return {
        pending: true,
        respondentCount: submittedCount,
        expectedMinimum: MIN_SUBMITTED_FOR_AGGREGATE,
      };
    }

    return {
      available: true,
      inviteStats: {
        total: invites.length,
        submitted: submittedCount,
        declined: invites.filter((i: any) => i.status === 'DECLINED').length,
        expired: invites.filter((i: any) => i.status === 'EXPIRED').length,
        pending: pendingCount,
      },
      feedbacks: feedbacks.map((f: any) => ({
        id: f.id,
        strength: f.strength,
        weakness: f.weakness,
        suggestion: f.suggestion,
        createdAt: f.createdAt,
      })),
    };
  }
}

export default new EvaluationPeerFeedbackService();
