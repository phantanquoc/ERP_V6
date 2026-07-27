# production-entry-validation Specification

## Purpose

Centralized min/max validation thresholds for all production data-entry fields, enforced at both frontend (input clamping) and backend (Zod schema rejection). Prevents nonsensical data (negative values, Infinity, NaN, values outside physical limits) from reaching the database.

## Requirements

### Requirement: Nguong min/max cho thong so nhap lieu san xuat
He thong SHALL ap dung nguong min/max co dinh cho tung thong so nhap lieu san xuat, dong bo o ca frontend va backend:

| Thong so | Min | Max | Kieu |
|---|---|---|---|
| `nhietDoNuocTruocNgam`, `nhietDoNuocSauVot` | 0 | 200 | thap phan |
| `giaiDoan{1..4}NhietDo` | 0 | 400 | thap phan |
| `brixNuocNgam` | 0 | 100 | thap phan |
| `giaiDoan{1..4}ApSuat` | 0 | 20 | thap phan |
| `thoiGianNgam` | 0 | 2880 | nguyen (phut) |
| `giaiDoan{1..4}ThoiGian` | 0 | 2880 | nguyen (phut) |
| `soLanNgam` | 0 | 40 | nguyen |
| `khoiLuong`, `khoiLuongDauVao`, khoi luong o san luong | 0 | 200000 | thap phan (kg) |

Gia tri ngoai nguong SHALL bi tu choi. Thong bao loi SHALL bang tieng Viet va neu ro khoang cho phep.

#### Scenario: Nhap gia tri vuot nguong tren
- **WHEN** nguoi dung nhap nhiet do nuoc ngam la 9999
- **THEN** he thong khong nhan gia tri do va hien thi thong bao tieng Viet neu ro khoang cho phep (0 den 200)

#### Scenario: Nhap gia tri am
- **WHEN** nguoi dung nhap mot gia tri am vao bat ky o so nao (ke ca o san luong)
- **THEN** he thong khong nhan gia tri am

#### Scenario: Nhap thap phan vao o so nguyen
- **WHEN** nguoi dung nhap 30.5 vao o thoi gian (phut) — ke ca khi nhap truc tiep, khong qua lop nhap focus
- **THEN** gia tri duoc lam tron xuong thanh so nguyen

#### Scenario: Gia tri khong huu han
- **WHEN** gia tri nhap vao cho ra `Infinity` hoac `NaN` (vi du `1e999`)
- **THEN** he thong khong nhan gia tri do va khong gui len may chu

### Requirement: Backend tu choi du lieu ngoai nguong
Cac endpoint nhan du lieu nhap lieu san xuat (danh gia ngam, thong so van hanh, san luong thanh pham) SHALL validate payload theo cung bang nguong o tren truoc khi ghi vao co so du lieu, va tra loi khi du lieu khong hop le.

#### Scenario: Goi API truc tiep voi gia tri vo ly
- **WHEN** mot client gui payload co nhiet do 99999 hoac gia tri am toi endpoint nhap lieu san xuat
- **THEN** may chu tu choi request voi loi validation va KHONG ghi du lieu

#### Scenario: Payload hop le
- **WHEN** payload co moi thong so nam trong nguong
- **THEN** may chu xu ly va ghi du lieu binh thuong

### Requirement: Gioi han dung luong anh dinh kem
Anh dinh kem o man Danh gia ngam SHALL khong vuot qua 20 MB. Vuot qua SHALL bi tu choi kem thong bao tieng Viet.

#### Scenario: Anh qua lon
- **WHEN** nguoi dung chon anh co dung luong lon hon 20 MB
- **THEN** he thong tu choi anh do va hien thi thong bao tieng Viet ve gioi han dung luong

### Requirement: Khong cho chon thoi gian chien o tuong lai
Truong thoi gian chien o man Danh gia ngam SHALL khong cho chon thoi diem sau thoi diem hien tai.

#### Scenario: Chon ngay tuong lai
- **WHEN** nguoi dung mo bo chon thoi gian chien va thu chon mot thoi diem o tuong lai
- **THEN** he thong khong cho chon thoi diem do

### Requirement: Canh bao truoc khi ghi de du lieu da nhap
O man Thong so van hanh, khi nguoi dung mo mot may da co du lieu da nhap truoc do, he thong SHALL yeu cau xac nhan truoc khi cho ghi de.

#### Scenario: Mo may da nhap
- **WHEN** nguoi dung chon mot may duoc danh dau da nhap
- **THEN** he thong hoi xac nhan viec se ghi de du lieu da co; chi khi xac nhan thi moi vao form

#### Scenario: May chua nhap
- **WHEN** nguoi dung chon mot may chua co du lieu
- **THEN** he thong vao form ngay, khong hoi xac nhan

### Requirement: Luu nhap cho man Thong so van hanh
Man Thong so van hanh SHALL tu luu nhap du lieu dang nhap vao localStorage, theo khoa gom ma chien, may, ngay va ca; du lieu SHALL duoc phuc hoi khi tai lai trang. Nhap SHALL bi xoa sau khi luu thanh cong.

#### Scenario: Tai lai trang khi dang nhap
- **WHEN** nguoi dung nhap mot so thong so roi tai lai trang voi cung ma chien, may, ngay, ca
- **THEN** cac gia tri dang nhap duoc phuc hoi tu nhap

#### Scenario: Sau khi luu thanh cong
- **WHEN** nguoi dung luu thanh cong
- **THEN** nhap tuong ung bi xoa

### Requirement: Reset thong so khi doi san pham
O man Danh gia ngam, khi nguoi dung doi san pham nguyen lieu, cac thong so da nhap o buoc Thong so va buoc Danh gia SHALL duoc reset de tranh gan du lieu cua san pham cu cho san pham moi.

#### Scenario: Doi san pham sau khi da nhap thong so
- **WHEN** nguoi dung da nhap thong so roi quay lai doi sang san pham khac
- **THEN** cac thong so da nhap duoc reset ve mac dinh
