import { Request, Response, NextFunction } from 'express';
import prisma from '@config/database';
export const getLotsByWarehouse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const warehouseId = req.params.warehouseId as string;

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
  } catch (error) {
    next(error);
  }
};

// Create lot
export const createLot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  } catch (error) {
    next(error);
  }
};

// Delete lot
export const deleteLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    await prisma.lot.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa lô thành công',
    });
  } catch (error) {
    next(error);
  }
};

