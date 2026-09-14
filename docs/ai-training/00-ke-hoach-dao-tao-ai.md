# Kế hoạch đào tạo AI cho nhân viên văn phòng — An Bình Foods

**Ngày lập:** 07/09/2026 · **Phiên bản:** 3.0 — **gộp thành 1 buổi duy nhất 90 phút**
**Chủ sở hữu tài liệu:** [Ban Hành chính & Chuyển đổi số — điền tên người phụ trách]
**Đối tượng:** Toàn bộ nhân viên văn phòng (Hành chính, Kế toán, Kinh doanh, QC, Kho, Kỹ thuật, Sản xuất-văn phòng)
**Trình độ đầu vào:** Thành thạo thao tác văn phòng cơ bản (Word/Excel/Email), giỏi nghiệp vụ chuyên môn của mình, chưa quen AI tạo sinh
**Công cụ trong phạm vi:** **ChatGPT** và **Gemini** (tài khoản cá nhân — trọng tâm an toàn dữ liệu)
**Mục tiêu sau đào tạo:** Mỗi nhân viên biết cách hỏi AI để ra kết quả dùng được, nắm 5 điều cấm về dữ liệu, và có 1 template prompt cho tác vụ lặp lại của phòng mình.

---

## 0. Ghi chú phiên bản

| Phiên bản | Nội dung |
|-----------|----------|
| v1.0 | 1 buổi 180 phút, một nội dung cho mọi người, đo bằng quiz ghi nhớ |
| v2.0 | Sau audit: chia 2 buổi × 90', thêm rubric/pre-post test, breakout phòng ban, Owner/Champion, sửa 9 lỗi nội dung |
| **v3.0 (bản này)** | **Gộp lại 1 buổi 90 phút** theo yêu cầu vận hành — giữ nguyên các cải tiến về đo lường, breakout phòng ban và hỗ trợ sau đào tạo, cắt phần lý thuyết và dồn thực hành |

**Nguyên tắc cắt khi dồn về 90 phút:** giữ trọn khối **an toàn dữ liệu** và **breakout theo phòng ban** (hai thứ tạo giá trị thực), cắt bớt lý thuyết mô tả AI và gộp các slide kỹ thuật thành cặp. Chi tiết đối chiếu ở `03-bao-cao-audit.md`.

---

## 1. Mục tiêu đào tạo (đo được ở 3 cấp độ)

| Cấp độ | Mục tiêu | Cách đo |
|--------|----------|---------|
| **Kiến thức** | Hiểu AI làm được/không làm được gì, nắm 5 điều cấm | Pre-test & post-test **cùng 10 câu** — đo mức tăng, yêu cầu post-test ≥ 8/10 |
| **Kỹ năng** | Viết prompt ra kết quả dùng được | Chấm 1 template của phòng + 3 prompt về nhà theo **rubric 4 mức** — đạt mức 3 trở lên |
| **Hành vi áp dụng** | Dùng AI đều đặn trong công việc thật | Khảo sát **30 ngày sau**: tần suất dùng, số tác vụ đã chuẩn hóa, giờ tiết kiệm/tuần; mục tiêu ≥ 60% dùng hàng tuần |

> Chỉ số kinh doanh đi kèm: tổng giờ tiết kiệm mỗi phòng ban mỗi tuần, do trưởng phòng xác nhận khi duyệt template.

---

## 2. Hình thức tổ chức

- **Thời lượng:** **1 buổi duy nhất — 90 phút** (có 1 giải lao 5 phút ở phút 40).
- **Hình thức:** Trực tiếp tại phòng họp, máy chiếu + loa. Mỗi học viên mang laptop hoặc điện thoại đã cài ChatGPT & Gemini.
- **Sĩ số:** 15-25 người. **Chia bàn theo phòng ban ngay từ đầu** — cần cho breakout ở cuối buổi.
- **Giảng viên:** 1 điều hành chính + 1 trợ giảng (bắt buộc có trợ giảng để kèm bàn trong 13 phút breakout). **Bố trí ngồi cặp mạnh-yếu.**
- **Tài liệu phát tay:** Cẩm nang `01-cam-nang-su-dung-AI.docx` (A4) + **Thẻ Prompt bỏ túi** (A4 ép plastic) + **bản rút gọn 4 trang chữ 14pt** cho người lớn tuổi.
- **Yêu cầu học viên mang theo:** 1 việc thật của mình (email / báo cáo / bảng tính) đã **ẩn dữ liệu nhạy cảm** — đổi tên thành "Khách A", xóa CCCD, đổi số tiền thành tỷ lệ. Dùng ở breakout phút 70.

