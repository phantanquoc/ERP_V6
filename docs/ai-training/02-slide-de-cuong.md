# Đề cương slide đào tạo AI — An Bình Foods

> **Phiên bản 3.0 — 09/2026 · 1 buổi duy nhất 90 phút · 40 slide** (khớp `00-ke-hoach-dao-tao-ai.md` v3.0)
> File dựng sẵn: `02-slide-90-phut.pptx` — người hướng dẫn chỉ việc chiếu, không cần dựng lại.
> Mỗi slide ghi: tiêu đề + nội dung chính + ghi chú lời giảng/demo.
> **Nhịp ~2,25 phút/slide** — chậm hơn bản 180' cũ (3,6 phút/slide), phù hợp người lớn tuổi.

**Tông màu:** nền trắng/xám nhạt, nhấn xanh #2563EB (theo `docs/design-system.md`), cảnh báo đỏ #EF4444, thành công xanh lá #10B981. Chữ tiêu đề đậm, ít chữ.

---

## Quy ước trình bày

- *Lời giảng:* gợi ý nói gì (không chiếu lên slide)
- *Demo:* thao tác live trên ChatGPT/Gemini
- *Tương tác:* yêu cầu học viên làm gì
- **Ghi chú nguồn:** mục nào ghi "quy ước nội bộ" thì KHÔNG được gán cho OpenAI/Google khi giảng

## Timeline tổng — dán ở bục giảng

