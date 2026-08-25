import { describe, expect, it } from 'vitest';
import { labelForPurchaseRequest, isReplenishment } from '../../utils/purchaseRequestLabel';

describe('isReplenishment', () => {
  it('returns true only for SHORTAGE × Chờ báo giá', () => {
    expect(isReplenishment({ sourceType: 'SHORTAGE', trangThai: 'Chờ báo giá' })).toBe(true);
  });

  it.each([
    [{ sourceType: 'SHORTAGE', trangThai: 'Chờ duyệt' }],
    [{ sourceType: 'SHORTAGE', trangThai: 'Đã duyệt' }],
    [{ sourceType: 'SHORTAGE', trangThai: 'Hoàn thành' }],
    [{ sourceType: 'SHORTAGE', trangThai: 'Từ chối' }],
    [{ sourceType: 'MANUAL', trangThai: 'Chờ báo giá' }],
    [{ sourceType: 'REORDER', trangThai: 'Chờ báo giá' }],
    [{ sourceType: 'QUICK', trangThai: 'Chờ báo giá' }],
    [{ sourceType: 'SHORTAGE', trangThai: undefined }],
    [{ sourceType: undefined, trangThai: 'Chờ báo giá' }],
    [{ sourceType: null, trangThai: null }],
    [{}],
  ] as any[])('returns false for %s', (input) => {
    expect(isReplenishment(input)).toBe(false);
  });
});

describe('labelForPurchaseRequest', () => {
  it.each([
    ['Yêu cầu bổ sung', { sourceType: 'SHORTAGE', trangThai: 'Chờ báo giá' }],
    ['Yêu cầu mua hàng', { sourceType: 'SHORTAGE', trangThai: 'Chờ duyệt' }],
    ['Yêu cầu mua hàng', { sourceType: 'SHORTAGE', trangThai: 'Đã duyệt' }],
    ['Yêu cầu mua hàng', { sourceType: 'SHORTAGE', trangThai: 'Hoàn thành' }],
    ['Yêu cầu mua hàng', { sourceType: 'MANUAL', trangThai: 'Chờ báo giá' }],
    ['Yêu cầu mua hàng', { sourceType: 'MANUAL', trangThai: 'Chờ duyệt' }],
    ['Yêu cầu mua hàng', { sourceType: 'REORDER', trangThai: 'Chờ báo giá' }],
    ['Yêu cầu mua hàng', { sourceType: 'QUICK', trangThai: 'Đã duyệt' }],
    ['Yêu cầu mua hàng', { sourceType: undefined, trangThai: 'Chờ báo giá' }],
    ['Yêu cầu mua hàng', {}],
  ] as any[])('returns "%s" for %s', (expected, input) => {
    expect(labelForPurchaseRequest(input)).toBe(expected);
  });
});
