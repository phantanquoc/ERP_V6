# Kich ban thuc hien — Luong YC sua chua (tu phat hien loi den ban giao)

> Change: `split-inspection-repair` — Phase 1 discriminator (`requestType KIEM_TRA | SUA_CHUA`) tren `common.repair_requests`.
> Nguon su that: `design.md` 2.x-6.x + `business-decisions.md` + `tasks.md` + `specs/repair-request/spec.md`.
> Du lieu mau dung xuyen suot: 1 to may, 1 thiet bi, 1 nhom vat tu — de stakeholder tick dung/sai tung buoc (muc 5).

---

## 0. Boi canh & nhan vat mau

| Ky hieu | Gia tri mau | Ghi chu |
|---------|-------------|---------|
| Thiet bi | May ep dau ME-03 (MachineSystem `MS-EP-03`) | Chi tiet: Truc vit chi tiet `MSD-EP-03-02`, cum o bi |
| Loi | Vong bi 6205 mon, keu to, nhiet do truc 78 doC | FaultRecord `FR-2026-041`, trang thai `DANG_THEO_DOI` |
| Phong ban | To San xuat - Day chuyen 2 (`PB-SX02`) | `phongBanId = PB-SX02` |
| Nguoi phat hien | Nguyen Van An — nhan vien van hanh (`EMP-012`, role `EMPLOYEE`) | To San xuat |
| To bao tri | Le Thi Bao — to truong bao tri (`EMP-034`, `TEAM_LEAD`) | Nguoi tiep nhan + lap ke hoach |
| Tho sua | Tran Van Cuong (`EMP-045`, `EMPLOYEE`) — `CHINH`, Pham Van Duc (`EMP-046`) — `PHU` | Assignee |
| Thu kho | Hoang Van Kho (`EMP-021`) | Xu ly YCCC |
| Purchasing | Nguyen Thi Mua (`EMP-055`) | YCBS -> YCMH |
| Nghiem thu | Le Thi Bao + Dai dien SX (`EMP-012`) | `AcceptanceHandover` |
| Ma phieu KT | `YC-SC-2026-001` (`requestType=KIEM_TRA`) | Prefix giu `YC-SC` Phase 1 (design 9) |
| Ma phieu SC | `YC-SC-2026-002` (`requestType=SUA_CHUA`, `sourceInspectionRequestId=YC-SC-2026-001`) | Copy items tu KT |
| Ngay gio chot | Phat hien 28/09/2026 08:15, tiep nhan 08:45, lap KH 29/09, YCCC 30/09, YCBS 01/10, YCMH 02/10, nhap kho 07/10, xuat kho 08/10, thi cong 08-09/10, nghiem thu 10/10 | Gio VN |

Kho mau:

| Kho | Ma | Ton truoc YCCC |
|-----|----|----------------|
| Kho vat tu chung | `WH-VT-01` | Vong bi 6205: 0 cai; Mo boi Lithium EP2: 3 kg (du); Gioang cao su D30: 0 cai |

---

## 1. Walkthrough 9 buoc — duong chinh (du ton mot phan, BO sung YCBS->YCMH, DAT)

### B1 — Phat hien loi (Cac phong ban) — tao phieu KIEM_TRA

| Truong | Noi dung |
|--------|----------|
| **Actor** | Nguyen Van An (`EMP-012`, `EMPLOYEE`, To SX02) |
| **Action (UI)** | Tab Chung > Nut "Tao yeu cau" > chon loai `KIEM_TRA` > dien form > Gui |
| **Action (API)** | `POST /repair-requests` |
| **Input** | `{ requestType:"KIEM_TRA", mucDoUuTien:"CAO", ghiChu:"Phat hien truc ep keu to, nhiet 78C, nghi ro ri dau", phongBanId:"PB-SX02", canNgungMay:false, items:[{ machineSystemId:"MS-EP-03", machineSystemDetailId:"MSD-EP-03-02", faultRecordId:"FR-2026-041", tenHeThong:"Cum truc ep", tinhTrangThietBi:"KET", loaiLoi:"Co khi", noiDungLoi:"Vong bi 6205 mon, keu, nong truc" }] }` |
| **Validation** | `requestType=KIEM_TRA` => `sourceInspectionRequestId` phai `null` (reject neu co); `faultRecordId` phai ton tai va `trangThai IN (DANG_THEO_DOI, TAI_PHAT)` |
| **Output** | `201 { success:true, data:{ id:101, maYeuCau:"YC-SC-2026-001", requestType:"KIEM_TRA", trangThai:"CHO_XU_LY", items:[{id:"cuid-kt-1", sourceInspectionItemId:null}] } }` |
| **Trang thai** | (moi tao) `CHO_XU_LY` |
| **Entity thay doi** | `RepairRequest` 1 row (`requestType=KIEM_TRA`), `RepairRequestItem` 1 row, `RepairRequestStatusLog {old:null, new:CHO_XU_LY, actor:EMP-012}` |
| **Notification** | Toast "Tao phieu kiem tra YC-SC-2026-001 thanh cong"; (optional) notify To Bao tri queue |
| **UI sau buoc** | Row moi trong tab Chung filter `Kiem tra / Cho xu ly`, badge `KIEM_TRA` xanh, click -> detail drawer hien timeline 1 moc |

> Bien the tai B1: neu An chon `SUA_CHUA` truc tiep khong qua KT thi bo qua B1-B2, tao luon `YC-SC-2026-002` voi `sourceInspectionRequestId=null` (van hop le Phase 1).

---

### B2 — To dam bao HT tiep nhan -> DA_TIEP_NHAN

| Truong | Noi dung |
|--------|----------|
| **Actor** | Le Thi Bao (`EMP-034`, `TEAM_LEAD`, To Bao tri) |
| **Action (UI)** | Mo detail `YC-SC-2026-001` > nut "Tiep nhan" |
| **Action (API)** | `PATCH /repair-requests/101/accept` body `{}` (actor lay tu `req.user`) |
| **Guard** | `KIEM_TRA` duoc phep `CHO_XU_LY -> DA_TIEP_NHAN`; `TU_CHOI` chi tu `CHO_XU_LY|DA_TIEP_NHAN|LEN_KE_HOACH` (khong lien quan buoc nay) |
| **Output** | `200 { success:true, data:{ trangThai:"DA_TIEP_NHAN" } }` |
| **Trang thai** | `CHO_XU_LY -> DA_TIEP_NHAN` |
| **Entity thay doi** | `RepairRequest.trangThai=DA_TIEP_NHAN`, `RepairRequestStatusLog {old:CHO_XU_LY, new:DA_TIEP_NHAN, actor:EMP-034, reason:null}` |
| **Notification** | Toast "Da tiep nhan"; timeline them moc `DA_TIEP_NHAN — Le Thi Bao 28/09 08:45` |

Sau B2, Bao co the `TU_CHOI` hoac `DA_HUY` neu kiem tra vo nghia, nhung kich ban chinh di tiep B3. Voi `KIEM_TRA`, duong ngan la `DA_TIEP_NHAN -> HOAN_THANH` (B3 se tao SC ke thua, sau do KT duoc `complete`).

---

### B3 — Tao phieu SUA_CHUA tu kiem tra (sourceInspectionRequestId, auto-fill items)

