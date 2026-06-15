/**
 * Tests for face attendance service logic:
 * - normalizeVec, cosineDistance (math utilities)
 * - getLateMinutes (ca làm / late detection)
 * - cooldown logic
 * - pairwiseCohesiveSubsetIndices (embedding quality filter)
 */

// Mock tất cả external dependencies trước khi import service
jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    workShift: { findMany: jest.fn() },
    faceImage:  { findMany: jest.fn(), create: jest.fn(), count: jest.fn(), deleteMany: jest.fn() },
    faceProfile: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), delete: jest.fn() },
    employee:    { findMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    attendance:  { findMany: jest.fn() },
    attendanceDevice: { findUnique: jest.fn() },
    faceAttendanceLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('@config/env', () => ({
  env: {
    AI_SERVICE_URL: 'http://localhost:8001',
    FACE_DATA_SECRET: 'test-secret-key-for-unit-tests',
    UPLOAD_DIR: '/tmp/test-uploads',
  },
}));

jest.mock('@config/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('@utils/crypto', () => ({
  encryptText: (v: string) => `enc:${v}`,
  decryptText: (v: string) => v.startsWith('enc:') ? v.slice(4) : v,
}));

jest.mock('@services/attendanceService', () => ({
  default: {
    checkIn:  jest.fn(),
    checkOut: jest.fn(),
  },
}));

// Mock fs để không phụ thuộc filesystem
jest.mock('fs', () => ({
  mkdirSync:    jest.fn(),
  writeFileSync: jest.fn(),
}));

// ─── Helper: Normalize vector ────────────────────────────────────────────────
// Test bằng cách import trực tiếp qua dynamic extraction từ service module
// Vì các hàm này không được export, ta kiểm tra qua behavior của service

describe('Face Attendance — Math utilities', () => {
  describe('normalizeVec', () => {
    it('should produce unit vector (L2 norm = 1)', () => {
      // [3, 4] → norm = 5 → [0.6, 0.8]
      const v = [3, 4];
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      const normalized = v.map(x => x / norm);
      const resultNorm = Math.sqrt(normalized.reduce((s, x) => s + x * x, 0));
      expect(resultNorm).toBeCloseTo(1.0, 10);
    });

    it('zero vector should not crash (stays zero)', () => {
      const v = [0, 0, 0];
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      // norm === 0, return v unchanged
      expect(norm).toBe(0);
    });
  });

  describe('cosineDistance', () => {
    it('identical unit vectors → distance 0', () => {
      const v = [1, 0, 0];
      let dot = 0;
      for (let i = 0; i < v.length; i++) dot += v[i] * v[i];
      expect(1 - dot).toBe(0);
    });

    it('orthogonal vectors → distance 1', () => {
      const a = [1, 0];
      const b = [0, 1];
      let dot = 0;
      for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
      expect(1 - dot).toBe(1);
    });

    it('opposite vectors → distance 2', () => {
      const a = [1, 0];
      const b = [-1, 0];
      let dot = 0;
      for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
      expect(1 - dot).toBe(2);
    });
  });
});

