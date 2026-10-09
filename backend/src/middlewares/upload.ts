import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from '@config/logger';

// Allowed file types for upload
const ALLOWED_TYPES = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Create multer upload middleware for a specific folder
 * @param folderName - Name of the folder inside uploads/
 * @param maxFiles - Maximum number of files allowed (default: 5)
 */
export const createUploadMiddleware = (folderName: string, maxFiles: number = 5) => {
  const uploadDir = path.join(__dirname, '../../uploads', folderName);

  // Create upload directory if it doesn't exist
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
      const nameWithoutExt = path.basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize filename
      cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    },
  });

  const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const extname = ALLOWED_TYPES.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = ALLOWED_TYPES.test(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          'Chỉ chấp nhận file: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR'
        )
      );
    }
  };

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter,
  }).array('files', maxFiles);
};

/**
 * Create single file upload middleware
 * @param folderName - Name of the folder inside uploads/
 */
export const createSingleUploadMiddleware = (folderName: string) => {
  const uploadDir = path.join(__dirname, '../../uploads', folderName);

  // Create upload directory if it doesn't exist
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
      const nameWithoutExt = path.basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_'); // Sanitize filename
      cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    },
  });

  const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const extname = ALLOWED_TYPES.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = ALLOWED_TYPES.test(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          'Chỉ chấp nhận file: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR'
        )
      );
    }
  };

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter,
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
export const renameAttachmentsByCode = (
  folderName: string,
  code?: string | null,
  urls: string[] = [],
  startIndex: number = 1,
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
  // `path.join('/a/b', '/uploads/x')` would discard the prefix on POSIX, so strip leading slash first.
  const relative = urlPath.replace(/^\/+/, '');
  return path.resolve(process.cwd(), relative);
};

/**
 * Delete uploaded file
 * @param filePath - Full path or URL of the file
 */
export const deleteUploadedFile = (filePath: string): void => {
  try {
    const fullPath = filePath.startsWith('/uploads/') ? resolveUploadPath(filePath) : filePath;
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
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (_req: Express.Request, _file: Express.Multer.File, cb: (e: Error | null, dest: string) => void) => cb(null, uploadDir),
    filename: (_req: Express.Request, file: Express.Multer.File, cb: (e: Error | null, name: string) => void) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      cb(null, `${base}-${uniqueSuffix}${ext}`);
    },
  });
  const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const extOk = ALLOWED_TYPES.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = ALLOWED_TYPES.test(file.mimetype);
    if (extOk || mimeOk) return cb(null, true);
    cb(new Error('Chỉ chấp nhận file: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR'));
  };
  const fieldsHandler = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter }).fields([
    { name: 'files', maxCount: maxFiles },
    { name: 'file', maxCount: 1 },
  ]);
  return (req: any, res: any, next: any) => {
    fieldsHandler(req as unknown as any, res, (err: unknown) => {
      if (err) return next(err);
      const byField = (req as unknown as { files?: Record<string, Express.Multer.File[]> }).files as unknown;
      if (byField && typeof byField === 'object' && !Array.isArray(byField)) {
        const map = byField as Record<string, Express.Multer.File[]>;
        const flat: Express.Multer.File[] = [...(map['files'] ?? []), ...(map['file'] ?? [])].slice(0, maxFiles);
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