| Truong | Noi dung |
|--------|----------|
| **Actor** | Le Thi Bao (`EMP-034`) |
| **Action (UI)** | Trong detail `YC-SC-2026-001` > nut "Tao phieu sua chua tu kiem tra" > form SUA_CHUA auto-fill items tu KT > bo sung `phuongAnSua` > Gui |
| **Action (API)** | `POST /repair-requests` body `{ requestType:"SUA_CHUA", sourceInspectionRequestId:"101" (id cua YC-SC-2026-001) hoac maYeuCau tuy contract, mucDoUuTien:"CAO", ghiChu:"De xuat thay vong bi 6205, ve sinh truc, thay gioang", phongBanId:"PB-SX02", canNgungMay:true, ngayBatDauKeHoach:"2026-10-08T07:00:00+07:00", ngayHoanThienDuKien:"2026-10-09T17:00:00+07:00", items:[{ machineSystemId:"MS-EP-03", machineSystemDetailId:"MSD-EP-03-02", faultRecordId:"FR-2026-041", tenHeThong:"Cum truc ep", tinhTrangThietBi:"KET", loaiLoi:"Co khi", noiDungLoi:"Vong bi 6205 mon", sourceInspectionItemId:"cuid-kt-1", phuongAnSua:"Thao cum truc, ep vong bi moi 6205, thay gioang D30, bom mo EP2 0.5kg" }] }` |
| **Validation** | `sourceInspectionRequestId` phai ton tai va co `requestType=KIEM_TRA`; `sourceInspectionItemId` phai thuoc KT nguon; `requestType=SUA_CHUA` moi duoc co planning fields; `ngayHoanThienDuKien > ngayBatDauKeHoach` |
| **Output** | `201 { data:{ id:102, maYeuCau:"YC-SC-2026-002", requestType:"SUA_CHUA", sourceInspectionRequestId:"...", trangThai:"CHO_XU_LY", items:[{id:"cuid-sc-1", sourceInspectionItemId:"cuid-kt-1", phuongAnSua:"..."}] } }` |
| **Trang thai SC** | `CHO_XU_LY` (moi tao) |
| **Trang thai KT nguon** | Bao co the `PATCH /repair-requests/101/complete` -> `DA_TIEP_NHAN -> HOAN_THANH` (KT hoan thanh khi da co phieu SC ke thua; khong bat buoc truoc B4) |
| **Entity thay doi** | `RepairRequest` 1 row SUA_CHUA + `RepairRequestItem` 1 row (`sourceInspectionItemId` tro ve KT), 2 `StatusLog` (SC: null->CHO_XU_LY, KT: DA_TIEP_NHAN->HOAN_THANH neu complete) |
| **Notification** | Toast "Tao phieu sua chua YC-SC-2026-002 tu YC-SC-2026-001"; detail SC hien chip link nguoc `Nguon: YC-SC-2026-001` clickable |

> Loi thuong gap neu sai: tao `KIEM_TRA` ma gui `sourceInspectionRequestId != null` -> `400 ValidationError`; tao `SUA_CHUA` tu KT khong ton tai -> `404`.

---

### B4 — Lap ke hoach + phan cong + vat tu du kien (RepairMaterialNeed)

| Truong | Noi dung |
|--------|----------|
| **Actor** | Le Thi Bao (`EMP-034`, TEAM_LEAD) + he thong |
| **Action (UI)** | Mo `YC-SC-2026-002` detail > khu vuc Lap ke hoach: dien `keHoachChiTiet`, `phuongAn`, `bienPhapAnToan`, `chiPhiDuKien`, `canNgungMay` > nut "Luu ke hoach" (= `plan`) > them Assignee > them Vat tu du kien |
| **Action (API) — tuan tu** | 1) `PATCH /repair-requests/102/accept` -> `CHO_XU_LY -> DA_TIEP_NHAN` (neu chua accept SC) <br> 2) `PATCH /repair-requests/102/plan` body `{ keHoachChiTiet:"Ngay 08/10 thao truc, ngay 09/10 lap va chay thu", phuongAn:"Dung doi ep thuy luc 10 tan, can chinh dong tam", bienPhapAnToan:"Cat dien, treo bien, mang gang chiu nhiet", chiPhiDuKien: 8500000, canNgungMay:true, ngayBatDauKeHoach:"2026-10-08T07:00:00+07:00", ngayHoanThienDuKien:"2026-10-09T17:00:00+07:00", phongBanId:"PB-SX02" }` -> `DA_TIEP_NHAN -> LEN_KE_HOACH` <br> 3) `POST /repair-requests/102/assignees` x2: `{userId:"EMP-045", vaiTro:"CHINH", isLead:true}` (Cuong lead), `{userId:"EMP-046", vaiTro:"PHU"}` (Duc) <br> 4) `POST /repair-requests/102/material-needs` x3: `{repairRequestItemId:"cuid-sc-1", tenVatTu:"Vong bi 6205", donVi:"cai", soLuongDuKien:2}`, `{... tenVatTu:"Mo boi Lithium EP2", donVi:"kg", soLuongDuKien:0.5}`, `{... tenVatTu:"Gioang cao su D30", donVi:"cai", soLuongDuKien:4}` |
| **Guard** | `LEN_KE_HOACH` chi tu `DA_TIEP_NHAN`; `assignees` toi da 1 `isLead=true` (transaction + partial unique index); `materialNeeds` unique `[repairRequestItemId, tenVatTu]`; `KIEM_TRA` bi chan them assignee/material (service reject) |
| **Trang thai** | `CHO_XU_LY -> DA_TIEP_NHAN -> LEN_KE_HOACH` |
| **Entity thay doi** | `RepairRequest` update 5 cot ke hoach + `trangThai=LEN_KE_HOACH`, 2 `StatusLog`, 2 `RepairRequestAssignee` rows, 3 `RepairMaterialNeed` rows (`soLuongThucTe=null` luc nay) |
| **Notification** | Toast tung buoc; timeline them 2 moc `accept` + `plan`; AssigneeList hien 2 avatar + vuong mien CHINH; MaterialNeedTable hien 3 dong vat tu |

Mau `RepairMaterialNeed` sau B4:

| tenVatTu | donVi | soLuongDuKien | soLuongThucTe |
|----------|-------|---------------|---------------|
| Vong bi 6205 | cai | 2 | null |
| Mo boi Lithium EP2 | kg | 0.5 | null |
| Gioang cao su D30 | cai | 4 | null |

---

### B5 — Tao YCCC (SupplyRequest) tu sua chua -> RepairSupplyLink (lien ket goc)

| Truong | Noi dung |
|--------|----------|
| **Actor** | **Le Thi Bao (`EMP-034`) — nguoi tao (de xuat), Tran Van Cuong (`EMP-045`) cung co the tao** — RBAC: bat ky actor nao co quyen `repair:write` tren SC 102 deu duoc tao YCCC tu SC (employeeId lay tu `req.user`, khong rang buoc phai la assignee) |
| **Action (UI)** | Trong detail `YC-SC-2026-002` > panel "YC vat tu" (SupplyLinkPanel) > nut "Tao YC vat tu" > chon 3 dong vat tu du kien > chon kho `WH-VT-01` > Gui. YCCC van co the tao doc lap o tab Cung ung nhu cu — khi do chua co link toi SC, co the link sau (B5 buoc 2). |
| **Action (API)** | 1) `POST /supply-requests` body `{ employeeId: lay tu req.user.id (VD Bao EMP-034 neu Bao bam, Cuong EMP-045 neu Cuong bam), mucDichYeuCau:"Phuc vu sua chua YC-SC-2026-002 - ME-03", mucDoUuTien:"CAO", loaiYeuCau:"Thường", items:[{ phanLoai:"Vat tu", tenGoi:"Vong bi 6205", soLuong:2, donViTinh:"cai", isNewProduct:false }, { phanLoai:"Vat tu", tenGoi:"Mo boi Lithium EP2", soLuong:0.5, donViTinh:"kg" }, { phanLoai:"Vat tu", tenGoi:"Gioang cao su D30", soLuong:4, donViTinh:"cai" }] }` -> tra ve `SupplyRequest { id:"cuid-yccc-01", maYeuCau:"YCCC-2026-011", trangThai:"Chưa cung cấp", items:[{id:"cuid-yccci-1", fulfillmentStatus:"Chờ xử lý"}, ...] }` <br> 2) `POST /repair-requests/102/supply-links` body `{ supplyRequestId:"cuid-yccc-01", soLuong:null, ghiChu:"Cap cho cum truc ep ME-03" }` (header-level link; neu muon per-item thi them `repairRequestItemId:"cuid-sc-1"` + `supplyRequestItemId:"cuid-yccci-1"`). **Khong bat buoc**: SC co the khong co YCCC (sua chua khong can vat tu) — B6-B6f bo qua, van di thang B7. |
| **Validation** | `supplyRequestId` phai ton tai (service `findUnique`); unique `[repairRequestItemId, supplyRequestId]` chong double-link; cross-type Int<->cuid khong co FK DB nen validate o service |
| **Trang thai SC** | Van `LEN_KE_HOACH` (tao YCCC khong doi trang thai SC) |
| **Trang thai YCCC** | `Chưa cung cấp`, moi `SupplyRequestItem.fulfillmentStatus="Chờ xử lý"` |
| **Entity thay doi** | `SupplyRequest` 1 row + 3 `SupplyRequestItem` rows + 1 `RepairSupplyLink { repairRequestId:102, supplyRequestId:"cuid-yccc-01", repairRequestItemId:null }` |
| **Notification** | Toast "Da tao YCCC YCCC-2026-011 va lien ket voi YC-SC-2026-002"; SupplyLinkPanel hien chip `YCCC-2026-011 [Chưa cung cấp]` deep-link sang tab Cung ung; dong thoi `GET /supply-requests/cuid-yccc-01` se tra ve `repairLinks:[{repairRequestId:102, maYeuCau:"YC-SC-2026-002"}]` de hien chip "Phuc vu SC #YC-SC-2026-002" |

