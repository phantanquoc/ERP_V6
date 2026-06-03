import attendanceController from '@controllers/attendanceController';
import attendanceService from '@services/attendanceService';
import { AuthorizationError } from '@utils/errors';

jest.mock('@services/attendanceService', () => ({
  __esModule: true,
  default: {
    resolveEmployeeAttendanceAccess: jest.fn(),
    getEmployeeAttendance: jest.fn(),
  },
}));

const mockResponse = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('AttendanceController.getEmployeeAttendance', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the authenticated employee scope for EMPLOYEE role', async () => {
    const req: any = {
      params: { employeeId: 'requested-employee-id' },
      query: { startDate: '2026-06-01', endDate: '2026-06-03' },
      user: { id: 'user-1', role: 'EMPLOYEE' },
    };
    const res = mockResponse();
    const attendances = [{ id: 'att-1' }];

    (attendanceService.resolveEmployeeAttendanceAccess as jest.Mock).mockResolvedValue('owned-employee-id');
    (attendanceService.getEmployeeAttendance as jest.Mock).mockResolvedValue(attendances);

    await attendanceController.getEmployeeAttendance(req, res, next);

    expect(attendanceService.resolveEmployeeAttendanceAccess).toHaveBeenCalledWith('requested-employee-id', {
      userId: 'user-1',
      role: 'EMPLOYEE',
    });
    expect(attendanceService.getEmployeeAttendance).toHaveBeenCalledWith(
      'owned-employee-id',
      new Date('2026-06-01'),
      new Date('2026-06-03')
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: attendances,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes authorization errors to next', async () => {
    const req: any = {
      params: { employeeId: 'other-employee-id' },
      query: { startDate: '2026-06-01', endDate: '2026-06-03' },
      user: { id: 'user-1', role: 'EMPLOYEE' },
    };
    const res = mockResponse();
    const error = new AuthorizationError('Bạn chỉ được xem dữ liệu điểm danh của chính mình');

    (attendanceService.resolveEmployeeAttendanceAccess as jest.Mock).mockRejectedValue(error);

    await attendanceController.getEmployeeAttendance(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(attendanceService.getEmployeeAttendance).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
