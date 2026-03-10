import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { createSingleUploadMiddleware, getFileUrl } from '@middlewares/upload';

const router = Router();

// Upload middleware for machine systems (single file)
const uploadMachineSystem = createSingleUploadMiddleware('machine-systems');

interface MachineSystem {
  id: number;
  khuVuc: string;
  viTri: string;
  maHeThong: string;
  tenHeThong: string;
  chucNang: string;
  maThietBi: string;
  tenThietBi: string;
  nhiemVu: string;
  maNguoiThucHien: string;
  nguoiThucHien: string;
  fileDinhKem?: string;
  ngayTao: string;
}

let machineSystems: MachineSystem[] = [];
let nextId = 1;

/**
 * @swagger
 * /api/machine-systems:
 *   get:
 *     tags: [Machine Systems]
 *     summary: Lấy danh sách hệ thống máy
 *     responses:
 *       200:
 *         description: Lấy danh sách hệ thống máy thành công
 */
router.get('/', (_req: Request, res: Response) => {
  res.json(machineSystems);
});

/**
 * @swagger
 * /api/machine-systems/export/excel:
 *   get:
 *     tags: [Machine Systems]
 *     summary: Xuất danh sách hệ thống máy ra Excel
 *     responses:
 *       200:
 *         description: Xuất Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Lỗi khi xuất Excel
 */
router.get('/export/excel', async (_req: Request, res: Response) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách hệ thống máy');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Khu vực', key: 'khuVuc', width: 15 },
      { header: 'Vị trí', key: 'viTri', width: 15 },
      { header: 'Mã hệ thống', key: 'maHeThong', width: 15 },
      { header: 'Tên hệ thống', key: 'tenHeThong', width: 20 },
      { header: 'Chức năng', key: 'chucNang', width: 20 },
      { header: 'Mã thiết bị', key: 'maThietBi', width: 15 },
      { header: 'Tên thiết bị', key: 'tenThietBi', width: 20 },
      { header: 'Nhiệm vụ', key: 'nhiemVu', width: 20 },
      { header: 'Mã NTH', key: 'maNguoiThucHien', width: 15 },
      { header: 'Người thực hiện', key: 'nguoiThucHien', width: 20 },
      { header: 'Ngày tạo', key: 'ngayTao', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    machineSystems.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        khuVuc: item.khuVuc,
        viTri: item.viTri,
        maHeThong: item.maHeThong,
        tenHeThong: item.tenHeThong,
        chucNang: item.chucNang,
        maThietBi: item.maThietBi,
        tenThietBi: item.tenThietBi,
        nhiemVu: item.nhiemVu,
        maNguoiThucHien: item.maNguoiThucHien,
        nguoiThucHien: item.nguoiThucHien,
        ngayTao: item.ngayTao ? new Date(item.ngayTao).toLocaleDateString('vi-VN') : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=danh-sach-he-thong-may-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xuất Excel', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/machine-systems/{id}:
 *   get:
 *     tags: [Machine Systems]
 *     summary: Lấy chi tiết hệ thống máy theo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của hệ thống máy
 *     responses:
 *       200:
 *         description: Lấy chi tiết hệ thống máy thành công
 *       404:
 *         description: Không tìm thấy hệ thống
 */
router.get('/:id', (req: Request, res: Response): void => {
  const system = machineSystems.find(s => s.id === parseInt(req.params.id as string));
  if (!system) {
    res.status(404).json({ message: 'Không tìm thấy hệ thống' });
    return;
  }
  res.json(system);
});

/**
 * @swagger
 * /api/machine-systems:
 *   post:
 *     tags: [Machine Systems]
 *     summary: Tạo hệ thống máy mới
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File đính kèm
 *     responses:
 *       201:
 *         description: Tạo hệ thống máy thành công
 */
router.post('/', uploadMachineSystem, (req: Request, res: Response) => {
  const newSystem: MachineSystem = {
    id: nextId++,
    khuVuc: req.body.khuVuc || '',
    viTri: req.body.viTri || '',
    maHeThong: req.body.maHeThong || '',
    tenHeThong: req.body.tenHeThong || '',
    chucNang: req.body.chucNang || '',
    maThietBi: req.body.maThietBi || '',
    tenThietBi: req.body.tenThietBi || '',
    nhiemVu: req.body.nhiemVu || '',
    maNguoiThucHien: req.body.maNguoiThucHien || '',
    nguoiThucHien: req.body.nguoiThucHien || '',
    fileDinhKem: req.file ? getFileUrl('machine-systems', req.file.filename) : undefined,
    ngayTao: new Date().toISOString()
  };
  machineSystems.push(newSystem);
  res.status(201).json(newSystem);
});

/**
 * @swagger
 * /api/machine-systems/{id}:
 *   put:
 *     tags: [Machine Systems]
 *     summary: Cập nhật hệ thống máy
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của hệ thống máy
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File đính kèm
 *     responses:
 *       200:
 *         description: Cập nhật hệ thống máy thành công
 *       404:
 *         description: Không tìm thấy hệ thống
 */
router.put('/:id', uploadMachineSystem, (req: Request, res: Response): void => {
  const index = machineSystems.findIndex(s => s.id === parseInt(req.params.id as string));
  if (index === -1) {
    res.status(404).json({ message: 'Không tìm thấy hệ thống' });
    return;
  }

  const existingSystem = machineSystems[index];
  machineSystems[index] = {
    ...existingSystem,
    khuVuc: req.body.khuVuc || existingSystem.khuVuc,
    viTri: req.body.viTri || existingSystem.viTri,
    maHeThong: req.body.maHeThong || existingSystem.maHeThong,
    tenHeThong: req.body.tenHeThong || existingSystem.tenHeThong,
    chucNang: req.body.chucNang || existingSystem.chucNang,
    maThietBi: req.body.maThietBi || existingSystem.maThietBi,
    tenThietBi: req.body.tenThietBi || existingSystem.tenThietBi,
    nhiemVu: req.body.nhiemVu || existingSystem.nhiemVu,
    maNguoiThucHien: req.body.maNguoiThucHien || existingSystem.maNguoiThucHien,
    nguoiThucHien: req.body.nguoiThucHien || existingSystem.nguoiThucHien,
    fileDinhKem: req.file ? getFileUrl('machine-systems', req.file.filename) : existingSystem.fileDinhKem
  };
  res.json(machineSystems[index]);
});

/**
 * @swagger
 * /api/machine-systems/{id}:
 *   delete:
 *     tags: [Machine Systems]
 *     summary: Xóa hệ thống máy
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của hệ thống máy
 *     responses:
 *       200:
 *         description: Xóa hệ thống máy thành công
 *       404:
 *         description: Không tìm thấy hệ thống
 */
router.delete('/:id', (req: Request, res: Response): void => {
  const index = machineSystems.findIndex(s => s.id === parseInt(req.params.id as string));
  if (index === -1) {
    res.status(404).json({ message: 'Không tìm thấy hệ thống' });
    return;
  }

  const deleted = machineSystems.splice(index, 1)[0];
  if (deleted.fileDinhKem) {
    const filePath = path.join(process.cwd(), deleted.fileDinhKem.replace('/uploads/', 'uploads/'));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  res.json({ message: 'Đã xóa thành công' });
});

export default router;

