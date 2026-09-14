# Báo cáo kiểm toán nội dung — Cẩm nang AI (v1.0 → v1.1)

> **Phạm vi:** Đối chiếu toàn bộ khẳng định trong `01-cam-nang-su-dung-ai.md` v1.0 với nguồn chính thức (OpenAI, Google) và văn bản pháp luật Việt Nam, bằng web search + web fetch.
> **Phương pháp:** 4 luồng kiểm tra song song (prompting, pháp lý, privacy & ảnh, chuẩn đào tạo) — tổng 30 nhận định, 98 lần tra cứu, 294k token.
> **Ngày audit:** 07/09/2026 · **File này lưu vết để lần rà soát quý sau đối chiếu lại.**

---

## Tổng quan

Cẩm nang v1.0 **có khung tốt** (phủ đủ 3 trụ cột: hiểu AI — cách hỏi — dùng có trách nhiệm; trọng tâm đúng vào kỹ năng đặt câu hỏi), nhưng **chưa đủ điều kiện in đại trà**. Trong 22 khẳng định nội dung:

- **CONFIRMED (đúng nguyên văn):** 6
- **PARTIALLY_CONFIRMED (đúng một phần, diễn giải quá mức hoặc gán sai nguồn):** 10
- **UNVERIFIABLE (không tìm thấy nguồn chính thức):** 3
- **REFUTED (sai):** 3

8 tiêu chí sư phạm được benchmark với chuẩn 2025-2026 (Google AI Essentials, OpenAI Academy, Microsoft):

- **Critical:** 1 (không cá nhân hóa theo phòng ban)
- **High:** 5 · **Medium:** 2

Mức chung: **khoảng 5,5/10** theo chuẩn đào tạo AI doanh nghiệp 2025-2026 — đạt chuẩn tài liệu cộng đồng, dưới chuẩn đào tạo doanh nghiệp có đo lường.

---

## Lỗi đã sửa trong v1.1 (bắt buộc trước khi in)

| # | Vấn đề (mức) | Chi tiết | Cách sửa |
|---|--------------|----------|----------|
| 1 | **CRITICAL — Bịa nghĩa vụ pháp lý** | Cẩm nang ghi Luật 134/2025 "bắt buộc công khai nguồn dữ liệu train". Thực tế luật chỉ buộc quản trị dữ liệu, lưu nhật ký vết và **cung cấp khi cơ quan thẩm quyền thanh tra** (Điều 14/28/31), đồng thời bảo vệ bí mật kinh doanh — không có nghĩa vụ công khai đại trà. | Xóa nghĩa vụ sai; sửa ghi chú pháp lý thành "minh bạch có điều kiện theo yêu cầu giải trình", dẫn đúng Điều 11.2-11.4, Điều 14/28/31 và Điều 5a NĐ 134/2026. |
| 2 | **HIGH — Gán suy diễn cho hãng** | Khung "5 thành tố" được ghi như chuẩn OpenAI/Google công bố nguyên văn. Thực tế không hãng nào công bố khung 5 ô này; OpenAI công bố 4 phần (Goal/Context/Output/Boundaries) kèm "Use only the parts that help", Google khuyên đặt role/format ở System Instruction. | Đổi nhãn thành **"quy ước nội bộ An Bình Foods"**, trích đúng 4 phần của learn.chatgpt.com, ghi rõ phần suy diễn. |
| 3 | **HIGH — Mốc thời gian và con số bịa** | Các khẳng định "OpenAI đổi khuyến nghị từ 7/2026", "kỹ năng cốt lõi 2026", "lặp 3 vòng" không có trong bất kỳ guide chính thức nào. | Gỡ toàn bộ mốc 7/2026 và "3 vòng"; sửa thành nguyên tắc chung "iterative refinement" có nguồn. |
| 4 | **MEDIUM — Gán framework cộng đồng cho hãng** | RTF / CO-STAR / CRISPE được gán như chuẩn OpenAI/Google. Thực tế là framework cộng đồng, không xuất hiện trong guide chính thức. | Tách thành mục "framework cộng đồng", ghi rõ không phải chuẩn hãng, không dẫn nguồn hãng. |
| 5 | **MEDIUM — Khẳng định tiếng Việt không nguồn** | "Prompt tiếng Việt hoàn toàn hiệu quả" được ghi như khuyến nghị chính thức. Không có tuyên bố nào của hãng so sánh tiếng Việt vs tiếng Anh. | Đổi thành quy ước nội bộ + khuyến nghị tự làm A/B test; bổ sung kỹ thuật delimiter cho bài toán phức tạp. |
| 6 | **HIGH — Tên model ảnh lỗi thời** | Ghi "GPT Image / DALL·E" song song và "Nano Banana = Imagen". Thực tế: **gpt-image-1/1.5/2** là thế hệ kế nhiệm DALL·E; **Nano Banana** (Gemini native) tách biệt **Imagen** (Vertex AI). | Sửa tên model trong Chương 8 và Slide 32. |
| 7 | **MEDIUM — Chi tiết privacy thiếu chính xác** | Ghi Gemini "vào myactivity.google.com" chung chung. Thực tế là **Keep Activity / Gemini Apps Activity**, hành vi lưu giữ khác bản cũ (giữ lịch sử nhưng nội dung trong thời gian tắt không dùng để train). | Sửa theo Data Controls FAQ + Privacy Hub, ghi rõ khác biệt Free/Plus/Pro vs Business/Enterprise. |
| 8 | **HIGH — Ngưỡng "20 từ" cho chữ trong ảnh** | Ngưỡng được ghi như spec chính thức. Thực tế là **kinh nghiệm cộng đồng**, không phải thông số hãng. | Thêm disclaimer "kinh nghiệm cộng đồng, không phải spec hãng". |
| 9 | **HIGH — Ghi chú pháp lý lỗi thời** | Ghi "khung pháp lý AI đang hoàn thiện" — đã sai từ Q1/2026 (3 văn bản đã hiệu lực: Luật 71/2025 từ 01/01/2026, Luật 134/2025 từ 01/03/2026, NĐ 134/2026 từ 09/04/2026). Số hiệu 131/2025/QH15 ghi trong bản nháp là sai số. | Viết lại toàn bộ ghi chú pháp lý, dẫn số hiệu/ngày/điều khoản chính xác, xóa số hiệu sai. |