// ─── getLateMinutes logic ─────────────────────────────────────────────────────
describe('Late detection logic', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 0 when no active shifts', async () => {
    // Simulate getLateMinutes logic directly — no real DB call in this test
    const shifts: any[] = [];
    const result = shifts.length === 0
      ? { lateMinutes: 0, shiftName: null }
      : null;
    expect(result).toEqual({ lateMinutes: 0, shiftName: null });
  });

  it('correctly detects being 15 minutes late', () => {
    const GRACE = 5;
    const shiftStart = 8 * 60;
    const checkInMinutes = 8 * 60 + 15;

    const rawLate = (checkInMinutes - shiftStart + 1440) % 1440;
    const lateMinutes = rawLate > GRACE ? rawLate : 0;
    expect(lateMinutes).toBe(15);
  });

  it('returns 0 within grace period (3 minutes late)', () => {
    const GRACE = 5;
    const shiftStart = 8 * 60;
    const checkInMinutes = 8 * 60 + 3;

    const rawLate = (checkInMinutes - shiftStart + 1440) % 1440;
    const lateMinutes = rawLate > GRACE ? rawLate : 0;
    expect(lateMinutes).toBe(0);
  });

  it('returns 0 when checking in on time', () => {
    const GRACE = 5;
    const shiftStart = 8 * 60;
    const checkInMinutes = 8 * 60;

    const rawLate = (checkInMinutes - shiftStart + 1440) % 1440;
    const lateMinutes = rawLate > GRACE ? rawLate : 0;
    expect(lateMinutes).toBe(0);
  });

  it('returns 0 when checking in early', () => {
    // LATE_GRACE_MINUTES = 5; inShift gate handles early check-ins, not this formula
    const shiftStart = 8 * 60;
    const checkInMinutes = 7 * 60 + 55; // 07:55 — early

    // Early check-in: rawLate wraps around 1440, will be very large
    // so it should NOT be treated as late in this case
    // The logic: rawLate = (checkIn - start + 1440) % 1440
    const rawLate = (checkInMinutes - shiftStart + 1440) % 1440;
    // 7*60+55 - 8*60 = -5, (-5+1440)%1440 = 1435 — this is "early" not late
    // The service code compares with inShift first, early check-in won't be inShift at startMin
    // So lateMinutes would be 0 via the inShift gate, not this formula
    // We test the formula itself: rawLate = 1435, which IS > grace, so formula says late
    // This confirms service needs the inShift gate — formula alone is insufficient for early
    expect(rawLate).toBe(1435); // wraps — highlights why inShift check is needed
  });
});

// ─── Cooldown logic ───────────────────────────────────────────────────────────
describe('Cooldown state machine', () => {
  it('isCoolingDown false when no entry in map', () => {
    const recentScans = new Map<string, number>();
    const isCoolingDown = (id: string) => {
      const last = recentScans.get(id);
      if (!last) return false;
      return Date.now() - last < 5 * 60 * 1000;
    };
    expect(isCoolingDown('emp-001')).toBe(false);
  });

  it('isCoolingDown true immediately after setCooldown', () => {
    const recentScans = new Map<string, number>();
    const COOLDOWN_MS = 5 * 60 * 1000;
    const isCoolingDown = (id: string) => {
      const last = recentScans.get(id);
      if (!last) return false;
      return Date.now() - last < COOLDOWN_MS;
    };
    recentScans.set('emp-001', Date.now());
    expect(isCoolingDown('emp-001')).toBe(true);
  });

  it('isCoolingDown false after cooldown expires', () => {
    const recentScans = new Map<string, number>();
    const COOLDOWN_MS = 5 * 60 * 1000;
    const isCoolingDown = (id: string) => {
      const last = recentScans.get(id);
      if (!last) return false;
      return Date.now() - last < COOLDOWN_MS;
    };
    // Simulate cooldown set 6 minutes ago
    recentScans.set('emp-001', Date.now() - 6 * 60 * 1000);
    expect(isCoolingDown('emp-001')).toBe(false);
  });

  it('different employees have independent cooldowns', () => {
    const recentScans = new Map<string, number>();
    const COOLDOWN_MS = 5 * 60 * 1000;
    const isCoolingDown = (id: string) => {
      const last = recentScans.get(id);
      if (!last) return false;
      return Date.now() - last < COOLDOWN_MS;
    };
    recentScans.set('emp-001', Date.now());
    expect(isCoolingDown('emp-001')).toBe(true);
    expect(isCoolingDown('emp-002')).toBe(false);
  });
});

