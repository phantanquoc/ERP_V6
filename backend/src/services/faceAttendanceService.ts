import prisma from '@config/database';
import { env } from '@config/env';
import { NotFoundError, ValidationError } from '@utils/errors';
import logger from '@config/logger';
import fs from 'fs';
import path from 'path';

const AI_URL = env.AI_SERVICE_URL;

// ─── AI Service Helpers ──────────────────────────────────────────────────────

async function callAiEnroll(images: string[]): Promise<number[][]> {
  const res = await fetch(`${AI_URL}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new ValidationError(`AI service enroll failed: ${err}`);
  }
  const data = await res.json() as { embeddings: number[][] };
  return data.embeddings;
}

async function callAiVerify(image: string, storedEmbeddings: number[][]): Promise<{ matched: boolean; confidence: number }> {
  const res = await fetch(`${AI_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, stored_embeddings: storedEmbeddings }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI service verify failed: ${err}`);
  }
  return res.json() as Promise<{ matched: boolean; confidence: number }>;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function saveBase64Image(b64: string, dir: string, filename: string): string {
  const data = b64.includes(',') ? b64.split(',')[1] : b64;
  const buffer = Buffer.from(data, 'base64');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class FaceAttendanceService {

  /** Lấy danh sách tất cả employees kèm trạng thái face profile */
  async listProfiles() {
    const employees = await prisma.employee.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        faceProfile: { select: { id: true, isActive: true, enrolledAt: true, images: { select: { id: true } } } },
      },
      orderBy: { employeeCode: 'asc' },
    });

    return employees.map(e => ({
      employeeId: e.id,
      employeeCode: e.employeeCode,
      fullName: `${e.user.lastName} ${e.user.firstName}`,
      email: e.user.email,
      faceProfile: e.faceProfile
        ? {
            id: e.faceProfile.id,
            isActive: e.faceProfile.isActive,
            enrolledAt: e.faceProfile.enrolledAt,
            imageCount: e.faceProfile.images.length,
          }
        : null,
    }));
  }

  /** Enroll face cho nhân viên: nhận ảnh base64, gọi AI lấy embeddings, lưu DB + disk */
  async enrollFace(employeeId: string, images: string[]) {
    if (!images || images.length === 0) {
      throw new ValidationError('Cần ít nhất 1 ảnh để đăng ký khuôn mặt');
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundError('Nhân viên không tồn tại');

    // Gọi AI service lấy embeddings
    logger.info(`Enrolling face for employee ${employeeId}, ${images.length} images`);
    const embeddings = await callAiEnroll(images);

    // Upsert FaceProfile
    const profile = await prisma.faceProfile.upsert({
      where: { employeeId },
      create: { employeeId, isActive: true },
      update: { isActive: true, updatedAt: new Date() },
    });

    // Xóa ảnh cũ và tạo ảnh mới
    await prisma.faceImage.deleteMany({ where: { faceProfileId: profile.id } });

    const uploadDir = path.join(env.UPLOAD_DIR, 'faces', employeeId);
    const created = await Promise.all(
      embeddings.map(async (emb, i) => {
        const filename = `face_${Date.now()}_${i}.jpg`;
        saveBase64Image(images[i], uploadDir, filename);
        return prisma.faceImage.create({
          data: {
            faceProfileId: profile.id,
            imagePath: `faces/${employeeId}/${filename}`,
            embedding: JSON.stringify(emb),
          },
        });
      })
    );

    logger.info(`Enrolled ${created.length} face images for employee ${employeeId}`);
    return { profileId: profile.id, imageCount: created.length };
  }

  /** Thêm biến thể khuôn mặt (ví dụ: có kính) — KHÔNG xoá embeddings cũ */
  async enrollVariation(employeeId: string, images: string[]) {
    if (!images || images.length === 0) {
      throw new ValidationError('Cần ít nhất 1 ảnh để thêm biến thể');
    }

    const profile = await prisma.faceProfile.findUnique({ where: { employeeId } });
    if (!profile) throw new NotFoundError('Nhân viên chưa đăng ký khuôn mặt, hãy đăng ký lần đầu trước');

    logger.info(`Adding face variation for employee ${employeeId}, ${images.length} images`);
    const embeddings = await callAiEnroll(images);

    const uploadDir = path.join(env.UPLOAD_DIR, 'faces', employeeId);
    const created = await Promise.all(
      embeddings.map(async (emb, i) => {
        const filename = `face_var_${Date.now()}_${i}.jpg`;
        saveBase64Image(images[i], uploadDir, filename);
        return prisma.faceImage.create({
          data: {
            faceProfileId: profile.id,
            imagePath: `faces/${employeeId}/${filename}`,
            embedding: JSON.stringify(emb),
          },
        });
      })
    );

    const total = await prisma.faceImage.count({ where: { faceProfileId: profile.id } });
    logger.info(`Added ${created.length} variation images for employee ${employeeId}, total=${total}`);
    return { profileId: profile.id, addedCount: created.length, totalCount: total };
  }

  /** Toggle active/inactive face profile */
  async toggleProfile(profileId: string) {
    const profile = await prisma.faceProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundError('Face profile không tồn tại');

    return prisma.faceProfile.update({
      where: { id: profileId },
      data: { isActive: !profile.isActive },
    });
  }

  /** Xóa face profile */
  async deleteProfile(employeeId: string) {
    const profile = await prisma.faceProfile.findUnique({ where: { employeeId } });
    if (!profile) throw new NotFoundError('Face profile không tồn tại');
    await prisma.faceProfile.delete({ where: { id: profile.id } });
  }

  /**
   * Verify khuôn mặt từ kiosk:
   * - Lấy tất cả active face profiles với embeddings
   * - Gọi AI verify từng profile cho đến khi match
   * - Nếu match: ghi check-in hoặc check-out vào bảng attendances
   */
  async verifyAndRecord(imageB64: string, deviceId?: string, ipAddress?: string) {
    // Lấy tất cả active profiles với embeddings
    const profiles = await prisma.faceProfile.findMany({
      where: { isActive: true },
      include: {
        images: { select: { embedding: true } },
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (profiles.length === 0) {
      return { matched: false, message: 'Chưa có nhân viên nào đăng ký khuôn mặt' };
    }

    let matchedProfile: typeof profiles[0] | null = null;
    let bestConfidence = 0;

    // So khớp lần lượt từng profile
    for (const profile of profiles) {
      const embeddings = profile.images
        .map(img => img.embedding ? JSON.parse(img.embedding) as number[] : null)
        .filter((e): e is number[] => e !== null);

      if (embeddings.length === 0) continue;

      try {
        const result = await callAiVerify(imageB64, embeddings);
        if (result.matched && result.confidence > bestConfidence) {
          matchedProfile = profile;
          bestConfidence = result.confidence;
        }
      } catch (err) {
        logger.warn(`Verify error for profile ${profile.id}: ${err}`);
      }
    }

    const snapshotPath = this.saveSnapshot(imageB64, matchedProfile?.employeeId);

    if (!matchedProfile) {
      await prisma.faceAttendanceLog.create({
        data: {
          action: 'UNRECOGNIZED',
          confidence: bestConfidence,
          snapshotPath,
          deviceId,
          ipAddress,
        },
      });
      return { matched: false, message: 'Không nhận diện được khuôn mặt' };
    }

    const employee = matchedProfile.employee;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tìm bản ghi attendance hôm nay
    const existing = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, attendanceDate: today },
    });

    let action: 'CHECK_IN' | 'CHECK_OUT';
    let attendanceId: string;

    if (!existing) {
      // Chưa check-in hôm nay → tạo check-in
      const attendance = await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          attendanceDate: today,
          checkInTime: new Date(),
          status: 'PRESENT',
        },
      });
      action = 'CHECK_IN';
      attendanceId = attendance.id;
    } else if (existing.checkInTime && !existing.checkOutTime) {
      // Đã check-in, chưa check-out → ghi check-out
      const checkOut = new Date();
      const diffMs = checkOut.getTime() - existing.checkInTime.getTime();
      const workHours = Math.max(0, Math.round((diffMs / 3600000) * 100) / 100);
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkOutTime: checkOut, workHours },
      });
      action = 'CHECK_OUT';
      attendanceId = updated.id;
    } else {
      // Đã có cả check-in lẫn check-out
      await prisma.faceAttendanceLog.create({
        data: {
          faceProfileId: matchedProfile.id,
          employeeId: employee.id,
          action: 'CHECK_OUT',
          confidence: bestConfidence,
          snapshotPath,
          deviceId,
          ipAddress,
          attendanceId: existing.id,
        },
      });
      return {
        matched: true,
        action: 'ALREADY_RECORDED',
        employee: { id: employee.id, fullName: `${employee.user.lastName} ${employee.user.firstName}` },
        confidence: bestConfidence,
        message: 'Hôm nay bạn đã chấm công đầy đủ rồi',
      };
    }

    await prisma.faceAttendanceLog.create({
      data: {
        faceProfileId: matchedProfile.id,
        employeeId: employee.id,
        action,
        confidence: bestConfidence,
        snapshotPath,
        deviceId,
        ipAddress,
        attendanceId,
      },
    });

    return {
      matched: true,
      action,
      employee: { id: employee.id, fullName: `${employee.user.lastName} ${employee.user.firstName}` },
      confidence: bestConfidence,
      message: action === 'CHECK_IN' ? 'Chấm công vào thành công' : 'Chấm công ra thành công',
    };
  }

  /** Validate device API key */
  async validateDevice(apiKey: string): Promise<boolean> {
    const device = await prisma.attendanceDevice.findUnique({ where: { apiKey } });
    return !!(device?.isActive);
  }

  /** Lấy danh sách logs */
  async getLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.faceAttendanceLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          faceProfile: {
            include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
      }),
      prisma.faceAttendanceLog.count(),
    ]);
    return { logs, total, page, limit };
  }

  // ─── Device Management ──────────────────────────────────────────────────

  async listDevices() {
    return prisma.attendanceDevice.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createDevice(name: string, location?: string) {
    return prisma.attendanceDevice.create({ data: { name, location } });
  }

  async toggleDevice(deviceId: string) {
    const device = await prisma.attendanceDevice.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundError('Thiết bị không tồn tại');
    return prisma.attendanceDevice.update({ where: { id: deviceId }, data: { isActive: !device.isActive } });
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private saveSnapshot(imageB64: string, employeeId?: string): string {
    try {
      const dir = path.join(env.UPLOAD_DIR, 'snapshots', employeeId || 'unknown');
      const filename = `snapshot_${Date.now()}.jpg`;
      saveBase64Image(imageB64, dir, filename);
      return `snapshots/${employeeId || 'unknown'}/${filename}`;
    } catch {
      return '';
    }
  }
}

export default new FaceAttendanceService();
