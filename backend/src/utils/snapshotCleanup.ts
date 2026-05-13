import fs from 'fs';
import path from 'path';
import { env } from '@config/env';
import logger from '@config/logger';

const SNAPSHOT_MAX_AGE_DAYS = 30;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day

function cleanOldSnapshots() {
  const snapshotDir = path.resolve(env.UPLOAD_DIR, 'snapshots');
  if (!fs.existsSync(snapshotDir)) return;

  const maxAge = Date.now() - SNAPSHOT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;

  try {
    const subDirs = fs.readdirSync(snapshotDir, { withFileTypes: true });
    for (const dir of subDirs) {
      if (!dir.isDirectory()) continue;
      const dirPath = path.join(snapshotDir, dir.name);
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs < maxAge) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        } catch { /* skip unreadable files */ }
      }

      // Remove empty directories
      try {
        const remaining = fs.readdirSync(dirPath);
        if (remaining.length === 0) fs.rmdirSync(dirPath);
      } catch { /* skip */ }
    }

    if (deleted > 0) {
      logger.info(`Snapshot cleanup: deleted ${deleted} files older than ${SNAPSHOT_MAX_AGE_DAYS} days`);
    }
  } catch (err) {
    logger.warn(`Snapshot cleanup error: ${err}`);
  }
}

export function startSnapshotCleanup() {
  // Run once on startup (delayed 30s to not block boot)
  setTimeout(cleanOldSnapshots, 30_000);
  // Then every 24 hours
  setInterval(cleanOldSnapshots, CLEANUP_INTERVAL_MS);
  logger.info(`Snapshot cleanup scheduled: every 24h, max age ${SNAPSHOT_MAX_AGE_DAYS} days`);
}