> Luu y thiet ke (design 6.1): `RepairSupplyLink` chi luu goc `supplyRequestId`; cac nac sau YCBS/YCMH khong them cot tren link ma truy vet qua FK san co (B6).

Mui ten quan he sau B5:

```
RepairRequest 102 --< RepairSupplyLink >-- SupplyRequest YCCC-2026-011
                                          --< SupplyRequestItem (3 items, "Cho xu ly")
```

---

### B6 — Kho xu ly YCCC — du ton thi xuat, thieu thi sinh YCBS -> YCMH -> nhap kho -> xuat (chuoi YCCC->YCBS->YCMH)

Buoc nay la buoc phan nhanh quan trong nhat. Co 2 nhom ket qua tren cung YCCC:

#### B6a — Kho quyet dinh tung item (SupplyRequestDecision)

| Truong | Noi dung |
|--------|----------|
| **Actor** | Hoang Van Kho (`EMP-021`, thu kho `WH-VT-01`) |
| **Action (API)** | `POST /supply-requests/cuid-yccc-01/decide` (hoac `POST /supply-request-decisions` tuy route) — tao 3 `SupplyRequestDecision` moi item |
| **Input mau** | Item 1 Vong bi 6205 x2: `{ supplyRequestItemId:"cuid-yccci-1", decision:"Chuyển thu mua", fulfilledQty:0, shortageQty:2, reason:"Ton 0, khong du cap", decidedByEmployeeId:"EMP-021" }` <br> Item 2 Mo EP2 0.5kg: `{ supplyRequestItemId:"cuid-yccci-2", decision:"Cấp đủ", fulfilledQty:0.5, shortageQty:0 }` (ton 3kg du) <br> Item 3 Gioang D30 x4: `{ supplyRequestItemId:"cuid-yccci-3", decision:"Chuyển thu mua", fulfilledQty:0, shortageQty:4, reason:"Ton 0" }` |
| **Entity thay doi** | 3 `SupplyRequestDecision` rows; 2 trong so do co `triggeredReplenishmentRequestId` se duoc dien o B6b |
| **Trang thai YCCC** | Van `Chưa cung cấp` (chua xuat); `SupplyRequestItem.fulfillmentStatus` chuyen `Chờ xử lý -> Thiếu tồn kho` (2 items) / `Đủ tồn kho` (1 item) tuy UI mapping |

#### B6b — Thieu ton -> sinh YCBS (ReplenishmentRequest) gom shortage

| Truong | Noi dung |
|--------|----------|
| **Actor** | Hoang Van Kho (`EMP-021`) — thao tac gom YCBS |
| **Action (API)** | `POST /replenishment-requests` gom 2 items thieu theo `phanLoaiGroup=MATERIALS` |
| **Input** | `{ employeeId:"EMP-045" (= SupplyRequest.employeeId goc, owner la nguoi yeu cau), supplyRequestId:"cuid-yccc-01", phanLoaiGroup:"MATERIALS", mucDichYeuCau:"Bo sung vat tu cho YCCC-2026-011 (SC YC-SC-2026-002)", mucDoUuTien:"CAO", items:[{ phanLoai:"Vat tu", tenGoi:"Vong bi 6205", soLuong:2, donViTinh:"cai" }, { phanLoai:"Vat tu", tenGoi:"Gioang cao su D30", soLuong:4, donViTinh:"cai" }] }` |
| **Output** | `ReplenishmentRequest { id:"cuid-ycbs-01", maYeuCau:"YC-BS-2026-007", trangThai:"Chờ báo giá", supplyRequestId:"cuid-yccc-01", convertedPurchaseRequestId:null, items:[{id:"cuid-ycbsi-1", nhaCungCapId:null, giaDuKien:null}, {id:"cuid-ycbsi-2", nhaCungCapId:null, giaDuKien:null}] }` |
| **FK noi chuoi** | Update 2 `SupplyRequestDecision.triggeredReplenishmentRequestId = "cuid-ycbs-01"` (FK SetNull, index san co) |
| **Trang thai YCBS** | `Chờ báo giá` (items chua co NCC/gia) |
| **Entity thay doi** | 1 `ReplenishmentRequest` + 2 `ReplenishmentRequestItem` + 2 `Decision` update FK |
| **Notification** | Toast "Da tao YCBS YC-BS-2026-007 cho 2 vat tu thieu" |

#### B6c — Purchasing dien gia/NCC va convert YCBS -> YCMH

| Truong | Noi dung |
|--------|----------|
| **Actor** | Nguyen Thi Mua (`EMP-055`, Purchasing) |
| **Action (UI)** | Mo YCBS `YC-BS-2026-007` > dien tung dong `nhaCungCapId` + `giaDuKien` > nut "Chuyen mua hang" |
| **Action (API)** | 1) `PATCH /replenishment-requests/cuid-ycbs-01/items/cuid-ycbsi-1` body `{ nhaCungCapId:"SUP-001", giaDuKien: 185000 }` (Vong bi 6205, NCC Vong bi Viet Nhat) <br> 2) `PATCH .../cuid-ycbsi-2` body `{ nhaCungCapId:"SUP-003", giaDuKien: 15000 }` (Gioang D30) <br> 3) `POST /replenishment-requests/cuid-ycbs-01/convert` (atomically) |
| **Convert atomically** | Tao `PurchaseRequest { id:"cuid-ycmh-01", maYeuCau:"YC-MH-2026-014", sourceType:"SHORTAGE" (hoac MANUAL/REORDER tuy mapping), trangThai:"Chờ duyệt", employeeId:"EMP-045", supplyRequestId:"cuid-yccc-01", items:[{ phanLoai:"Vat tu", tenHangHoa:"Vong bi 6205", soLuong:2, donViTinh:"cai", nhaCungCapId:"SUP-001", giaDuKien:185000 }, { phanLoai:"Vat tu", tenHangHoa:"Gioang cao su D30", soLuong:4, donViTinh:"cai", nhaCungCapId:"SUP-003", giaDuKien:15000 }] }` + `ReplenishmentRequest.convertedPurchaseRequestId="cuid-ycmh-01" @unique` + `ReplenishmentRequest.trangThai="Đã chuyển mua hàng"` (1 YCBS -> 1 YCMH) |
| **Trang thai** | YCBS: `Chờ báo giá -> Đã chuyển mua hàng`; YCMH: `Chờ duyệt` |
| **Entity thay doi** | 2 `ReplenishmentRequestItem` update NCC/gia + 1 `PurchaseRequest` + 2 `PurchaseRequestItem` (giaDuKien sao y tu YCBS, `giaThucTe=null` luc nay) + 1 `ReplenishmentRequest` update FK + status |
| **FK chuoi** | `ReplenishmentRequest.convertedPurchaseRequestId -> PurchaseRequest.id` (relation `ReplenishmentToPurchase`) |