### Chuẩn bị trước buổi học (gửi trước 3 ngày)

- [ ] Mỗi học viên tự tạo tài khoản ChatGPT (chatgpt.com) và Gemini (gemini.google.com) bằng email cá nhân, **đăng nhập được trước khi vào lớp**.
- [ ] Gửi **1 video 5 phút** giới thiệu giao diện hai công cụ.
- [ ] Gửi **pre-test 10 câu** trên Google Form (làm ở nhà, không chấm điểm).
- [ ] Gửi danh sách "dữ liệu cấm dán vào AI" để học viên đọc trước.
- [ ] Nhắc mang việc thật đã ẩn dữ liệu — **nhắc 2 lần: 3 ngày và 1 ngày trước**.

---

## 3. Chương trình 90 phút

| # | Khối | Phút | Thời lượng | Nội dung | Hình thức |
|---|------|------|-----------|----------|-----------|
| 1 | **Mở đầu** | 0-5 | 5' | Vì sao học AI bây giờ (3 con số ứng dụng AI tại VN). Nói thẳng nỗi lo "AI có lấy việc mình không": AI lấy việc lặp lại, không lấy việc phán đoán. | Diễn giải + hỏi đáp |
| 2 | **Hiểu đúng về AI** | 5-15 | 10' | AI tạo sinh là gì (kể chuyện). ChatGPT vs Gemini. AI giỏi gì / dở gì / bịa ra sao. Demo 1 prompt dở vs 1 prompt tốt. Quy tắc vàng. | Giảng + demo live |
| 3 | **Cách hỏi để AI trả lời hay** | 15-37 | 22' | Công thức **5 thành tố** (quy ước nội bộ). 4 kỹ thuật: đóng vai, đưa ngữ cảnh, cho ví dụ, chia nhỏ. 3 câu thần chú tự kiểm tra. **Bài tập nhanh 8 phút.** Mẹo tiếng Việt + lỗi phổ biến. | Giảng + demo + bài tập |
| — | **Giải lao** | 37-42 | 5' | Tranh thủ hỏi trợ giảng nếu vướng đăng nhập. | — |
| 4 | **An toàn dữ liệu & ranh giới đỏ** | 42-57 | 15' | **Tắt chia sẻ huấn luyện — cả lớp làm ngay tại chỗ.** 5 điều cấm. Hallucination + 3 cách bắt lỗi. Việc tuyệt đối không giao cho AI. | Giảng + thao tác tại lớp |
| 5 | **Quy trình làm việc + tạo văn bản & ảnh** | 57-69 | 12' | Quy trình 4 bước (nhấn Bước 3 kiểm sự thật) + checklist trước khi gửi. 5 loại văn bản hay dùng. Tạo ảnh: cấu trúc prompt, 3 giới hạn, ranh giới đỏ. | Giảng + demo |
| 6 | **Breakout theo phòng ban** | 69-82 | 13' | Mỗi bàn chọn 1 tác vụ lặp lại → viết template prompt theo 5 thành tố → chạy thử **trên việc thật đã ẩn dữ liệu** → phản biện nhanh với bàn bên cạnh. | Workshop nhóm |
| 7 | **Bế mạc** | 82-90 | 8' | Post-test 10 câu (giống hệt pre-test). Tổng kết 4 điều mang về. Công bố hệ thống hỗ trợ + bài tập về nhà. Phát tài liệu. | — |

**Thực hành chiếm ~33 phút / 90 phút ≈ 37%** (bài tập nhanh 8' + thao tác tắt huấn luyện 5' + breakout 13' + post-test 5' + demo live xen kẽ).

### Bài tập nhanh ở khối 3 (8 phút)

