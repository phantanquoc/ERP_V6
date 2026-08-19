import { QuotationStatus } from '@prisma/client';

export const AGING_THRESHOLD = 7;
export const AGING_RED = 14;

export const NON_TERMINAL_STATUSES: QuotationStatus[] = [
  QuotationStatus.DRAFT,
  QuotationStatus.DANG_CHO_PHAN_HOI,
  QuotationStatus.DANG_CHO_GUI_DON_HANG,
  QuotationStatus.SENT,
  QuotationStatus.APPROVED,
];
