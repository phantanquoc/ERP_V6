# Cẩm nang sử dụng AI cho nhân viên văn phòng

### Công ty Cổ phần An Bình Foods — Ban Hành chính & Chuyển đổi số

> **Tài liệu lưu hành nội bộ · Phiên bản 1.2 — 09/2026** (đã qua audit; thêm Phần riêng Claude Cowork)
> Đối tượng: toàn bộ nhân viên văn phòng · Công cụ: Chương 1-13: ChatGPT & Gemini (tài khoản cá nhân) · **Chương 14: Claude Cowork (công cụ trả phí, tách riêng)**
> Chủ sở hữu tài liệu: [Ban Hành chính & Chuyển đổi số — điền tên người phụ trách] · **Rà soát định kỳ: mỗi quý**, lần kế tiếp 12/2026
> Mỗi chương đều có **ví dụ prompt sao chép được** — hãy thử ngay trên máy của bạn.
> **Quy ước trong cẩm nang:** nội dung ghi "quy ước nội bộ" là cách An Bình Foods hệ thống hóa cho dễ dạy, **không phải** khuyến nghị chính thức nguyên văn của OpenAI/Google/Anthropic. Các nguồn chính thức được dẫn riêng ở Chương 13 và mục 14.7.

---

## Mục lục

