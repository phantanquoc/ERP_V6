import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Helper function to format Zod errors
const formatZodErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join('.') || 'root';
    errors[path] = issue.message;
  });

  return errors;
};

/**
 * Zod validation middleware
 * Validates request body against a Zod schema
 */
export const zodValidate = <T>(schema: z.ZodType<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);

      res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors,
      });
      return;
    }

    // Replace req.body with validated/transformed data
    req.body = result.data;
    next();
  };
};

/**
 * Zod validation for query parameters (Express 5: req.query is getter-only)
 */
export const zodValidateQuery = <T>(schema: z.ZodType<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = formatZodErrors(result.error);

      res.status(400).json({
        success: false,
        message: 'Query parameters không hợp lệ',
        errors,
      });
      return;
    }

    // Express 5 defines req.query as a getter; reassigning it throws. Merge
    // the validated fields back onto the same object instead.
    Object.assign(req.query as Record<string, unknown>, result.data as Record<string, unknown>);
    next();
  };
};

/**
 * Zod validation for URL parameters
 */
export const zodValidateParams = <T>(schema: z.ZodType<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = formatZodErrors(result.error);

      res.status(400).json({
        success: false,
        message: 'URL parameters không hợp lệ',
        errors,
      });
      return;
    }

    req.params = result.data as any;
    next();
  };
};

