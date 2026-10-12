import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from '@config/logger';

// Allowed file types for upload
const ALLOWED_TYPES = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
const BLOCKED_EXTENSIONS = new Set([
  '.php',
  '.phtml',
  '.php5',
  '.html',
  '.htm',
  '.js',
  '.svg',
  '.exe',
  '.sh',
  '.bat',
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB hard cap
const MAX_FILE_SIZE = Math.min(
  (process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE, 10) : NaN) ||
    MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_BYTES
);

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

function assertInsideUploads(resolvedPath: string): void {
  if (resolvedPath !== UPLOADS_ROOT && !resolvedPath.startsWith(UPLOADS_ROOT + path.sep)) {
    throw new Error('Path traversal detected: path escapes uploads directory');
  }
}

function isAllowedFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) return false;
  const extOk = ALLOWED_TYPES.test(ext);
  const mimeOk = ALLOWED_TYPES.test(file.mimetype);
  return extOk && mimeOk;
}

function buildFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (isAllowedFile(file)) return cb(null, true);
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Loại file bị chặn vì lý do bảo mật: ${ext}`));
  }
  cb(new Error('Chỉ chấp nhận file: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR'));
}

/**
 * Create multer upload middleware for a specific folder
 * @param folderName - Name of the folder inside uploads/
 * @param maxFiles - Maximum number of files allowed (default: 5)
 */
export const createUploadMiddleware = (folderName: string, maxFiles: number = 5) => {
  const uploadDir = path.join(__dirname, '../../uploads', folderName);

  // ponytail: sync mkdir kept — one-time dir ensure; async would complicate multer's sync destination callback for no gain
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const nameWithoutExt = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize filename
      cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: buildFileFilter,
  }).array('files', maxFiles);
};

/**
 * Create single file upload middleware
 * @param folderName - Name of the folder inside uploads/
 */
export const createSingleUploadMiddleware = (folderName: string) => {
  const uploadDir = path.join(__dirname, '../../uploads', folderName);

  // Create upload directory if it doesn't exist
  // ponytail: sync mkdir kept — runs once at startup inside request handler first-call; async adds complexity for no measurable gain
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const nameWithoutExt = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize filename
      cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: buildFileFilter,
  }).single('file');
};

/**
 * Get file URL path from uploaded file
 * @param folderName - Name of the folder inside uploads/
 * @param filename - Name of the uploaded file
 */
export const getFileUrl = (folderName: string, filename: string): string => {
  return `/uploads/${folderName}/${filename}`;
};

/**
 * Rename freshly uploaded attachments so their names follow the request code
 * (e.g. YC-CC-2026-001-1.pdf) instead of multer's random suffix.
 *
 * Must run after the code exists, so callers invoke it once the record is created.
 * `startIndex` lets an append-only update continue numbering after stored files.
 * A rename failure keeps the original URL — never drop a file the user uploaded.
 *
 * @param folderName - Folder inside uploads/ holding the files
 * @param code - Request code used as the filename stem
 * @param urls - Current `/uploads/...` URLs to rename
 * @param startIndex - First sequence number to try (default 1)
 */
// ponytail: sync exists/rename kept — callers are sync service methods; async would require awaiting in 4 services for no measurable gain
export const renameAttachmentsByCode = (
  folderName: string,
  code?: string | null,
  urls: string[] = [],
  startIndex: number = 1
): string[] => {
  if (!code || urls.length === 0) return urls;
  const uploadDir = path.join(__dirname, '../../uploads', folderName);
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, '_');
  let next = startIndex;

  return urls.map((url) => {
    const oldName = path.basename(url);
    const oldPath = path.join(uploadDir, oldName);
    const ext = path.extname(oldName);

    // Skip a file that already follows the convention (idempotent re-runs).
    if (oldName.startsWith(`${safeCode}-`)) return url;

    // Claim the next free slot so an append never clobbers a stored attachment.
    let target: string;
    do {
      target = `${safeCode}-${next}${ext}`;
      next += 1;
    } while (fs.existsSync(path.join(uploadDir, target)));

    try {
      fs.renameSync(oldPath, path.join(uploadDir, target));
      return getFileUrl(folderName, target);
    } catch (error) {
      logger.error(`Failed to rename attachment ${oldName} -> ${target}:`, error);
      return url;
    }
  });
};

/**
 * Resolve an `/uploads/...` URL to an absolute disk path under the app's
 * `uploads/` directory. Works regardless of whether __dirname is `src/` or `dist/`.
 */
export const resolveUploadPath = (urlPath: string): string => {
  if (!urlPath.startsWith('/uploads/')) return urlPath;
  const relative = urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(process.cwd(), relative);
  assertInsideUploads(resolved);
  return resolved;
};

/**
 * Delete uploaded file
 * @param filePath - Full path or URL of the file
 */
// ponytail: sync unlink kept — delete is off hot path and callers expect void return; async would require awaiting in service callers
export const deleteUploadedFile = (filePath: string): void => {
  try {
    const fullPath = filePath.startsWith('/uploads/') ? resolveUploadPath(filePath) : filePath;
    // For raw paths (not /uploads/ URLs), still enforce uploads boundary before deleting
    if (!filePath.startsWith('/uploads/')) {
      const resolved = path.resolve(fullPath);
      assertInsideUploads(resolved);
    }
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    logger.error('Error deleting file:', error);
  }
};

/**
 * Multer middleware that accepts both `files` (array, up to maxFiles) and legacy
 * `file` (single) field names. Replaces `.array('files')` which silently drops
 * `file` uploads. Returns `req.files` as a flat array and `req.file` as the
 * first file for backward compat.
 */
export const createCompatUploadMiddleware = (folderName: string, maxFiles: number = 4) => {
  const uploadDir = path.join(__dirname, '../../uploads', folderName);
  // ponytail: sync mkdir kept — same rationale as above
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (
      _req: Express.Request,
      _file: Express.Multer.File,
      cb: (e: Error | null, dest: string) => void
    ) => cb(null, uploadDir),
    filename: (
      _req: Express.Request,
      file: Express.Multer.File,
      cb: (e: Error | null, name: string) => void
    ) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      cb(null, `${base}-${uniqueSuffix}${ext}`);
    },
  });
  const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    return buildFileFilter(_req, file, cb);
  };
  const fieldsHandler = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter }).fields(
    [
      { name: 'files', maxCount: maxFiles },
      { name: 'file', maxCount: 1 },
    ]
  );
  return (req: any, res: any, next: any) => {
    fieldsHandler(req as unknown as any, res, (err: unknown) => {
      if (err) return next(err);
      const byField = (req as unknown as { files?: Record<string, Express.Multer.File[]> })
        .files as unknown;
      if (byField && typeof byField === 'object' && !Array.isArray(byField)) {
        const map = byField as Record<string, Express.Multer.File[]>;
        const flat: Express.Multer.File[] = [...(map['files'] ?? []), ...(map['file'] ?? [])].slice(
          0,
          maxFiles
        );
        (req as unknown as { files: Express.Multer.File[] }).files = flat;
        if (flat.length) (req as unknown as { file: Express.Multer.File }).file = flat[0];
      }
      next();
    });
  };
};

export default {
  createUploadMiddleware,
  createSingleUploadMiddleware,
  getFileUrl,
  renameAttachmentsByCode,
  deleteUploadedFile,
};