#### B6d — YCMH duyet -> InboundPlan

| Truong | Noi dung |
|--------|----------|
| **Actor** | Truong mua hang / Nguoi duyet (`EMP-060`) |
| **Action (API)** | `PATCH /purchase-requests/cuid-ycmh-01/approve` body `{ nguoiDuyet:"EMP-060", lyDo:"Duyet bo sung cho SC YC-SC-2026-002" }` hoac `POST /purchase-requests/:id/approve` tuy route hien tai |
| **Output** | `PurchaseRequest.trangThai="Đã duyệt" (hoac "Da duyet")` + auto tao `InboundPlan { id:"cuid-ibp-01", purchaseRequestId:"cuid-ycmh-01" @unique, maKeHoach:"KH-NH-2026-014", ngayDuKienNhap:"2026-10-07", warehouseId:"WH-VT-01", trangThai:"Chờ nhập" }` |
| **Entity thay doi** | `PurchaseRequest` update duyet + 1 `InboundPlan` |

#### B6e — Hang ve: confirm gia thuc te -> WarehouseReceipt -> LotProduct -> InboundPlan Da nhap

| Truong | Noi dung |
|--------|----------|
| **Actor** | Nguyen Thi Mua (`EMP-055`) + Thu kho `WH-VT-01` |
| **Action (API)** | 1) `POST /purchase-requests/cuid-ycmh-01/confirm-actual-price` body `{ items:[{ id:"...", giaThucTe:182000, soLuongThucTe:2 }, { id:"...", giaThucTe:15000, soLuongThucTe:4 }] }` (mac dinh `giaThucTe=giaDuKien` neu khong doi) -> cap nhat `PurchaseRequestItem.giaThucTe/soLuongThucTe` + `InternationalProduct.giaThanh` binh quan gia quyen <br> 2) `POST /warehouse-receipts` body `{ purchaseRequestId:"cuid-ycmh-01", inboundPlanId:"cuid-ibp-01", warehouseId:"WH-VT-01", items:[{ tenHangHoa:"Vong bi 6205", soLuong:2, giaThanh:182000 }, { tenHangHoa:"Gioang cao su D30", soLuong:4, giaThanh:15000 }] }` -> `WarehouseReceipt { id:"WR-2026-014", inboundPlanId:"cuid-ibp-01" } + WarehouseReceiptItem[] -> LotProduct { soLuong +=, giaThanh bq }` <br> 3) `InboundPlan.trangThai="Đã nhập"` |
| **Entity thay doi** | 2 `PurchaseRequestItem` update gia thuc te + 1 `WarehouseReceipt` + 2 `WarehouseReceiptItem` + 2 `LotProduct` tang ton + 1 `InboundPlan` update status |

#### B6f — Xuat kho hoan tra YCCC: OutboundPlan + WarehouseIssue -> cap nhat fulfilledQty

| Truong | Noi dung |
|--------|----------|
| **Actor** | Hoang Van Kho (`EMP-021`) |
| **Action (API)** | `POST /outbound-plans` body `{ supplyRequestId:"cuid-yccc-01", maKeHoach:"KH-XH-2026-011", warehouseId:"WH-VT-01" }` -> `OutboundPlan { id:"cuid-obp-01", supplyRequestId:"cuid-yccc-01" }` <br> `POST /warehouse-issues` body `{ supplyRequestId:"cuid-yccc-01", outboundPlanId:"cuid-obp-01", warehouseId:"WH-VT-01", items:[{ supplyRequestItemId:"cuid-yccci-1", soLuong:2 }, { supplyRequestItemId:"cuid-yccci-2", soLuong:0.5 }, { supplyRequestItemId:"cuid-yccci-3", soLuong:4 }] }` -> tru `LotProduct.soLuong`, tao `WarehouseIssue { id:"WI-2026-011", supplyRequestId:"cuid-yccc-01", outboundPlanId:"cuid-obp-01" }` |
| **Cap nhat YCCC** | `SupplyRequestItem.fulfilledQty` tang (2 / 0.5 / 4), `fulfillmentStatus` -> `Đã cấp đủ` (3 items), `SupplyRequest.trangThai` tien toi `Đã cấp đủ` / hoan tat |
| **Entity thay doi** | 1 `OutboundPlan` + 1 `WarehouseIssue` + 3 `WarehouseIssueItem` + 3 `LotProduct` giam ton + 3 `SupplyRequestItem` update fulfilled + 1 `SupplyRequest` update trangThai |
| **Notification** | Toast "Da xuat kho cho YCCC-2026-011"; banner trong detail SC `YC-SC-2026-002` chuyen tu "Cho cap phat" -> "Da cap du vat tu" |

#### Tong ket chuoi sau B6 (de dung cho B9 AcceptanceHandover.warehouseIssueId)

```
YC-SC-2026-002 (SUA_CHUA, LEN_KE_HOACH)
  --RepairSupplyLink--> YCCC-2026-011 (Da cap du)
                          --Decision(thieu)--> YC-BS-2026-007 (Da chuyen mua hang)
                                                  --convertedPurchaseRequestId--> YC-MH-2026-014 (Da duyet)
                                                                                        --1:1--> KH-NH-2026-014 (Da nhap) --< WR-2026-014 -> LotProduct
                                                                                        |
                                                                                        +--< WI-2026-011 (Outbound KH-XH-2026-011)  <-- dung cho B9
```

**Tra cuu chuoi (khong doi schema RepairSupplyLink):** `GET /repair-requests/102/supply-chain` goi `resolveSupplyChain(supplyRequestIds)` — gom `supplyRequestId` tu links, query `SupplyRequestItem -> SupplyRequestDecision (triggeredReplenishmentRequestId != null, lay moi nhat per item) -> ReplenishmentRequest -> PurchaseRequest (qua convertedPurchaseRequestId) -> InboundPlan + WarehouseIssue`. Ket qua hydrate 3 tang chip `[YCCC] -> [YCBS] -> [YCMH]` trong SupplyLinkPanel; khi chua co YCBS/YCMH hien placeholder "Chua phat sinh bo sung". Reverse: `GET /supply-requests/:id` / `GET /replenishment-requests/:id` / `GET /purchase-requests/:id` deu tra ve `repairLinks` de hien chip "Phuc vu SC #YC-SC-2026-002" (design 6.3).

**Unlink semantics:** `DELETE /repair-requests/102/supply-links/:linkId` chi xoa row link, khong cascade toi YCBS/YCMH/InboundPlan/WarehouseReceipt/WarehouseIssue da sinh — chung thuoc vong doi kho/mua hang doc lap.

---

### B7 — Thi cong sua chua (DANG_SUA_CHUA -> CHO_NGHIEM_THU)

