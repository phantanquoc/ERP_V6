import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all warehouses
export const getAllWarehouses = async (_req: Request, res: Response) => {
  try {
    const warehouses = await prisma.warehouses.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lots: {
          include: {
            lotProducts: {
              include: {
                internationalProduct: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: warehouses,
    });
  } catch (error: any) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách kho',
      error: error.message,
    });
  }
};

// Generate warehouse code
export const generateWarehouseCode = async (_req: Request, res: Response) => {
  try {
    const lastWarehouse = await prisma.warehouses.findFirst({
      orderBy: { maKho: 'desc' },
    });

    let newCode = 'KHO001';
    if (lastWarehouse && lastWarehouse.maKho) {
      const lastNumber = parseInt(lastWarehouse.maKho.replace('KHO', ''));
      newCode = `KHO${String(lastNumber + 1).padStart(3, '0')}`;
    }

    res.json({
      success: true,
      data: { code: newCode },
    });
  } catch (error: any) {
    console.error('Error generating warehouse code:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã kho',
      error: error.message,
    });
  }
};

// Create warehouse
export const createWarehouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { maKho, tenKho } = req.body;

    if (!tenKho) {
      res.status(400).json({
        success: false,
        message: 'Tên kho là bắt buộc',
      });
      return;
    }

    // Generate code if not provided
    let warehouseCode = maKho;
    if (!warehouseCode) {
      const lastWarehouse = await prisma.warehouses.findFirst({
        orderBy: { maKho: 'desc' },
      });
      const lastNumber = lastWarehouse && lastWarehouse.maKho
        ? parseInt(lastWarehouse.maKho.replace('KHO', ''))
        : 0;
      warehouseCode = `KHO${String(lastNumber + 1).padStart(3, '0')}`;
    }

    const warehouse = await prisma.warehouses.create({
      data: {
        id: warehouseCode,
        maKho: warehouseCode,
        tenKho,
        updatedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: warehouse,
      message: 'Tạo kho thành công',
    });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo kho',
      error: error.message,
    });
  }
};

// Delete warehouse
export const deleteWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.warehouses.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa kho thành công',
    });
  } catch (error: any) {
    console.error('Error deleting warehouse:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa kho',
      error: error.message,
    });
  }
};

