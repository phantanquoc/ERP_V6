const mockTx:any={ purchaseRequest:{findFirst:jest.fn().mockResolvedValue(null),create:jest.fn(),findUnique:jest.fn(),update:jest.fn()}, purchaseRequestItem:{createMany:jest.fn(),findMany:jest.fn().mockResolvedValue([])}, replenishmentRequest:{create:jest.fn(),update:jest.fn(),findUnique:jest.fn(),findFirst:jest.fn()}, supplyRequestDecision:{findMany:jest.fn().mockResolvedValue([])}, supplyRequestItem:{findMany:jest.fn().mockResolvedValue([])}, supplyRequest:{findMany:jest.fn().mockResolvedValue([]),findUnique:jest.fn().mockResolvedValue(null)}, warehouses:{findUnique:jest.fn()}, inboundPlan:{findUnique:jest.fn().mockResolvedValue(null)}, employee:{findUnique:jest.fn()}, user:{findUnique:jest.fn()}, lot:{findUnique:jest.fn()} };
jest.mock('@config/database',()=>({__esModule:true,default:{purchaseRequest:{findUnique:jest.fn(),findFirst:jest.fn(),update:jest.fn(),create:jest.fn(),count:jest.fn(),updateMany:jest.fn()},replenishmentRequest:{findFirst:jest.fn(),findMany:jest.fn()},supplyRequest:{findUnique:jest.fn(),findMany:jest.fn()},supplyRequestDecision:{findMany:jest.fn()},supplyRequestItem:{findMany:jest.fn()},employee:{findUnique:jest.fn(),findMany:jest.fn()},user:{findUnique:jest.fn()},supplier:{findMany:jest.fn()},warehouses:{findUnique:jest.fn()},inboundPlan:{findUnique:jest.fn()},purchaseRequestItem:{findMany:jest.fn()},lot:{findUnique:jest.fn()},$transaction:jest.fn((fn:any)=>fn(mockTx)),}}));
jest.mock('@utils/errors',()=>{class ValidationError extends Error{statusCode=400;constructor(m:string){super(m);this.name='ValidationError';}} class NotFoundError extends Error{statusCode=404;constructor(m:string){super(m);this.name='NotFoundError';}} class AuthorizationError extends Error{statusCode=403;constructor(m:string){super(m);this.name='AuthorizationError';}} return{ValidationError,NotFoundError,AuthorizationError,ConflictError:ValidationError,AppError:Error};});
jest.mock('@services/notificationService',()=>({__esModule:true,default:{notify:jest.fn().mockResolvedValue(undefined)}}));
const mockRename=jest.fn((_f:string,c:string,urls:string[],s=1)=>urls.map((u,i)=>`/uploads/${_f}/${c}-${s+i}${u.slice(u.lastIndexOf('.'))}`));
jest.mock('@middlewares/upload',()=>({__esModule:true,getFileUrl:(f:string,n:string)=>`/uploads/${f}/${n}`,renameAttachmentsByCode:(...a:unknown[])=>mockRename(...(a as [string,string,string[],number])),deleteUploadedFile:jest.fn()}));
jest.mock('@utils/codeGenerator',()=>({nextYearlyCode:(_a:any,_p:string,y:number)=>`${_p}-${y}-001`,yearlyCodeWhere:()=>'.*'}));
import prisma from '@config/database';
import purchaseRequestService from '@services/purchaseRequestService';
const prismaMock=prisma as jest.Mocked<typeof prisma>;
const m=(t:string)=>`/uploads/purchase-requests/rand-${t}.pdf`;
beforeEach(()=>{jest.clearAllMocks();(prismaMock.$transaction as jest.Mock).mockImplementation((fn:any)=>fn(mockTx));mockRename.mockClear();});
describe('purchase attachments',()=>{
  test('Hoan thanh with new file succeeds',async()=>{
    (prismaMock.purchaseRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({id:'p1',maYeuCau:'YC-MH-2026-001',trangThai:'Hoàn thành',tepDinhKem:['/uploads/purchase-requests/YC-MH-2026-001-1.pdf'],fileKemTheo:null,supplyRequestId:null,ngayYeuCau:new Date()} as never)
      .mockResolvedValueOnce({tepDinhKem:['/uploads/purchase-requests/YC-MH-2026-001-1.pdf'],fileKemTheo:null} as never);
    (prismaMock.purchaseRequest.update as jest.Mock).mockResolvedValue({id:'p1',tepDinhKem:['/uploads/purchase-requests/YC-MH-2026-001-1.pdf','/uploads/purchase-requests/YC-MH-2026-001-2.pdf']} as never);
    const res=await purchaseRequestService.updatePurchaseRequest('p1',{tepDinhKem:[m('new')]} as never);
    expect((res as {tepDinhKem:string[]}).tepDinhKem.length).toBe(2);
  });
  test('Hoan thanh with items is blocked',async()=>{
    (prismaMock.purchaseRequest.findUnique as jest.Mock).mockResolvedValue({id:'p1',maYeuCau:'YC-MH-2026-001',trangThai:'Hoàn thành',supplyRequestId:null} as never);
    await expect(purchaseRequestService.updatePurchaseRequest('p1',{items:[{phanLoai:'A',tenHangHoa:'X',soLuong:1,donViTinh:'cái'}]} as never)).rejects.toThrow('Không thể sửa yêu cầu đã hoàn thành');
  });
  test('cap 4 rejects fifth',async()=>{
    (prismaMock.purchaseRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({id:'p1',maYeuCau:'YC-MH-2026-001',trangThai:'Chờ duyệt',supplyRequestId:null,ngayYeuCau:new Date()} as never)
      .mockResolvedValueOnce({tepDinhKem:['a','b','c'],fileKemTheo:null} as never);
    await expect(purchaseRequestService.updatePurchaseRequest('p1',{tepDinhKem:[m('d'),m('e')]} as never)).rejects.toThrow('tối đa 4 tệp');
  });
  test('legacy fileKemTheo visible via normalize',async()=>{
    const {normalizeAttachments}=await import('@utils/attachmentUtils');
    expect(normalizeAttachments({tepDinhKem:[],fileKemTheo:'/uploads/purchase-requests/old.pdf'})).toEqual(['/uploads/purchase-requests/old.pdf']);
    expect(normalizeAttachments({tepDinhKem:['/uploads/purchase-requests/a.pdf'],fileKemTheo:'/uploads/purchase-requests/old.pdf'})).toEqual(['/uploads/purchase-requests/a.pdf']);
  });
});