---

## Khẳng định được xác nhận — giữ nguyên

- Đường dẫn **Settings → Data Controls → Improve the model for everyone = OFF** chính xác từng click (Data Controls FAQ).
- Tài khoản **Business/Enterprise mặc định loại trừ khỏi training**.
- Tỷ lệ khung hình **16:9 / 1:1 / 4:5** đúng spec Gemini (ai.google.dev) — lưu ý 4:5 trên OpenAI phải crop.
- **Điều 11 Luật 134/2025** (gắn nhãn định dạng máy đọc được) và **Điều 5a NĐ 134/2026** (AI không phải tác giả) xác nhận nguyên văn.
- 4 số hiệu luật/nghị định đều tồn tại, khớp ngày ký/hiệu lực.

---

## Điểm yếu về thiết kế đào tạo (đã đưa vào kế hoạch v2.0)

| Tiêu chí | Vấn đề | Đã sửa trong `00-ke-hoach-dao-tao-ai.md` v2.0 |
|----------|--------|----------------------------------------------|
| Thời lượng | Dồn 180' một buổi vượt ngưỡng chú ý người lớn | Chia **2 buổi × 90', cách nhau 7-14 ngày** |
| Thực hành | Demo chung, không làm trên việc thật; thiếu bước review | Yêu cầu **mang việc thật đã ẩn dữ liệu** vào Buổi 2; thêm peer review chéo |
| Đo lường | Quiz 10 câu chỉ đo ghi nhớ | Thêm **pre/post test cùng đề + rubric 4 mức** chấm prompt/output |
| Cá nhân hóa | Một giáo án cho mọi phòng ban | **40% breakout theo phòng ban** ở Buổi 2; template do trưởng phòng duyệt |
| Sau đào tạo | Không có hỗ trợ, dễ rơi rụng sau 2 tuần | Chỉ định **Owner + Champion**, office hours 2 tuần/lần, showcase hàng tháng |
| Bảo trì | Không có owner, không lịch cập nhật → lỗi thời trong 3-6 tháng | **Rà soát mỗi quý**, footer phiên bản, lưu bản số làm gốc |
| Tiếp cận | Thuật ngữ dày, 50 slide/180' nhịp nhanh | Bản rút gọn 4 trang chữ 14pt + 3 video xem lại + ngồi cặp mạnh-yếu |

---

## Nguồn đối chiếu chính

- `learn.chatgpt.com/docs/prompting` · `help.openai.com/en/articles/10032626` · `developers.openai.com/cookbook/examples/gpt-5/gpt-5-1_prompting_guide` · `ai.google.dev/gemini-api/docs/prompting-strategies` · `help.openai.com/en/articles/7730893` (Data Controls FAQ) · `ai.google.dev/gemini-api/docs/image-generation`
- `vanban.chinhphu.vn` (Luật 71/2025, 134/2025; NĐ 134/2026) · `thuvienphapluat.vn` · `english.luatvietnam.vn` · `baker`/`rouse`/`tilleke` phân tích NĐ 134/2026
- Google AI Essentials / OpenAI Academy / Microsoft AI Skills & Work Trend Index 2026 / Coursiv / StartBrain (chuẩn đào tạo)

---

## Kết luận audit

Làm nhóm **"sửa trong bảng in" (9 mục trên)** thì cẩm nang **an toàn để in**. Làm thêm nhóm **"sửa trong tuần"** (chia 2 buổi, rubric, breakout, mang việc thật) thì tiệm cận chuẩn Google/Microsoft/OpenAI mà chi phí tăng không đáng kể. Báo cáo chi tiết từng finding (evidence nguyên văn + fix) lưu trong journal của workflow `wf_e53fced2-5d3` để đối chiếu khi rà soát quý 12/2026.

*Audit thực hiện bằng 4 subagent Opus chạy song song, đối chiếu chéo — không thay thế rà soát pháp chế nội bộ trước khi phát hành.*