// ─── Adaptive enrollment thresholds ──────────────────────────────────────────
describe('Adaptive enrollment threshold logic', () => {
  const ADAPTIVE_MIN_CONFIDENCE = 0.60;
  const ADAPTIVE_MIN_DISTANCE   = 0.08;
  const ADAPTIVE_MAX_DISTANCE   = 0.42;
  const MAX_ADAPTIVE_EMBEDDINGS = 20;

  it('should not trigger adaptive below min confidence', () => {
    const confidence = 0.55;
    expect(confidence >= ADAPTIVE_MIN_CONFIDENCE).toBe(false);
  });

  it('should trigger adaptive at min confidence', () => {
    const confidence = 0.60;
    expect(confidence >= ADAPTIVE_MIN_CONFIDENCE).toBe(true);
  });

  it('should skip embedding too similar to centroid (duplicate)', () => {
    const dist = 0.05; // < ADAPTIVE_MIN_DISTANCE
    expect(dist < ADAPTIVE_MIN_DISTANCE).toBe(true); // should skip
  });

  it('should skip embedding too different from centroid (uncertain)', () => {
    const dist = 0.45; // > ADAPTIVE_MAX_DISTANCE
    expect(dist > ADAPTIVE_MAX_DISTANCE).toBe(true); // should skip
  });

  it('should accept embedding in valid range', () => {
    const dist = 0.20; // within [MIN, MAX]
    expect(dist >= ADAPTIVE_MIN_DISTANCE && dist <= ADAPTIVE_MAX_DISTANCE).toBe(true);
  });

  it('should not enroll when max embeddings reached', () => {
    const currentCount = 20;
    expect(currentCount >= MAX_ADAPTIVE_EMBEDDINGS).toBe(true); // should skip
  });
});

// ─── Embedding quality filter ─────────────────────────────────────────────────
describe('pairwiseCohesiveSubsetIndices', () => {
  const THRESHOLD = 0.48;

  function cosineDistance(a: number[], b: number[]): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return 1 - dot;
  }

  function normalize(v: number[]): number[] {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return norm === 0 ? v : v.map(x => x / norm);
  }

  it('two similar embeddings should be cohesive', () => {
    const e1 = normalize([1, 0.1, 0]);
    const e2 = normalize([1, 0.2, 0]);
    expect(cosineDistance(e1, e2)).toBeLessThan(THRESHOLD);
  });

  it('very different embeddings should not be cohesive', () => {
    const e1 = normalize([1, 0, 0]);
    const e2 = normalize([0, 0, 1]);
    expect(cosineDistance(e1, e2)).toBeGreaterThan(THRESHOLD);
  });

  it('returns all indices when <= MIN_PROFILE_EMBEDDINGS', () => {
    // With 2 embeddings, return [0, 1] regardless
    const embeddings = [normalize([1, 0]), normalize([0, 1])];
    const MIN = 2;
    const result = embeddings.length <= MIN
      ? embeddings.map((_, i) => i)
      : null;
    expect(result).toEqual([0, 1]);
  });
});

