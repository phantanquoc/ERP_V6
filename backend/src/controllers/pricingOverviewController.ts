import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@utils/errors';
import { getPricingOverview } from '@services/pricingOverviewService';

function parseMonthYear(req: Request): { month?: number; year?: number } {
  const rawMonth = req.query.month as string | undefined;
  const rawYear = req.query.year as string | undefined;

  let month: number | undefined;
  let year: number | undefined;

  if (rawMonth !== undefined && rawMonth !== '') {
    month = Number(rawMonth);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new ValidationError('Tham số month không hợp lệ (1-12)');
    }
  }

  if (rawYear !== undefined && rawYear !== '') {
    year = Number(rawYear);
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      throw new ValidationError('Tham số year không hợp lệ (YYYY)');
    }
  }

  // Both must be provided together for filtering; lone value is treated as no filter
  if ((month !== undefined) !== (year !== undefined)) {
    throw new ValidationError('month và year phải đi cùng nhau');
  }

  return { month, year };
}

export async function getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, year } = parseMonthYear(req);
    const data = await getPricingOverview(month, year);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export default { getOverview };
