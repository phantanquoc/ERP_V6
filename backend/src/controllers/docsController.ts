import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import type { AuthenticatedRequest } from '@types';
import docsService from '@services/docsService';

const DOCS_DIR = path.resolve(__dirname, '../../docs/quy-trinh');

const DOC_MAP: Array<{ slug: string; title: string; departmentCode: string | null }> = [
  { slug: '00-chung', title: 'Hướng dẫn chung', departmentCode: null },
  { slug: '01-chat-luong', title: 'Bộ phận chất lượng', departmentCode: 'quality' },
  { slug: '02-tong-hop', title: 'Bộ phận tổng hợp', departmentCode: 'general' },
  { slug: '03-kinh-doanh', title: 'Bộ phận kinh doanh', departmentCode: 'business' },
  { slug: '04-ke-toan', title: 'Bộ phận kế toán', departmentCode: 'accounting' },
  { slug: '05-thu-mua', title: 'Bộ phận thu mua', departmentCode: 'purchasing' },
  { slug: '06-san-xuat', title: 'Bộ phận sản xuất', departmentCode: 'production' },
  { slug: '07-ky-thuat', title: 'Bộ phận kỹ thuật', departmentCode: 'technical' },
];

const DEPT_CODE_TO_PERM: Record<string, string> = {
  DEPT_GENERAL: 'general',
  DEPT_QUALITY: 'quality',
  DEPT_BUSINESS: 'business',
  DEPT_ACCOUNTING: 'accounting',
  DEPT_PURCHASING: 'purchasing',
  DEPT_PRODUCTION: 'production',
  DEPT_TECHNICAL: 'technical',
};

export class DocsController {
  async listDocs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const userRecord = await docsService.getUserWithDepartments(userId);
      if (!userRecord) { res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' }); return; }

      const isAdmin = userRecord.role === 'ADMIN';

      const allDeptIds: string[] = [];
      if (userRecord.departmentId) allDeptIds.push(userRecord.departmentId);
      for (const sd of userRecord.secondaryDepartments) {
        if (sd.departmentId && !allDeptIds.includes(sd.departmentId)) allDeptIds.push(sd.departmentId);
      }

      const deptIdToCode = await docsService.getDepartmentCodes(allDeptIds);

      const userPermCodes: string[] = [];
      const primaryDeptCode = userRecord.departmentId ? deptIdToCode[userRecord.departmentId] : null;
      if (primaryDeptCode && DEPT_CODE_TO_PERM[primaryDeptCode]) {
        userPermCodes.push(DEPT_CODE_TO_PERM[primaryDeptCode]);
      }
      for (const sd of userRecord.secondaryDepartments) {
        const code = deptIdToCode[sd.departmentId];
        const mapped = code ? DEPT_CODE_TO_PERM[code] : null;
        if (mapped && !userPermCodes.includes(mapped)) userPermCodes.push(mapped);
      }

      const availableDocs = DOC_MAP.filter(doc => {
        if (doc.departmentCode === null) return true;
        if (isAdmin) return true;
        return userPermCodes.includes(doc.departmentCode);
      });

      res.json({ success: true, data: availableDocs });
    } catch (error) {
      next(error);
    }
  }

  async getDocContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const doc = DOC_MAP.find(d => d.slug === slug);

      if (!doc) { res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu' }); return; }

      const filePath = path.join(DOCS_DIR, `${slug}.md`);
      if (!fs.existsSync(filePath)) { res.status(404).json({ success: false, message: 'Không tìm thấy file tài liệu' }); return; }

      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ success: true, data: { slug: doc.slug, title: doc.title, content } });
    } catch (error) {
      next(error);
    }
  }

  async updateDocContent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const isAdmin = await docsService.isAdmin(userId);
      if (!isAdmin) { res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền chỉnh sửa tài liệu' }); return; }

      const { slug } = req.params;
      const { content } = req.body;

      if (typeof content !== 'string') { res.status(400).json({ success: false, message: 'Nội dung không hợp lệ' }); return; }

      const doc = DOC_MAP.find(d => d.slug === slug);
      if (!doc) { res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu' }); return; }

      const filePath = path.join(DOCS_DIR, `${slug}.md`);
      fs.writeFileSync(filePath, content, 'utf-8');

      res.json({ success: true, message: 'Cập nhật tài liệu thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new DocsController();