| Truong | Noi dung |
|--------|----------|
| **Actor** | Tran Van Cuong (`EMP-045`, CHINH) + Pham Van Duc (`EMP-046`, PHU) |
| **Action (UI)** | Trong detail `YC-SC-2026-002` > nut "Bat dau sua" (khi vat tu da cap du) > thi cong > dien `noiDungThucHien`, `gioCongThucTe` > nut "De nghi nghiem thu" |
| **Action (API)** | 1) `PATCH /repair-requests/102/start` body `{}` -> `LEN_KE_HOACH -> DANG_SUA_CHUA` (existing route `PATCH /:id/start`) <br> 2) (tuong tac) `PUT /repair-requests/102` body `{ noiDungThucHien:"Da thao truc, ep vong bi 6205 moi, thay 4 gioang D30, bom mo 0.5kg, can dong tam 0.02mm, chay thu 30p nhiet 42C", gioCongThucTe: 6.5 }` (update header, khong doi `trangThai` truc tiep) <br> 3) `PATCH /repair-requests/102/submit-acceptance` body `{}` -> `DANG_SUA_CHUA -> CHO_NGHIEM_THU` |
| **Guard** | `start` chi tu `LEN_KE_HOACH`; `submit-acceptance` chi tu `DANG_SUA_CHUA`; `trangThai` khong cho client ghi truc tiep (strip nhu `updateRepairRequest`) |
| **Trang thai** | `LEN_KE_HOACH -> DANG_SUA_CHUA -> CHO_NGHIEM_THU` |
| **Entity thay doi** | `RepairRequest.trangThai` 2 lan + 2 `StatusLog` (`start` + `submit`) + `RepairRequest.noiDungThucHien` + `gioCongThucTe` |
| **Notification** | Toast "Da bat dau sua" / "Da de nghi nghiem thu"; timeline them 2 moc; banner SC chuyen sang mau `CHO_NGHIEM_THU` |

Vat tu thuc te sau thi cong (de dung B9):

| tenVatTu | soLuongDuKien | soLuongThucTe |
|----------|---------------|---------------|
| Vong bi 6205 | 2 | 1 (1 cai du phong khong dung) |
| Mo boi Lithium EP2 | 0.5 | 0.4 |
| Gioang cao su D30 | 4 | 4 |

=> `PUT /repair-requests/102/material-needs/:needId` cap nhat `soLuongThucTe` cho 3 dong (tuong ung).

---

### B8 — Nghiem thu — DAT (HOAN_THANH) va nhanh KHONG_DAT (loop ve DANG_SUA_CHUA)

#### B8-DAT — duong chinh

| Truong | Noi dung |
|--------|----------|
| **Actor** | Le Thi Bao (`EMP-034`) + Dai dien SX (`EMP-012`) |
| **Action (UI)** | Trong detail `YC-SC-2026-002` > khu vuc Nghiem thu (AcceptanceSection) > tao bien ban nghiem thu > chon `DAT` > Xac nhan |
| **Action (API)** | 1) `POST /acceptance-handovers` (hoac route tuong ung) body `{ repairRequestId:102, warehouseIssueId:"WI-2026-011" (lay tu B6f), chiPhiThucTe: 6200000, ketQua:"DAT", items:[{ tenHangMuc:"Thay vong bi 6205", ketQua:"DAT" }] }` -> `AcceptanceHandover { id:"cuid-ah-01", repairRequestId:102, warehouseIssueId:"WI-2026-011", ketQua:"DAT", chiPhiThucTe:6200000 }` <br> 2) `PATCH /repair-requests/102/confirm-acceptance` body `{ ketQua:"DAT", chiPhiThucTe:6200000 }` -> `CHO_NGHIEM_THU -> DA_NGHIEM_THU` <br> 3) `PATCH /repair-requests/102/complete` body `{}` -> `DA_NGHIEM_THU -> HOAN_THANH` (set `ngayHoanThanhThucTe=now()`) |
| **Guard** | `confirm-acceptance` chi tu `CHO_NGHIEM_THU`; `ketQua` enum `DAT|KHONG_DAT`; `complete` chi tu `DA_NGHIEM_THU` |
| **Trang thai** | `CHO_NGHIEM_THU -> DA_NGHIEM_THU -> HOAN_THANH` |
| **Entity thay doi** | 1 `AcceptanceHandover` + 1 `AcceptanceHandoverItem` + `RepairRequest.ketQuaNghiemThu=DAT` + `chiPhiThucTe=6200000` + `ngayHoanThanhThucTe` + 2 `StatusLog` |
| **Notification** | Toast "Nghiem thu DAT — YC-SC-2026-002 da hoan thanh"; timeline them 2 moc `DA_NGHIEM_THU (DAT)` + `HOAN_THANH`; chip trang thai xanh la |

#### B8-KHONG_DAT — nhanh loop (bien the b)

| Truong | Noi dung |
|--------|----------|
| **Actor** | Le Thi Bao + Dai dien SX |
| **Action (API)** | 1) `POST /acceptance-handovers` body `{ repairRequestId:102, warehouseIssueId:"WI-2026-011", ketQua:"KHONG_DAT", chiPhiThucTe: 6200000, ghiChu:"Do rung con 0.08mm vuot nguong 0.05mm, yeu cau can lai" }` -> handover 1 <br> 2) `PATCH /repair-requests/102/confirm-acceptance` body `{ ketQua:"KHONG_DAT" }` -> `CHO_NGHIEM_THU -> DA_NGHIEM_THU` (tam) <br> 3) He thong tu dong trigger `DA_NGHIEM_THU --KHONG_DAT--> DANG_SUA_CHUA` (loop duy nhat hop le, ghi log `reason:'acceptance_khong_dat'`), giu lai handover cu |
| **Trang thai** | `CHO_NGHIEM_THU -> DA_NGHIEM_THU -> DANG_SUA_CHUA` (quay lai B7) |
| **Entity thay doi** | 1 `AcceptanceHandover {ketQua:KHONG_DAT}` + `RepairRequest.ketQuaNghiemThu=KHONG_DAT` + `StatusLog {DA_NGHIEM_THU->DANG_SUA_CHUA, reason:'acceptance_khong_dat'}` |
| **Tiep theo** | Quay lai B7: tho sua khac phuc (can dong tam lai), cap nhat `noiDungThucHien`, `submit-acceptance` lan 2 -> B8-DAT lan 2 tao `AcceptanceHandover` thu 2 voi `ketQua:DAT`, roi `complete` -> `HOAN_THANH`. Lich su giu ca 2 bien ban. |
| **Notification** | Canh bao "KHONG_DAT — phieu se quay lai DANG_SUA_CHUA de khac phuc"; timeline hien loop mui ten do |

---

### B9 — Ban giao — AcceptanceHandover gan warehouseIssueId, cap nhat chi phi thuc te

| Truong | Noi dung |
|--------|----------|
| **Actor** | Le Thi Bao (`EMP-034`) + Hoang Van Kho (`EMP-021`) |
| **Action (UI)** | Trong detail `YC-SC-2026-002` (da `HOAN_THANH`) > tab Ban giao > xem bien ban `AH-2026-014` > in / ky so |
| **Action (API)** | `GET /repair-requests/102` include `acceptanceHandovers:[{ id:"cuid-ah-01", warehouseIssueId:"WI-2026-011", ketQua:"DAT", chiPhiThucTe:6200000, createdAt:"2026-10-10T10:00:00+07:00" }]` + `GET /warehouse-issues/WI-2026-011` de doi chieu vat tu xuat thuc te |
| **Doi chieu chi phi** | `chiPhiDuKien` (B4) 8.500.000 vs `chiPhiThucTe` 6.200.000 (tiet kiem do dung 1 vong bi thay vi 2); `gioCongThucTe` 6.5h; chenh lech giai trinh trong `AcceptanceHandover.ghiChu` hoac `RepairRequest.noiDungThucHien` |
| **Trang thai cuoi** | SC `HOAN_THANH` (`ngayHoanThanhThucTe=2026-10-10T10:00:00+07:00`), KT nguon `HOAN_THANH`, YCCC `Đã cấp đủ`, YCBS `Đã chuyển mua hàng`, YCMH `Đã duyệt`, InboundPlan `Đã nhập`, WarehouseIssue `WI-2026-011` |
| **Entity thay doi** | Khong them entity moi o B9 (chi doc + in); neu can dieu chinh chi phi sau ban giao thi `PUT /acceptance-handovers/:id` update `chiPhiThucTe` (service cho phep) |
| **Notification** | Toast "Ban giao hoan tat"; email/slack (neu cau hinh) toi To SX02: "ME-03 da san sang van hanh lai" |
| **Deep-link** | Tu `AcceptanceHandover.warehouseIssueId=WI-2026-011` click -> tab Kho > phieu xuat `WI-2026-011`; tu `WI-2026-011.supplyRequestId` -> `YCCC-2026-011` -> chip "Phuc vu SC #YC-SC-2026-002" nguoc lai |

