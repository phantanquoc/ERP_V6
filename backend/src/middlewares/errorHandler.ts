import { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/errors';
import { isDevelopment } from '@config/env';

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(isDevelopment && { stack: err.stack }),
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;

    // Handle foreign key constraint errors (P2003)
    if (prismaError.code === 'P2003') {
      const constraint = prismaError.meta?.constraint || '';
      let message = 'Không thể xóa bản ghi này vì đang được sử dụng';

      // Customize message based on constraint
      if (constraint.includes('quotation_request_items')) {
        message = 'Không thể xóa sản phẩm này vì đang được sử dụng trong yêu cầu báo giá';
      } else if (constraint.includes('warehouse_inventory')) {
        message = 'Không thể xóa sản phẩm này vì đang có trong kho hàng';
      } else if (constraint.includes('order_items')) {
        message = 'Không thể xóa sản phẩm này vì đang được sử dụng trong đơn hàng';
      }

      res.status(400).json({
        success: false,
        message,
        ...(isDevelopment && { error: err.message, constraint }),
      });
      return;
    }

    // Handle other Prisma errors
    res.status(400).json({
      success: false,
      message: 'Database error',
      ...(isDevelopment && { error: err.message }),
    });
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(isDevelopment && { error: err.message, stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

