import { Request, Response, NextFunction } from 'express';
import prisma from '@config/database';

// Get all lot products
export const getAllLotProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    if (page && limit) {
      const skip = (page - 1) * limit;

      const [lotProducts, total] = await Promise.all([
        prisma.lotProduct.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            internationalProduct: true,
            lot: {
              include: {
                warehouse: true,
              },
            },
          },
        }),
        prisma.lotProduct.count(),
      ]);

      res.json({
        success: true,
        data: lotProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      const lotProducts = await prisma.lotProduct.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          internationalProduct: true,
          lot: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: lotProducts,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Add product to lot
export const addProductToLot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lotId, internationalProductId, soLuong, donViTinh } = req.body;

    if (!lotId || !internationalProductId || soLuong === undefined || soLuong === null || !donViTinh) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc',
      });
      return;
    }

    // Check if product already exists in this lot
    const existingProduct = await prisma.lotProduct.findFirst({
      where: {
        lotId,
        internationalProductId,
      },
      include: {
        internationalProduct: true,
      },
    });

    if (existingProduct) {
      res.status(400).json({
        success: false,
        message: `Sản phẩm "${existingProduct.internationalProduct?.tenSanPham}" đã được thêm vào lô này trước đó`,
      });
      return;
    }

    const lotProduct = await prisma.lotProduct.create({
      data: {
        lotId,
        internationalProductId,
        soLuong: parseFloat(soLuong),
        donViTinh,
      },
      include: {
        internationalProduct: true,
        lot: true,
      },
    });

    res.status(201).json({
      success: true,
      data: lotProduct,
      message: 'Thêm sản phẩm vào lô thành công',
    });
  } catch (error) {
    next(error);
  }
};

// Remove product from lot
export const removeProductFromLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    await prisma.lotProduct.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa sản phẩm khỏi lô thành công',
    });
  } catch (error) {
    next(error);
  }
};

// Move product between lots
export const moveProductBetweenLots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lotProductId, targetLotId } = req.body;

    if (!lotProductId || !targetLotId) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc',
      });
      return;
    }

    // Lấy thông tin sản phẩm đang di chuyển
    const sourceProduct = await prisma.lotProduct.findUnique({
      where: { id: lotProductId },
      include: {
        internationalProduct: true,
      },
    });

    if (!sourceProduct) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
      return;
    }

    // Kiểm tra xem sản phẩm đã tồn tại trong lô đích chưa
    const existingProductInTargetLot = await prisma.lotProduct.findFirst({
      where: {
        lotId: targetLotId,
        internationalProductId: sourceProduct.internationalProductId,
      },
    });

    let resultProduct;

    if (existingProductInTargetLot) {
      // Nếu sản phẩm đã tồn tại trong lô đích -> cộng số lượng và xóa bản ghi nguồn
      await prisma.$transaction([
        // Cộng số lượng vào sản phẩm đã tồn tại
        prisma.lotProduct.update({
          where: { id: existingProductInTargetLot.id },
          data: {
            soLuong: existingProductInTargetLot.soLuong + sourceProduct.soLuong,
          },
        }),
        // Xóa sản phẩm nguồn
        prisma.lotProduct.delete({
          where: { id: lotProductId },
        }),
      ]);

      // Lấy thông tin sản phẩm đã được gộp
      resultProduct = await prisma.lotProduct.findUnique({
        where: { id: existingProductInTargetLot.id },
        include: {
          internationalProduct: true,
          lot: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: resultProduct,
        message: `Đã gộp ${sourceProduct.soLuong} ${sourceProduct.donViTinh} vào sản phẩm cùng loại trong lô đích`,
      });
    } else {
      // Nếu sản phẩm chưa tồn tại -> di chuyển như bình thường
      resultProduct = await prisma.lotProduct.update({
        where: { id: lotProductId },
        data: { lotId: targetLotId },
        include: {
          internationalProduct: true,
          lot: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: resultProduct,
        message: 'Di chuyển sản phẩm thành công',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Update product quantity
export const updateProductQuantity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { soLuong, donViTinh, giaThanh } = req.body;

    const lotProduct = await prisma.lotProduct.update({
      where: { id },
      data: {
        soLuong: soLuong ? parseFloat(soLuong) : undefined,
        donViTinh: donViTinh || undefined,
        giaThanh: giaThanh !== undefined ? parseFloat(giaThanh) : undefined,
      },
      include: {
        internationalProduct: true,
      },
    });

    res.json({
      success: true,
      data: lotProduct,
      message: 'Cập nhật thành công',
    });
  } catch (error) {
    next(error);
  }
};