So do ban giao:

```
AcceptanceHandover (AH-2026-014, DAT, 6.2tr) --warehouseIssueId--> WarehouseIssue WI-2026-011
                                                                    --outboundPlanId--> OutboundPlan KH-XH-2026-011
                                                                    --supplyRequestId--> SupplyRequest YCCC-2026-011
                                                                                           --RepairSupplyLink--> RepairRequest YC-SC-2026-002 (HOAN_THANH)
```

---

## 2. Chuoi du lieu mau tong hop (de seed / demo)

| Entity | Ma mau | Trang thai cuoi | FK quan trong |
|--------|--------|-----------------|---------------|
| RepairRequest KT | YC-SC-2026-001 (id 101) | HOAN_THANH | `requestType=KIEM_TRA`, `items[0].id=cuid-kt-1` |
| RepairRequest SC | YC-SC-2026-002 (id 102) | HOAN_THANH | `requestType=SUA_CHUA`, `sourceInspectionRequestId=101`, `sourceInspectionItemId=cuid-kt-1`, `trangThai` 9 gia tri, `canNgungMay=true` |
| RepairRequestItem SC | cuid-sc-1 | — | `sourceInspectionItemId=cuid-kt-1`, `phuongAnSua` |
| RepairRequestAssignee | 2 rows | — | `repairRequestId=102`, `userId EMP-045 (CHINH,isLead true)` + `EMP-046 (PHU)` |
| RepairMaterialNeed | 3 rows | — | `repairRequestItemId=cuid-sc-1`, `soLuongThucTe` dien sau B7 |
| RepairSupplyLink | cuid-rsl-01 | — | `repairRequestId=102`, `supplyRequestId=cuid-yccc-01`, `repairRequestItemId=null` (header) |
| SupplyRequest YCCC | YCCC-2026-011 (cuid-yccc-01) | Đã cấp đủ | `employeeId=EMP-045`, `trangThai` |
| SupplyRequestItem | 3 rows | Đã cấp đủ | `fulfilledQty` = soLuong, `fulfillmentStatus` |
| SupplyRequestDecision | 3 rows | — | `triggeredReplenishmentRequestId=cuid-ycbs-01` (2 rows thieu), `decidedBy=EMP-021` |
| ReplenishmentRequest YCBS | YC-BS-2026-007 (cuid-ycbs-01) | Đã chuyển mua hàng | `supplyRequestId=cuid-yccc-01`, `convertedPurchaseRequestId=cuid-ycmh-01` @unique |
| ReplenishmentRequestItem | 2 rows | — | `nhaCungCapId` + `giaDuKien` dien truoc convert |
| PurchaseRequest YCMH | YC-MH-2026-014 (cuid-ycmh-01) | Đã duyệt | `supplyRequestId=cuid-yccc-01`, `sourceType=SHORTAGE`, `InBound` |
| PurchaseRequestItem | 2 rows | — | `giaDuKien` sao y tu YCBS, `giaThucTe=182000/15000` |
| InboundPlan | KH-NH-2026-014 (cuid-ibp-01) | Đã nhập | `purchaseRequestId=cuid-ycmh-01 @unique`, `warehouseId=WH-VT-01` |
| WarehouseReceipt | WR-2026-014 | — | `purchaseRequestId=cuid-ycmh-01`, `inboundPlanId=cuid-ibp-01` -> `LotProduct` +ton |
| OutboundPlan | KH-XH-2026-011 (cuid-obp-01) | — | `supplyRequestId=cuid-yccc-01` |
| WarehouseIssue | WI-2026-011 | — | `supplyRequestId=cuid-yccc-01`, `outboundPlanId=cuid-obp-01` (dung cho AcceptanceHandover) |
| AcceptanceHandover | AH-2026-014 (cuid-ah-01) | DAT | `repairRequestId=102`, `warehouseIssueId=WI-2026-011`, `ketQua=DAT`, `chiPhiThucTe=6200000` |
| RepairRequestStatusLog | ~8-10 rows | — | Moi transition ghi `oldStatus/newStatus/actorId/actorRole/reason` |

---

## 3. Bang doi chieu — khoi BPMN PDF <-> buoc <-> entity <-> API

> Ghi chu: ten khoi BPMN lay theo dac ta van hanh PDF "Quy trinh bao tri — sua chua" (nhom lenh duyet, kho, mua hang). Neu PDF doi ten khoi, giu so thu tu va map lai cot BPMN.

| # | Khoi BPMN (PDF) | Buoc kich ban | Entity chinh | API / UI | Ghi chu map |
|---|-----------------|---------------|--------------|----------|-------------|
| 1 | Phat hien loi / Bao hong | B1 | `RepairRequest (KIEM_TRA)` + `RepairRequestItem` + `FaultRecord` | `POST /repair-requests {requestType:KIEM_TRA}` | Nguoi van hanh tao KT, chua phai SC |
| 2 | Tiep nhan / Phan loai | B2 | `RepairRequest.trangThai` + `RepairRequestStatusLog` | `PATCH /:id/accept` | TEAM_LEAD/DEPARTMENT_HEAD, `ADMIN` bypass |
| 3 | Lap phieu sua chua | B3 | `RepairRequest (SUA_CHUA)` + `sourceInspectionRequestId` + `sourceInspectionItemId` | `POST /repair-requests {requestType:SUA_CHUA, sourceInspectionRequestId}` | Auto-fill items tu KT, guard KIEM_TRA khong co nguon |
| 4 | Lap ke hoach | B4 (plan) | `RepairRequest.keHoachChiTiet/phuongAn/bienPhapAnToan/chiPhiDuKien/canNgungMay/phongBanId` | `PATCH /:id/plan` | `DA_TIEP_NHAN -> LEN_KE_HOACH`, forward-only |
| 5 | Phan cong nhan su | B4 (assignee) | `RepairRequestAssignee` | `POST /:id/assignees`, `DELETE /:id/assignees/:aid` | Toi da 1 `isLead`, unique `[repairRequestId,userId]` |
| 6 | Du tru vat tu | B4 (material) | `RepairMaterialNeed` | `POST /:id/material-needs`, `PUT /:id/material-needs/:needId` | Unique `[itemId, tenVatTu]`, SUA_CHUA only |
| 7 | Lap YC cung cap | B5 | `SupplyRequest` + `SupplyRequestItem` | `POST /supply-requests` | Tao YCCC tu materialNeeds |
| 8 | Lien ket SC-VT | B5 (link) | `RepairSupplyLink` | `POST /:id/supply-links` | Single source `supplyRequestId`, Int<->cuid validate |
| 9 | Kho xu ly — duyet / tu choi cap | B6a | `SupplyRequestDecision` + `SupplyRequestItem.fulfillmentStatus` | `POST /supply-requests/:id/decide` | `Cấp đủ / Cấp một phần / Không cấp / Chuyển thu mua` |
| 10 | Kho tao YCBS (thieu ton) | B6b | `ReplenishmentRequest` + `ReplenishmentRequestItem` + `Decision.triggeredReplenishmentRequestId` | `POST /replenishment-requests` | Gom shortage theo `phanLoaiGroup`, `trangThai=Chờ báo giá` |
| 11 | Mua hang bao gia & chuyen YCMH | B6c | `ReplenishmentRequest.convertedPurchaseRequestId` + `PurchaseRequest` + `PurchaseRequestItem.giaDuKien` | `PATCH /replenishment-requests/:id/items/*` + `POST /replenishment-requests/:id/convert` | 1 YCBS -> 1 YCMH @unique, atomically |
| 12 | Duyet mua hang | B6d | `PurchaseRequest.trangThai` + `InboundPlan` | `PATCH /purchase-requests/:id/approve` | Sinh `InboundPlan KH-NH-* @unique`, `Chờ nhập` |
| 13 | Nhap kho | B6e | `WarehouseReceipt` + `WarehouseReceiptItem` + `LotProduct` + `InboundPlan.trangThai=Đã nhập` | `POST /purchase-requests/:id/confirm-actual-price` + `POST /warehouse-receipts` | `giaThucTe` bq gia quyen `InternationalProduct.giaThanh` |
| 14 | Xuat kho cap cho SC | B6f | `OutboundPlan` + `WarehouseIssue` + `SupplyRequestItem.fulfilledQty` | `POST /outbound-plans` + `POST /warehouse-issues` | Cap lai YCCC goc, update `Đã cấp đủ` |
| 15 | Thi cong | B7 | `RepairRequest.trangThai=DANG_SUA_CHUA` + `noiDungThucHien/gioCongThucTe` + `RepairMaterialNeed.soLuongThucTe` | `PATCH /:id/start` + `PUT /:id` + `PATCH /:id/submit-acceptance` | `LEN_KE_HOACH -> DANG_SUA_CHUA -> CHO_NGHIEM_THU` |
| 16 | Nghiem thu | B8 | `AcceptanceHandover` + `AcceptanceHandoverItem` + `RepairRequest.ketQuaNghiemThu` | `POST /acceptance-handovers` + `PATCH /:id/confirm-acceptance` | `DAT -> DA_NGHIEM_THU`, `KHONG_DAT` loop ve `DANG_SUA_CHUA` |
| 17 | Hoan thanh / Dong phieu | B8 (complete) | `RepairRequest.trangThai=HOAN_THANH` + `ngayHoanThanhThucTe` | `PATCH /:id/complete` | `DA_NGHIEM_THU -> HOAN_THANH` |
| 18 | Ban giao & hach toan | B9 | `AcceptanceHandover.warehouseIssueId` + `chiPhiThucTe` vs `chiPhiDuKien` | `GET /repair-requests/:id` (include handovers) + `GET /warehouse-issues/:id` | Deep-link `WI-2026-011 -> YCCC -> SC` |

