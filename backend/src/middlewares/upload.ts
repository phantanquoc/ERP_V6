import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Allowed file types for upload
const ALLOWED_TYPES = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

    if (mimetype && extname) {
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

    if (mimetype && extname) {
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
 * Delete uploaded file
 * @param filePath - Full path or URL of the file
 */
export const deleteUploadedFile = (filePath: string): void => {
  try {
    // Handle both full paths and URL paths
    let fullPath = filePath;
    if (filePath.startsWith('/uploads/')) {
      fullPath = path.join(__dirname, '../..', filePath);
    }
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

export default {
  createUploadMiddleware,
  createSingleUploadMiddleware,
  getFileUrl,
  deleteUploadedFile,
};