1. [AI là gì — nói cho dễ hiểu](#1-ai-là-gì--nói-cho-dễ-hiểu)
2. [ChatGPT và Gemini — chọn ai khi nào](#2-chatgpt-và-gemini--chọn-ai-khi-nào)
3. [Tư duy đúng trước khi hỏi AI](#3-tư-duy-đúng-trước-khi-hỏi-ai)
4. [Công thức 5 thành tố của một câu hỏi tốt](#4-công-thức-5-thành-tố-của-một-câu-hỏi-tốt)
5. [4 kỹ thuật khiến AI trả lời hay hơn hẳn](#5-4-kỹ-thuật-khiến-ai-trả-lời-hay-hơn-hẳn)
6. [Quy trình 4 bước: Người ra ý — AI viết nháp — Người kiểm — AI làm mịn](#6-quy-trình-4-bước-người-ra-ý--ai-viết-nháp--người-kiểm--ai-làm-mịn)
7. [Tạo văn bản: email, báo cáo, biên bản, bài đăng](#7-tạo-văn-bản-email-báo-cáo-biên-bản-bài-đăng)
8. [Tạo ảnh: minh họa, slide, bài đăng mạng xã hội](#8-tạo-ảnh-minh-họa-slide-bài-đăng-mạng-xã-hội)
9. [5 điều cấm & cách bắt lỗi AI bịa đặt](#9-5-điều-cấm--cách-bắt-lỗi-ai-bịa-đặt)
10. [Thư viện 15 template prompt dùng ngay](#10-thư-viện-15-template-prompt-dùng-ngay)
11. [Lộ trình tự học 30 ngày](#11-lộ-trình-tự-học-30-ngày)
12. [Hỏi đáp nhanh (FAQ)](#12-hỏi-đáp-nhanh-faq)
13. [Nguồn tham khảo](#13-nguồn-tham-khảo)
14. [**PHẦN RIÊNG** — Claude Cowork: giao việc cho AI tự làm nhiều bước](#14-ccowork)

---

## 1. AI là gì — nói cho dễ hiểu

**AI tạo sinh (Generative AI)** là chương trình máy tính đã đọc một lượng văn bản và hình ảnh khổng lồ trên internet, rồi học cách **đoán chữ tiếp theo** sao cho câu trả lời nghe tự nhiên và hữu ích. Hai cái tên bạn sẽ dùng nhiều nhất:

- **ChatGPT** (của OpenAI) — mạnh về viết lách, suy luận, làm việc với file.
- **Gemini** (của Google) — mạnh về tìm kiếm thông tin mới, làm việc với Google Workspace, và xử lý nhiều loại file cùng lúc.

Hãy hình dung AI như **một trợ lý thực tập sinh rất chăm, đọc nhiều, gõ nhanh, nhưng chưa có kinh nghiệm thực tế ở công ty bạn**. Em ấy có thể soạn nháp rất nhanh, nhưng bạn — người có nghiệp vụ — mới là người quyết định nội dung cuối cùng có đúng và dùng được hay không.

### AI giỏi gì

- Soạn thảo văn bản, tóm tắt, biên tập, dịch thuật.
- Gợi ý ý tưởng, dàn ý, tiêu đề, kịch bản.
- Tạo ảnh minh họa, biểu đồ, slide nháp.
- Giải thích khái niệm, hướng dẫn thao tác Excel/Word.

### AI dở gì (và hay bịa ra sao)

- **Bịa số liệu, bịa nguồn, bịa điều luật.** Nếu bạn hỏi "Nghị định 123 nói gì?", AI có thể tự chế ra điều khoản nghe rất thuyết phục nhưng không tồn tại. Luôn kiểm chứng với văn bản gốc.
- **Không biết chuyện nội bộ công ty bạn** trừ khi bạn cung cấp. AI không tự biết quy trình kho của An Bình Foods.
- **Tính toán đôi khi sai**, nhất là phép tính dài, đơn vị đo, quy đổi tiền tệ.
- **Kiến thức có độ trễ.** Dù Gemini có thể tìm kiếm trên mạng, kết quả tìm kiếm vẫn có thể lỗi thời hoặc sai nguồn.

> **Quy tắc vàng:** AI là người soạn nháp, bạn là người ký duyệt. Mọi con số, tên người, điều luật, ngày tháng do AI đưa ra — hãy kiểm lại trước khi gửi ra ngoài.

---

## 2. ChatGPT và Gemini — chọn ai khi nào

| Tiêu chí | ChatGPT (chatgpt.com) | Gemini (gemini.google.com) |
|----------|----------------------|---------------------------|
| **Điểm mạnh nổi bật** | Viết lách mượt, suy luận chặt, làm việc tốt với file Word/Excel/PDF bạn tải lên | Tìm kiếm thông tin mới trên Google, tóm tắt video YouTube, làm việc mượt với Gmail/Drive/Docs |
| **Tạo ảnh** | Tạo ảnh trực tiếp trong hội thoại bằng dòng model **GPT Image** (tên model: `gpt-image-1`, `1.5`, `2` — thế hệ kế nhiệm DALL·E), chỉnh sửa ảnh bằng lời | Tạo ảnh trong hội thoại bằng **Nano Banana** (dòng native của Gemini); **Imagen** là dòng ảnh trên Vertex AI, khác với Nano Banana |
| **Ghi nhớ thói quen** | Có Memory (nhớ sở thích, cách bạn muốn xưng hô) | Có Gems (trợ lý chuyên biệt bạn tự tạo cho tác vụ lặp lại) |
| **Bản miễn phí** | Đủ dùng cho hầu hết tác vụ văn phòng | Đủ dùng; tài khoản Google là dùng được ngay |
| **Khi nào dùng** | Soạn email, báo cáo, biên bản, phân tích số liệu, viết bài đăng | Tìm thông tin mới, kiểm tra giá thị trường, tóm tắt tài liệu dài, tạo ảnh minh họa |

**Lời khuyên thực tế:** Dùng cả hai. Soạn nháp bằng ChatGPT, kiểm chứng thông tin mới bằng Gemini (nhờ Gemini tìm nguồn trên mạng). Đừng trung thành với một công cụ duy nhất.

### Đăng ký & đăng nhập (tài khoản cá nhân)

1. **ChatGPT:** Vào `chatgpt.com` → Sign up → dùng email cá nhân → xác minh → đăng nhập là dùng được. Tải thêm app ChatGPT trên điện thoại để dùng mọi lúc.
2. **Gemini:** Vào `gemini.google.com` → đăng nhập bằng tài khoản Google (Gmail) → dùng ngay. Trên điện thoại, Gemini đã có sẵn trong app Google.

> **Lưu ý quan trọng vì dùng tài khoản cá nhân:** Mọi thứ bạn dán vào ChatGPT/Gemini bản miễn phí **có thể được dùng để cải thiện mô hình** (trừ khi bạn tắt trong Settings). Vì vậy **tuyệt đối không dán** dữ liệu nhạy cảm — xem Chương 9.

---

## 3. Tư duy đúng trước khi hỏi AI

Trước khi gõ, hãy tự trả lời 3 câu hỏi này (mất 30 giây nhưng tiết kiệm 30 phút sửa lại):

1. **Tôi muốn AI làm gì cho tôi?** (một động từ rõ ràng: soạn, tóm tắt, biên tập, gợi ý, dịch, tạo ảnh...)
2. **Ai sẽ đọc kết quả này?** (sếp, khách hàng, đồng nghiệp, đăng Facebook — mỗi đối tượng cần giọng văn khác nhau)
3. **Kết quả đạt là như thế nào?** (độ dài, định dạng, giọng văn, deadline — càng cụ thể càng ít phải sửa)

**Ví dụ đổi tư duy:**

- Câu hỏi dở: *"Viết giúp tôi email gửi khách hàng."* → AI không biết khách nào, việc gì, giọng ra sao → trả lời chung chung, bạn phải sửa nhiều.
- Câu hỏi tốt: *"Soạn email gửi khách hàng X về việc giao hàng chậm 2 ngày do mưa bão, giọng chân thành, đề xuất bù 5% đơn hàng, khoảng 150 chữ, có tiêu đề."* → AI trả lời dùng được ngay.

---

## 4. Công thức 5 thành tố của một câu hỏi tốt

Mọi prompt hiệu quả đều có 5 thành tố. Bạn không cần nhớ tên framework — chỉ cần kiểm tra đủ 5 ô trước khi gửi:

```
┌─────────────────────────────────────────────────────┐
│  1. VAI TRÒ     → AI đóng vai ai?                   │
│  2. BỐI CẢNH    → Việc này là gì, cho ai, vì sao?   │
│  3. NHIỆM VỤ    → Làm gì, động từ rõ ràng            │
│  4. RÀNG BUỘC   → Độ dài, giọng văn, điều cấm/không │
│  5. ĐỊNH DẠNG   → Trả về dạng gì (bảng, email, list)│
└─────────────────────────────────────────────────────┘
```

### Ví dụ áp dụng đủ 5 thành tố

> **Prompt mẫu — Soạn công văn:**
>
> Bạn là **trợ lý hành chính** [VAI TRÒ] của công ty sản xuất thực phẩm 200 nhân sự tại Gia Lai [BỐI CẢNH].
> Hãy **soạn công văn gửi nhà cung cấp bao bì** về việc đề nghị báo giá 5.000 túi zip 200g, giao trước 30/09 [NHIỆM VỤ].
> Văn phong **trang trọng, ngắn gọn, dưới 250 chữ**, không dùng từ suồng sã, xưng "Công ty chúng tôi" [RÀNG BUỘC].
> Trả về **dạng công văn có tiêu đề, kính gửi, nội dung, kết thúc và chỗ ký tên** [ĐỊNH DẠNG].

**Mẹo tiếng Việt (quy ước nội bộ — không phải khuyến nghị chính thức của hãng):** Prompt bằng tiếng Việt cho kết quả tốt với ChatGPT và Gemini trong thực tế sử dụng nội bộ, nhưng **không có** tuyên bố chính thức nào của OpenAI hay Google so sánh hiệu quả tiếng Việt vs tiếng Anh. Chỉ khi bạn cần AI viết nội dung tiếng Anh chuẩn bản xứ, hãy ra lệnh bằng tiếng Anh. Lỗi phổ biến khi prompt tiếng Việt là viết quá ngắn gọn kiểu chat ("làm giúp cái báo cáo") — hãy viết đầy đủ như ví dụ trên. Nếu muốn kiểm chứng, hãy tự làm A/B test cùng một yêu cầu bằng tiếng Việt và tiếng Anh.

> **Nguồn:** Lưu ý minh bạch: **không có** "khung 5 thành tố" chính thức nào do OpenAI hay Google công bố nguyên văn. Đây là **quy ước nội bộ của An Bình Foods**, tổng hợp từ các gợi ý rời rạc của hãng để dễ dạy và dễ nhớ. Nguồn gốc thật: OpenAI (learn.chatgpt.com/docs/prompting) liệt kê **4 phần** — *Goal* (mục tiêu), *Context* (ngữ cảnh), *Output* (định dạng), *Boundaries* (ranh buộc), kèm nguyên tắc "Use only the parts that help" (chỉ dùng phần nào thực sự hữu ích). Google (ai.google.dev prompting-strategies) khuyên đặt *role/persona* và *output format* ở vị trí ưu tiên. Cẩm nang gộp lại thành 5 ô cho đầy đủ.

---

## 5. 4 kỹ thuật khiến AI trả lời hay hơn hẳn

### Kỹ thuật 1 — Đóng vai (Role)

Nói AI đóng vai ai, câu trả lời sẽ mang góc nhìn của vai đó.

- *"Bạn là **kế toán trưởng** với 10 năm kinh nghiệm, hãy rà soát email này xem có thiếu chứng từ gì không."*
- *"Bạn là **khách hàng khó tính**, hãy đọc thử bài giới thiệu sản phẩm này và chê thật gắt để tôi sửa."*
- *"Bạn là **giảng viên Excel**, hãy giải thích hàm VLOOKUP cho người mới bằng ví dụ bán hàng thực tế."*

### Kỹ thuật 2 — Đưa ngữ cảnh & tài liệu (Context)

Đừng bắt AI đoán. Dán hoặc tải lên tài liệu thật.

- Tải file Word/Excel/PDF lên ChatGPT/Gemini rồi nói: *"Dựa vào file biên bản họp đính kèm, hãy tóm tắt 5 quyết định chính và người phụ trách mỗi việc."*
- Dán số liệu: *"Dưới đây là doanh số 6 tháng của 3 dòng sản phẩm [dán bảng] — hãy nhận xét xu hướng và gợi ý 3 hành động cho tháng tới."*

> Với Gemini, bạn có thể dán link Google Docs/Sheets — Gemini đọc trực tiếp. Với ChatGPT, tải file lên là tiện nhất.

### Kỹ thuật 3 — Cho ví dụ (Few-shot)

Cho AI 1-2 ví dụ về kết quả bạn muốn, AI sẽ bắt chước rất sát.

> *"Tôi muốn AI viết mô tả sản phẩm theo phong cách này. Ví dụ 1: [dán mô tả mẫu]. Ví dụ 2: [dán mô tả mẫu]. Bây giờ hãy viết mô tả cho sản phẩm mới: Mít sấy giòn 100g, vị mật ong, không chiên dầu."*

### Kỹ thuật 4 — Chia nhỏ & lặp lại (Decompose & Iterate)

Đừng nhồi mọi yêu cầu vào một prompt dài. Chia việc lớn thành bước nhỏ, và **lặp lại** để mài giũa.

**Quy trình lặp (áp dụng cho mọi tác vụ):**

1. Gửi prompt lần 1 → xem kết quả.
2. Nói: *"Giữ nguyên ý, viết lại ngắn hơn 30%, giọng trang trọng hơn."*
3. Nói: *"Thêm một bảng so sánh 3 phương án vào cuối."*
4. Nói: *"Bây giờ dịch toàn bộ sang tiếng Anh để gửi đối tác."*

> **Nguồn kỹ thuật (đã đối chiếu):** OpenAI API *Prompt engineering guide* liệt kê *provide examples (few-shot)*, *split complex tasks*, *use iterative refinement* như nguyên tắc chung ("Prompt engineering often requires an iterative approach"). Gemini *Prompt design strategies* (ai.google.dev) khuyên *always include few-shot examples* và *break down / chain prompts* cho việc phức tạp — không dùng nhãn "CoT" nổi bật. **Lưu ý minh bạch:** Các mốc thời gian "đổi khuyến nghị từ 7/2026" và con số "3 vòng lặp" **không có trong bất kỳ guide chính thức nào** và đã được gỡ khỏi cẩm nang. RTF / CO-STAR / CRISPE là **framework cộng đồng** (không phải chuẩn OpenAI/Google) — hữu ích cho người mới nhưng cần tách khỏi mục "khuyến nghị chính thức".

### Câu thần chú để AI tự kiểm tra

Thêm vào cuối prompt một trong các câu sau để AI cẩn thận hơn:

- *"Nếu thiếu thông tin để trả lời chính xác, hãy hỏi lại tôi thay vì đoán."*
- *"Sau khi trả lời, hãy tự đóng vai người phản biện và chỉ ra 3 điểm yếu của chính câu trả lời vừa rồi."*
- *"Hãy trích nguồn cho mọi số liệu và điều luật bạn nêu; nếu không có nguồn, ghi rõ 'chưa kiểm chứng'."*

---

## 6. Quy trình 4 bước: Người ra ý — AI viết nháp — Người kiểm — AI làm mịn

Đây là quy trình chuẩn cho **mọi** tác vụ văn bản. In ra dán ở bàn làm việc:

```
BƯỚC 1 — NGƯỜI RA Ý (5-10 phút)
  Bạn viết dàn ý bằng bullet: mục đích, đối tượng, 3-5 ý chính, số liệu phải có.
  ↓
BƯỚC 2 — AI VIẾT NHÁP (2-3 phút)
  Dán dàn ý + prompt 5 thành tố → AI viết bản nháp.
  ↓
BƯỚC 3 — NGƯỜI KIỂM SỰ THẬT (10-15 phút) ★ QUAN TRỌNG NHẤT
  Kiểm tra: số liệu đúng không? Tên người/đơn vị đúng không?
  Điều luật/văn bản có tồn tại không? Giọng văn có phù hợp người nhận không?
  Sửa trực tiếp trên bản nháp, đánh dấu chỗ nào AI bịa.
  ↓
BƯỚC 4 — AI LÀM MỊN (2-3 phút)
  Đưa bản đã sửa lại cho AI: "Hãy biên tập lại cho mượt, sửa chính tả,
  thống nhất giọng văn, nhưng GIỮ NGUYÊN số liệu và ý chính tôi đã sửa."
```

> **Tuyệt đối không bỏ Bước 3.** Gửi văn bản do AI viết mà chưa kiểm chứng số liệu/điều luật là lỗi nghiêm trọng — người ký chịu trách nhiệm, không phải AI.

---

## 7. Tạo văn bản: email, báo cáo, biên bản, bài đăng

### 7.1 Soạn email

**Prompt mẫu — Email xin lỗi giao hàng chậm:**

> Bạn là nhân viên kinh doanh của công ty thực phẩm sấy khô.
> Soạn email gửi khách hàng là siêu thị tại TP.HCM về việc đơn hàng 500kg chuối sấy giao chậm 2 ngày do mưa bão ảnh hưởng vận chuyển.
> Giọng chân thành, chuyên nghiệp, đề xuất bù 5% giá trị đơn hàng cho lần sau.
> Khoảng 150-180 chữ, có tiêu đề email, lời chào, lời cảm ơn, chữ ký.
> Cuối email chừa chỗ điền tên, SĐT, ngày.

### 7.2 Tóm tắt biên bản họp

> Tải file biên bản lên rồi prompt:
> "Tóm tắt biên bản họp đính kèm thành 3 phần: (1) Quyết định chính (tối đa 5 bullet), (2) Việc cần làm — ai làm — deadline (dạng bảng 3 cột), (3) Vấn đề chưa chốt cần họp lại. Nếu biên bản thiếu deadline, ghi 'chưa rõ — cần xác nhận'."

### 7.3 Viết báo cáo tuần/tháng

> "Bạn là trợ lý hành chính. Dựa vào các ghi chú sau [dán ghi chú], hãy viết báo cáo tuần cho Ban Giám đốc, gồm: Tiêu đề, Tóm tắt 3 dòng, Kết quả đạt được (bullet), Khó khăn, Đề xuất. Văn phong trang trọng, dưới 400 chữ."

### 7.4 Viết bài đăng Facebook/Zalo cho sản phẩm

> "Bạn là content writer cho thương hiệu trái cây sấy ăn liền. Viết 3 phương án caption Facebook giới thiệu sản phẩm Mít sấy giòn 100g — vị mật ong, không chiên dầu, mỗi caption 80-120 chữ, kèm 3 hashtag, giọng trẻ trung nhưng không sến, có lời kêu gọi hành động. Cuối mỗi caption thêm gợi ý hình ảnh minh họa."

### 7.5 Dịch thuật

> "Dịch email sau sang tiếng Anh thương mại, giọng lịch sự, giữ nguyên số liệu và tên riêng. Sau bản dịch, liệt kê 3 cụm từ quan trọng bạn đã chọn và giải thích vì sao chọn cách dịch đó."

---

## 8. Tạo ảnh: minh họa, slide, bài đăng mạng xã hội

### 8.1 Cấu trúc prompt tạo ảnh (dùng cho cả ChatGPT và Gemini)

```
[Chủ thể chính] + [hành động/bối cảnh] + [phong cách] + [ánh sáng/màu sắc] + [tỷ lệ khung hình] + [chi tiết loại trừ]
```

**Ví dụ prompt ảnh tốt:**

> "Ảnh chụp sản phẩm túi mít sấy giòn 100g đặt trên bàn gỗ sáng màu, bên cạnh là vài lát mít tươi và lọ mật ong nhỏ, phong cách tối giản hiện đại, ánh sáng tự nhiên ấm áp, nền mờ nhẹ, tỷ lệ 4:5, không có chữ trên bao bì, không có người trong ảnh."

**Ví dụ prompt ảnh dở (để tránh):**

> "Tạo ảnh mít sấy đẹp" → quá chung chung, AI sẽ cho ra ảnh ngẫu nhiên, khó dùng.

### 8.2 Mẹo thực tế cho dân văn phòng

- **Tỷ lệ khung hình:** Gemini (ai.google.dev) hỗ trợ `16:9` cho slide, `1:1` cho bài đăng vuông, `4:5` cho ảnh dọc và nhiều tỷ lệ khác; với OpenAI, `4:5` không có dạng native mà phải crop. Khi prompt, nêu rõ tỷ lệ mong muốn — ví dụ `16:9` cho slide, `1:1` cho bài đăng.
- **Chữ trong ảnh:** Theo thực tế sử dụng và phản ánh cộng đồng, chữ tiếng Việt trên ảnh AI vẫn hay sai — mức độ lỗi tăng khi trên ~20 từ. Ngưỡng "20 từ" **không phải thông số chính thức của hãng**, chỉ là kinh nghiệm cộng đồng. Nếu cần chữ, hãy tạo ảnh **không có chữ**, rồi thêm chữ bằng Canva/PowerPoint sau — nhanh và chính xác hơn.
- **Logo & bao bì thật:** Đừng yêu cầu AI tạo lại logo công ty — AI sẽ bịa ra logo gần giống nhưng sai. Hãy dùng ảnh chụp thật của sản phẩm, chỉ nhờ AI tạo **bối cảnh xung quanh**. Tên model chính xác hiện nay: **gpt-image-1 / 1.5 / 2** là thế hệ kế nhiệm DALL·E; **Nano Banana** là dòng ảnh native của Gemini, tách biệt với **Imagen** trên Vertex AI.
- **Chỉnh sửa bằng lời:** Sau khi có ảnh, bạn có thể nói: *"Giữ nguyên bố cục, đổi nền thành màu be sáng, thêm đĩa tre nhỏ bên cạnh."* — cả ChatGPT và Gemini đều hiểu.

### 8.3 Use case phù hợp cho An Bình Foods

| Nhu cầu | Gợi ý prompt |
|---------|-------------|
| Ảnh minh họa bài đăng Facebook | "Vườn mít chín vàng ở Tây Nguyên, nắng sớm, phong cách ảnh thực tế, ấm áp, không người" |
| Hình nền slide thuyết trình | "Nền trừu tượng màu xanh lá nhạt và be, họa tiết lá nhiệt đới mờ, tối giản, để chừa khoảng trống cho chữ" |
| Minh họa SOP/quy trình | "Sơ đồ 4 bước quy trình sấy mít: sơ chế → tẩm vị → sấy → đóng gói, phong cách infographic phẳng, màu xanh-vàng" |
| Mockup ý tưởng bao bì (chỉ để brainstorm nội bộ) | "Ý tưởng bao bì túi đứng 200g cho chuối sấy, tông vàng nâu, có cửa sổ trong suốt, phong cách hiện đại — CHỈ DÙNG NỘI BỘ, không phải thiết kế cuối" |

> **Ranh giới đỏ với ảnh AI (quy định nội bộ, có viện dẫn):** Theo *Usage Policies* của OpenAI/Google (cấm nội dung gây hiểu lầm) và quy định pháp luật về nhãn mác/quảng cáo, ảnh AI **không dùng** làm ảnh bao bì chính thức, ảnh chứng nhận chất lượng, hay ảnh quảng cáo có cam kết về thành phần/xuất xứ — vì AI có thể tạo ra chi tiết sai lệch. Nếu dùng ảnh AI cho truyền thông nội bộ/mạng xã hội, ghi chú "Ảnh minh họa AI" để minh bạch.

---

## 9. 5 điều cấm & cách bắt lỗi AI bịa đặt

### 9.1 5 điều cấm khi dùng tài khoản cá nhân

Vì bạn dùng tài khoản cá nhân (không phải tài khoản doanh nghiệp có hợp đồng bảo mật), hãy tuân thủ nghiêm:

| # | Cấm | Vì sao | Làm thay thế |
|---|-----|--------|-------------|
| 1 | **Không dán** họ tên + CCCD, lương, hợp đồng lao động, thông tin sức khỏe nhân viên | Rò rỉ dữ liệu cá nhân, vi phạm pháp luật bảo vệ dữ liệu | Dùng tên giả "Anh A", che số CCCD, chỉ dán phần cần thiết |
| 2 | **Không dán** giá vốn, công thức sản phẩm, danh sách khách hàng, hợp đồng, báo giá mật | Bí mật kinh doanh có thể bị lưu trên máy chủ AI | Chỉ mô tả chung chung: "sản phẩm sấy giòn, phân khúc trung cấp" |
| 3 | **Không dán** tài khoản ngân hàng, mã số thuế, tờ khai, báo cáo tài chính chưa công bố | Rủi ro gian lận, lộ số liệu nhạy cảm | Tự tóm tắt số liệu thành tỷ lệ/phần trăm trước khi hỏi AI |
| 4 | **Không để AI quyết định** nhân sự, lương thưởng, kỷ luật, hay ký thay văn bản pháp lý | AI không chịu trách nhiệm pháp lý, người ký chịu | AI chỉ gợi ý nháp, người có thẩm quyền quyết định và ký |
| 5 | **Không đăng** nội dung do AI tạo ra mà chưa kiểm chứng ra ngoài (báo giá, cam kết chất lượng, bài PR) | AI bịa số liệu/điều luật rất thuyết phục, gửi ra ngoài gây thiệt hại uy tín & pháp lý | Luôn có người kiểm Bước 3 (Chương 6) trước khi gửi/khách hàng thấy |

> **Cách giảm rủi ro thêm:** Vào Settings của ChatGPT → Data Controls → tắt "Improve the model for everyone" nếu bạn không muốn hội thoại mới của mình được dùng để huấn luyện (nhân viên dùng tài khoản cá nhân/Plus/Pro đã xác nhận có toggle này; tài khoản Business/Enterprise mặc định đã loại trừ). Với Gemini, tùy chọn nằm ở phần **Keep Activity / Gemini Apps Activity** của tài khoản Google (khác Gemini cũ là mất lịch sử, bản hiện tại giữ lịch sử nhưng nội dung trong thời gian tắt sẽ không dùng để train, chi tiết theo `myactivity.google.com`).

### 9.2 Hallucination — AI bịa rất giống thật

**Dấu hiệu nhận biết AI đang bịa:**

- Nêu điều luật/nghị định với số hiệu rất cụ thể nhưng bạn tìm trên Google không ra.
- Đưa số liệu thống kê kèm nguồn "theo Tổng cục Thống kê 2024" nhưng không có link hoặc link không tồn tại.
- Trích dẫn lời của một người nổi tiếng mà bạn chưa từng nghe.
- Câu trả lời quá mượt, quá tự tin, không hề nói "tôi không chắc".

**Cách bắt lỗi:**

1. Yêu cầu AI **trích nguồn có link** cho mọi số liệu/điều luật. Không có link → coi như chưa kiểm chứng.
2. Tự tìm lại trên Google hoặc văn bản gốc (với Gemini, yêu cầu "hãy tìm kiếm trên mạng và chỉ trả lời dựa trên kết quả tìm được").
3. Hỏi vặn: *"Bạn có chắc điều luật này tồn tại không? Nếu không chắc, hãy nói 'tôi không chắc'."*

### 9.3 Những việc tuyệt đối không giao cho AI

- Tính lương, quyết định tăng/giảm lương, đánh giá nhân sự để kỷ luật.
- Lập báo cáo tài chính, tờ khai thuế để nộp cơ quan nhà nước.
- Soạn hợp đồng có giá trị pháp lý mà không có người có chuyên môn rà soát.
- Trả lời khách hàng về cam kết chất lượng, hạn sử dụng, chứng nhận — phải dựa trên hồ sơ QC thật.

---

## 10. Thư viện 15 template prompt dùng ngay

> **Cách dùng:** Sao chép prompt, thay phần trong [ngoặc vuông] bằng thông tin thật của bạn, dán vào ChatGPT hoặc Gemini.

### Nhóm A — Hành chính & Nhân sự (3 mẫu)

**A1. Soạn công văn**

> Bạn là trợ lý hành chính. Soạn công văn [số/không số] gửi [đơn vị nhận] về việc [nội dung]. Văn phong trang trọng, dưới [số] chữ, có tiêu đề, kính gửi, nội dung chia 2-3 đoạn, kết thúc và chỗ ký tên. Xưng "Công ty chúng tôi".

**A2. Tóm tắt biên bản họp**

> Tóm tắt biên bản họp đính kèm thành 3 phần: (1) Quyết định chính (tối đa 5 bullet), (2) Bảng Việc cần làm | Người phụ trách | Deadline, (3) Vấn đề chưa chốt. Nếu thiếu deadline, ghi "chưa rõ — cần xác nhận".

**A3. Soạn thông báo nội bộ**

> Soạn thông báo nội bộ gửi toàn công ty về [sự việc], giọng rõ ràng, thân thiện, có tiêu đề, thời gian/địa điểm, yêu cầu cụ thể với nhân viên, và liên hệ khi cần. Dưới 200 chữ.

### Nhóm B — Kế toán & Mua hàng (3 mẫu)

**B1. Email đối chiếu công nợ**

> Bạn là kế toán. Soạn email gửi [nhà cung cấp/khách hàng] [tên] về việc đối chiếu công nợ tháng [tháng], số tiền [số tiền], đề nghị xác nhận trước ngày [deadline]. Giọng lịch sự, chuyên nghiệp, có bảng tóm tắt 3 dòng: Nội dung | Số tiền | Ghi chú. Dưới 180 chữ.

**B2. Giải thích số liệu cho sếp**

> Dưới đây là số liệu [dán bảng Excel]. Hãy viết đoạn giải thích 5-7 câu cho Ban Giám đốc: xu hướng chính là gì, nguyên nhân có thể, và 2 đề xuất. Văn phong súc tích, không dùng thuật ngữ kế toán phức tạp.

**B3. Soạn yêu cầu báo giá (RFQ)**

> Soạn email yêu cầu báo giá gửi [nhà cung cấp] cho [tên hàng] số lượng [số lượng], yêu cầu ghi rõ đơn giá, VAT, thời gian giao, điều kiện thanh toán. Có bảng 4 cột: STT | Tên hàng | Quy cách | Số lượng.

### Nhóm C — Kinh doanh & Marketing (4 mẫu)

**C1. Soạn báo giá**

> Bạn là nhân viên kinh doanh. Soạn báo giá gửi [khách hàng] cho [sản phẩm] số lượng [số lượng], đơn giá [giá], chiết khấu [mức], thời hạn báo giá đến [ngày]. Có bảng báo giá và điều khoản thanh toán/giao hàng. Giọng chuyên nghiệp, dưới 300 chữ.

**C2. Viết bài đăng Facebook/Zalo**

> Bạn là content writer cho thương hiệu trái cây sấy. Viết 3 phương án caption cho sản phẩm [tên sản phẩm] — [đặc điểm nổi bật], mỗi caption 80-120 chữ, kèm 3 hashtag, giọng [trẻ trung/trang trọng], có lời kêu gọi hành động.

**C3. Soạn email chăm sóc khách hàng**

> Soạn email cảm ơn khách hàng [tên] đã mua [sản phẩm], hỏi thăm trải nghiệm, mời đánh giá 5 sao, tặng voucher [mức] cho lần sau. Giọng ấm áp, chân thành, dưới 150 chữ.

**C4. Xử lý khiếu nại**

> Khách hàng phản ánh [nội dung khiếu nại]. Soạn email trả lời: xin lỗi chân thành, nêu nguyên nhân, đề xuất khắc phục [phương án], cam kết thời gian xử lý. Giọng chuyên nghiệp, không đổ lỗi, dưới 200 chữ.

### Nhóm D — QC & Sản xuất (2 mẫu)

**D1. Báo cáo kiểm tra lô hàng**

> Bạn là nhân viên QC. Dựa vào ghi chú kiểm tra sau [dán ghi chú], hãy viết báo cáo kiểm tra lô [mã lô] gồm: Thông tin lô, Kết quả kiểm tra (bảng), Kết luận Đạt/Không đạt, Đề xuất xử lý. Văn phong khách quan, chính xác.

**D2. Viết SOP ngắn gọn**

> Viết SOP (quy trình thao tác chuẩn) cho [công đoạn] gồm: Mục đích, Phạm vi, Các bước thực hiện (đánh số), Lưu ý an toàn. Dưới 350 chữ, dùng bullet và bảng nếu cần.

### Nhóm E — Dùng chung (3 mẫu)

**E1. Tóm tắt tài liệu dài**

> Tóm tắt tài liệu đính kèm thành: (1) Tóm tắt 5 dòng cho Ban Giám đốc, (2) 5 ý chính dạng bullet, (3) 3 việc cần làm tiếp theo. Nếu tài liệu có số liệu, giữ nguyên số liệu gốc.

**E2. Biên tập & sửa lỗi**

> Biên tập lại văn bản sau cho mượt, sửa chính tả và ngữ pháp, thống nhất giọng văn [trang trọng/thân thiện], nhưng GIỮ NGUYÊN số liệu, tên riêng và ý chính. Văn bản: [dán văn bản].

**E3. Tạo dàn ý trước khi viết**

> Tôi cần viết [loại văn bản] về [chủ đề] cho [đối tượng]. Hãy lập dàn ý gồm 4-6 mục, mỗi mục 1 câu mô tả. Đừng viết全文, chỉ dàn ý để tôi duyệt trước.

---

## 11. Lộ trình tự học 30 ngày

> Mỗi ngày 15-20 phút. Đánh dấu ✓ khi hoàn thành.

| Tuần | Mục tiêu | Việc làm mỗi ngày |
|------|----------|-------------------|
| **Tuần 1 — Làm quen** | Gõ prompt ra kết quả dùng được | Ngày 1-2: Đọc Chương 1-4, thử 3 prompt mẫu Chương 10. Ngày 3-4: Soạn 1 email thật bằng AI (áp dụng quy trình 4 bước). Ngày 5-7: Tóm tắt 1 biên bản/1 tài liệu dài bằng AI. |
| **Tuần 2 — Nâng cao** | Dùng 4 kỹ thuật Chương 5 thành thạo | Ngày 8-10: Thử đóng vai + đưa file lên. Ngày 11-12: Thử cho ví dụ (few-shot) với 1 tác vụ của phòng mình. Ngày 13-14: Tạo 1 ảnh minh họa cho bài đăng/slide. |
| **Tuần 3 — Chuyên sâu theo phòng** | Chuẩn hóa 1 template cho phòng mình | Ngày 15-17: Chọn 1 tác vụ lặp lại của phòng, viết template prompt. Ngày 18-20: Dùng template đó 3 lần cho việc thật, ghi lại thời gian tiết kiệm. Ngày 21: Nhờ đồng nghiệp thử template của bạn. |
| **Tuần 4 — An toàn & chia sẻ** | Thành thạo ranh giới đỏ, chia sẻ cho đồng nghiệp | Ngày 22-23: Đọc kỹ Chương 9, tự kiểm tra 3 hội thoại cũ xem có dán dữ liệu cấm không. Ngày 24-26: Hướng dẫn 1 đồng nghiệp chưa biết dùng AI. Ngày 27-30: Tổng kết — viết 1 đoạn 5 dòng: AI đã giúp bạn tiết kiệm bao nhiêu thời gian, việc gì AI làm tốt nhất/dở nhất. |

---

## 12. Hỏi đáp nhanh (FAQ)

**Hỏi: Prompt bằng tiếng Việt có kém hơn tiếng Anh không?**
Đáp: Không có tuyên bố chính thức nào của hãng về việc này, nhưng trong thực tế sử dụng nội bộ, tiếng Việt cho kết quả tốt. Chỉ khi bạn cần AI viết tiếng Anh chuẩn bản xứ (email gửi đối tác nước ngoài), hãy ra lệnh bằng tiếng Anh. Với bài toán logic/pháp lý phức tạp, bạn có thể thử viết phần **hướng dẫn** bằng tiếng Anh và giữ **dữ liệu** tiếng Việt trong nháy ba (`"""`) — kỹ thuật này được nghiên cứu về ngôn ngữ ít tài nguyên khuyến nghị.

**Hỏi: Dùng bản miễn phí có đủ không, có cần mua Plus/Advanced không?**
Đáp: Đủ cho 90% tác vụ văn phòng trong cẩm nang này. Bản trả phí cho phép tải file lớn hơn, tạo ảnh nhiều hơn, và trả lời dài hơn — cân nhắc khi bạn dùng AI hàng ngày và thấy bị giới hạn.

**Hỏi: AI có thay thế nhân viên không?**
Đáp: Không. AI thay thế **phần việc lặp lại** (soạn nháp, tóm tắt, gợi ý), còn **quyết định, kiểm chứng, chịu trách nhiệm** vẫn là con người. Người biết dùng AI sẽ làm nhanh hơn người không biết — đó là lý do bạn học cẩm nang này.

**Hỏi: Tôi lỡ dán dữ liệu nhạy cảm vào AI rồi, làm sao?**
Đáp: Xóa hội thoại đó ngay (ChatGPT: ... → Delete; Gemini: Activity → Delete). Đổi mật khẩu nếu đã dán thông tin đăng nhập. Báo cho quản lý trực tiếp để đánh giá rủi ro. Về sau, luôn dùng dữ liệu giả khi thử prompt.

**Hỏi: ChatGPT và Gemini trả lời khác nhau, tin ai?**
Đáp: Tin **nguồn gốc** mà chúng trích dẫn, không tin lời AI nói suông. Với số liệu/điều luật, hãy yêu cầu cả hai trích link nguồn, rồi tự mở link kiểm chứng. Nếu không có nguồn, coi như chưa kiểm chứng.

**Hỏi: Tạo ảnh bằng AI có vi phạm bản quyền không?**
Đáp: Ảnh AI tạo ra từ prompt chung chung (phong cảnh, vật thể) thường an toàn để dùng nội bộ. Nhưng **đừng** yêu cầu AI bắt chước phong cách của họa sĩ cụ thể, logo thương hiệu, hay nhân vật có bản quyền — có rủi ro pháp lý. Với ảnh dùng ra ngoài (quảng cáo, bao bì), hãy hỏi ý kiến phụ trách marketing/pháp chế.

**Hỏi: Học xong mà vẫn hỏi AI ra kết quả dở thì sao?**
Đáp: 90% là do prompt thiếu 1 trong 5 thành tố (Chương 4). Hãy kiểm tra lại: bạn đã nói rõ vai trò, bối cảnh, nhiệm vụ, ràng buộc, định dạng chưa? Nếu đủ 5 mà vẫn dở, hãy **chia nhỏ** việc lớn thành bước nhỏ (Chương 5, Kỹ thuật 4).

---

## 13. Nguồn tham khảo

Tài liệu này được biên soạn dựa trên các nguồn chính thức sau (truy cập 09/2026):

1. **OpenAI — Prompt engineering best practices for ChatGPT** (help.openai.com, bài 10032626) — hướng dẫn chính thức cho người dùng cuối: *be clear and specific, provide context, avoid ambiguity, build conversationally*.
2. **OpenAI — Prompt engineering guide** (developers.openai.com/api/docs/guides/prompt-engineering) — 6 chiến lược prompt engineering cho API. Trong guide này, mục "Give the model time to 'think'" (chain-of-thought) được ghi rõ **hữu ích hơn cho các model reasoning như o1/o3/GPT-5**, ít cần thiết cho tác vụ văn phòng thông thường.
3. **OpenAI — GPT-5 / GPT-5.1 Prompting Guide** (developers.openai.com Cookbook, 2025) — nhấn mạnh *prompting is iterative; adapt patterns to your workflows; avoid conflicting instructions; metaprompting*. **Không** có khuyến nghị "lead with intent / 3 vòng lặp / đổi chiến lược từ 7/2026" như một số diễn giải suy diễn trên mạng. Nếu dùng GPT-5.1, áp dụng mẫu *Goal/Context/Output/Boundaries* của learn.chatgpt.com (mục 5) thay vì checklist riêng.
4. **OpenAI Academy — Prompting resource** (academy.openai.com) — ví dụ prompt theo vai trò cho người mới.
5. **learn.chatgpt.com/docs/prompting** — triết lý ChatGPT hiện tại: *start in your own words, review, shape with follow-ups; short prompt is often enough; For larger tasks include Goal/Context/Output/Boundaries — Use only the parts that help* (chỉ dùng phần nào thực sự hữu ích, không bắt buộc điền đủ 4 phần).
6. **Google — Gemini prompting guide** (ai.google.dev/gemini-api/docs/prompting-strategies) — khuyên đặt *role/persona* và *output format* ở System Instruction, *always include few-shot examples*, và *break down / chain prompts* cho task phức tạp. **Không** công bố khung cố định "role+context+task+examples+format".
7. **Google AI Essentials & Prompt Design in Vertex AI** (Google Cloud Skills) — cấu trúc khóa học gợi ý cho lộ trình 30 ngày.
8. **Microsoft — Prompt engineering techniques** (learn.microsoft.com, Azure AI Foundry) — tổng hợp kỹ thuật trung lập, hữu ích để đối chiếu.
9. **MIT Sloan EdTech — Effective Prompts for AI: The Essentials** — nguyên tắc *context, specificity, build on conversation*.

> **Ghi chú về pháp lý AI tại Việt Nam (09/2026 — đã hiệu lực):** Ba luật/nội dung chính liên quan đã có hiệu lực, không còn "đang hoàn thiện":
> - **Luật Công nghiệp Công nghệ số 71/2025/QH15** — ký 14/06/2025, hiệu lực **01/01/2026** (trừ Điều 11/28/29 hiệu lực 01/07/2025).
> - **Luật Trí tuệ nhân tạo 134/2025/QH15** — thông qua 10/12/2025 (kỳ họp 10, Quốc hội khóa XV), hiệu lực **01/03/2026** (trừ nội dung Điều 35). Văn bản **yêu cầu quản trị dữ liệu, lưu nhật ký vết (traceability), minh bạch có điều kiện và gắn nhãn nội dung AI** (Điều 11.2–11.4, Điều 14/28/31) và **chỉ cung cấp thông tin/mã nguồn khi cơ quan có thẩm quyền thanh tra** — **không** có nghĩa vụ "công khai nguồn dữ liệu train" đại trà; bí mật kinh doanh/mã nguồn/thuật toán được bảo vệ theo quy định chuyên ngành.
> - **Nghị định 134/2026/NĐ-CP** — ký 06/04/2026, hiệu lực **09/04/2026**, sửa Nghị định 17/2023/NĐ-CP; **Điều 5a (khoản bổ sung bởi Điều 4 NĐ 134/2026)**: **AI không phải tác giả/chủ thể quyền tác giả**; tác phẩm do AI hỗ trợ chỉ được bảo hộ khi có đóng góp sáng tạo đáng kể, mang tính quyết định của con người; bổ sung cơ chế **TDM opt-out (Điều 37b: chủ quyền được bảo lưu bằng tín hiệu máy đọc được)**.
> - Kiểm tra toàn văn tại: `vanban.chinhphu.vn` (134/2025, 134/2026), `thuvienphapluat.vn`, `english.luatvietnam.vn`. Số hiệu **131/2025/QH15** trước đây ghi trong bản nháp là **sai** và đã được đính chính — không trích dẫn. Khi sử dụng AI cho nội dung công bố ra ngoài, tuân thủ thêm **Nghị định 13/2023/NĐ-CP** (bảo vệ dữ liệu cá nhân) và quy chế nội bộ. Cẩm nang được rà soát lại mỗi quý (xem footer phiên bản).

---

# PHẦN RIÊNG — CLAUDE COWORK

> **Chương 14 này tách riêng, không trộn với ChatGPT/Gemini.** Hai công cụ ở Chương 1-13 phục vụ *hỏi đáp và soạn nháp*; Claude Cowork là công cụ khác hẳn về bản chất — **AI tự làm nhiều bước thay bạn**. Đọc chương này nếu bạn được giao dùng Cowork, hoặc muốn hiểu vì sao nó mạnh hơn và cũng rủi ro hơn ChatGPT/Gemini.
> **Toàn bộ nội dung chương này đối chiếu từ tài liệu chính thức của Anthropic** (URL ở mục 14.7). Điểm nào chưa xác minh được với nguồn chính thức sẽ ghi rõ.

---

## 14.1 Claude Cowork là gì

**Claude Cowork** là công cụ của **Anthropic** (hãng sở hữu dòng mô hình Claude). Mô tả chính thức: nó đưa năng lực của Claude Code — một agent tự động — sang **công việc văn phòng**, và *"có thể đảm nhận các tác vụ phức tạp nhiều bước và thực thi thay bạn"*, trả lại kết quả hoàn chỉnh để bạn rà soát.

Hãy dùng phép so sánh này để phân biệt với phần trước của cẩm nang:

| | **ChatGPT / Gemini** (Chương 1-13) | **Claude Cowork** |
|---|---|---|
| Bản chất | Bạn hỏi → nó trả lời **một lần** | Bạn **giao cả việc** → nó tự làm **nhiều bước** rồi trả kết quả |
| Ví dụ | "Soạn email đòi nợ khách A" | "Đọc 12 file công nợ trong thư mục này, tìm khoản quá hạn, soạn email đòi nợ cho từng khoản, lưu vào thư mục `draf-email`" |
| Bạn làm gì | Copy kết quả, dán vào nơi cần | **Xem lại** kết quả agent đã tự làm |
| Sút rủi ro | Sai thì bạn sửa 1 đoạn | **Sai thì sai hàng loạt** — agent đã tự chạy 12 bước |

Vì vậy **mọi nguyên tắc ở Chương 1-13 vẫn áp dụng nguyên vẹn** (công thức hỏi, kiểm sự thật, ẩn dữ liệu), nhưng mức độ cẩn thận phải **cao hơn**, vì Cowork tự hành động chứ không chỉ trả lời.

## 14.2 Cần gì để dùng được — điểm khác biệt quan trọng nhất

Khác ChatGPT và Gemini (bản miễn phí đủ dùng), Cowork **không có trên tài khoản miễn phí**.

- **Yêu cầu gói trả phí.** Theo bảng giá chính thức `claude.com/pricing` (đối chiếu 09/2026): Cowork có từ gói **Pro trở lên** — Pro khoảng **20 USD/tháng** trả theo tháng, hoặc ~17 USD/tháng nếu trả theo năm; **Max** từ ~100 USD/tháng; **Team** ~20-25 USD/người/tháng (bản Standard) và ~100-125 USD/người/tháng (bản Premium); **Enterprise** tính theo số người dùng + mức dùng thực tế.
- **Giá và điều kiện có thể đổi.** Đây là phần xuống cấp nhanh nhất — **kiểm tra lại trang giá trước khi in hoặc trước khi nói "rẻ" với đồng nghiệp.**
- **Máy tính / thiết bị.** Có app Desktop cho **macOS, Windows (cả x64 và arm64), ChromeOS, Linux**. Bản web và mobile đang trong giai đoạn mở rộng dần (beta), quyền truy cập khác nhau theo gói.
- **Muốn cho nó làm việc với file trên máy bạn** thì phải: cài **Claude Desktop app**, mở app, và **tự tay kết nối (connect) thư mục** bạn muốn nó thấy. Web/mobile chỉ làm việc với file đã lưu vào tài khoản.
- **Không cần biết dòng lệnh (command line).** Đây là điểm khác Claude Code: Cowork thiết kế cho người không chuyên kỹ thuật — bạn mô tả mục tiêu bằng ngôn ngữ tự nhiên.

> **Hệ quả thực tế cho An Bình Foods:** vì Cowork **bắt buộc trả phí**, đây **không phải** công cụ mọi nhân viên đều có sẵn như ChatGPT/Gemini. Việc trang bị gói cho ai do lãnh đạo quyết định — đừng tự ứng tiền rồi tính chi phí mà không có phê duyệt bằng văn bản.

## 14.3 Nó chạy ở đâu — hiểu đúng để bảo vệ dữ liệu

Theo tài liệu trợ giúp chính thức của Anthropic:

- **Tác vụ chạy trên môi trường tạm thời, cô lập, đặt trên máy chủ của Anthropic**, tạo ra theo từng phiên và bị xóa sau khi xong. **Phiên trên cloud không truy cập được mạng nội bộ hay máy tính của công ty.**
- **File trên máy bạn**, khi đã kết nối qua Desktop app, **được xử lý trên máy chủ Anthropic** — chứ không phải chỉ quanh quẩn trong máy bạn.
- Claude **chỉ đọc/ghi được trong thư mục bạn đã kết nối**, không tự lan ra nơi khác.
- Bạn **xóa tác vụ bất kỳ lúc nào**; xóa khỏi lịch sử ngay, khỏi hệ thống trong vòng 30 ngày.
- **Không chia sẻ được cả phiên** với đồng nghiệp — chỉ chia sẻ từng kết quả (artifact) riêng lẻ. Một số tính năng chỉ có trên Desktop.

**Về việc dữ liệu có được dùng để huấn luyện mô hình hay không:** trang Trung tâm Quyền riêng tư của Anthropic (phạm vi áp dụng cho tài khoản cá nhân Free/Pro/Max) nêu dữ liệu chỉ được dùng để train khi: (1) bạn **bật/tự nguyện tham gia** tùy chọn cải thiện mô hình, (2) hội thoại bị gắn cờ để rà soát an toàn, hoặc (3) bạn tham gia chương trình như Trusted Tester. Hội thoại ở chế độ **Ẩn danh (Incognito)** được loại trừ kể cả khi đã bật cải thiện mô hình. Phản hồi (thumbs up/down) có thể lưu tới 5 năm.

> ⚠️ **Chưa xác minh được:** trang quyền riêng tư đã đối chiếu **không mô tả** mặc định của tài khoản Team/Enterprise — Anthropic dành một bài riêng cho sản phẩm thương mại. Vì vậy cẩm nang **không khẳng định** "dùng gói công ty thì dữ liệu chắc chắn không bị train". **Người dùng Cowork ở An Bình Foods vẫn phải áp dụng 5 điều cấm (Chương 9) như khi dùng tài khoản cá nhân**, cho tới khi Ban Hành chính xác nhận bằng văn bản từ nguồn chính thức.

## 14.4 Ba chế độ phê duyệt — chọn cái nào

Đây là phần phải hiểu trước khi giao việc cho Cowork. Anthropic mô tả **ba chế độ**:

| Chế độ | Cách hoạt | Khi nào dùng |
|--------|-----------|--------------|
| **Manual — Hỏi trước khi làm** | Dừng lại xin phép ở từng hành động | **Mặc định cho người mới.** Dùng khi bạn chưa tin chắc việc nó sắp làm |
| **Auto — Tự duyệt** | Claude tự rà soát rủi ro (rò rỉ dữ liệu ra ngoài, nội dung web độc hại) và chặn hành động nguy hiểm | Khi bạn đã hiểu tác vụ và tin tưởng phạm vi; **vẫn tốn配额 nhiều hơn** vì có thêm lớp kiểm tra an toàn |
| **Skip — Làm không hỏi** | Không dừng, **không kiểm tra tự động** | **KHÔNG dùng cho việc nhạy cảm.** Chỉ khi bạn tin tưởng tuyệt đối mọi nguồn liên quan |

Hai điểm an toàn tuyệt đối, theo tài liệu chính thức:

- **Xóa file vĩnh viễn luôn cần bạn cho phép rõ ràng**, ở **cả ba** chế độ. Không có chế độ nào cho phép nó tự xóa không hỏi.
- Người dùng **chịu trách nhiệm với mọi hành động Claude thực hiện thay mình**, gồm: nội dung đã đăng ra ngoài, giao dịch mua bán, dữ liệu bị thay đổi, kết quả của tác vụ hẹn giờ, và thao tác trên ứng dụng.

**Khuyến nghị cho nhân viên An Bình Foods: luôn bắt đầu ở Manual.** Chỉ chuyển sang Auto khi đã chạy việc đó vài lần và biết chắc nó sẽ làm gì. Không dùng Skip với công việc liên quan số liệu công ty.

## 14.5 Dùng Cowork cho việc ở An Bình Foods

Cowork mạnh nhất với **công việc nhiều file, lặp lại, có quy trình rõ**. Anthropic minh họa bằng các nhóm: báo cáo định kỳ gộp từ nhiều nguồn, đối chiếu bảng tính theo vùng, rà soát hợp đồng hàng loạt, phân tích ghi chú trao đổi với khách, và tạo spreadsheet/slide/document định dạng sẵn ("bạn nói **cái gì**, không cần nói **làm thế nào**").

Bốn bước của một lần giao việc (**không dùng** công thức 5 thành tố như với ChatGPT — ở đây cái cần là **kết quả cuối cùng**):

```
1. MỤC TIÊU + TIÊU CHÍ ĐẠT   →  nói rõ kết quả phải trông thế nào, cái gì là đạt
2. PHẠM VI                  →  thư mục/những file nào được phép chạm vào
3. CHẾ ĐỘ PHÊ DUYỆT         →  Manual nếu lần đầu làm việc này
4. BẠN RÀ SOÁT              →  xem việc nó đã làm, đối chiếu với file gốc
```

**Ví dụ 1 — Gộp và đối chiếu bảng tính (Kế toán / Kinh doanh)**

> Trong thư mục `Doi chieu/Quy III` có các file báo bán hàng của từng vùng và file ngân sách. Hãy gộp tất cả vào một tab tổng hợp, rồi tạo một tab riêng cho từng vùng. **Gắn cờ mọi khoản chênh lệch quá 5% so với ngân sách.** Với mỗi chỗ bị gắn cờ, ghi rõ tên file gốc và dòng số liệu để tôi tự kiểm. **Chỉnh sửa hoặc xóa file gốc — chỉ tạo file mới.** Chế độ: hỏi tôi trước mỗi hành động ghi file.

Điểm cần để ý trong prompt trên: *"ghi rõ tên file gốc và dòng số liệu để tôi tự kiểm"* — bắt Cowork để dấu vết cho bạn kiểm, giống hệt nguyên tắc "trích nguồn có link" ở Chương 5. Và *"chỉ tạo file mới"* — giữ dữ liệu gốc nguyên vẹn.

**Ví dụ 2 — Soạn bộ email đòi công nợ (Kế toán)**

> Đọc file `cong-no-da-an.txt` (đã ẩn tên khách thật, chỉ còn "Khách A", "Khách B"). Với từng khoản quá hạn 30 ngày, soạn một email đòi nợ giọng lịch sự, có bảng số tiền và hạn trả. **Lưu từng email vào thư mục `draft-email/`, KHÔNG gửi.** Lập bảng: file nào | khách nào | số tiền | ngày gửi dự kiến, để tôi đối chiếu.

> **Vì sao ví dụ này bắt buộc phải "KHÔNG gửi" và dùng tên đã ẩn:** đây đúng là chỗ Cowork khác ChatGPT. ChatGPT chỉ trả lời — bạn chưa paste thì chưa ai nhận gì. Cowork **có thể tự thực hiện hành động**. Nên mọi việc có hệ quả ra bên ngoài (gửi email, cập nhật file thật, đăng bài, đặt hàng) phải **dừng ở bản nháp** để người duyệt.

**Ví dụ 3 — Rà soát hợp đồng nhà cung cấp hàng loạt (Mua hàng / Pháp chế)**

> Thư mục `Hop dong NCC 2026` có 9 hợp đồng. Đối chiếu từng hợp đồng với bảng tiêu chí `checklist-phu-hop.md`: điều khoản thanh toán, thời gian giao, phạt chậm, trách nhiệm chất lượng. Với mỗi hợp đồng, tạo một memo nêu: **điểm lệch so với checklist**, **mức nghiêm trọng (Cao/Trung bình/Thấp)** kèm lý do, và câu chữ đề xuất để đàm phán. **Trích nguyên văn điều khoản và số điều** của từng hợp đồng để pháp chế kiểm lại. Không tự ý kết luận hợp đồng nào "đạt".

Ví dụ này khớp đúng nhóm use case "rà soát hợp đồng hàng loạt" mà Anthropic nêu — và minh họa ranh giới quan trọng: Cowork **lập danh sách điểm lệch để người có chuyên môn quyết**, không tự kết luận.

**Ví dụ 4 — Báo cáo tuần từ nhiều nguồn (Tổ vận hành / Hành chính)**

> Gộp các nguồn sau cho tuần vừa rồi: file ghi chú sản xuất trong `Ghi chú SX/`, biên bản họp trong `Bien ban/`, và danh sách khiếu nại tôi dán bên dưới. Tạo báo cáo: **Tóm tắt 5 dòng cho Ban Giám đốc**, **bảng việc đã xong / đang làm / vướng**, và **3 việc cần Ban Giám đốc quyết**. Sau khi xong, **tự liệt kê những chỗ bạn phải đoán vì thiếu dữ liệu** để tôi bổ sung.

Câu cuối ("liệt kê những chỗ bạn phải đoán") là phiên bản dành cho agent của "3 câu thần chú" ở Chương 5 — tác vụ nhiều bước rất cần nó, vì sai ở bước 2 sẽ lan sang bước 3, 4, 5.

## 14.6 Rủi ro riêng của Cowork — khác với ChatGPT/Gemini

Tài liệu "Dùng Claude Cowork an toàn" của Anthropic nêu rõ Cowork **có rủi ro riêng do bản chất agent và có quyền truy cập internet**. Bốn thứ phải nhớ:

**1. Prompt injection là mối đe dọa chính.** Nguy hiểm xảy ra khi Cowork **đọc nội dung không đáng tin CÙNG LÚC có quyền làm việc hệ quả** (xóa file, chạy lệnh, bấm nút). Nghĩa là một trang web, một file email, một tài liệu chia sẻ có thể chứa dòng chữ disguised-as-instruction để dẫn agent làm bậy.
→ **Cách phòng:** giới hạn quyền duyệt web ở site thật sự cần; cân nhắc kỹ trước khi cài plugin/MCP (chúng mở rộng phạm vi hành động của agent); chặn ứng dụng nhạy cảm khỏi quyền thao tác máy tính.

**2. Nó "thấy" mọi thứ trong ứng dụng đã cấp quyền.** Với chế độ thao tác máy tính, Cowork **xin phép theo từng ứng dụng nhưng không có tường riêng giữa nó và màn hình** — nghĩa là mọi thứ đang hiện trên màn hình của ứng dụng đã cho phép, nó đều nhìn thấy.
→ **Cách phòng:** trước khi bật, đóng mọi cửa sổ có dữ liệu nhạy cảm (bảng lương, hợp đồng, tờ khai).

**3. Sai hàng loạt, không sai một chỗ.** Cowork tách việc lớn thành nhiều phần chạy song song. Prompt mơ hồ thì **lỗi cũng được nhân bản** ra tất cả các phần.
→ **Cách phòng:** lần đầu luôn để Manual; luôn có bước "liệt kê chỗ bạn phải đoán".

**4. Giám sát phạm vi (scope creep) — nhất là tác vụ hẹn giờ.** Bạn có thể đặt lịch để nó tự chạy định kỳ, và nó vẫn chạy khi bạn đóng laptop. **Không có ai giám sát theo thời gian thực.**
→ **Cách phòng:** đừng đặt lịch cho việc liên quan dữ liệu thật của công ty khi chưa chạy tay thành công nhiều lần; theo dõi xem nó có chạm vào tài nguyên bất ngờ không.

**4 điều KHÔNG được tin / KHÔNG được nói với đồng nghiệp** (các tuyên bố này **không có** trong tài liệu Anthropic):

| Tuyên bố hay gặp | Thực tế theo nguồn chính thức |
|------------------|-------------------------------|
| "Chạy hoàn toàn trên máy bạn, dữ liệu không rời khỏi máy" | **Sai.** Tác vụ chạy trong môi trường cô lập trên máy chủ Anthropic; file từ máy bạn cũng được xử lý trên server |
| "Cowork thay được nhân viên" | Không. Đầu ra là **memo/bản nháp để người có chuyên môn rà soát**; bạn chịu trách nhiệm cho mọi hành động nó thay bạn làm |
| "Cứ trả phí là dữ liệu không bao giờ bị train" | **Chưa xác minh được** cho gói Team/Enterprise (bài quyền riêng tư đã đối chiếu chỉ phủ tài khoản cá nhân). Với cá nhân: cần **tự nguyện bật** tùy chọn cải thiện mô hình nó mới dùng để train |
| "Nó tự học và giỏi dần theo thời gian" | Không có mô tả nào về tự học liên phiên — mỗi tác vụ chạy trong môi trường tạm, bị xóa sau phiên |

**Ranh giới pháp lý.** Luật Trí tuệ nhân tạo 134/2025/QH15 **không có chương riêng cho "agentic AI"** — không suy diễn rằng có. Luật điều chỉnh qua khái niệm **hệ thống AI có "các mức độ tự chủ khác nhau, có khả năng tự thích ứng sau triển khai"**, kèm các nguyên tắc: AI **phục vụ con người, không thay thế thẩm quyền và trách nhiệm của con người**; phải **duy trì khả năng con người kiểm soát và can thiệp** với mọi quyết định/hành động của hệ thống AI (Điều 4, Điều 14); phân loại rủi ro theo mức tác động (Điều 9); bên triển khai chịu trách nhiệm bồi thường (Điều 29). **Thực hành đúng tinh thần luật = luôn giữ con người trong vòng duyệt**, tức đúng các mục 14.4 và 14.6 ở trên. Nghị định/tình tư hướng dẫn thi hành: **chưa tra được văn bản hiệu lực tại thời điểm soạn** — cập nhật ở kỳ rà soát quý.

## 14.7 Nguồn cho phần Claude Cowork

Đối chiếu 09/2026. **Trước khi in hoặc giảng, mở lại 4 URL đầu** — tính năng, trạng thái beta và giá đang thay đổi nhanh.

1. **Sản phẩm Claude Cowork** (caïp nhat, dùng lam chuẩn ve use case va kha nang): `claude.com/product/cowork`
2. **Bắt đầu với Claude Cowork** — kiến trúc cloud, quyền thư mục, hạn mức, thiết bị, gói cần: `support.claude.com/en/articles/13345190-get-started-with-claude-cowork`
3. **Dùng Claude Cowork an toàn** — 3 chế độ phê duyệt, prompt injection, trách nhiệm người dùng, phạm vi quyền: `support.claude.com/en/articles/13364135-use-claude-cowork-safely`
4. **Dữ liệu của tôi có dùng để huấn luyện mô hình không** (phạm vi: Free/Pro/Max): `privacy.claude.com/en/articles/10023580-is-my-data-used-for-model-training`
5. **Bảng giá chính thức**: `claude.com/pricing`
6. **Khi nào chọn Cowork, khi nào chọn Chat** (khóa học chính thức): `academy.claude.com/tutorials/choosing-between-claude-cowork-or-chat`
7. **Khóa học "Introduction to Claude Cowork"** (Anthropic, tiếng Anh): `anthropic.skilljar.com/introduction-to-claude-cowork`

> **Ghi chú minh bạch:** **không tìm thấy** thông cáo báo chí chính thức riêng cho Cowork trên trang tin của Anthropic tại thời điểm đối chiếu. Các mốc "ra mắt dưới dạng research preview tháng 01/2026", "GA tháng 04/2026" chỉ thấy trên **báo chí bên thứ ba** — cẩm nang này **không dùng** các mốc đó làm sự kiện đã xác minh, và **không** trích trang hướng dẫn do cộng đồng lập làm nguồn chính thức.

---

**Hết cẩm nang.**

> **Thẻ Prompt bỏ túi (in riêng 1 mặt A4 ép plastic):**
> Mặt trước — Công thức 5 thành tố + 4 kỹ thuật. Mặt sau — Quy trình 4 bước + 5 điều cấm + 3 câu thần chú tự kiểm tra.
> File thiết kế thẻ sẽ đính kèm khi in ấn.

*An Bình Foods — Tài liệu lưu hành nội bộ. Vui lòng không phát tán ra ngoài khi chưa có phê duyệt.*
