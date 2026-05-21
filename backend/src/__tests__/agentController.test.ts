import { AgentController } from '@controllers/agentController';
import { ValidationError } from '@utils/errors';
import { env } from '@config/env';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    department: {
      findUnique: jest.fn().mockResolvedValue({ code: 'SALES' }),
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    headers: { authorization: 'Bearer test-jwt-token' },
    user: { id: 'user-1', email: 'test@example.com', role: 'EMPLOYEE', departmentId: 'dept-1', subDepartmentId: null },
    body: {},
    ...overrides,
  } as any);

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.write = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.headersSent = false;
  return res;
};

const mockNext = jest.fn();

// ─── Mock fetch helper ───────────────────────────────────────────────────────

function makeReadableStream(chunks: string[]) {
  let index = 0;
  const encoder = new TextEncoder();
  return {
    getReader: () => ({
      read: jest.fn().mockImplementation(async () => {
        if (index < chunks.length) {
          return { done: false, value: encoder.encode(chunks[index++]) };
        }
        return { done: true, value: undefined };
      }),
    }),
  };
}

function makeFetchResponse(ok: boolean, status: number, chunks: string[] = []) {
  return {
    ok,
    status,
    body: ok ? makeReadableStream(chunks) : null,
  } as unknown as Response;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AgentController.stream', () => {
  let controller: AgentController;

  beforeEach(() => {
    controller = new AgentController();
    mockNext.mockClear();
    jest.clearAllMocks();
  });

  // ─── Validation ────────────────────────────────────────────────────────────

  it('ném ValidationError khi thiếu cả message lẫn confirm_tool', async () => {
    const req = mockRequest({ body: {} });
    const res = mockResponse();

    await controller.stream(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    const err = mockNext.mock.calls[0][0] as ValidationError;
    expect(err.message).toMatch(/Thiếu/);
  });

  it('không ném lỗi khi chỉ có confirm_tool (không có message)', async () => {
    const chunks = ['Đã thực hiện thành công'];
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(true, 200, chunks));

    const req = mockRequest({ body: { confirm_tool: 'create_leave_request', confirm_params: {} } });
    const res = mockResponse();

    await controller.stream(req, res, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  // ─── Streaming ─────────────────────────────────────────────────────────────

  it('pipe response chunks từ AI service về client', async () => {
    const chunks = ['Tìm thấy ', '3 kết quả'];
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(true, 200, chunks));

    const req = mockRequest({ body: { message: 'xem chấm công tuần này' } });
    const res = mockResponse();

    await controller.stream(req, res, mockNext);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith('Transfer-Encoding', 'chunked');
    expect(res.write).toHaveBeenCalledTimes(2);
    expect(res.end).toHaveBeenCalled();
  });

  it('forward JWT token đến AI service', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(true, 200, ['ok']));

    const req = mockRequest({ body: { message: 'test' } });
    const res = mockResponse();

    await controller.stream(req, res, mockNext);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const fetchOptions = fetchCall[1] as RequestInit;
    expect((fetchOptions.headers as Record<string, string>)['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('gửi đúng URL đến AI service', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(true, 200, ['ok']));

    const req = mockRequest({ body: { message: 'test' } });
    const res = mockResponse();

    await controller.stream(req, res, mockNext);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchCall[0]).toBe(`${env.AI_SERVICE_URL}/agent/stream`);
  });

  // ─── Error handling ─────────────────────────────────────────────────────────

  it('AI service down → trả fallback message 200', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const req = mockRequest({ body: { message: 'test' } });
    const res = mockResponse();

    await controller.stream(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('Trợ lý ERP đang khởi động')
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('AI service trả status lỗi → gọi next với Error', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(false, 503, []));

    const req = mockRequest({ body: { message: 'test' } });
    const res = mockResponse();

    await controller.stream(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('AbortError (timeout) → trả thông báo timeout 200', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(abortErr);

    const req = mockRequest({ body: { message: 'test' } });
    const res = mockResponse();

    await controller.stream(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('mất quá nhiều thời gian')
    );
  });
});