> Viết lại câu hỏi dở **"Làm giúp cái báo cáo"** thành prompt đủ 5 thành tố → chấm chéo trong bàn theo checklist.
> Gợi ý đặt câu hỏi: Ai đọc báo cáo? Báo cáo về việc gì? Bao nhiêu chữ? Định dạng thế nào?
> Trợ giảng đi quanh, bàn nào xong sớm thì thử luôn trên ChatGPT/Gemini.

### Breakout ở khối 6 (13 phút — rút gọn từ 40 phút của v2.0)

| Phút | Việc |
|------|------|
| 0-2 | Chọn 1 tác vụ lặp lại tốn thời gian nhất của phòng |
| 2-6 | Viết template prompt theo 5 thành tố (dùng template mẫu của phòng làm khởi điểm) |
| 6-10 | Chạy thử trên việc thật đã ẩn dữ liệu, sửa template theo kết quả |
| 10-13 | Bàn bên cạnh đóng vai phản biện: chỉ ra **2 lỗ hổng** (thiếu ràng buộc? còn dữ liệu cấm?) |

> **Đánh đổi đã chấp nhận:** v2.0 dành 40 phút cho breakout kèm trưởng phòng duyệt theo rubric. Bản 90 phút rút còn 13 phút và **chuyển bước duyệt rubric về sau buổi học** — trưởng phòng chấm template trong 7 ngày kế tiếp, không chấm tại lớp. Đây là điểm yếu lớn nhất của bản 90 phút; bù lại bằng office hours và khảo sát 30 ngày.

---

## 4. Rubric chấm prompt/output (4 mức — trưởng phòng chấm trong 7 ngày sau buổi học)

| Tiêu chí | Mức 1 — Không đạt | Mức 2 — Cơ bản | Mức 3 — Đạt | Mức 4 — Tốt |
|----------|-------------------|----------------|------------|-------------|
| **Đủ thành tố** | Dưới 2/5 | 3/5 | 4-5/5 | 5/5 + biết cắt bỏ phần thừa |
| **Ràng buộc cụ thể** | Không có độ dài/giọng/định dạng | Có 1 ràng buộc | Có ràng buộc định lượng | Có cả ràng buộc "không được làm gì" |
| **An toàn dữ liệu** | Còn tên/số thật nhạy cảm | Che một phần | Không còn dữ liệu cấm | Có quy trình che để người khác lặp lại |
| **Kiểm chứng được** | Nhận kết quả AI mà không soát | Có đọc lại | Tự kiểm 1 số liệu/tên riêng | Ghi rõ mục nào AI tạo, mục nào người xác nhận |

**Ngưỡng đạt:** mức 3 trở lên ở cả 4 tiêu chí. Trưởng phòng ký xác nhận template của phòng mình.

---

## 5. Bài tập về nhà & chuẩn đầu ra

| Việc | Hạn | Ai chịu trách nhiệm |
|------|-----|---------------------|
| Mỗi học viên nộp 3 prompt + kết quả thật, tự chấm theo rubric | 7 ngày sau buổi học | Cá nhân |
| Mỗi phòng ban nộp 1 template chuẩn hóa, trưởng phòng chấm theo rubric | 7 ngày sau buổi học | Trưởng phòng + Champion |
| Khảo sát áp dụng: tần suất dùng, tác vụ đã chuẩn hóa, giờ tiết kiệm | 30 ngày sau | Owner chương trình |
| Showcase 1 ca hay trên nhóm hỏi đáp | Hàng tháng | Owner + Champion |

---

## 6. Hỗ trợ sau đào tạo

Vì buổi học chỉ 90 phút, phần này **quyết định đào tạo có hiệu quả hay không**:

