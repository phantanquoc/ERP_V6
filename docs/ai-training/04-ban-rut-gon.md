# Cẩm nang rút gọn — Dùng AI cho công việc văn phòng (4 trang)

> **An Bình Foods · Tài liệu lưu hành nội bộ · Phiên bản 2.0 — 09/2026 · Cỡ chữ 14pt — in đen trắng được**
> **Đối tượng:** người không quen đọc tài liệu dài, người lớn tuổi · **Chủ sở hữu:** [Ban Hành chính — điền tên] · **Review:** 12/2026
> **Mọi ví dụ dưới đây đều dùng được ngay** — chỉ cần thay phần trong [ngoặc vuông].

---

## Trang 1 — Hỏi AI thế nào cho ra việc?

**Trước khi gõ, trả lời 3 câu này (mất 30 giây):**
1. Tôi muốn AI làm gì? — động từ rõ: soạn, tóm tắt, biên tập, gợi ý, dịch, tạo ảnh...
2. Ai sẽ đọc kết quả? — sếp, khách hàng, đồng nghiệp, đăng Facebook — mỗi đối tượng cần giọng khác nhau.
3. Kết quả trông như thế nào là đạt? — độ dài, định dạng, giọng văn.

**Công thức để kiểm tra (quy ước nội bộ An Bình Foods, không phải chuẩn hãng):**

| Ô | Hỏi mình |
|---|----------|
| **Vai trò** | AI đóng vai ai? (trợ lý hành chính, kế toán trưởng, khách hàng khó tính...) |
| **Bối cảnh** | Việc gì, cho ai, vì sao làm việc này? |
| **Nhiệm vụ** | Làm gì — động từ rõ ràng |
| **Ràng buộc** | Bao nhiêu chữ, giọng trang trọng hay thân thiện, điều gì KHÔNG được làm |
| **Định dạng** | Trả về dạng gì: email, bảng, bullet, công văn... |

> Nguồn thật: OpenAI chỉ khuyến nghị Goal/Context/Output/Boundaries và dặn "chỉ dùng phần nào thực sự hữu ích"; Google khuyên đặt vai trò và định dạng ở vị trí ưu tiên. Công ty gộp thành 5 ô cho dễ nhớ.

**Ví dụ — hỏi dở vs hỏi hay:**
- Dở: "Viết giúp tôi email gửi khách hàng." → thiếu hết, AI đoán mò.
- Hay: "Bạn là nhân viên kinh doanh. Soạn email cho siêu thị ở TP.HCM về việc giao chậm 2 ngày do mưa bão, giọng chân thành, đề xuất bù 5% đơn sau, 150 chữ, có tiêu đề + chữ ký."

**4 mẹo khiến AI trả lời hay hơn:**
- **Đóng vai:** "Bạn là [vai], hãy..." — đổi góc nhìn.
- **Đưa tài liệu:** tải file Word/Excel/PDF lên rồi nói "Dựa vào file đính kèm, hãy..."
- **Cho ví dụ:** dán 1-2 mẫu bạn thích → "Viết theo phong cách này cho [sản phẩm mới]."
- **Chia nhỏ:** việc lớn → chia 3 bước; viết xong thì nói "Ngắn hơn 30%, giọng trang trọng hơn."

**Ba câu để AI tự kiểm tra (dán vào cuối prompt):**
- "Nếu thiếu thông tin, hãy hỏi lại thay vì đoán."
- "Hãy tự chê 3 điểm yếu của câu trả lời vừa rồi."
- "Mọi số liệu/điều luật phải có nguồn kèm link; không có thì ghi 'chưa kiểm chứng'."

---

## Trang 2 — Quy trình làm việc & tạo văn bản

**Quy trình 4 bước — dán ở bàn làm việc:**

