import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get lots by warehouse
export const getLotsByWarehouse = async (req: Request, res: Response) => {
  try {
    const { warehouseId } = req.params;

    const lots = await prisma.lot.findMany({
      where: { warehouseId },
      orderBy: { createdAt: 'asc' },
      include: {
        lotProducts: {
          include: {
            internationalProduct: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: lots,
    });
  } catch (error: any) {
    console.error('Error fetching lots:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách lô',
      error: error.message,
    });
  }
};

// Create lot
export const createLot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenLo, warehouseId } = req.body;

    if (!tenLo || !warehouseId) {
      res.status(400).json({
        success: false,
        message: 'Tên lô và mã kho là bắt buộc',
      });
      return;
    }

    const lot = await prisma.lot.create({
      data: {
        tenLo,
        warehouseId,
      },
      include: {
        lotProducts: {
          include: {
            internationalProduct: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: lot,
      message: 'Tạo lô thành công',
    });
  } catch (error: any) {
    console.error('Error creating lot:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo lô',
      error: error.message,
    });
  }
};

// Delete lot
export const deleteLot = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.lot.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa lô thành công',
    });
  } catch (error: any) {
    console.error('Error deleting lot:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa lô',
      error: error.message,
    });
  }
};