Dang dung cho tra cuu chuoi (design 6.2-6.3):

| Nhu cau | Endpoint | Giai thuat |
|---------|----------|------------|
| Tu SC xem ca chuoi | `GET /repair-requests/:id/supply-chain` | `resolveSupplyChain(supplyRequestIds)` batch: Items -> Decisions (latest triggered) -> YCBS -> YCMH (converted) -> InboundPlan + WarehouseIssue |
| Tu YCCC xem SC | `GET /supply-requests/:id` include `repairLinks` | `RepairSupplyLink.supplyRequestId=:id` |
| Tu YCBS xem SC | `GET /replenishment-requests/:id` include `repairLinks` | `YCBS <- Decision.triggeredReplenishmentRequestId <- SupplyRequestItem.supplyRequestId -> RepairSupplyLink` |
| Tu YCMH xem SC | `GET /purchase-requests/:id` include `repairLinks` | `YCMH <- ReplenishmentRequest.convertedPurchaseRequestId <- ... -> RepairSupplyLink` |

---

## 4. Bien the

### Bien the (a) — Thieu ton kho -> YCBS->YCMH (da la duong chinh o B6)

> Bien the nay chinh la B6b-f o tren. Tom tat de tick rieng:

| Diem | Noi dung |
|------|----------|
| Kich hoat | `SupplyRequestDecision.decision="Chuyển thu mua"` + `shortageQty>0` (Vong bi 6205 x2, Gioang D30 x4) |
| YCBS | `YC-BS-2026-007`, `Chờ báo giá` (chua co NCC/gia), `employeeId` = owner YCCC goc |
| Convert | Purchasing dien `nhaCungCapId/giaDuKien` tung item YCBS roi `POST /convert` -> `YC-MH-2026-014`, `Chờ duyệt`, `ReplenishmentRequest.trangThai=Đã chuyển mua hàng` |
| Nhap | Duyet YCMH -> `KH-NH-2026-014 Chờ nhập` -> `confirm-actual-price` -> `WR-2026-014` -> `Đã nhập` |
| Xuat | `KH-XH-2026-011` + `WI-2026-011` cap lai YCCC, `fulfilledQty` du |
| Hien thi SC | SupplyLinkPanel hien 3 tang: `YCCC-2026-011 [Đã cấp đủ] -> YC-BS-2026-007 [Đã chuyển] -> YC-MH-2026-014 [Đã duyệt]` kem mui ten + tooltip `shortageQty/reason`, deep-link toi YCBS/YCMH |
| Can test | Forward trace tu SC thay YCBS/YCMH; reverse chip tu YCBS/YCMH tro ve SC; unlink SC khong xoa YCBS/YCMH |

**Doi chieu bien the du ton hoan toan (khong sinh YCBS):** Neu ton du ca 3 vat tu, B6a cho `decision="Cấp đủ"` ca 3 items, khong sinh YCBS/YCMH, di thang B6f xuat kho. Khi do `GET /:id/supply-chain` tra ve chi tang 1 `[YCCC]` + placeholder "Chua phat sinh bo sung", van dung.

### Bien the (b) — KHONG_DAT quay lai sua (loop)

| Diem | Noi dung |
|------|----------|
| Kich hoat | Nghiem thu lan 1 `ketQua=KHONG_DAT` (do rung 0.08mm > 0.05mm) |
| Loop | `CHO_NGHIEM_THU -> DA_NGHIEM_THU -> DANG_SUA_CHUA` (loop duy nhat hop le, `reason:'acceptance_khong_dat'`), giu `AcceptanceHandover` lan 1 |
| Khac phuc | Tho sua can dong tam lai (B7 lap lai): update `noiDungThucHien`, `submit-acceptance` lan 2 |
| Nghiem thu lan 2 | Tao `AcceptanceHandover` thu 2 `ketQua=DAT` (co the dung chung `warehouseIssueId` cu hoac tao phieu xuat bo sung neu can vat tu them + link moi) -> `confirm-acceptance DAT` -> `complete` -> `HOAN_THANH` |
| Lich su | Detail hien 2 bien ban (1 KHONG_DAT do, 1 DAT xanh), timeline hien mui ten loop `DA_NGHIEM_THU -> DANG_SUA_CHUA` |
| Can test | `DA_NGHIEM_THU --KHONG_DAT--> DANG_SUA_CHUA` duoc phep bat chap forward-only; `TU_CHOI/DA_HUY` khong duoc sau `DANG_SUA_CHUA` (tru ADMIN); `ADMIN` bypass van bi chan loop nguoc khac |

---

## 5. Checklist TDD — stakeholder tick dung/sai tung buoc

> In ra hoac mo file nay tren man hinh, tick [x] neu dung, ghi ly do neu sai. Tat ca phai [x] truoc khi merge.

### B1 — Phat hien loi (KIEM_TRA)

- [ ] Tao duoc phieu `KIEM_TRA` tu tab Chung, ma `YC-SC-2026-001` sinh tu dong, `trangThai=CHO_XU_LY`
- [ ] `KIEM_TRA` co `sourceInspectionRequestId=null` (tao `KIEM_TRA` ma gui sourceId -> 400)
- [ ] Item luu dung `machineSystemId / faultRecordId` va hien ten he thong trong detail
- [ ] `FaultRecord` sai trang thai (khong phai `DANG_THEO_DOI/TAI_PHAT`) bi tu choi
- [ ] Timeline co 1 moc `CHO_XU_LY` voi actor `EMP-012`

### B2 — Tiep nhan