```
1. BẠN RA Ý (5-10')    2. AI VIẾT NHÁP (2-3')   3. BẠN KIỂM (10-15') ★   4. AI LÀM MỊN (2-3')
Bạn viết bullet ý chính   Dán prompt 5 ô          Số liệu đúng? Tên đúng?     "Biên tập mượt,
mục đích, đối tượng,      → AI viết nháp           Điều luật có thật?            giữ nguyên số liệu
3-5 ý phải có                                          Giọng hợp người nhận?      tôi đã sửa."
                                                       Sửa trực tiếp trên bản     ↓ Gửi đi
                                                       AI viết

★ TUYỆT ĐỐI KHÔNG BỎ BƯỚC 3. Bạn là người ký, bạn chịu trách nhiệm.
```

**Checklist "review trước khi gửi" (5 mục):**
- [ ] Số liệu đúng chưa? · [ ] Tên người/đơn vị đúng chưa? · [ ] Điều luật/văn bản có tồn tại không?
- [ ] Giọng văn hợp người nhận chưa? · [ ] Còn dữ liệu nhạy cảm nào lộ không?

**5 prompt dùng ngay — thay [ngoặc vuông] rồi dán vào ChatGPT hoặc Gemini:**

**Email** — "Bạn là nhân viên hành chính. Soạn email cho [đối tượng] về [việc], [số] chữ, giọng [trang trọng/thân thiện], có tiêu đề + chữ ký."

**Tóm tắt họp** — Tải biên bản lên, prompt: "Tóm tắt thành 3 phần: (1) Quyết định chính (5 bullet), (2) Bảng Việc | Người phụ trách | Hạn, (3) Việc chưa chốt. Thiếu hạn → ghi 'chưa rõ'."

**Báo cáo tuần** — "Dựa vào ghi chú: [dán]. Viết báo cáo tuần cho Ban Giám đốc: Tiêu đề, Tóm tắt 3 dòng, Kết quả (bullet), Khó khăn, Đề xuất. Trang trọng, dưới 400 chữ."

**Dịch** — "Dịch đoạn sau sang tiếng Anh thương mại, giữ số liệu/tên riêng. Sau bản dịch, giải thích 3 cụm từ quan trọng bạn chọn."

**Biên tập** — "Biên tập đoạn sau cho mượt, sửa chính tả, thống nhất giọng [trang trọng/thân thiện], GIỮ NGUYÊN số liệu và tên riêng. Đoạn: [dán]."

---

## Trang 3 — Tạo ảnh & dữ liệu nào phải ẩn

**Tạo ảnh — prompt nên có:**
[Chủ thể] + [bối cảnh] + [phong cách] + [ánh sáng/màu] + [tỷ lệ] + [điều loại trừ]

Ví dụ hay: "Túi mít sấy 100g trên bàn gỗ sáng, cạnh vài lát mít tươi và lọ mật ong nhỏ, phong cách tối giản, ánh sáng tự nhiên ấm, nền mờ nhẹ, tỷ lệ 4:5, không chữ trên bao bì."

Ví dụ dở: "Tạo ảnh mít sấy đẹp." → chung chung, khó dùng.

**Ba giới hạn thực tế:**
- **Chữ trong ảnh:** tiếng Việt có dấu hay sai/lệch; chữ càng dài càng dễ sai (kinh nghiệm cộng đồng, **không phải con số chính thức của hãng**). Xử lý an toàn: **tạo ảnh không chữ, ghép chữ bằng Canva/PowerPoint** sau.
- **Logo/sản phẩm:** đừng bắt AI vẽ lại logo — sẽ ra bản gần giống nhưng sai. Dùng ảnh chụp thật, chỉ nhờ AI tạo **bối cảnh xung quanh**.
- **Dùng ảnh AI:** không dùng cho bao bì chính thức, chứng nhận chất lượng, quảng cáo cam kết thành phần/xuất xứ. Dùng cho mạng xã hội/truyền thông nội bộ → ghi "Ảnh minh họa".

**Tạo ảnh — tỷ lệ khung hình:** 16:9 slide · 1:1 bài vuông · 4:5 ảnh dọc · 9:16 Reels. Gemini hỗ trợ trực tiếp các tỷ lệ này; với ChatGPT, 4:5 thường phải crop.

**Dữ liệu nào phải ẩn trước khi dán vào AI (tài khoản cá nhân):**