| Cơ chế | Chi tiết |
|--------|----------|
| **Owner chương trình** | 1 người thuộc Ban Hành chính & Chuyển đổi số — sở hữu cẩm nang, lịch cập nhật, số liệu áp dụng |
| **Champion mỗi phòng ban** | 1 người thạo nhất của phòng, chỗ hỏi đầu tiên của đồng nghiệp; **cử ngay trong buổi học** |
| **Kênh hỏi đáp** | Nhóm Zalo "Hỗ trợ AI — An Bình Foods"; trả lời trong 24h làm việc |
| **Office hours** | 30 phút, mỗi 2 tuần — kèm 1-1 cho người gặp khó; mở đầu bằng "AI News 5 phút". **Quan trọng hơn ở bản 90 phút** vì không đủ thời gian kèm tại lớp |
| **Thư viện template chung** | Google Drive theo thư mục phòng ban, có phiên bản, trưởng phòng duyệt trước khi đưa vào |
| **Video xem lại** | 3 video 3-5 phút (đăng ký tài khoản / prompt 5 thành tố / tạo ảnh) cho người vắng hoặc cần ôn |

---

## 7. Cập nhật & bảo trì tài liệu

- Cẩm nang và slide **lưu dạng số** (Google Docs/Notion) là bản gốc; bản in chỉ là snapshot có ghi ngày.
- **Footer mọi tài liệu:** `Phiên bản X.Y — Tháng/Năm — Owner: [tên] — Review kế tiếp: [tháng]`.
- **Rà soát mỗi quý** (nửa ngày, Owner chủ trì): model/tính năng mới, thay đổi giao diện, cập nhật tên gọi, rà soát quy định pháp lý mới.
- Hai mục xuống cấp nhanh nhất, ưu tiên cập nhật trước: **bảng so sánh ChatGPT vs Gemini** và **phần tạo ảnh**.

---

## 8. Tài liệu trong bộ này

| File | Vai trò |
|------|---------|
| `00-ke-hoach-dao-tao-AI.docx` | Chính file này (bản Word) — để lãnh đạo duyệt |
| `01-cam-nang-su-dung-AI.docx` | **Cẩm nang phát tay** ~32 trang, in màu, kèm Thẻ Prompt bỏ túi |
| `02-slide-90-phut.pptx` | **Slide trình chiếu** — 39 slide, dựng sẵn, người hướng dẫn chỉ việc chiếu |
| `02-slide-de-cuong.md` | Đề cương slide dạng text — ghi chú lời giảng/demo cho từng slide |
| `03-bao-cao-audit.md` | Báo cáo kiểm toán nội dung — bằng chứng đối chiếu nguồn chính thức + pháp lý |
| `04-ban-rut-gon.docx` | Bản rút gọn 4 trang chữ 14pt, in đen trắng — cho người lớn tuổi |

> File nguồn để chỉnh sửa: các file `.md` cùng tên + `build-ai-training-docx.py` / `build-ai-training-pptx.py`. Sửa `.md` hoặc script rồi chạy lại là ra bản mới.

---

## 9. Chuẩn bị hậu cần (checklist)

**Trước buổi học:**
- [ ] Máy chiếu, mic, loa, wifi ổn định (+ phương án 4G dự phòng)
- [ ] Mỗi học viên có tài khoản ChatGPT & Gemini **đăng nhập được** (kiểm tra trước 1 ngày)
- [ ] Đã gửi video 5 phút + pre-test 10 câu + danh sách dữ liệu cấm
- [ ] Đã nhắc mang việc thật đã ẩn dữ liệu (2 lần)
- [ ] In cẩm nang, Thẻ Prompt bỏ túi, bản rút gọn 4 trang chữ 14pt
- [ ] 5-6 file mẫu demo: biên bản họp 2 trang, bảng doanh số Excel, ảnh sản phẩm mít sấy, công văn mẫu, 1 đoạn văn lủng củng
- [ ] **Tài khoản demo riêng** đã đăng nhập trên máy chiếu — không dùng tài khoản cá nhân có dữ liệu thật
- [ ] Đã **chạy thử mọi prompt demo ít nhất 2 lần**; prompt nào ra kết quả xấu thì đổi prompt, đừng cứu tại lớp
- [ ] Ảnh chụp màn hình backup cho từng demo (phòng wifi chập chờn)
- [ ] Văn bản pháp quy thật để chiếu cạnh kết quả AI bịa
- [ ] Google Form: pre-test, post-test (10 câu giống hệt), thu bài, khảo sát
- [ ] Đồng hồ đếm ngược cho breakout; tắt thông báo máy chiếu
- [ ] Sắp bàn theo phòng ban; in bảng tên phòng đặt trên bàn