- [ ] Nut "Tiep nhan" doi `CHO_XU_LY -> DA_TIEP_NHAN`, timeline them moc `DA_TIEP_NHAN — Le Thi Bao`
- [ ] `EMPLOYEE` thuong khong thay nut Tiep nhan (RBAC `checkDepartment`), `ADMIN` bypass duoc
- [ ] Tu `DA_TIEP_NHAN` co the `TU_CHOI` (neu kiem tra vo nghia), khong the nhay thang toi `DANG_SUA_CHUA` voi `KIEM_TRA`

### B3 — Tao SUA_CHUA tu kiem tra

- [ ] Nut "Tao phieu sua chua tu kiem tra" auto-fill items + `sourceInspectionItemId` dung
- [ ] Phieu SC `YC-SC-2026-002` co `sourceInspectionRequestId` tro ve `YC-SC-2026-001`, detail hien chip link nguoc
- [ ] Filter tab Chung `?type=sua_chua` hien SC moi, `?type=kiem_tra` hien KT nguon
- [ ] Tao `SUA_CHUA` voi `sourceInspectionRequestId` khong ton tai -> 404
- [ ] (Tuy chon) KT nguon `DA_TIEP_NHAN -> HOAN_THANH` sau khi da co SC ke thua

### B4 — Lap ke hoach + phan cong + vat tu

- [ ] `PATCH /:id/plan` doi `DA_TIEP_NHAN -> LEN_KE_HOACH`, luu du 5 truong ke hoach + `canNgungMay` + `phongBanId`
- [ ] `ngayHoanThienDuKien <= ngayBatDauKeHoach` bi 400 (Zod)
- [ ] Them 2 assignee, 1 `CHINH` (vuong mien), them nguoi thu 3 `isLead=true` bi 409 hoac tu dong ha lead cu
- [ ] Unique `[repairRequestId,userId]` chong add trung nguoi
- [ ] Them 3 vat tu du kien, trung `tenVatTu` tren cung `repairRequestItemId` bi 409
- [ ] `KIEM_TRA` khong them duoc assignee/material (403/400)

### B5 — Tao YCCC + link

- [ ] Nut "Tao YC vat tu" tao `YCCC-2026-011` voi 3 items dung `soLuong/donViTinh`, `trangThai=Chưa cung cấp`
- [ ] `POST /:id/supply-links` tao link, `GET /:id/supply-links` tra ve summary YCCC
- [ ] Detail SC hien chip `YCCC-2026-011 [Chưa cung cấp]` deep-link sang tab Cung ung
- [ ] Mo `YCCC-2026-011` hien chip "Phuc vu SC #YC-SC-2026-002" (reverse lookup)
- [ ] Trung `[repairRequestItemId, supplyRequestId]` bi 409; `supplyRequestId` khong ton tai bi 404
- [ ] Xoa link `DELETE /:id/supply-links/:linkId` chi xoa row link, khong xoa YCCC

### B6 — Kho xu ly + chuoi YCBS->YCMH

- [ ] Kho tao 3 `SupplyRequestDecision` dung `decision/shortageQty`, 2 thieu co `triggeredReplenishmentRequestId`
- [ ] Tu dong gom shortage tao `YC-BS-2026-007 [Chờ báo giá]`, items chua co NCC/gia
- [ ] Purchasing dien `nhaCungCapId/giaDuKien` tung item YCBS thanh cong
- [ ] `POST /replenishment-requests/:id/convert` tao `YC-MH-2026-014 [Chờ duyệt]`, `YCBS.trangThai=Đã chuyển mua hàng`, 1 YCBS chi convert 1 lan (lan 2 bi 409 do @unique)
- [ ] Duyet YCMH sinh `KH-NH-2026-014 [Chờ nhập]` (@unique 1 YCMH = 1 plan)
- [ ] `confirm-actual-price` + `WarehouseReceipt` tang `LotProduct` ton, `InboundPlan=Đã nhập`
- [ ] `OutboundPlan KH-XH-2026-011` + `WarehouseIssue WI-2026-011` tru ton, `SupplyRequestItem.fulfilledQty` du, `YCCC=Đã cấp đủ`
- [ ] `GET /repair-requests/102/supply-chain` tra ve du 3 tang `[YCCC]->[YCBS]->[YCMH]` + `InboundPlan` + `WarehouseIssue`; truong hop du ton chi co 1 tang + placeholder

### B7 — Thi cong

- [ ] Nut "Bat dau sua" doi `LEN_KE_HOACH -> DANG_SUA_CHUA`
- [ ] Cap nhat `noiDungThucHien` + `gioCongThucTe` luu thanh cong
- [ ] Cap nhat `soLuongThucTe` cho 3 dong vat tu (1 cai du phong khong dung)
- [ ] Nut "De nghi nghiem thu" doi `DANG_SUA_CHUA -> CHO_NGHIEM_THU`
- [ ] Khong the doi `trangThai` truc tiep qua `PUT /:id` (bi strip)

### B8 — Nghiem thu

- [ ] Tao `AcceptanceHandover` gan `warehouseIssueId=WI-2026-011` thanh cong
- [ ] `confirm-acceptance DAT` doi `CHO_NGHIEM_THU -> DA_NGHIEM_THU`, `complete` doi `DA_NGHIEM_THU -> HOAN_THANH`, `ngayHoanThanhThucTe` co gia tri
- [ ] Bien the KHONG_DAT: `DA_NGHIEM_THU -> DANG_SUA_CHUA` loop duoc, giu bien ban cu, timeline hien loop do
- [ ] Sau KHONG_DAT, lam lai B7 -> nghiem thu lan 2 DAT -> HOAN_THANH, detail hien 2 bien ban
- [ ] `TU_CHOI` chi tu `CHO_XU_LY|DA_TIEP_NHAN|LEN_KE_HOACH`; `DA_HUY` sau `DANG_SUA_CHUA` chi `ADMIN` duoc

### B9 — Ban giao

- [ ] Detail SC `HOAN_THANH` hien `AcceptanceHandover` voi `warehouseIssueId` clickable -> `WI-2026-011`
- [ ] Tu `WI-2026-011` dieu huong nguoc ve `YCCC-2026-011` -> chip SC
- [ ] `chiPhiThucTe` (6.2tr) vs `chiPhiDuKien` (8.5tr) hien dung, chenh lech co ghi chu
- [ ] In / xuat bien ban chua du thong tin (ma, ngay, ketQua, chi phi, chu ky)

### Tong hop chuoi & hien thi

- [ ] SupplyLinkPanel hien timeline 3 tang voi mui ten + tooltip `reason/shortageQty`, deep-link toi YCBS/YCMH
- [ ] Tab Cung ung / Kho / Mua hang deu hien chip "Phuc vu SC #YC-SC-..." khi mo YCCC/YCBS/YCMH co lien ket
- [ ] Unlink SC khong lam mat YCBS/YCMH/InboundPlan/WarehouseReceipt/WarehouseIssue da sinh

---

## 6. Ghi chu trien khai

- **Prefix ma:** Phase 1 giu `YC-SC` cho ca `KIEM_TRA` lan `SUA_CHUA` (design 9). Khi can thong ke thi filter bang `requestType`, khong dua vao prefix. Phase 2 co the tach `YC-KT`.
- **Trang thai tieng Viet kho:** Cac bang tren dung nhan tieng Viet de stakeholder doc (`Chưa cung cấp`, `Chờ báo giá`, ...). Trong code dung literal khong dau nhu hien tai (`"Chưa cung cấp"` / `"Chờ báo giá"` / `"Đã chuyển mua hàng"` / `"Chờ duyệt"` ... — tuy tung service).
- **Legacy SHORTAGE path:** `SupplyRequestDecision.triggeredPurchaseRequestId` (YCCC->YCMH truc tiep) van duoc ton trong khi `resolveSupplyChain` fallback neu khong co `triggeredReplenishmentRequestId`.
- **Seed de demo walkthrough:** Dung bang muc 2 de seed 1 KT + 1 SC + full chuoi kho, chay `npx prisma db seed` idempotent.