| Dữ liệu | Cách ẩn |
|---------|---------|
| Tên khách hàng | "Khách A", "Đại lý miền Bắc" |
| Số tiền thật | tỷ lệ %, hoặc "X đồng" |
| CCCD / mã số thuế | xóa hẳn |
| Công thức sản phẩm | "sản phẩm sấy giòn vị mật ong" |
| Danh sách nhân viên | số lượng + vị trí, không tên |
| Giá vốn / báo giá mật | "phân khúc trung cấp", ẩn con số |

> Mẹo: ẩn dữ liệu không làm giảm chất lượng bản nháp — AI soạn lời hay mà không cần biết con số thật.

**Khi nào KHÔNG nên dùng AI:** cần chính xác tuyệt đối từng con số · chưa có dữ liệu để cung cấp · người ký không kiểm được · việc liên quan bí mật nặng → làm tay hoặc chỉ dùng AI phần dàn ý.

---

## Trang 4 — 5 điều cấm & khi lỡ dán nhạy cảm

**5 điều cấm khi dùng tài khoản cá nhân:**

| # | KHÔNG dán / KHÔNG giao |
|---|------------------------|
| 1 | Họ tên + CCCD, lương, hợp đồng, thông tin sức khỏe nhân viên → đổi "Anh A", che số |
| 2 | Giá vốn, công thức, danh sách khách hàng, hợp đồng/báo giá mật → mô tả chung chung |
| 3 | Tài khoản ngân hàng, mã số thuế, tờ khai, báo cáo tài chính chưa công bố → chỉ dùng tỷ lệ/% |
| 4 | Giao AI quyết định nhân sự, lương thưởng, kỷ luật, ký thay văn bản pháp lý → AI chỉ soạn nháp, người quyết định |
| 5 | Đăng ra ngoài nội dung AI tạo ra chưa kiểm chứng (báo giá, cam kết chất lượng, bài PR) → kiểm xong mới gửi |

**Bật tắt chia sẻ huấn luyện (làm một lần):**
- **ChatGPT:** bấm avatar → Settings → Data controls → **tắt "Improve the model for everyone"** (chỉ ảnh hưởng hội thoại **sau khi tắt**)
- **Gemini:** vào activity của tài khoản Google để quản lý lịch sử

**Lỡ dán nhạy cảm thì sao?**
1. Xóa hội thoại ngay (ChatGPT: ... → Delete; Gemini: xóa ở Activity)
2. Đổi mật khẩu nếu đã dán thông tin đăng nhập
3. Báo quản lý trực tiếp để đánh giá rủi ro
4. Về sau luôn thử bằng dữ liệu giả

**Dấu hiệu AI đang bịa & cách bắt lỗi:**
- Nêu điều luật/nghị định rất cụ thể nhưng tìm Google không ra; số liệu "theo Tổng cục Thống kê" nhưng không có link tồn tại; trả lời quá mượt, không hề nói "tôi không chắc".
- Cách bắt: **bắt AI trích nguồn có link** → tự mở link kiểm tra; **yêu cầu "hãy tìm trên mạng và chỉ trả lời dựa trên kết quả"**; **hỏi vặn** "Bạn có chắc không? Không chắc thì nói 'tôi không chắc'."

**Tuyệt đối không giao cho AI một mình:**
tính lương, quyết định nhân sự để kỷ luật, lập báo cáo tài chính/tờ khai thuế để nộp, soạn hợp đồng không qua chuyên môn rà soát, hứa hẹn với khách về chất lượng/hạn dùng/chứng nhận — phải dựa trên hồ sơ QC thật.

**Ghi nhớ pháp lý VN (đã hiệu lực):** Luật Công nghiệp Công nghệ số 71/2025 (01/01/2026), Luật Trí tuệ nhân tạo 134/2025 (01/03/2026), Nghị định 134/2026 (09/04/2026) — xem cẩm nang đầy đủ Chương 13 và `vanban.chinhphu.vn`.

---

*Hết bản rút gọn. Bản đầy đủ ~32 trang có 15 template, lộ trình 30 ngày, FAQ và nguồn tham khảo ở cẩm nang chính. Thắc mắc → nhóm Zalo "Hỗ trợ AI — An Bình Foods".*