**Trong buổi học:**
- [ ] Trợ giảng quét màn hình khi đi quanh — bắt ngay ai dán dữ liệu nhạy cảm
- [ ] Ghi lại tên Champion từng phòng ở slide bế mạc

**Sau buổi học:**
- [ ] Trưởng phòng chấm template theo rubric trong 7 ngày
- [ ] Lập nhóm Zalo hỏi đáp + công bố lịch office hours
- [ ] Chạy khảo sát 30 ngày, báo cáo lãnh đạo số giờ tiết kiệm
- [ ] Đưa lịch rà soát quý vào calendar của Owner

---

## 10. Rủi ro & cách xử lý

| Rủi ro | Xử lý |
|--------|-------|
| **90 phút quá ngắn, không kịp kèm từng người** | Đây là rủi ro lớn nhất của bản này. Bù bằng: trợ giảng bắt buộc có, office hours 2 tuần/lần, Champion mỗi phòng, video xem lại. Nếu lớp > 25 người thì **chia 2 ca cùng nội dung** thay vì kéo dài buổi |
| Học viên lớn tuổi ngại công nghệ, choáng vì thuật ngữ | Bản rút gọn 4 trang chữ 14pt + 3 video xem lại + ngồi cặp mạnh-yếu + đổi tên kỹ thuật sang tiếng Việt đời thường ("đóng vai" thay "role prompting") |
| Nỗi lo "AI thay việc" gây chống đối ngầm | Nói thẳng ngay 5 phút đầu; dành 2 phút cho 1-2 người nói lo lắng của họ trước khi đi tiếp |
| Học viên không mang việc thật → breakout quay về demo | Bắt buộc nộp trước 1 việc thật qua form 24h trước buổi; bàn nào chưa nộp thì dùng bộ dữ liệu mẫu giả lập của phòng đó |
| Học viên dán dữ liệu nhạy cảm vào AI trong thực hành | Nhắc 5 điều cấm ngay đầu khối an toàn; **yêu cầu tắt huấn luyện tại lớp**; trợ giảng quét màn hình; mọi ví dụ dùng dữ liệu đã che |
| Breakout 13 phút không đủ để ra template đạt chuẩn | Chấp nhận: template hoàn thiện tại office hours; trưởng phòng chấm trong 7 ngày sau buổi học |
| Sau đào tạo rơi rụng | Office hours + showcase hàng tháng + khảo sát 30 ngày + template phải được trưởng phòng duyệt |
| Wifi yếu / không đăng nhập được | Tài khoản dự phòng + ảnh chụp màn hình backup cho mọi demo |
| Nhân sự vắng nhiều vì bận đơn hàng | Bố trí 2 khung giờ để chọn; xin lãnh đạo duyệt thời lượng tính vào giờ làm |

---

## 11. Cần xác nhận thêm trước khi chốt in ấn

1. **Logo & màu sắc:** theo `docs/design-system.md` (xanh #2563EB) hay bộ nhận diện riêng của An Bình Foods?
2. **Ngôn ngữ:** 100% tiếng Việt (đề xuất) hay song ngữ Việt-Anh cho thuật ngữ?
3. **In ấn:** in màu toàn bộ hay đen trắng (ảnh hưởng Thẻ Prompt và highlight 5 màu)?
4. **Tài khoản demo:** tạo 1-2 tài khoản trả phí dùng chung để demo tính năng nâng cao, hay chỉ demo bản miễn phí?
5. **Owner chương trình:** chỉ định ai sở hữu tài liệu và lịch cập nhật quý? (bắt buộc — thiếu mục này là rủi ro lớn nhất)
6. **Có cho phép dùng dữ liệu thật đã che danh tính không, hay yêu cầu 100% dữ liệu giả trong đào tạo?**
7. **Số lượng học viên mỗi ca:** nếu > 25 người, có chia 2 ca không?

> Sau khi lãnh đạo duyệt bản 3.0 này, điền các mục `[ ]` trong slide và tài liệu rồi in.
