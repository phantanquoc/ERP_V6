import prisma from '@config/database';
import { env } from '@config/env';
import { NotFoundError, ValidationError } from '@utils/errors';
import logger from '@config/logger';
import fs from 'fs';
import path from 'path';

const AI_URL = env.AI_SERVICE_URL;

// ─── Embedding Cache ─────────────────────────────────────────────────────────
// Caches ALL active embeddings in memory to avoid DB round-trip on every verify.
// Invalidated on enroll/delete. TTL: 5 minutes as safety net.

interface CachedProfile {
  id: string;
  employeeId: string;
  employee: { id: string; employeeCode: string; user: { firstName: string; lastName: string } };
  embeddings: number[][];  // pre-parsed, pre-normalized unit vectors
}

let embeddingCache: CachedProfile[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

function normalizeVec(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map(x => x / norm);
}

async function getEmbeddingCache(): Promise<CachedProfile[]> {
  if (embeddingCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return embeddingCache;
  }
  const profiles = await prisma.faceProfile.findMany({
    where: { isActive: true },
    include: {
      images: { select: { embedding: true } },
      employee: {
        select: {
          id: true,
          employeeCode: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  embeddingCache = profiles
    .map(p => ({
      id: p.id,
      employeeId: p.employeeId,
      employee: p.employee,
      // Pre-parse + pre-normalize all embeddings so verify is pure math
      embeddings: p.images
        .map(img => img.embedding ? normalizeVec(JSON.parse(img.embedding) as number[]) : null)
        .filter((e): e is number[] => e !== null),
    }))
    .filter(p => p.embeddings.length > 0);
  cacheTimestamp = Date.now();
  logger.info(`Embedding cache refreshed: ${embeddingCache.length} profiles`);
  return embeddingCache;
}

export function invalidateEmbeddingCache() {
  embeddingCache = null;
  cacheTimestamp = 0;
}

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

interface AiBatchVerifyResult {
  matched: boolean;
  profile_id: string | null;
  confidence: number;
  vote_count: number;
  message: string;
}

async function callAiBatchVerify(
  imageFaceCrop: string,
  profiles: Array<{ profile_id: string; embeddings: number[][] }>
): Promise<AiBatchVerifyResult> {
  const res = await fetch(`${AI_URL}/verify-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageFaceCrop, profiles, anti_spoofing: false }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI service verify failed: ${err}`);
  }
  return res.json() as Promise<AiBatchVerifyResult>;
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
    invalidateEmbeddingCache();
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
    invalidateEmbeddingCache();
    return { profileId: profile.id, addedCount: created.length, totalCount: total };
  }

  /** Toggle active/inactive face profile */
  async toggleProfile(profileId: string) {
    const profile = await prisma.faceProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundError('Face profile không tồn tại');

    const result = await prisma.faceProfile.update({
      where: { id: profileId },
      data: { isActive: !profile.isActive },
    });
    invalidateEmbeddingCache();
    return result;
  }

  /** Xóa face profile */
  async deleteProfile(employeeId: string) {
    const profile = await prisma.faceProfile.findUnique({ where: { employeeId } });
    if (!profile) throw new NotFoundError('Face profile không tồn tại');
    await prisma.faceProfile.delete({ where: { id: profile.id } });
    invalidateEmbeddingCache();
  }

  /**
   * Verify khuôn mặt từ kiosk (optimized):
   * 1. Load embeddings từ cache (không query DB mỗi lần)
   * 2. Gọi AI service 1 lần duy nhất với TẤT CẢ profiles (batch)
   * 3. AI dùng vectorized cosine similarity với opencv detector (10x nhanh hơn retinaface)
   */
  async verifyAndRecord(imageB64: string, deviceId?: string, ipAddress?: string) {
    const cachedProfiles = await getEmbeddingCache();

    if (cachedProfiles.length === 0) {
      return { matched: false, message: 'Chưa có nhân viên nào đăng ký khuôn mặt' };
    }

    // Single batch call: AI extracts probe embedding once, compares against all profiles
    const aiResult = await callAiBatchVerify(
      imageB64,
      cachedProfiles.map(p => ({ profile_id: p.id, embeddings: p.embeddings }))
    );

    const snapshotPath = this.saveSnapshot(imageB64, aiResult.profile_id ?? undefined);
    const matchedCached = aiResult.matched && aiResult.profile_id
      ? cachedProfiles.find(p => p.id === aiResult.profile_id) ?? null
      : null;
    const bestConfidence = aiResult.confidence;

    if (!matchedCached) {
      await prisma.faceAttendanceLog.create({
        data: { action: 'UNRECOGNIZED', confidence: bestConfidence, snapshotPath, deviceId, ipAddress },
      });
      return { matched: false, message: 'Không nhận diện được khuôn mặt' };
    }

    // Load employee data (not in cache to keep cache lean)
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: matchedCached.employeeId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        subDepartment: { select: { name: true } },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: { employeeId: employee.id, attendanceDate: today },
    });

    let action: 'CHECK_IN' | 'CHECK_OUT';
    let attendanceId: string;

    if (!existing) {
      const attendance = await prisma.attendance.create({
        data: { employeeId: employee.id, attendanceDate: today, checkInTime: new Date(), status: 'PRESENT' },
      });
      action = 'CHECK_IN';
      attendanceId = attendance.id;
    } else if (existing.checkInTime && !existing.checkOutTime) {
      const checkOut = new Date();
      const workHours = Math.max(0, Math.round(
        ((checkOut.getTime() - existing.checkInTime.getTime()) / 3600000) * 100
      ) / 100);
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkOutTime: checkOut, workHours },
      });
      action = 'CHECK_OUT';
      attendanceId = updated.id;
    } else {
      await prisma.faceAttendanceLog.create({
        data: {
          faceProfileId: matchedCached.id,
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
        employee: {
          id: employee.id,
          fullName: `${employee.user.lastName} ${employee.user.firstName}`,
          employeeCode: employee.employeeCode,
          department: employee.subDepartment?.name ?? null,
        },
        confidence: bestConfidence,
        message: 'Hôm nay bạn đã chấm công đầy đủ rồi',
      };
    }

    await prisma.faceAttendanceLog.create({
      data: { faceProfileId: matchedCached.id, employeeId: employee.id, action, confidence: bestConfidence, snapshotPath, deviceId, ipAddress, attendanceId },
    });

    return {
      matched: true,
      action,
      employee: {
        id: employee.id,
        fullName: `${employee.user.lastName} ${employee.user.firstName}`,
        employeeCode: employee.employeeCode,
        department: employee.subDepartment?.name ?? null,
      },
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
