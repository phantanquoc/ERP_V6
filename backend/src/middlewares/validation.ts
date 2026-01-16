import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'boolean';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
}

export const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors[rule.field] = `${rule.field} is required`;
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      if (rule.type) {
        if (rule.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            errors[rule.field] = `${rule.field} must be a valid email`;
          }
        } else if (typeof value !== rule.type) {
          errors[rule.field] = `${rule.field} must be of type ${rule.type}`;
        }
      }

      // Check string length
      if (rule.type === 'string' || typeof value === 'string') {
        const strValue = String(value);
        if (rule.minLength && strValue.length < rule.minLength) {
          errors[rule.field] = `${rule.field} must be at least ${rule.minLength} characters`;
        }
        if (rule.maxLength && strValue.length > rule.maxLength) {
          errors[rule.field] = `${rule.field} must be at most ${rule.maxLength} characters`;
        }
      }

      // Check number range
      if (rule.type === 'number' || typeof value === 'number') {
        const numValue = Number(value);
        if (rule.min !== undefined && numValue < rule.min) {
          errors[rule.field] = `${rule.field} must be at least ${rule.min}`;
        }
        if (rule.max !== undefined && numValue > rule.max) {
          errors[rule.field] = `${rule.field} must be at most ${rule.max}`;
        }
      }

      // Check pattern
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors[rule.field] = `${rule.field} format is invalid`;
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
          errors[rule.field] = typeof result === 'string' ? result : `${rule.field} is invalid`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    next();
  };
};