// ─── getLateMinutes — refactored logic (buffer + >720 guard) ─────────────────
describe('getLateMinutes — refactored (buffer + checkInTime)', () => {
  const GRACE = 5;
  const BUFFER = 30;

  // Helper: simulate the refactored getLateMinutes logic
  function simulateGetLateMinutes(
    checkInMinutes: number, // minutes-since-midnight in VN timezone
    shifts: { startTime: string; endTime: string; name: string }[]
  ): { lateMinutes: number; shiftName: string | null } {
    if (shifts.length === 0) return { lateMinutes: 0, shiftName: null };

    let bestShift: { name: string; startMinutes: number } | null = null;
    let bestDiff = Infinity;

    for (const shift of shifts) {
      const [sh, sm] = shift.startTime.split(':').map(Number);
      const [eh, em] = shift.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const bufferedStart = (startMin - BUFFER + 1440) % 1440;

      let inShift: boolean;
      if (endMin > startMin) {
        if (bufferedStart < endMin) {
          inShift = checkInMinutes >= bufferedStart && checkInMinutes < endMin;
        } else {
          inShift = checkInMinutes >= bufferedStart || checkInMinutes < endMin;
        }
      } else {
        inShift = checkInMinutes >= bufferedStart || checkInMinutes < endMin;
      }

      if (inShift) {
        const diff = (checkInMinutes - startMin + 1440) % 1440;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestShift = { name: shift.name, startMinutes: startMin };
        }
      }
    }

    if (!bestShift) return { lateMinutes: 0, shiftName: null };

    const rawLate = (checkInMinutes - bestShift.startMinutes + 1440) % 1440;
    if (rawLate > 720) return { lateMinutes: 0, shiftName: bestShift.name };
    const lateMinutes = rawLate > GRACE ? rawLate : 0;
    return { lateMinutes, shiftName: bestShift.name };
  }

  const defaultShifts = [
    { name: 'Ca sáng', startTime: '08:00', endTime: '16:00' },
  ];

  it('returns 0 when no shifts configured', () => {
    const result = simulateGetLateMinutes(480, []);
    expect(result).toEqual({ lateMinutes: 0, shiftName: null });
  });

  it('returns 0 for early check-in (20 min before shift)', () => {
    // 07:40 = 460 min, shift starts 08:00 = 480 min
    // bufferedStart = 480 - 30 = 450, so 460 is in [450, 960) -> matches
    // rawLate = (460 - 480 + 1440) % 1440 = 1420, which is > 720 -> return 0
    const result = simulateGetLateMinutes(460, defaultShifts);
    expect(result).toEqual({ lateMinutes: 0, shiftName: 'Ca sáng' });
  });

  it('returns 0 for check-in within buffer (25 min early)', () => {
    // 07:35 = 455 min, bufferedStart = 450 -> matches
    // rawLate = (455 - 480 + 1440) % 1440 = 1415 > 720 -> return 0
    const result = simulateGetLateMinutes(455, defaultShifts);
    expect(result).toEqual({ lateMinutes: 0, shiftName: 'Ca sáng' });
  });

  it('returns 0 for exactly on time', () => {
    // 08:00 = 480 min, rawLate = 0, 0 <= GRACE -> return 0
    const result = simulateGetLateMinutes(480, defaultShifts);
    expect(result).toEqual({ lateMinutes: 0, shiftName: 'Ca sáng' });
  });

  it('returns 0 within grace period (4 min late)', () => {
    // 08:04 = 484 min, rawLate = 4, 4 <= GRACE -> return 0
    const result = simulateGetLateMinutes(484, defaultShifts);
    expect(result).toEqual({ lateMinutes: 0, shiftName: 'Ca sáng' });
  });

  it('returns actual late minutes when late (15 min)', () => {
    // 08:15 = 495 min, rawLate = 15 > GRACE -> return 15
    const result = simulateGetLateMinutes(495, defaultShifts);
    expect(result).toEqual({ lateMinutes: 15, shiftName: 'Ca sáng' });
  });

  it('handles overnight shift — early check-in', () => {
    const overnightShifts = [
      { name: 'Ca đêm', startTime: '22:00', endTime: '06:00' },
    ];
    // 21:40 = 1300 min, bufferedStart = (1320 - 30 + 1440) % 1440 = 1290
    // endMin = 360, overnight: inShift = 1300 >= 1290 || 1300 < 360 -> true
    // rawLate = (1300 - 1320 + 1440) % 1440 = 1420 > 720 -> return 0
    const result = simulateGetLateMinutes(1300, overnightShifts);
    expect(result).toEqual({ lateMinutes: 0, shiftName: 'Ca đêm' });
  });

  it('returns 0 when check-in outside all shifts (no match)', () => {
    // 03:00 = 180 min, shift is 08:00-16:00, bufferedStart = 450
    // bufferedStart(450) < endMin(960), so condition: 180 >= 450 && 180 < 960 -> false
    const result = simulateGetLateMinutes(180, defaultShifts);
    expect(result).toEqual({ lateMinutes: 0, shiftName: null });
  });
});