| Phút | Khối | Slide |
|------|------|-------|
| 0-5 | Mở đầu | 1-3 |
| 5-15 | Hiểu đúng về AI | 4-9 |
| 15-37 | **Cách hỏi hay** (có bài tập 8') | 10-20 |
| 37-42 | Giải lao | 21 |
| 42-57 | **An toàn dữ liệu** (có thao tác tại lớp 5') | 22-28 |
| 57-69 | Quy trình + tạo văn bản & ảnh | 29-33 |
| 69-82 | **Breakout phòng ban** | 34-36 |
| 82-90 | Bế mạc (post-test 5') | 37-40 |

---

# MỞ ĐẦU (slide 1-3 · 5 phút)

**SLIDE 01 — Trang bìa**
- Tiêu đề: **AI cho công việc văn phòng**
- Phụ đề: ChatGPT & Gemini — dùng nhanh hơn, nhàn hơn, an toàn hơn · 90 phút
- Ngày, địa điểm, logo An Bình Foods
- Footer: Tài liệu lưu hành nội bộ · v3.0 — 09/2026 · Owner: [tên] · Review: 12/2026

**SLIDE 02 — Vì sao học AI ngay bây giờ?**
- 3 con số về mức độ ứng dụng AI của nhân viên văn phòng Việt Nam:
  - Tỷ lệ nhân viên tri thức VN đã dùng AI tạo sinh — cao hơn trung bình toàn cầu
  - Tỷ lệ nhân viên văn phòng/chủ doanh nghiệp đã áp dụng AI
  - Tỷ lệ doanh nghiệp tin AI tuyệt đối không cần người kiểm tra — **rất thấp**
- Dòng kết: "Cơ hội lớn, nhưng vẫn cần người kiểm chứng. Đó là lý do có 90 phút hôm nay."
- *Lời giảng:* Không đọc con số trên slide — dẫn nguồn ở cẩm nang Chương 13. Chỉ nói ý: nhiều người đã dùng, nhưng ít ai dùng có kiểm soát.

**SLIDE 03 — "AI có lấy mất việc của tôi không?"**
- Hai thẻ đối lập:
  - **AI LẤY** — phần việc lặp lại: soạn nháp, tóm tắt, gợi ý, tìm nhanh, định dạng lại
  - **AI KHÔNG LẤY** — phần cần con người: phán đoán, chịu trách nhiệm, hiểu ngữ cảnh công ty, quyết định nhân sự/tài chính
- Cam kết của công ty: [điền nội dung lãnh đạo duyệt]
- *Tương tác:* Dành **2 phút** cho 1-2 người nói lo lắng của họ trước khi đi tiếp. Không hứa hẹn vượt quá thẩm quyền.

---

# KHỐI 1 — HIỂU ĐÚNG VỀ AI (slide 4-9 · 10 phút)

**SLIDE 04 — Tiêu đề khối 1: Hiểu đúng về AI trước khi dùng** (10 phút)

**SLIDE 05 — AI tạo sinh là gì? (kể chuyện, không kỹ thuật)**
- Minh họa: AI như **"thực tập sinh đọc nhiều, gõ nhanh, nhưng chưa có kinh nghiệm ở công ty mình"**
- 3 bullet: Đã đọc lượng văn bản khổng lồ → Học cách đoán chữ tiếp theo → Trả lời nghe tự nhiên
- *Lời giảng:* Nhấn AI không "hiểu" như con người, chỉ giỏi bắt chước mẫu câu. Không đi sâu kỹ thuật.

**SLIDE 06 — ChatGPT vs Gemini — hai trợ lý của bạn**
- Bảng 3 cột: Tiêu chí | ChatGPT | Gemini (rút gọn Cẩm nang Chương 2)
  - Điểm mạnh, tạo ảnh, ghi nhớ thói quen, khi nào dùng
- Dòng kết: "Dùng cả hai — soạn bằng ChatGPT, kiểm chứng thông tin mới bằng Gemini"
- *Demo:* Mở cả hai trang cạnh nhau cho thấy giao diện.
- **Ghi chú chính xác:** ChatGPT tạo ảnh bằng dòng **GPT Image** (`gpt-image-1/1.5/2`, kế nhiệm DALL·E); Gemini có **Nano Banana** (native trong hội thoại), khác **Imagen** trên Vertex AI.

**SLIDE 07 — AI giỏi gì / AI dở gì** (gộp 2 cột — tiết kiệm thời lượng)
- Cột trái xanh **AI GIỎI**: soạn thảo & biên tập · tóm tắt & dịch · gợi ý ý tưởng · tạo ảnh minh họa
- Cột phải đỏ **AI DỞ**: bịa số liệu/điều luật rất thuyết phục · không biết chuyện nội bộ công ty · tính toán đôi khi sai · kiến thức có độ trễ
- *Lời giảng:* Demo nhanh hỏi AI "Nghị định 123 nói gì?" → cho xem kết quả bịa. 2 phút, không kéo dài.

**SLIDE 08 — Demo live: prompt dở vs prompt tốt**
- Chia đôi màn hình: trái "Viết giúp tôi email gửi khách hàng" — phải prompt đủ 5 thành tố
- *Demo:* Gõ live cả hai trên ChatGPT, so sánh kết quả ngay. Đây là demo **thuyết phục nhất** cả buổi — chuẩn bị kỹ.

**SLIDE 09 — Quy tắc vàng**
- Chữ lớn giữa slide nền navy: **"AI là người soạn nháp — Bạn là người ký duyệt"**
- Dưới: Mọi con số, tên người, điều luật do AI đưa ra — kiểm lại trước khi gửi
- *Tương tác:* Hỏi cả lớp "Ai từng thấy AI trả lời sai?" — mời 1 người chia sẻ 30 giây.

---

# KHỐI 2 — CÁCH HỎI ĐỂ AI TRẢ LỜI HAY (slide 10-20 · 22 phút) ★ TRỌNG TÂM

**SLIDE 10 — Tiêu đề khối 2: Cách hỏi để AI trả lời hay** (22 phút · có bài tập 8 phút)

**SLIDE 11 — 3 câu hỏi trước khi gõ (30 giây tư duy)**
- 3 thẻ: Tôi muốn AI làm gì? (động từ rõ) | Ai sẽ đọc kết quả? | Kết quả đạt là thế nào?
- *Tương tác:* Cho ví dụ "Viết giúp cái báo cáo" — cả lớp cùng sửa thành câu hỏi tốt, 1 phút.

**SLIDE 12 — Công thức 5 thành tố**
- Sơ đồ 5 ô màu khác nhau: **Vai trò · Bối cảnh · Nhiệm vụ · Ràng buộc · Định dạng**
- *Lời giảng:* "Trước khi gửi, kiểm tra đủ 5 ô."

**SLIDE 13 — 5 thành tố đến từ đâu? (minh bạch nguồn)**
- Thẻ trái: **OpenAI thực sự nói gì** — Goal / Context / Output / Boundaries, kèm *"Use only the parts that help"* (không phải lúc nào cũng cần đủ); Google khuyên đặt role/persona và output format ở vị trí ưu tiên
- Thẻ phải: **An Bình Foods làm gì** — gộp thành 5 ô cho dễ nhớ; **đây là QUY ƯỚC NỘI BỘ, không phải chuẩn hãng**; RTF/CO-STAR/CRISPE là framework cộng đồng
- *Lời giảng:* Nói rõ "không có khung 5 ô nguyên văn nào từ OpenAI/Google". Nếu ai hỏi RTF/CO-STAR, trả lời "framework cộng đồng, hữu ích, không phải chuẩn hãng".
- **Khi dựng slide:** không đặt logo OpenAI/Google cạnh sơ đồ 5 ô.

**SLIDE 14 — Ví dụ đủ 5 thành tố (soạn công văn)**
- Prompt mẫu Cẩm nang Chương 4, mỗi dòng gắn nhãn màu theo 5 thành tố
- *Demo:* Chiếu kết quả AI trả về — cho thấy ra công văn dùng được ngay.

**SLIDE 15 — Kỹ thuật 1 & 2: Đóng vai + Đưa ngữ cảnh** (gộp — tiết kiệm slide)
- **Đóng vai:** "Bạn là kế toán trưởng 10 năm kinh nghiệm…" / "Bạn là khách hàng khó tính, hãy chê thật gắt…" / "Bạn là giảng viên Excel…"
- **Đưa ngữ cảnh:** tải file Word/Excel/PDF lên rồi nói "Dựa vào file đính kèm…" / dán số liệu vào prompt / Gemini đọc link Google Docs trực tiếp
- *Demo (chọn 1 trong 2, không làm cả hai):* "Bạn là khách hàng khó tính…" **hoặc** tải biên bản mẫu 2 trang cho AI tóm tắt.

**SLIDE 16 — Kỹ thuật 3 & 4: Cho ví dụ + Chia nhỏ & lặp lại** (gộp)
- **Cho ví dụ (few-shot):** dán 1-2 mẫu bạn thích → "Viết theo phong cách này cho [sản phẩm mới]" — như đưa văn mẫu cho thực tập sinh
- **Chia nhỏ & lặp lại:** việc lớn → chia bước nhỏ → lặp lại mài giũa. Chuỗi: viết nháp → "ngắn hơn 30%, trang trọng hơn" → "thêm bảng so sánh" → "dịch sang tiếng Anh"
- **Ghi chú nguồn (đọc trước khi giảng):** cả OpenAI và Google đều nói làm prompt là quá trình **lặp lại (iterative)**. Con số "3 vòng" hay mốc "OpenAI đổi khuyến nghị từ 7/2026" là **suy diễn lan truyền, không có trong tài liệu chính thức** — đừng nhắc.

**SLIDE 17 — 3 câu thần chú để AI tự kiểm tra**
- 3 thẻ trích dẫn:
  - "Nếu thiếu thông tin, hãy hỏi lại thay vì đoán."
  - "Hãy tự đóng vai phản biện và chỉ ra 3 điểm yếu của câu trả lời vừa rồi."
  - "Hãy trích nguồn cho mọi số liệu; nếu không có, ghi 'chưa kiểm chứng'."
- *Lời giảng:* Dặn copy 1 trong 3 câu dán vào cuối mọi prompt quan trọng.

**SLIDE 18 — BÀI TẬP NHANH (8 phút)**
- Viết lại câu hỏi dở **"Làm giúp cái báo cáo"** thành prompt đủ 5 thành tố → chấm chéo trong bàn theo checklist
- Gợi ý: Ai đọc báo cáo? Báo cáo về việc gì? Bao nhiêu chữ? Định dạng thế nào?
- *Vận hành:* Đồng hồ đếm ngược 8 phút chiếu trên slide. Trợ giảng đi quanh. Bàn nào xong sớm thì chạy thử luôn trên ChatGPT/Gemini. Mời 1 bàn đọc kết quả — 1 phút.

**SLIDE 19 — Mẹo tiếng Việt + lỗi phổ biến** (gộp)
- "Trong thực tế dùng nội bộ, tiếng Việt cho kết quả tốt." — **không có tuyên bố chính thức nào của OpenAI/Google so sánh tiếng Việt vs tiếng Anh**, đây là kinh nghiệm
- Cần viết tiếng Anh chuẩn bản xứ → ra lệnh bằng tiếng Anh. Bài toán phức tạp → thử: hướng dẫn tiếng Anh + dữ liệu tiếng Việt trong `"""`
- **Lỗi phổ biến:** viết quá ngắn kiểu chat · thiếu dấu phân cách giữa lệnh và dữ liệu · không nói rõ đơn vị (kg vs tấn) · dùng từ mơ hồ ("làm cho hay hơn" → "rút gọn còn 150 chữ, giọng trang trọng")

**SLIDE 20 — Tổng kết khối 2: Checklist**
- 3 cột: 5 ô tick thành tố | 4 kỹ thuật | 3 câu thần chú
- *Lời giảng:* "In ra chính là **Thẻ Prompt bỏ túi** — để ở bàn làm việc. Tự chấm prompt vừa viết: đủ 5 thành tố chưa?"

---

# GIẢI LAO (slide 21 · 5 phút — phút 37 đến 42)

**SLIDE 21 — Giải lao 5 phút**
- Ảnh nhẹ nhàng + "Quay lại lúc __:__"
- Dòng nhắc: "Tranh thủ hỏi trợ giảng nếu vướng đăng nhập — sau giải lao vào phần an toàn dữ liệu, quan trọng nhất buổi."

---

# KHỐI 3 — AN TOÀN DỮ LIỆU & RANH GIỚI ĐỎ (slide 22-28 · 15 phút) ★ QUAN TRỌNG NHẤT

> **Vì sao 15 phút cho khối này:** học viên dùng **tài khoản cá nhân**, về nhà là tự dùng ngay. Không nắm ranh giới thì rủi ro rò rỉ dữ liệu xảy ra trong tuần đầu tiên.

**SLIDE 22 — Tiêu đề khối 3: An toàn dữ liệu — phần quan trọng nhất hôm nay** (15 phút)

**SLIDE 23 — Vì sao + Tắt chia sẻ huấn luyện: LÀM NGAY TẠI LỚP (5 phút)**
- Trên cùng: tài khoản cá nhân → hội thoại **mặc định có thể được dùng để cải thiện mô hình**, trừ khi bạn tự tắt. Dữ liệu đi từ máy bạn → máy chủ nước ngoài → có thể được lưu.
- **ChatGPT:** avatar → **Settings → Data controls → tắt "Improve the model for everyone"**
  - Chỉ áp dụng cho hội thoại **sau khi tắt**; hội thoại cũ cần yêu cầu xóa riêng
  - Ảnh chụp màn hình từng bước (chèn ảnh khi dựng)
- **Gemini:** vào trang **activity của tài khoản Google** để quản lý Gemini Apps Activity
- *Tương tác:* **Yêu cầu cả lớp mở điện thoại làm ngay bây giờ.** Trợ giảng đi kiểm tra từng bàn — ai chưa được giơ tay. Đây là 5 phút đáng giá nhất buổi học.
- **Ghi chú chính xác:** đường dẫn ChatGPT đã xác nhận theo tài liệu trợ giúp chính thức của OpenAI. Với Gemini, mô tả đúng là "quản lý qua trang activity" — **không** khẳng định "tắt là mất sạch lịch sử".

**SLIDE 24 — 5 điều cấm khi dùng tài khoản cá nhân (slide quan trọng nhất)**
- Bảng 4 cột × 5 hàng: # | Cấm | Vì sao | Làm thay thế
  1. Họ tên + CCCD, lương, HĐLĐ, sức khỏe NV → dùng "Anh A", che số
  2. Giá vốn, công thức, DS khách hàng, HĐ/báo giá mật → mô tả chung chung
  3. TK ngân hàng, MST, tờ khai, BCTC chưa công bố → chỉ dùng tỷ lệ/%
  4. Giao AI quyết định nhân sự, lương, kỷ luật, ký thay VB → AI chỉ gợi ý, người ký
  5. Đăng ra ngoài nội dung AI tạo chưa kiểm chứng → kiểm Bước 3 trước khi gửi
- Cột "Cấm" nền đỏ, cột "Làm thay thế" nền xanh
- *Tương tác:* Đọc to từng điều. Hỏi "Ai từng dán bảng lương/báo giá vào AI chưa?" — **không phê phán**, chỉ dặn từ nay dùng dữ liệu đã che.

**SLIDE 25 — Hallucination: AI bịa rất giống thật**
- 4 dấu hiệu: nêu điều luật rất cụ thể nhưng Google không ra · số liệu "theo Tổng cục Thống kê 2024" nhưng không có link tồn tại · trích dẫn lời người nổi tiếng bạn chưa từng nghe · trả lời quá mượt, không hề nói "tôi không chắc"
- *Demo:* hỏi AI "Nghị định 13/2023 nói gì về bảo vệ dữ liệu cá nhân?" — chiếu cạnh văn bản thật đã chuẩn bị trước.

**SLIDE 26 — 3 cách bắt lỗi AI bịa**
- 3 thẻ bước: **Bắt trích nguồn** (yêu cầu link cho mọi số liệu/điều luật) → **Tự đối chiếu** (mở link/văn bản gốc; Gemini: "hãy tìm trên mạng và chỉ trả lời dựa trên kết quả") → **Hỏi vặn** ("Bạn có chắc không? Không chắc thì nói 'tôi không chắc'")
- *Lời giảng:* "AI rất ngoan — nếu bạn cho phép nó nói 'tôi không chắc', nó sẽ thành thật hơn."

**SLIDE 27 — Những việc tuyệt đối không giao cho AI**
- 4 thẻ cấm: Tính lương/quyết định nhân sự · Báo cáo tài chính/tờ khai thuế để nộp · Hợp đồng pháp lý không qua chuyên môn rà soát · Cam kết chất lượng/hạn dùng/chứng nhận với khách
- Dòng kết chữ lớn: **"AI gợi ý — Người quyết định — Người ký chịu trách nhiệm"**

**SLIDE 28 — Dữ liệu nào phải ẩn trước khi dán vào AI**
- Bảng 2 cột: Loại dữ liệu | Cách ẩn
  - Tên khách hàng → "Khách A", "Đại lý miền Bắc"
  - Số tiền thật → tỷ lệ %, hoặc "X đồng"
  - CCCD / mã số thuế → xóa hẳn
  - Công thức sản phẩm → "sản phẩm sấy giòn vị mật ong"
  - Danh sách nhân viên → số lượng + vị trí, không tên
  - Giá vốn / báo giá mật → "phân khúc trung cấp", ẩn con số
- *Lời giảng:* "Ẩn dữ liệu **không làm giảm chất lượng bản nháp** — AI soạn lời hay mà không cần biết con số thật." Slide này dùng lại ngay ở breakout.

---

# KHỐI 4 — QUY TRÌNH LÀM VIỆC & TẠO NỘI DUNG (slide 29-33 · 12 phút)

**SLIDE 29 — Tiêu đề khối 4: Quy trình làm việc + tạo văn bản & ảnh** (12 phút)

**SLIDE 30 — Quy trình 4 bước + checklist review (gộp 1 slide)**
- 4 thẻ bước ngang: **1 Bạn ra ý** (bullet, 5-10') → **2 AI viết nháp** (2-3') → **3 Bạn kiểm sự thật ★** (10-15', thẻ đỏ) → **4 AI làm mịn** (2-3')
- Bên dưới: **Checklist trước khi gửi** (5 mục) — số liệu đúng? tên đúng? điều luật có thật? giọng hợp người nhận? còn dữ liệu nhạy cảm?
- *Lời giảng:* "Bước 3 là bước bạn **bắt buộc** phải làm. AI viết nhanh, nhưng bạn là người chịu trách nhiệm khi gửi ra ngoài." Checklist này in ở mặt sau Thẻ Prompt.

**SLIDE 31 — Tạo văn bản: 5 loại hay dùng nhất**
- 4-5 thẻ: Email | Biên bản & Báo cáo | Bài đăng MXH | Dịch thuật | Tóm tắt tài liệu dài — mỗi thẻ 1 dòng ví dụ prompt
- *Demo (chọn 1, không làm cả hai — hết thời gian):* tải file 3-4 trang → "Tóm tắt thành 5 dòng cho BGĐ, 5 ý chính, 3 việc cần làm" **hoặc** dán đoạn văn lủng củng → "Biên tập mượt, **giữ nguyên số liệu**"
- *Lời giảng:* "Mọi prompt chi tiết đã có ở Cẩm nang Chương 7 & 10 — về chỉ việc copy, thay phần trong [ngoặc vuông]."

**SLIDE 32 — Tạo ảnh: cấu trúc prompt + 3 giới hạn (gộp)**
- Công thức: **[Chủ thể] + [Bối cảnh] + [Phong cách] + [Ánh sáng/Màu] + [Tỷ lệ] + [Loại trừ]** — ghi rõ **quy ước nội bộ**, không phải spec hãng
- Ví dụ hay vs ví dụ dở cạnh nhau (Cẩm nang 8.1)
- Tỷ lệ: **16:9** slide · **1:1** bài vuông · **4:5** ảnh dọc · **9:16** Reels — Gemini hỗ trợ trực tiếp; với ChatGPT, 4:5 thường phải crop
- 3 giới hạn: **chữ tiếng Việt trong ảnh hay sai** → tạo ảnh không chữ rồi ghép bằng Canva/PowerPoint · **đừng bắt AI vẽ lại logo** → dùng ảnh chụp thật, chỉ nhờ AI tạo bối cảnh · **tên model đổi nhanh** → kiểm tra lại mỗi kỳ rà soát quý
- *Demo:* Gõ prompt ảnh mít sấy → cho xem kết quả → nói "Đổi nền thành màu be sáng" để chỉnh tiếp. *Tương tác:* "Ảnh này đăng Facebook được chưa? Còn thiếu gì?"

**SLIDE 33 — Ranh giới đỏ với ảnh AI**
- 3 thẻ cấm: ảnh bao bì chính thức | ảnh chứng nhận chất lượng | ảnh quảng cáo cam kết thành phần/xuất xứ
- Lý do: AI tạo chi tiết sai lệch → gây hiểu lầm, vướng quy định nhãn hàng hóa và quảng cáo
- **Nếu dùng ảnh AI cho mạng xã hội/truyền thông nội bộ:** ghi **"Ảnh minh họa"** — phù hợp Luật Trí tuệ nhân tạo (nghĩa vụ gắn nhãn nội dung AI) và chính sách hãng
- *Lời giảng:* Nhấn "đây là quy định nội bộ của công ty, có cơ sở từ chính sách hãng và pháp luật — không phải trích dẫn nguyên văn điều luật".

---

# KHỐI 5 — BREAKOUT THEO PHÒNG BAN (slide 34-36 · 13 phút) ★ THỰC HÀNH TRÊN VIỆC THẬT

> **Đánh đổi đã chấp nhận:** bản 2 buổi dành 40 phút cho breakout kèm trưởng phòng duyệt theo rubric. Bản 90 phút rút còn **13 phút** và **chuyển bước duyệt rubric về 7 ngày sau buổi học** (trưởng phòng chấm, không chấm tại lớp). Đây là điểm yếu lớn nhất của bản 90 phút — bù bằng office hours và khảo sát 30 ngày.

**SLIDE 34 — Tiêu đề khối 5: Breakout theo phòng ban** (13 phút · làm trên việc thật bạn mang tới)

**SLIDE 35 — Hướng dẫn breakout 13 phút**
- 4 thẻ bước có nhãn thời gian:
  - **0-2'** Chọn 1 tác vụ lặp lại tốn thời gian nhất của phòng
  - **2-6'** Viết 1 template prompt theo 5 thành tố (dùng template mẫu của phòng làm khởi điểm)
  - **6-10'** Chạy thử **trên việc thật đã ẩn dữ liệu**, sửa template theo kết quả
  - **10-13'** Bàn bên cạnh đóng vai phản biện: chỉ ra **2 lỗ hổng** (thiếu ràng buộc? còn dữ liệu cấm?)
- *Vận hành:* Đồng hồ đếm ngược 13 phút chiếu trên slide. Trợ giảng kèm bàn lúng túng. Bàn nào chưa mang việc thật thì dùng bộ dữ liệu mẫu giả lập của phòng đó.
- *Lời giảng:* "Tìm lỗi của nhau là cách học nhanh nhất — không phải thi đua."

**SLIDE 36 — Gợi ý theo 5 phòng ban (1 bảng lớn — thay 5 slide)**
| Phòng ban | Tác vụ mẫu | Template khởi điểm | Ràng buộc riêng |
|-----------|-----------|-------------------|-----------------|
| Hành chính & Nhân sự | Thông báo nội bộ, trích quy định nội quy, soạn JD, tóm tắt đơn từ | A1, A2, A3 | Không dán thông tin cá nhân NV — đổi tên, che CCCD |
| Kế toán & Mua hàng | Đối chiếu công nợ, giải thích chênh lệch, RFQ, nhắc nợ | B1, B2, B3 | Không dán giá vốn, số dư TK, tờ khai → chỉ dùng tỷ lệ/% |
| Kinh doanh & Marketing | Báo giá, caption sản phẩm, email CSKH, trả lời khiếu nại | C1, C2, C3, C4 | Cam kết với khách phải dựa trên hồ sơ thật — AI chỉ soạn lời |
| QC & Sản xuất | Báo cáo kiểm tra lô, viết SOP, biên bản sự cố, hướng dẫn công đoạn | D1, D2 | Số liệu kiểm nghiệm, chỉ tiêu, hạn dùng lấy từ hồ sơ QC |
| Kho & Kỹ thuật | Phiếu yêu cầu cung cấp, biên bản bàn giao, mô tả sự cố máy, đề xuất mua vật tư | E1, E3 + B3 | Mã hàng, định mức, thông số máy đối chiếu sổ kho/hồ sơ thiết bị |

- *Lời giảng:* "Template khởi điểm đã in sẵn ở Cẩm nang Chương 10 — copy rồi sửa, đừng viết từ số 0."

---

# BẾ MẠC (slide 37-40 · 8 phút — phút 82 đến 90)

**SLIDE 37 — Post-test (5 phút)**
- QR code Google Form — **10 câu giống hệt pre-test** để đo mức tăng (gain)
- *Lời giảng:* "Không tính điểm thi — làm để chính bạn thấy mình tiến bộ cỡ nào." Yêu cầu **cả lớp làm ngay tại chỗ**, không mang về.

**SLIDE 38 — Tổng kết 4 điều mang về**
- 4 thẻ: **5 thành tố** (quy ước nội bộ) | **4 kỹ thuật** (đóng vai, đưa ngữ cảnh, cho ví dụ, chia nhỏ) | **Quy trình 4 bước + checklist review** | **5 điều cấm**

**SLIDE 39 — Bài tập về nhà + hệ thống hỗ trợ (gộp)**
- **Trong 7 ngày tới:**
  - Mỗi người nộp 3 prompt + kết quả thật, tự chấm theo rubric 4 mức
  - Mỗi phòng nộp 1 template chuẩn hóa — **trưởng phòng chấm theo rubric** (mức 3 trở lên cả 4 tiêu chí)
  - Mỗi phòng cử **1 Champion** — ghi tên ngay tại lớp
- **Hệ thống hỗ trợ:** Owner [tên] · Champion mỗi phòng · nhóm Zalo "Hỗ trợ AI" (trả lời 24h) · **office hours 30' mỗi 2 tuần** · showcase hàng tháng · thư viện template Google Drive · 3 video xem lại
- *Lời giảng:* "Vì buổi học chỉ 90 phút, **office hours quan trọng hơn bình thường** — đó là chỗ kèm 1-1 mà hôm nay không đủ thời gian làm. Gặp khó đừng im lặng."

**SLIDE 40 — Cảm ơn & phát tài liệu**
- Chữ lớn: **Cảm ơn!**
- Phát: Cẩm nang in (~32 trang) + Thẻ Prompt bỏ túi (ép plastic) + **bản rút gọn 4 trang chữ 14pt**
- QR khảo sát hài lòng (5 câu)
- Liên hệ: [Tên] — [SĐT] — [Email]
- Footer: An Bình Foods · v3.0 — 09/2026 · Rà soát kế tiếp: 12/2026

---

# PHỤ LỤC — GHI CHÚ CHO NGƯỜI HƯỚNG DẪN

## Thiết kế

| Hạng mục | Chuẩn |
|----------|-------|
| Tỷ lệ | 16:9 |
| Font | Be Vietnam Pro hoặc Inter (hỗ trợ dấu tiếng Việt tốt) — kiểm tra kỹ dấu phụ `ễ`, `ữ`, `ồ` |
| Cỡ chữ | Tiêu đề 18-28pt · body 8-11pt (slide đông chữ) · **bản in rút gọn 14pt tối thiểu** |
| Màu | Nền trắng/#F8FAFC · chữ #334155 · nhấn #2563EB · cảnh báo #EF4444 · đạt #16A34A |
| Mật độ | Tối đa 6 bullet/slide. Slide thực hành (18, 21, 35, 37) để trống nhiều. |
| Ảnh minh họa | Ảnh thật của An Bình Foods (nhà xưởng, sản phẩm) làm nền mờ slide bìa/khối. Icon outline đơn giản. |
| **Không dùng** | Ảnh AI cho slide bìa/khối nếu slide đó nói về giới hạn của ảnh AI — tránh mâu thuẫn thông điệp |

## Nhịp trình chiếu

| Khối | Phút | Slide | Phút/slide |
|------|------|-------|-----------|
| Mở đầu | 0-5 | 1-3 | 1,7 |
| Hiểu AI | 5-15 | 4-9 | 1,7 |
| Cách hỏi hay | 15-37 | 10-20 | 2,0 |
| Giải lao | 37-42 | 21 | 5,0 |
| An toàn | 42-57 | 22-28 | 2,1 |
| Quy trình & nội dung | 57-69 | 29-33 | 2,4 |
| Breakout | 69-82 | 34-36 | 4,3 |
| Bế mạc | 82-90 | 37-40 | 2,0 |

**Trung bình ~2,25 phút/slide.** Chậm hơn bản 180' cũ (3,6 phút/slide) — chủ đích, vì đối tượng có người lớn tuổi.

## Ba chỗ dễ lố thời gian — cách cắt tại lớp

| Chỗ | Dấu hiệu lố | Cắt gì |
|-----|------------|--------|
| Slide 08 demo prompt dở/tốt | Demo chạy lâu, AI trả lời chậm | Bỏ demo live, dùng ảnh chụp màn hình đã chuẩn bị |
| Slide 15/16 demo kỹ thuật | Đã quá phút 30 | Chỉ demo **1** kỹ thuật, kỹ thuật còn lại nói miệng |
| Slide 31/32 demo văn bản & ảnh | Đã quá phút 65 | Bỏ demo tạo ảnh, chỉ chiếu slide 32-33 rồi vào breakout |

> **Không được cắt:** slide 23 (tắt huấn luyện tại lớp), slide 24 (5 điều cấm), slide 35-36 (breakout). Ba chỗ này là giá trị cốt lõi của buổi 90 phút.

## Demo live — checklist chuẩn bị

- [ ] **Tài khoản demo riêng** đã đăng nhập sẵn trên máy chiếu (công ty tạo mới, không dùng tài khoản cá nhân có dữ liệu thật)
- [ ] **Đã tắt "Improve the model for everyone"** trên tài khoản demo để làm mẫu đúng thao tác ở slide 23
- [ ] 5 file mẫu trên desktop: biên bản họp 2 trang, bảng doanh số Excel, ảnh mít sấy, công văn mẫu, đoạn văn lủng củng
- [ ] **Đã chạy thử mọi prompt demo ít nhất 2 lần** — AI trả lời khác nhau mỗi lần; prompt nào ra kết quả xấu thì **đổi prompt**, đừng cứu tại lớp
- [ ] Ảnh chụp màn hình backup cho **từng** demo, phòng wifi chập chờn
- [ ] Văn bản pháp quy thật để chiếu cạnh kết quả AI bịa (slide 25)
- [ ] Đồng hồ đếm ngược: 8 phút (slide 18), 5 phút (slide 23), 13 phút (slide 35), 5 phút (slide 37)
- [ ] Sắp bàn theo phòng ban + in bảng tên phòng đặt trên bàn
- [ ] Tắt thông báo máy chiếu, chế độ không làm phiền

## Google Form cần dựng

| Form | Câu hỏi | Dùng khi nào |
|------|---------|--------------|
| Pre-test | 10 câu kiến thức + 2 câu tự đánh giá mức thạo AI | Gửi trước buổi học 3 ngày |
| Post-test | **10 câu giống hệt** pre-test | Slide 37, cuối buổi |
| Thu bài về nhà | 3 prompt + kết quả + tự chấm rubric | Trong 7 ngày sau buổi học |
| Nộp template phòng ban | Tên phòng, tác vụ, template, xác nhận trưởng phòng | Trong 7 ngày sau buổi học |
| Khảo sát hài lòng | 5 câu | Slide 40, cuối buổi |
| Khảo sát áp dụng 30 ngày | Tần suất dùng, tác vụ đã chuẩn hóa, giờ tiết kiệm/tuần | 30 ngày sau |

## In ấn

- **Cẩm nang:** A4, đóng gáy keo, ~32 trang, **in màu** (cần thấy highlight 5 màu ở Chương 4)
- **Thẻ Prompt bỏ túi:** 1 mặt A4, ép plastic. **Mặt trước** — 5 thành tố + 4 kỹ thuật + 3 câu thần chú. **Mặt sau** — quy trình 4 bước + checklist review trước khi gửi + 5 điều cấm + bảng dữ liệu phải ẩn
- **Bản rút gọn 4 trang, chữ 14pt, in đen trắng** — cho người lớn tuổi. Nội dung ở `04-ban-rut-gon.docx`
- Footer mọi bản in: `Phiên bản 3.0 — 09/2026 · Owner: [tên] · Review kế tiếp: 12/2026`

## Đối chiếu slide ↔ cẩm nang

| Slide | Chương Cẩm nang |
|-------|-----------------|
| 05-09 | Chương 1-2 |
| 11-20 | Chương 3-5 |
| 23-28 | Chương 9 |
| 30-31 | Chương 6-7 |
| 32-33 | Chương 8 |
| 36 | Chương 10 (template) |
| 39 | Chương 11 + rubric ở kế hoạch mục 4 |

## Việc phải làm mỗi kỳ rà soát quý (12/2026)

- [ ] Kiểm tra model/tính năng mới của ChatGPT & Gemini — hai mục xuống cấp nhanh nhất là **bảng so sánh công cụ** (slide 06) và **tạo ảnh** (slide 32-33)
- [ ] Xác minh lại đường dẫn Settings/Data controls còn đúng như giao diện hiện tại không (slide 23)
- [ ] Rà soát văn bản pháp lý mới ban hành (Luật AI + nghị định hướng dẫn, sở hữu trí tuệ, dữ liệu cá nhân)
- [ ] Cập nhật số liệu thống kê VN ở slide 02 (kèm nguồn và năm)
- [ ] Tổng hợp góp ý từ nhóm Zalo + khảo sát 30 ngày → sửa cẩm nang
- [ ] Tăng phiên bản trong footer (3.0 → 3.1)

> **Chạy thử trước buổi chính thức:** tập toàn bộ 90 phút với 2-3 đồng nghiệp chưa biết AI, bấm giờ từng khối. Khối 2 thường lố 3-5 phút vì thực hành sôi nổi — nếu lố, cắt demo ở slide 15/16 xuống còn nói miệng.
