#!/usr/bin/env python3
"""Build Word docs for AI training — An Binh Foods (v2.0).

Outputs:
  docs/ai-training/01-cam-nang-su-dung-AI.docx
  docs/ai-training/04-ban-rut-gon.docx
  docs/ai-training/00-ke-hoach-dao-tao-AI.docx

Run: python3 docs/ai-training/build-ai-training-docx.py
"""
import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn, nsdecls
from docx.dml.color import ColorFormat

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_CAM_NANG = os.path.join(ROOT, "01-cam-nang-su-dung-AI.docx")
OUT_RUT_GON = os.path.join(ROOT, "04-ban-rut-gon.docx")
OUT_KE_HOACH = os.path.join(ROOT, "00-ke-hoach-dao-tao-AI.docx")

# Palette
NAVY = RGBColor(0x0F, 0x23, 0x3A)
BLUE = RGBColor(0x25, 0x63, 0xEB)
BLUE_DARK = RGBColor(0x1D, 0x4E, 0xD8)
SLATE_700 = RGBColor(0x33, 0x41, 0x55)
SLATE_500 = RGBColor(0x64, 0x74, 0x8B)
SLATE_400 = RGBColor(0x94, 0xA3, 0xB8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)
GREEN = RGBColor(0x16, 0xA3, 0x4A)
RED = RGBColor(0xEF, 0x44, 0x44)

def hex_to_rgb(h):
    h = h.lstrip("#")
    return RGBColor(int(h[0:2],16), int(h[2:4],16), int(h[4:6],16))

def set_margins(section, top=0.6, bottom=0.6, left=0.7, right=0.7):
    section.top_margin = Inches(top)
    section.bottom_margin = Inches(bottom)
    section.left_margin = Inches(left)
    section.right_margin = Inches(right)
    section.header_distance = Inches(0.3)
    section.footer_distance = Inches(0.3)

def add_horizontal_line(paragraph, color=BLUE, width_pt=1.2):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(int(width_pt * 8)))
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "%02X%02X%02X" % (color[0], color[1], color[2]) if isinstance(color, RGBColor) else color.lstrip("#"))
    pBdr.append(bottom)
    pPr.append(pBdr)

def shade_cell(cell, color_hex):
    tblCell = cell._tc
    tblCellProperties = tblCell.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color_hex.lstrip("#"))
    tblCellProperties.append(shd)

def shade_paragraph(paragraph, color_hex):
    pPr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color_hex.lstrip("#"))
    pPr.append(shd)

def set_cell_margins(cell, top=40, bottom=40, left=80, right=80):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for side, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(val))
        el.set(qn("w:type"), "dxa")
        tcMar.append(el)
    tcPr.append(tcMar)

def add_footer(doc, text):
    section = doc.sections[0]
    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.font.size = Pt(7)
    run.font.color.rgb = SLATE_400
    run.font.name = "Inter"
    # border top
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    top = OxmlElement("w:top")
    top.set(qn("w:val"), "single"); top.set(qn("w:sz"), "4"); top.set(qn("w:space"), "4"); top.set(qn("w:color"), "E2E8F0")
    pBdr.append(top); pPr.append(pBdr)

def style_document(doc):
    style = doc.styles["Normal"]
    style.font.name = "Inter"
    style.font.size = Pt(9.5)
    style.font.color.rgb = SLATE_700
    style.paragraph_format.space_after = Pt(4)
    style.paragraph_format.line_spacing = 1.15
    for i in range(1, 4):
        hs = doc.styles[f"Heading {i}"]
        hs.font.name = "Be Vietnam Pro"
        hs.font.color.rgb = NAVY
        hs.font.bold = True
        if i == 1:
            hs.font.size = Pt(16)
            hs.paragraph_format.space_before = Pt(14)
            hs.paragraph_format.space_after = Pt(6)
        elif i == 2:
            hs.font.size = Pt(12)
            hs.paragraph_format.space_before = Pt(10)
            hs.paragraph_format.space_after = Pt(4)
        else:
            hs.font.size = Pt(10)
            hs.paragraph_format.space_before = Pt(8)
            hs.paragraph_format.space_after = Pt(3)

def p(doc, text, size=9.5, color=SLATE_700, bold=False, italic=False, align=None, space_after=4, bullet=False, name="Inter"):
    para = doc.add_paragraph(style="List Bullet" if bullet else "Normal")
    if align is not None:
        para.alignment = align
    para.paragraph_format.space_after = Pt(space_after)
    run = para.add_run(text)
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.bold = bold
    run.italic = italic
    run.font.name = name
    return para

def p_mixed(doc, parts, align=None, space_after=4, bullet=False):
    """parts: list of (text, dict{size,color,bold,italic,name})"""
    para = doc.add_paragraph(style="List Bullet" if bullet else "Normal")
    if align is not None:
        para.alignment = align
    para.paragraph_format.space_after = Pt(space_after)
    for text, opts in parts:
        run = para.add_run(text)
        run.font.size = Pt(opts.get("size", 9.5))
        if "color" in opts:
            run.font.color.rgb = opts["color"]
        run.bold = opts.get("bold", False)
        run.italic = opts.get("italic", False)
        run.font.name = opts.get("name", "Inter")
    return para

def add_heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    # ensure font
    for run in h.runs:
        run.font.name = "Be Vietnam Pro"
        run.font.color.rgb = NAVY
    return h

def add_callout(doc, title, body, accent=BLUE, bg="#EFF6FF", icon="i"):
    # table 1x1 with left border accent
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(7.1)
    cell = tbl.cell(0, 0)
    shade_cell(cell, bg)
    # left border accent via cell border
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    left = OxmlElement("w:left"); left.set(qn("w:val"), "single"); left.set(qn("w:sz"), "18"); left.set(qn("w:space"), "0"); left.set(qn("w:color"), "%02X%02X%02X" % (accent[0], accent[1], accent[2]))
    for side in ["top","right","bottom","insideH","insideV"]:
        el = OxmlElement(f"w:{side}"); el.set(qn("w:val"), "nil"); tcBorders.append(el)
    tcBorders.append(left); tcPr.append(tcBorders)
    set_cell_margins(cell, top=60, bottom=60, left=120, right=120)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    # content
    pp = cell.paragraphs[0]
    r = pp.add_run(f"  {icon}  {title}")
    r.bold = True; r.font.size = Pt(9); r.font.color.rgb = accent; r.font.name = "Be Vietnam Pro"
    pp2 = cell.add_paragraph()
    r2 = pp2.add_run(body)
    r2.font.size = Pt(8.5); r2.font.color.rgb = SLATE_700; r2.font.name = "Inter"
    pp2.paragraph_format.space_after = Pt(0)
    tbl.rows[0].height_rule = docx.enum.table.WD_ROW_HEIGHT_RULE.AUTO if 'docx' in dir() else None
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def add_table(doc, headers, rows, col_widths=None, header_bg="#0F233A", header_fg="#FFFFFF", zebra=True):
    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.style = "Table Grid"
    if col_widths:
        for i, w in enumerate(col_widths):
            tbl.columns[i].width = Inches(w)
    # header
    for j, h in enumerate(headers):
        cell = tbl.cell(0, j)
        shade_cell(cell, header_bg)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_margins(cell, top=50, bottom=50)
        pp = cell.paragraphs[0]
        pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pp.add_run(h)
        r.bold = True; r.font.size = Pt(7.5); r.font.color.rgb = hex_to_rgb(header_fg); r.font.name = "Be Vietnam Pro"
    # rows
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            cell = tbl.cell(i+1, j)
            if zebra and i % 2 == 1:
                shade_cell(cell, "#F8FAFB")
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell, top=40, bottom=40)
            pp = cell.paragraphs[0]
            r = pp.add_run(str(val))
            r.font.size = Pt(7.8); r.font.color.rgb = SLATE_700; r.font.name = "Inter"
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return tbl

def add_code_block(doc, text, bg="#F1F5F9"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(7.1)
    cell = tbl.cell(0, 0)
    shade_cell(cell, bg)
    set_cell_margins(cell, top=60, bottom=60, left=120, right=120)
    pp = cell.paragraphs[0]
    r = pp.add_run(text)
    r.font.size = Pt(8); r.font.color.rgb = SLATE_700; r.font.name = "Consolas"
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def cover_page(doc, title, subtitle, meta_lines, accent=BLUE):
    # Top accent bar
    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(0)
    run = para.add_run("━" * 80)
    run.font.size = Pt(14); run.font.color.rgb = accent; run.font.name = "Inter"
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    # Logo placeholder
    p(doc, "AN BÌNH FOODS", size=9, color=BLUE, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2, name="Be Vietnam Pro")
    p(doc, "AN BINH FOODS JSC", size=7, color=SLATE_400, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10, name="Inter")
    # Title
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.paragraph_format.space_after = Pt(4)
    run = para.add_run(title)
    run.font.size = Pt(22); run.bold = True; run.font.color.rgb = NAVY; run.font.name = "Be Vietnam Pro"
    para2 = doc.add_paragraph()
    para2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para2.paragraph_format.space_after = Pt(10)
    run2 = para2.add_run(subtitle)
    run2.font.size = Pt(10); run2.font.color.rgb = SLATE_500; run2.font.name = "Inter"; run2.italic = True
    # Meta box
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(5.2)
    cell = tbl.cell(0, 0)
    shade_cell(cell, "#EFF6FF")
    set_cell_margins(cell, top=80, bottom=80, left=140, right=140)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    for idx, line in enumerate(meta_lines):
        pp = cell.paragraphs[0] if idx == 0 else cell.add_paragraph()
        pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pp.add_run(line)
        r.font.size = Pt(7.5); r.font.color.rgb = SLATE_700; r.font.name = "Inter"
        if idx == 0:
            r.bold = True
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    # Bottom accent
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run("━" * 80)
    run.font.size = Pt(14); run.font.color.rgb = accent; run.font.name = "Inter"

# ── Build: Cẩm nang ──
def build_cam_nang():
    doc = Document()
    set_margins(doc.sections[0])
    style_document(doc)
    add_footer(doc, "An Bình Foods  ·  Cẩm nang sử dụng AI cho văn phòng  ·  v1.1 — 09/2026  ·  Review: 12/2026  ·  Lưu hành nội bộ")

    cover_page(doc, "Cẩm nang sử dụng AI", "Cho nhân viên văn phòng  ·  ChatGPT & Gemini (tài khoản cá nhân)",
               ["Tài liệu lưu hành nội bộ  ·  Phiên bản 1.1 — 09/2026", "Đã qua audit đối chiếu nguồn chính thức + pháp luật", "Chủ sở hữu: Ban Hành chính & Chuyển đổi số  ·  Rà soát mỗi quý (kế tiếp 12/2026)"])
    p(doc, "Mỗi chương đều có ví dụ prompt sao chép được — thử ngay trên máy của bạn.", size=8, color=SLATE_500, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)
    add_callout(doc, "Quy ước trong cẩm nang", "Nội dung ghi \"quy ước nội bộ\" là cách An Bình Foods hệ thống hóa cho dễ dạy, KHÔNG phải khuyến nghị chính thức nguyên văn của OpenAI/Google. Nguồn chính thức được dẫn riêng ở Chương 13.", accent=BLUE, bg="#EFF6FF", icon="ⓘ")

    # Mục lục
    add_heading(doc, "Mục lục", level=1)
    toc_items = [
        "1. AI là gì — nói cho dễ hiểu",
        "2. ChatGPT và Gemini — chọn ai khi nào",
        "3. Tư duy đúng trước khi hỏi AI",
        "4. Công thức 5 thành tố của một câu hỏi tốt",
        "5. 4 kỹ thuật khiến AI trả lời hay hơn hẳn",
        "6. Quy trình 4 bước: Người ra ý — AI viết nháp — Người kiểm — AI làm mịn",
        "7. Tạo văn bản: email, báo cáo, biên bản, bài đăng",
        "8. Tạo ảnh: minh họa, slide, bài đăng mạng xã hội",
        "9. 5 điều cấm & cách bắt lỗi AI bịa đặt",
        "10. Thư viện 15 template prompt dùng ngay",
        "11. Lộ trình tự học 30 ngày",
        "12. Hỏi đáp nhanh (FAQ)",
        "13. Nguồn tham khảo",
        "14. [PHẦN RIÊNG] Claude Cowork — giao việc cho AI tự làm nhiều bước",
    ]
    for item in toc_items:
        pp = doc.add_paragraph(style="List Bullet")
        r = pp.add_run(item)
        r.font.size = Pt(8.5); r.font.color.rgb = SLATE_700; r.font.name = "Inter"
        pp.paragraph_format.space_after = Pt(1)

    # Ch1
    add_heading(doc, "1. AI là gì — nói cho dễ hiểu", level=1)
    p(doc, "AI tạo sinh (Generative AI) là chương trình máy tính đã đọc một lượng văn bản và hình ảnh khổng lồ trên internet, rồi học cách đoán chữ tiếp theo sao cho câu trả lời nghe tự nhiên và hữu ích. Hai cái tên bạn sẽ dùng nhiều nhất:")
    p(doc, "ChatGPT (của OpenAI) — mạnh về viết lách, suy luận, làm việc với file.", bullet=True)
    p(doc, "Gemini (của Google) — mạnh về tìm kiếm thông tin mới, làm việc với Google Workspace, và xử lý nhiều loại file cùng lúc.", bullet=True)
    add_callout(doc, "Hình dung dễ nhớ", "AI như một trợ lý thực tập sinh rất chăm, đọc nhiều, gõ nhanh, nhưng chưa có kinh nghiệm thực tế ở công ty bạn. Em ấy soạn nháp rất nhanh, nhưng bạn — người có nghiệp vụ — mới là người quyết định nội dung cuối cùng có đúng và dùng được hay không.", accent=BLUE, bg="#EFF6FF", icon="💡")
    add_heading(doc, "AI giỏi gì", level=2)
    for t in ["Soạn thảo văn bản, tóm tắt, biên tập, dịch thuật.", "Gợi ý ý tưởng, dàn ý, tiêu đề, kịch bản.", "Tạo ảnh minh họa, biểu đồ, slide nháp.", "Giải thích khái niệm, hướng dẫn thao tác Excel/Word."]:
        p(doc, t, bullet=True, size=8.5)
    add_heading(doc, "AI dở gì (và hay bịa ra sao)", level=2)
    for t in ["Bịa số liệu, bịa nguồn, bịa điều luật — nếu hỏi \"Nghị định 123 nói gì?\", AI có thể tự chế điều khoản rất thuyết phục nhưng không tồn tại. Luôn kiểm chứng với văn bản gốc.",
              "Không biết chuyện nội bộ công ty bạn trừ khi bạn cung cấp.",
              "Tính toán đôi khi sai, nhất là phép tính dài, đơn vị đo, quy đổi tiền tệ.",
              "Kiến thức có độ trễ — dù Gemini có thể tìm trên mạng, kết quả vẫn có thể lỗi thời hoặc sai nguồn."]:
        p(doc, t, bullet=True, size=8.5)
    add_callout(doc, "Quy tắc vàng", "AI là người soạn nháp, bạn là người ký duyệt. Mọi con số, tên người, điều luật, ngày tháng do AI đưa ra — hãy kiểm lại trước khi gửi ra ngoài.", accent=AMBER, bg="#FFFBEB", icon="⚠")

    # Ch2
    add_heading(doc, "2. ChatGPT và Gemini — chọn ai khi nào", level=1)
    add_table(doc,
        ["Tiêu chí", "ChatGPT (chatgpt.com)", "Gemini (gemini.google.com)"],
        [
            ["Điểm mạnh nổi bật", "Viết lách mượt, suy luận chặt, làm việc tốt với file Word/Excel/PDF bạn tải lên", "Tìm kiếm thông tin mới trên Google, tóm tắt video YouTube, làm việc mượt với Gmail/Drive/Docs"],
            ["Tạo ảnh", "Tạo ảnh trực tiếp bằng dòng GPT Image (gpt-image-1/1.5/2 — kế nhiệm DALL·E), chỉnh sửa bằng lời", "Tạo ảnh bằng Nano Banana (native của Gemini); Imagen là dòng trên Vertex AI"],
            ["Ghi nhớ thói quen", "Có Memory (nhớ sở thích, cách xưng hô)", "Có Gems (trợ lý chuyên biệt cho tác vụ lặp lại)"],
            ["Bản miễn phí", "Đủ dùng cho hầu hết tác vụ văn phòng", "Đủ dùng; tài khoản Google là dùng được ngay"],
            ["Khi nào dùng", "Soạn email, báo cáo, biên bản, phân tích số liệu, viết bài đăng", "Tìm thông tin mới, kiểm tra giá thị trường, tóm tắt tài liệu dài, tạo ảnh minh họa"],
        ],
        col_widths=[1.4, 2.85, 2.85], header_bg="#0F233A")
    p(doc, "Lời khuyên: Dùng cả hai. Soạn nháp bằng ChatGPT, kiểm chứng thông tin mới bằng Gemini (nhờ Gemini tìm nguồn trên mạng).", size=8, color=SLATE_500, italic=True)
    add_heading(doc, "Đăng ký & đăng nhập (tài khoản cá nhân)", level=2)
    p(doc, "ChatGPT: vào chatgpt.com → Sign up → dùng email cá nhân → xác minh → đăng nhập là dùng được. Tải thêm app ChatGPT trên điện thoại.", bullet=True, size=8.5)
    p(doc, "Gemini: vào gemini.google.com → đăng nhập bằng Gmail → dùng ngay. Trên điện thoại, Gemini có sẵn trong app Google.", bullet=True, size=8.5)
    add_callout(doc, "Lưu ý tài khoản cá nhân", "Mọi thứ bạn dán vào ChatGPT/Gemini bản miễn phí có thể được dùng để cải thiện mô hình (trừ khi bạn tắt trong Settings). Vì vậy tuyệt đối không dán dữ liệu nhạy cảm — xem Chương 9.", accent=RED, bg="#FEF2F2", icon="🔒")

    # Ch3
    add_heading(doc, "3. Tư duy đúng trước khi hỏi AI", level=1)
    p(doc, "Trước khi gõ, trả lời 3 câu hỏi này (30 giây nhưng tiết kiệm 30 phút sửa lại):")
    p(doc, "Tôi muốn AI làm gì cho tôi? (động từ rõ: soạn, tóm tắt, biên tập, gợi ý, dịch, tạo ảnh...)", bullet=True)
    p(doc, "Ai sẽ đọc kết quả này? (sếp, khách hàng, đồng nghiệp, đăng Facebook — mỗi đối tượng cần giọng khác)", bullet=True)
    p(doc, "Kết quả đạt là như thế nào? (độ dài, định dạng, giọng văn, deadline — càng cụ thể càng ít phải sửa)", bullet=True)
    add_table(doc, ["Loại", "Ví dụ"], [
        ["Câu hỏi dở", "\"Viết giúp tôi email gửi khách hàng.\" → AI không biết khách nào, việc gì, giọng ra sao → trả lời chung chung."],
        ["Câu hỏi tốt", "\"Soạn email gửi khách hàng X về việc giao hàng chậm 2 ngày do mưa bão, giọng chân thành, đề xuất bù 5% đơn hàng, khoảng 150 chữ, có tiêu đề.\" → dùng được ngay."],
    ], col_widths=[1.2, 5.9])

    # Ch4
    add_heading(doc, "4. Công thức 5 thành tố của một câu hỏi tốt", level=1)
    p(doc, "Mọi prompt hiệu quả đều có 5 thành tố. Bạn không cần nhớ tên framework — chỉ cần kiểm tra đủ 5 ô trước khi gửi:")
    add_table(doc, ["#", "Thành tố", "Hỏi mình"], [
        ["1", "VAI TRÒ", "AI đóng vai ai?"],
        ["2", "BỐI CẢNH", "Việc này là gì, cho ai, vì sao?"],
        ["3", "NHIỆM VỤ", "Làm gì, động từ rõ ràng"],
        ["4", "RÀNG BUỘC", "Độ dài, giọng văn, điều cấm/không"],
        ["5", "ĐỊNH DẠNG", "Trả về dạng gì (bảng, email, list)"],
    ], col_widths=[0.4, 1.2, 5.5])
    add_heading(doc, "Ví dụ áp dụng đủ 5 thành tố", level=2)
    add_code_block(doc, "Prompt mẫu — Soạn công văn:\n\nBạn là trợ lý hành chính [VAI TRÒ] của công ty sản xuất thực phẩm 200 nhân sự tại Gia Lai [BỐI CẢNH].\nHãy soạn công văn gửi nhà cung cấp bao bì về việc đề nghị báo giá 5.000 túi zip 200g, giao trước 30/09 [NHIỆM VỤ].\nVăn phong trang trọng, ngắn gọn, dưới 250 chữ, không dùng từ suồng sã, xưng \"Công ty chúng tôi\" [RÀNG BUỘC].\nTrả về dạng công văn có tiêu đề, kính gửi, nội dung, kết thúc và chỗ ký tên [ĐỊNH DẠNG].")
    add_heading(doc, "Mẹo tiếng Việt (quy ước nội bộ)", level=2)
    p(doc, "Prompt bằng tiếng Việt cho kết quả tốt với ChatGPT và Gemini trong thực tế sử dụng nội bộ, nhưng không có tuyên bố chính thức nào của OpenAI hay Google so sánh hiệu quả tiếng Việt vs tiếng Anh. Chỉ khi cần viết tiếng Anh chuẩn bản xứ, hãy ra lệnh bằng tiếng Anh. Lỗi phổ biến khi prompt tiếng Việt là viết quá ngắn gọn kiểu chat (\"làm giúp cái báo cáo\") — hãy viết đầy đủ. Nếu muốn kiểm chứng, hãy tự làm A/B test cùng yêu cầu bằng tiếng Việt và tiếng Anh.", size=8.5, color=SLATE_700)
    add_callout(doc, "Minh bạch nguồn", "Không có \"khung 5 thành tố\" chính thức nào do OpenAI hay Google công bố nguyên văn. Đây là quy ước nội bộ của An Bình Foods, tổng hợp từ gợi ý rời rạc của hãng để dễ dạy. Nguồn thật: OpenAI (learn.chatgpt.com/docs/prompting) liệt kê 4 phần — Goal, Context, Output, Boundaries kèm \"Use only the parts that help\"; Google (ai.google.dev) khuyên đặt role/persona và output format ở vị trí ưu tiên. Cẩm nang gộp thành 5 ô cho đầy đủ.", accent=BLUE, bg="#EFF6FF", icon="ⓘ")

    # Ch5
    add_heading(doc, "5. 4 kỹ thuật khiến AI trả lời hay hơn hẳn", level=1)
    add_heading(doc, "Kỹ thuật 1 — Đóng vai (Role)", level=2)
    for t in ["\"Bạn là kế toán trưởng 10 năm kinh nghiệm, hãy rà soát email này xem thiếu chứng từ gì không.\"",
              "\"Bạn là khách hàng khó tính, hãy đọc thử bài giới thiệu sản phẩm và chê thật gắt để tôi sửa.\"",
              "\"Bạn là giảng viên Excel, hãy giải thích VLOOKUP cho người mới bằng ví dụ bán hàng.\""]:
        p(doc, t, bullet=True, size=8.5)
    add_heading(doc, "Kỹ thuật 2 — Đưa ngữ cảnh & tài liệu (Context)", level=2)
    p(doc, "Đừng bắt AI đoán. Dán hoặc tải lên tài liệu thật.", size=8.5)
    p(doc, "Tải file Word/Excel/PDF lên rồi nói: \"Dựa vào file biên bản họp đính kèm, hãy tóm tắt 5 quyết định chính và người phụ trách.\"", bullet=True, size=8.5)
    p(doc, "Dán số liệu: \"Dưới đây là doanh số 6 tháng của 3 dòng [dán bảng] — hãy nhận xét xu hướng và gợi ý 3 hành động.\"", bullet=True, size=8.5)
    p(doc, "Với Gemini, có thể dán link Google Docs/Sheets — Gemini đọc trực tiếp. Với ChatGPT, tải file lên là tiện nhất.", size=8, color=SLATE_500, italic=True)
    add_heading(doc, "Kỹ thuật 3 — Cho ví dụ (Few-shot)", level=2)
    p(doc, "Cho AI 1-2 ví dụ về kết quả bạn muốn, AI sẽ bắt chước rất sát.", size=8.5)
    add_code_block(doc, "\"Tôi muốn AI viết mô tả sản phẩm theo phong cách này.\nVí dụ 1: [dán mô tả mẫu]. Ví dụ 2: [dán mô tả mẫu].\nBây giờ hãy viết mô tả cho: Mít sấy giòn 100g, vị mật ong, không chiên dầu.\"")
    add_heading(doc, "Kỹ thuật 4 — Chia nhỏ & lặp lại (Decompose & Iterate)", level=2)
    p(doc, "Đừng nhồi mọi yêu cầu vào một prompt dài. Chia việc lớn thành bước nhỏ, và lặp lại để mài giũa.", size=8.5)
    p(doc, "Gửi prompt lần 1 → xem kết quả.", bullet=True, size=8.5)
    p(doc, "Nói: \"Giữ nguyên ý, viết lại ngắn hơn 30%, giọng trang trọng hơn.\"", bullet=True, size=8.5)
    p(doc, "Nói: \"Thêm một bảng so sánh 3 phương án vào cuối.\"", bullet=True, size=8.5)
    p(doc, "Nói: \"Bây giờ dịch toàn bộ sang tiếng Anh để gửi đối tác.\"", bullet=True, size=8.5)
    add_callout(doc, "Nguồn kỹ thuật (đã đối chiếu)", "OpenAI API Prompt engineering guide liệt kê provide examples (few-shot), split complex tasks, use iterative refinement như nguyên tắc chung (\"Prompt engineering often requires an iterative approach\"). Gemini Prompt design strategies khuyên always include few-shot examples và break down / chain prompts. Lưu ý: mốc \"đổi khuyến nghị từ 7/2026\" và \"3 vòng lặp\" không có trong guide chính thức và đã được gỡ. RTF/CO-STAR/CRISPE là framework cộng đồng, không phải chuẩn hãng.", accent=SLATE_500, bg="#F8FAFB", icon="📚")
    add_heading(doc, "Câu thần chú để AI tự kiểm tra", level=2)
    p(doc, "Thêm vào cuối prompt một trong các câu sau để AI cẩn thận hơn:", size=8.5)
    for t in ["\"Nếu thiếu thông tin để trả lời chính xác, hãy hỏi lại tôi thay vì đoán.\"",
              "\"Sau khi trả lời, hãy tự đóng vai người phản biện và chỉ ra 3 điểm yếu của chính câu trả lời vừa rồi.\"",
              "\"Hãy trích nguồn cho mọi số liệu và điều luật bạn nêu; nếu không có nguồn, ghi rõ 'chưa kiểm chứng'.\""]:
        p(doc, t, bullet=True, size=8.5)

    # Ch6
    add_heading(doc, "6. Quy trình 4 bước", level=1)
    p(doc, "Quy trình chuẩn cho mọi tác vụ văn bản. In ra dán ở bàn làm việc:", size=9, bold=True)
    add_table(doc, ["Bước", "Ai làm", "Việc", "Thời gian"], [
        ["1", "BẠN", "Ra ý — viết dàn ý bullet: mục đích, đối tượng, 3-5 ý chính, số liệu phải có", "5-10'"],
        ["2", "AI", "Viết nháp — dán dàn ý + prompt 5 thành tố → AI viết bản nháp", "2-3'"],
        ["3", "BẠN ★", "Kiểm sự thật — số liệu đúng? tên đúng? điều luật có thật? giọng hợp người nhận? Sửa trực tiếp.", "10-15'"],
        ["4", "AI", "Làm mịn — \"Biên tập mượt, sửa chính tả, giữ nguyên số liệu tôi đã sửa\"", "2-3'"],
    ], col_widths=[0.6, 0.8, 4.9, 0.8])
    add_callout(doc, "Tuyệt đối không bỏ Bước 3", "Gửi văn bản do AI viết mà chưa kiểm chứng số liệu/điều luật là lỗi nghiêm trọng — người ký chịu trách nhiệm, không phải AI.", accent=RED, bg="#FEF2F2", icon="⛔")
    add_heading(doc, "Checklist \"review trước khi gửi\" (5 mục)", level=2)
    for t in ["Số liệu đúng chưa?", "Tên người/đơn vị đúng chưa?", "Điều luật/văn bản có tồn tại không?", "Giọng văn hợp người nhận chưa?", "Còn dữ liệu nhạy cảm nào lộ không?"]:
        p(doc, t, bullet=True, size=8.5)

    # Ch7
    add_heading(doc, "7. Tạo văn bản: email, báo cáo, biên bản, bài đăng", level=1)
    add_heading(doc, "7.1 Soạn email", level=2)
    add_code_block(doc, "Prompt mẫu — Email xin lỗi giao hàng chậm:\n\nBạn là nhân viên kinh doanh của công ty thực phẩm sấy khô.\nSoạn email gửi khách hàng là siêu thị tại TP.HCM về việc đơn hàng 500kg chuối sấy giao chậm 2 ngày do mưa bão.\nGiọng chân thành, chuyên nghiệp, đề xuất bù 5% giá trị đơn sau. 150-180 chữ, có tiêu đề, lời chào, cảm ơn, chữ ký.")
    add_heading(doc, "7.2 Tóm tắt biên bản họp", level=2)
    add_code_block(doc, "Tải file biên bản lên rồi prompt:\n\"Tóm tắt thành 3 phần: (1) Quyết định chính (5 bullet), (2) Việc cần làm — ai làm — deadline (bảng 3 cột), (3) Vấn đề chưa chốt cần họp lại.\nNếu thiếu deadline, ghi 'chưa rõ — cần xác nhận'.\"")
    add_heading(doc, "7.3 Viết báo cáo tuần/tháng", level=2)
    add_code_block(doc, "\"Bạn là trợ lý hành chính. Dựa vào ghi chú sau [dán], hãy viết báo cáo tuần cho Ban Giám đốc, gồm: Tiêu đề, Tóm tắt 3 dòng, Kết quả (bullet), Khó khăn, Đề xuất. Trang trọng, dưới 400 chữ.\"")
    add_heading(doc, "7.4 Viết bài đăng Facebook/Zalo", level=2)
    add_code_block(doc, "\"Bạn là content writer cho thương hiệu trái cây sấy. Viết 3 phương án caption cho Mít sấy giòn 100g — vị mật ong, không chiên dầu, mỗi caption 80-120 chữ, kèm 3 hashtag, giọng trẻ trung nhưng không sến, có CTA. Cuối mỗi caption thêm gợi ý hình ảnh.\"")
    add_heading(doc, "7.5 Dịch thuật", level=2)
    add_code_block(doc, "\"Dịch email sau sang tiếng Anh thương mại, giọng lịch sự, giữ nguyên số liệu và tên riêng. Sau bản dịch, liệt kê 3 cụm từ quan trọng bạn đã chọn và giải thích.\"")

    # Ch8
    add_heading(doc, "8. Tạo ảnh: minh họa, slide, bài đăng mạng xã hội", level=1)
    add_heading(doc, "8.1 Cấu trúc prompt tạo ảnh", level=2)
    p(doc, "Quy ước nội bộ để dễ nhớ (không phải spec chính thức của hãng):", size=8, color=SLATE_500, italic=True)
    add_code_block(doc, "[Chủ thể chính] + [hành động/bối cảnh] + [phong cách] + [ánh sáng/màu] + [tỷ lệ khung hình] + [chi tiết loại trừ]")
    add_heading(doc, "Ví dụ prompt ảnh tốt", level=2)
    add_code_block(doc, "\"Ảnh chụp túi mít sấy giòn 100g trên bàn gỗ sáng, cạnh vài lát mít tươi và lọ mật ong nhỏ, phong cách tối giản hiện đại, ánh sáng tự nhiên ấm, nền mờ nhẹ, tỷ lệ 4:5, không chữ trên bao bì, không người trong ảnh.\"")
    p(doc, "Ví dụ prompt dở (để tránh): \"Tạo ảnh mít sấy đẹp\" → chung chung, AI cho ra ảnh ngẫu nhiên, khó dùng.", size=8.5, color=SLATE_500, italic=True)
    add_heading(doc, "8.2 Mẹo thực tế cho dân văn phòng", level=2)
    p(doc, "Tỷ lệ khung hình: Gemini (ai.google.dev) hỗ trợ 16:9 cho slide, 1:1 cho bài vuông, 4:5 cho ảnh dọc và nhiều tỷ lệ khác; với OpenAI, 4:5 không có dạng native mà phải crop. Khi prompt, nêu rõ tỷ lệ mong muốn.", bullet=True, size=8.5)
    p(doc, "Chữ trong ảnh: theo thực tế sử dụng và phản ánh cộng đồng, chữ tiếng Việt vẫn hay sai — lỗi tăng khi trên ~20 từ. Ngưỡng \"20 từ\" không phải thông số chính thức của hãng, chỉ là kinh nghiệm cộng đồng. Nếu cần chữ, tạo ảnh không chữ rồi ghép chữ bằng Canva/PowerPoint.", bullet=True, size=8.5)
    p(doc, "Logo & bao bì thật: đừng yêu cầu AI tạo lại logo — AI sẽ bịa ra bản gần giống nhưng sai. Dùng ảnh chụp thật, chỉ nhờ AI tạo bối cảnh xung quanh. Model hiện nay: gpt-image-1/1.5/2 (kế nhiệm DALL·E); Nano Banana (Gemini native) tách biệt Imagen (Vertex AI).", bullet=True, size=8.5)
    p(doc, "Chỉnh sửa bằng lời: sau khi có ảnh, nói \"Giữ nguyên bố cục, đổi nền thành be sáng, thêm đĩa tre nhỏ bên cạnh.\" — cả ChatGPT và Gemini đều hiểu.", bullet=True, size=8.5)
    add_heading(doc, "8.3 Use case phù hợp cho An Bình Foods", level=2)
    add_table(doc, ["Nhu cầu", "Gợi ý prompt"], [
        ["Ảnh minh họa Facebook", "\"Vườn mít chín vàng ở Tây Nguyên, nắng sớm, phong cách ảnh thực tế, ấm áp, không người\""],
        ["Hình nền slide", "\"Nền trừu tượng xanh lá nhạt và be, họa tiết lá nhiệt đới mờ, tối giản, chừa khoảng trống cho chữ\""],
        ["Minh họa SOP", "\"Sơ đồ 4 bước sấy mít: sơ chế → tẩm vị → sấy → đóng gói, phong cách infographic phẳng, màu xanh-vàng\""],
        ["Mockup bao bì (nội bộ)", "\"Ý tưởng bao bì túi đứng 200g cho chuối sấy, tông vàng nâu, có cửa sổ trong suốt — CHỈ DÙNG NỘI BỘ\""],
    ], col_widths=[1.8, 5.3])
    add_callout(doc, "Ranh giới đỏ với ảnh AI (quy định nội bộ, có viện dẫn)", "Theo Usage Policies của OpenAI/Google (cấm nội dung gây hiểu lầm) và quy định pháp luật về nhãn mác/quảng cáo, ảnh AI không dùng làm bao bì chính thức, chứng nhận chất lượng, hay quảng cáo cam kết thành phần/xuất xứ. Nếu dùng ảnh AI cho truyền thông nội bộ/mạng xã hội, ghi \"Ảnh minh họa AI\" để minh bạch.", accent=AMBER, bg="#FFFBEB", icon="⚠")

    # Ch9
    add_heading(doc, "9. 5 điều cấm & cách bắt lỗi AI bịa đặt", level=1)
    add_heading(doc, "9.1 5 điều cấm khi dùng tài khoản cá nhân", level=2)
    add_table(doc, ["#", "Cấm", "Vì sao", "Làm thay thế"], [
        ["1", "Không dán họ tên + CCCD, lương, HĐLĐ, sức khỏe NV", "Rò rỉ dữ liệu cá nhân, vi phạm pháp luật", "Dùng tên giả \"Anh A\", che số CCCD"],
        ["2", "Không dán giá vốn, công thức, DS khách hàng, HĐ/báo giá mật", "Bí mật kinh doanh có thể bị lưu", "Mô tả chung: \"sấy giòn, phân khúc trung cấp\""],
        ["3", "Không dán TK ngân hàng, MST, tờ khai, BCTC chưa công bố", "Rủi ro gian lận, lộ số liệu", "Tóm tắt thành tỷ lệ/% trước khi hỏi AI"],
        ["4", "Không để AI quyết định nhân sự, lương, kỷ luật, ký thay VB pháp lý", "AI không chịu trách nhiệm, người ký chịu", "AI chỉ gợi ý nháp, người quyết định & ký"],
        ["5", "Không đăng ra ngoài nội dung AI tạo chưa kiểm chứng", "AI bịa rất thuyết phục, gây thiệt hại uy tín & pháp lý", "Luôn kiểm Bước 3 trước khi gửi"],
    ], col_widths=[0.35, 2.2, 2.2, 2.35])
    add_callout(doc, "Cách giảm rủi ro thêm", "ChatGPT: Settings → Data controls → tắt \"Improve the model for everyone\" (chỉ ảnh hưởng hội thoại sau khi tắt; Business/Enterprise mặc định đã loại trừ). Gemini: quản lý qua trang activity của tài khoản Google (Keep Activity / Gemini Apps Activity).", accent=BLUE, bg="#EFF6FF", icon="🔒")
    add_heading(doc, "9.2 Hallucination — AI bịa rất giống thật", level=2)
    p(doc, "Dấu hiệu nhận biết AI đang bịa:", size=9, bold=True)
    for t in ["Nêu điều luật/nghị định rất cụ thể nhưng tìm Google không ra.",
              "Đưa số liệu \"theo Tổng cục Thống kê 2024\" nhưng không có link tồn tại.",
              "Trích dẫn lời người nổi tiếng bạn chưa từng nghe.",
              "Câu trả lời quá mượt, quá tự tin, không hề nói \"tôi không chắc\"."]:
        p(doc, t, bullet=True, size=8.5)
    p(doc, "Cách bắt lỗi:", size=9, bold=True)
    p(doc, "Yêu cầu AI trích nguồn có link cho mọi số liệu/điều luật. Không có link → coi như chưa kiểm chứng.", bullet=True, size=8.5)
    p(doc, "Tự tìm lại trên Google hoặc văn bản gốc (với Gemini, yêu cầu \"hãy tìm trên mạng và chỉ trả lời dựa trên kết quả\").", bullet=True, size=8.5)
    p(doc, "Hỏi vặn: \"Bạn có chắc điều luật này tồn tại không? Nếu không chắc, hãy nói 'tôi không chắc'.\"", bullet=True, size=8.5)
    add_heading(doc, "9.3 Những việc tuyệt đối không giao cho AI", level=2)
    for t in ["Tính lương, quyết định tăng/giảm lương, đánh giá nhân sự để kỷ luật.",
              "Lập báo cáo tài chính, tờ khai thuế để nộp cơ quan nhà nước.",
              "Soạn hợp đồng có giá trị pháp lý mà không có chuyên môn rà soát.",
              "Trả lời khách hàng về cam kết chất lượng, hạn sử dụng, chứng nhận — phải dựa trên hồ sơ QC thật."]:
        p(doc, t, bullet=True, size=8.5)

    # Ch10
    add_heading(doc, "10. Thư viện 15 template prompt dùng ngay", level=1)
    p(doc, "Cách dùng: sao chép prompt, thay phần trong [ngoặc vuông] bằng thông tin thật, dán vào ChatGPT hoặc Gemini.", size=8, color=SLATE_500, italic=True)
    def template_group(title, items):
        add_heading(doc, title, level=2)
        for code, text in items:
            para = doc.add_paragraph()
            run = para.add_run(code + "  ")
            run.bold = True; run.font.size = Pt(8.5); run.font.color.rgb = BLUE; run.font.name = "Be Vietnam Pro"
            para.paragraph_format.space_after = Pt(1)
            add_code_block(doc, text)
    template_group("Nhóm A — Hành chính & Nhân sự (3 mẫu)", [
        ("A1. Soạn công văn", "Bạn là trợ lý hành chính. Soạn công văn [số/không số] gửi [đơn vị nhận] về việc [nội dung]. Văn phong trang trọng, dưới [số] chữ, có tiêu đề, kính gửi, nội dung 2-3 đoạn, kết thúc và chỗ ký tên. Xưng \"Công ty chúng tôi\"."),
        ("A2. Tóm tắt biên bản họp", "Tóm tắt biên bản họp đính kèm thành 3 phần: (1) Quyết định chính (5 bullet), (2) Bảng Việc | Người phụ trách | Deadline, (3) Vấn đề chưa chốt. Thiếu deadline → \"chưa rõ — cần xác nhận\"."),
        ("A3. Soạn thông báo nội bộ", "Soạn thông báo nội bộ gửi toàn công ty về [sự việc], giọng rõ ràng, thân thiện, có tiêu đề, thời gian/địa điểm, yêu cầu cụ thể, liên hệ khi cần. Dưới 200 chữ."),
    ])
    template_group("Nhóm B — Kế toán & Mua hàng (3 mẫu)", [
        ("B1. Email đối chiếu công nợ", "Bạn là kế toán. Soạn email gửi [NCC/khách hàng] [tên] về đối chiếu công nợ tháng [tháng], số tiền [số tiền], đề nghị xác nhận trước [deadline]. Giọng lịch sự, có bảng 3 dòng: Nội dung | Số tiền | Ghi chú. Dưới 180 chữ."),
        ("B2. Giải thích số liệu cho sếp", "Dưới đây là số liệu [dán bảng Excel]. Viết 5-7 câu cho BGĐ: xu hướng chính, nguyên nhân có thể, 2 đề xuất. Văn phong súc tích, không dùng thuật ngữ kế toán phức tạp."),
        ("B3. Soạn yêu cầu báo giá (RFQ)", "Soạn email yêu cầu báo giá gửi [NCC] cho [tên hàng] số lượng [số lượng], yêu cầu ghi rõ đơn giá, VAT, thời gian giao, điều kiện thanh toán. Bảng 4 cột: STT | Tên hàng | Quy cách | Số lượng."),
    ])
    template_group("Nhóm C — Kinh doanh & Marketing (4 mẫu)", [
        ("C1. Soạn báo giá", "Bạn là NVKD. Soạn báo giá gửi [khách hàng] cho [sản phẩm] số lượng [số lượng], đơn giá [giá], chiết khấu [mức], hạn đến [ngày]. Có bảng báo giá và điều khoản thanh toán/giao hàng. Dưới 300 chữ."),
        ("C2. Viết bài đăng Facebook/Zalo", "Bạn là content writer cho trái cây sấy. Viết 3 caption cho [tên SP] — [đặc điểm], mỗi caption 80-120 chữ, kèm 3 hashtag, giọng [trẻ trung/trang trọng], có CTA."),
        ("C3. Email chăm sóc khách hàng", "Soạn email cảm ơn [tên] đã mua [sản phẩm], hỏi thăm trải nghiệm, mời đánh giá 5 sao, tặng voucher [mức] cho lần sau. Ấm áp, chân thành, dưới 150 chữ."),
        ("C4. Xử lý khiếu nại", "Khách phản ánh [nội dung]. Soạn email trả lời: xin lỗi chân thành, nêu nguyên nhân, đề xuất khắc phục [phương án], cam kết thời gian xử lý. Không đổ lỗi, dưới 200 chữ."),
    ])
    template_group("Nhóm D — QC & Sản xuất (2 mẫu)", [
        ("D1. Báo cáo kiểm tra lô hàng", "Bạn là NV QC. Dựa vào ghi chú sau [dán], viết báo cáo kiểm tra lô [mã lô] gồm: Thông tin lô, Kết quả (bảng), Kết luận Đạt/Không đạt, Đề xuất. Văn phong khách quan."),
        ("D2. Viết SOP ngắn gọn", "Viết SOP cho [công đoạn] gồm: Mục đích, Phạm vi, Các bước (đánh số), Lưu ý an toàn. Dưới 350 chữ, dùng bullet và bảng nếu cần."),
    ])
    template_group("Nhóm E — Dùng chung (3 mẫu)", [
        ("E1. Tóm tắt tài liệu dài", "Tóm tắt tài liệu đính kèm thành: (1) Tóm tắt 5 dòng cho BGĐ, (2) 5 ý chính (bullet), (3) 3 việc cần làm. Giữ nguyên số liệu gốc."),
        ("E2. Biên tập & sửa lỗi", "Biên tập văn bản sau cho mượt, sửa chính tả, thống nhất giọng [trang trọng/thân thiện], nhưng GIỮ NGUYÊN số liệu, tên riêng và ý chính. Văn bản: [dán]."),
        ("E3. Tạo dàn ý trước khi viết", "Tôi cần viết [loại văn bản] về [chủ đề] cho [đối tượng]. Hãy lập dàn ý 4-6 mục, mỗi mục 1 câu. Đừng viết全文, chỉ dàn ý để tôi duyệt."),
    ])

    # Ch11
    add_heading(doc, "11. Lộ trình tự học 30 ngày", level=1)
    p(doc, "Mỗi ngày 15-20 phút. Đánh dấu ✓ khi hoàn thành.", size=8, color=SLATE_500, italic=True)
    add_table(doc, ["Tuần", "Mục tiêu", "Việc làm mỗi ngày"], [
        ["Tuần 1\nLàm quen", "Gõ prompt ra kết quả dùng được", "Ngày 1-2: Đọc Chương 1-4, thử 3 prompt Chương 10.\nNgày 3-4: Soạn 1 email thật bằng AI (quy trình 4 bước).\nNgày 5-7: Tóm tắt 1 biên bản/tài liệu dài."],
        ["Tuần 2\nNâng cao", "Dùng 4 kỹ thuật thành thạo", "Ngày 8-10: Thử đóng vai + đưa file lên.\nNgày 11-12: Thử cho ví dụ (few-shot) với việc của phòng mình.\nNgày 13-14: Tạo 1 ảnh minh họa."],
        ["Tuần 3\nChuyên sâu", "Chuẩn hóa 1 template cho phòng", "Ngày 15-17: Chọn tác vụ lặp lại, viết template.\nNgày 18-20: Dùng template 3 lần, ghi giờ tiết kiệm.\nNgày 21: Nhờ đồng nghiệp thử template của bạn."],
        ["Tuần 4\nAn toàn", "Thành thạo ranh giới đỏ, chia sẻ", "Ngày 22-23: Đọc Chương 9, kiểm tra 3 hội thoại cũ.\nNgày 24-26: Hướng dẫn 1 đồng nghiệp chưa biết AI.\nNgày 27-30: Tổng kết 5 dòng: tiết kiệm bao nhiêu giờ, việc gì tốt/dở nhất."],
    ], col_widths=[1.0, 1.7, 4.4])

    # Ch12
    add_heading(doc, "12. Hỏi đáp nhanh (FAQ)", level=1)
    faqs = [
        ("Prompt bằng tiếng Việt có kém hơn tiếng Anh không?", "Không có tuyên bố chính thức nào của hãng về việc này, nhưng trong thực tế dùng nội bộ, tiếng Việt cho kết quả tốt. Chỉ khi cần viết tiếng Anh chuẩn bản xứ (email đối tác nước ngoài), hãy ra lệnh bằng tiếng Anh. Với bài toán logic/pháp lý phức tạp, có thể thử viết phần hướng dẫn bằng tiếng Anh và giữ dữ liệu tiếng Việt trong \"\"\" — kỹ thuật được nghiên cứu về ngôn ngữ ít tài nguyên khuyến nghị."),
        ("Dùng bản miễn phí có đủ không?", "Đủ cho 90% tác vụ trong cẩm nang. Bản trả phí cho phép tải file lớn hơn, tạo ảnh nhiều hơn, trả lời dài hơn — cân nhắc khi dùng AI hàng ngày và thấy bị giới hạn."),
        ("AI có thay thế nhân viên không?", "Không. AI thay thế phần việc lặp lại (soạn nháp, tóm tắt, gợi ý), còn quyết định, kiểm chứng, chịu trách nhiệm vẫn là con người. Người biết dùng AI sẽ làm nhanh hơn người không biết."),
        ("Lỡ dán dữ liệu nhạy cảm vào AI rồi, làm sao?", "Xóa hội thoại ngay (ChatGPT: ... → Delete; Gemini: Activity → Delete). Đổi mật khẩu nếu đã dán thông tin đăng nhập. Báo quản lý trực tiếp. Về sau luôn dùng dữ liệu giả khi thử prompt."),
        ("ChatGPT và Gemini trả lời khác nhau, tin ai?", "Tin nguồn gốc mà chúng trích dẫn, không tin lời nói suông. Với số liệu/điều luật, yêu cầu cả hai trích link nguồn, rồi tự mở link kiểm chứng. Không có nguồn → coi như chưa kiểm chứng."),
        ("Tạo ảnh bằng AI có vi phạm bản quyền không?", "Ảnh từ prompt chung chung (phong cảnh, vật thể) thường an toàn nội bộ. Đừng bắt AI bắt chước phong cách họa sĩ cụ thể, logo thương hiệu, hay nhân vật có bản quyền. Với ảnh dùng ra ngoài (quảng cáo, bao bì), hỏi marketing/pháp chế."),
        ("Hỏi AI ra kết quả dở thì sao?", "90% do prompt thiếu 1 trong 5 thành tố (Chương 4). Kiểm tra: đã rõ vai trò, bối cảnh, nhiệm vụ, ràng buộc, định dạng chưa? Nếu đủ 5 mà vẫn dở, hãy chia nhỏ việc lớn thành bước nhỏ (Chương 5, Kỹ thuật 4)."),
    ]
    for q, a in faqs:
        para = doc.add_paragraph()
        r = para.add_run("Hỏi: " + q)
        r.bold = True; r.font.size = Pt(9); r.font.color.rgb = NAVY; r.font.name = "Be Vietnam Pro"
        para.paragraph_format.space_after = Pt(1)
        para2 = doc.add_paragraph()
        r2 = para2.add_run("Đáp: " + a)
        r2.font.size = Pt(8.5); r2.font.color.rgb = SLATE_700; r2.font.name = "Inter"
        para2.paragraph_format.space_after = Pt(6)

    # Ch13
    add_heading(doc, "13. Nguồn tham khảo", level=1)
    p(doc, "Tài liệu được biên soạn dựa trên các nguồn chính thức sau (truy cập 09/2026):", size=8.5)
    sources = [
        "OpenAI — Prompt engineering best practices for ChatGPT (help.openai.com, bài 10032626) — be clear and specific, provide context, avoid ambiguity, build conversationally.",
        "OpenAI — Prompt engineering guide (developers.openai.com/api/docs/guides/prompt-engineering) — 6 chiến lược; mục \"Give the model time to 'think'\" (chain-of-thought) hữu ích hơn cho model reasoning (o1/o3/GPT-5), ít cần thiết cho tác vụ văn phòng thường.",
        "OpenAI — GPT-5 / GPT-5.1 Prompting Guide (developers.openai.com Cookbook, 2025) — prompting is iterative; adapt patterns to your workflows; avoid conflicting instructions; metaprompting. Không có khuyến nghị \"lead with intent / 3 vòng lặp / đổi chiến lược từ 7/2026\".",
        "OpenAI Academy — Prompting resource (academy.openai.com) — ví dụ prompt theo vai trò cho người mới.",
        "learn.chatgpt.com/docs/prompting — start in your own words, review, shape with follow-ups; short prompt is often enough; For larger tasks include Goal/Context/Output/Boundaries — Use only the parts that help.",
        "Google — Gemini prompting guide (ai.google.dev/gemini-api/docs/prompting-strategies) — đặt role/persona và output format ở System Instruction, always include few-shot examples, break down / chain prompts. Không công bố khung cố định \"role+context+task+examples+format\".",
        "Google AI Essentials & Prompt Design in Vertex AI (Google Cloud Skills) — cấu trúc khóa học gợi ý cho lộ trình 30 ngày.",
        "Microsoft — Prompt engineering techniques (learn.microsoft.com, Azure AI Foundry) — tổng hợp kỹ thuật trung lập.",
        "MIT Sloan EdTech — Effective Prompts for AI: The Essentials — context, specificity, build on conversation.",
    ]
    for idx, s in enumerate(sources, 1):
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Inches(0.2)
        para.paragraph_format.space_after = Pt(2)
        r = para.add_run(f"{idx}. {s}")
        r.font.size = Pt(7.5); r.font.color.rgb = SLATE_500; r.font.name = "Inter"
    add_callout(doc, "Ghi chú pháp lý AI tại Việt Nam (09/2026 — đã hiệu lực)",
        "Luật Công nghiệp Công nghệ số 71/2025/QH15 — ký 14/06/2025, hiệu lực 01/01/2026 (trừ Điều 11/28/29 hiệu lực 01/07/2025).  "
        "Luật Trí tuệ nhân tạo 134/2025/QH15 — thông qua 10/12/2025, hiệu lực 01/03/2026 (trừ Điều 35); yêu cầu quản trị dữ liệu, lưu nhật ký vết, minh bạch có điều kiện và gắn nhãn nội dung AI (Điều 11.2-11.4, 14/28/31) và chỉ cung cấp thông tin/mã nguồn khi cơ quan thẩm quyền thanh tra — không có nghĩa vụ công khai nguồn dữ liệu train đại trà.  "
        "Nghị định 134/2026/NĐ-CP — ký 06/04/2026, hiệu lực 09/04/2026, sửa NĐ 17/2023; Điều 5a (bổ sung bởi Điều 4): AI không phải tác giả; tác phẩm do AI hỗ trợ chỉ được bảo hộ khi có đóng góp sáng tạo đáng kể, mang tính quyết định của con người; TDM opt-out (Điều 37b).  "
        "Tra toàn văn: vanban.chinhphu.vn, thuvienphapluat.vn, english.luatvietnam.vn. Số hiệu 131/2025/QH15 ghi trong bản nháp là sai và đã đính chính. Tuân thủ thêm NĐ 13/2023/NĐ-CP (dữ liệu cá nhân). Rà soát mỗi quý.",
        accent=NAVY, bg="#F8FAFB", icon="⚖")

    # ═══ PHẦN RIÊNG — CH14 CLAUDE COWORK ═══
    doc.add_page_break()
    p(doc, "PHẦN RIÊNG — CLAUDE COWORK", size=15, color=BLUE_DARK, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2, name="Be Vietnam Pro")
    p(doc, "Chương 14 tách riêng, không trộn với ChatGPT/Gemini. Hai công cụ ở Chương 1-13 phục vụ hỏi đáp và soạn nháp; Claude Cowork là công cụ khác hẳn về bản chất — AI tự làm nhiều bước thay bạn. Đọc chương này nếu bạn được giao dùng Cowork, hoặc muốn hiểu vì sao nó mạnh hơn và cũng rủi ro hơn.", size=8, color=SLATE_500, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)
    add_callout(doc, "Toàn bộ nội dung chương này đối chiếu từ tài liệu chính thức của Anthropic", "URL ở mục 14.7. Điểm nào chưa xác minh được với nguồn chính thức sẽ ghi rõ ngay trong văn bản.", accent=BLUE, bg="#EFF6FF", icon="ⓘ")

    add_heading(doc, "14.1 Claude Cowork là gì", level=2)
    p(doc, "Claude Cowork là công cụ của Anthropic (hãng sở hữu dòng mô hình Claude). Mô tả chính thức: nó đưa năng lực của Claude Code — một agent tự động — sang công việc văn phòng, và \"có thể đảm nhận các tác vụ phức tạp nhiều bước và thực thi thay bạn\", trả lại kết quả hoàn chỉnh để bạn rà soát.", size=8.5)
    add_table(doc, ["", "ChatGPT / Gemini (Chương 1-13)", "Claude Cowork"], [
        ["Bản chất", "Bạn hỏi → nó trả lời MỘT LẦN", "Bạn GIAO CẢ VIỆC → nó tự làm NHIỀU BƯỚC rồi trả kết quả"],
        ["Ví dụ", "\"Soạn email đòi nợ khách A\"", "\"Đọc 12 file công nợ trong thư mục này, tìm khoản quá hạn, soạn email đòi nợ cho từng khoản, lưu vào thư mục draft-email\""],
        ["Bạn làm gì", "Copy kết quả, dán vào nơi cần", "XEM LẠI kết quả agent đã tự làm"],
        ["Rủi ro", "Sai thì bạn sửa 1 đoạn", "SAI THÌ SAI HÀNG LOẠT — agent đã tự chạy 12 bước"],
    ], col_widths=[0.9, 2.8, 3.4])
    p(doc, "Mọi nguyên tắc ở Chương 1-13 vẫn áp dụng nguyên vẹn (công thức hỏi, kiểm sự thật, ẩn dữ liệu), nhưng mức độ cẩn thận phải CAO HƠN, vì Cowork tự hành động chứ không chỉ trả lời.", size=8.5, bold=True)

    add_heading(doc, "14.2 Cần gì để dùng được — điểm khác biệt quan trọng nhất", level=2)
    p(doc, "Khác ChatGPT và Gemini (bản miễn phí đủ dùng), Cowork KHÔNG có trên tài khoản miễn phí.", size=8.5, bold=True)
    add_table(doc, ["Hạng mục", "Chi tiết (đối chiếu 09/2026)"], [
        ["Gói cần có", "Cowork có từ gói PRO trở lên. KHÔNG có trên Free."],
        ["Giá", "Pro ~20 USD/tháng trả theo tháng, hoặc ~17 USD/tháng nếu trả theo năm. Max từ ~100 USD/tháng. Team ~20-25 USD/người/tháng (Standard), ~100-125 (Premium). Enterprise: theo số người + mức dùng thực tế."],
        ["Cảnh báo giá", "Giá và điều kiện CÓ THỂ ĐỔI — đây là phần xuống cấp nhanh nhất. Kiểm tra claude.com/pricing trước khi in hoặc trước khi nói \"rẻ\" với đồng nghiệp."],
        ["Thiết bị", "Desktop app cho macOS, Windows (x64 và arm64), ChromeOS, Linux. Bản web và mobile đang mở rộng dần (beta), quyền truy cập khác nhau theo gói."],
        ["Làm việc với file trên máy", "Phải cài Claude Desktop app, MỞ app, và TỰ TAY KẾT NỐI thư mục bạn muốn nó thấy. Web/mobile chỉ làm việc với file đã lưu vào tài khoản."],
        ["Có cần biết lập trình?", "KHÔNG. Cowork thiết kế cho người không chuyên kỹ thuật — bạn mô tả mục tiêu bằng ngôn ngữ tự nhiên, nói \"cái gì\" chứ không cần nói \"làm thế nào\"."],
    ], col_widths=[1.5, 5.6])
    add_callout(doc, "Hệ quả thực tế cho An Bình Foods", "Vì Cowork BẮT BUỘC TRẢ PHÍ, đây KHÔNG phải công cụ mọi nhân viên đều có sẵn như ChatGPT/Gemini. Việc trang bị gói cho ai do lãnh đạo quyết định — đừng tự ứng tiền rồi tính chi phí mà không có phê duyệt bằng văn bản.", accent=AMBER, bg="#FFFBEB", icon="⚠")

    add_heading(doc, "14.3 Nó chạy ở đâu — hiểu đúng để bảo vệ dữ liệu", level=2)
    p(doc, "Theo tài liệu trợ giúp chính thức của Anthropic:", size=8.5)
    for t in ["Tác vụ chạy trên MÔI TRƯỜNG TẠM THỜI, CÔ LẬP, ĐẶT TRÊN MÁY CHỦ CỦA ANTHROPIC — tạo theo từng phiên và bị xóa sau khi xong. Phiên trên cloud KHÔNG truy cập được mạng nội bộ hay máy tính của công ty.",
              "File trên máy bạn, khi đã kết nối qua Desktop app, ĐƯỢC XỬ LÝ TRÊN MÁY CHỦ ANTHROPIC — chứ không phải chỉ quanh quẩn trong máy bạn.",
              "Claude chỉ đọc/ghi được trong thư mục bạn đã kết nối, không tự lan ra nơi khác.",
              "Bạn xóa tác vụ bất kỳ lúc nào; xóa khỏi lịch sử ngay, khỏi hệ thống trong vòng 30 ngày.",
              "Không chia sẻ được cả phiên với đồng nghiệp — chỉ chia sẻ từng kết quả (artifact) riêng lẻ. Một số tính năng chỉ có trên Desktop."]:
        p(doc, t, bullet=True, size=8.5)
    p(doc, "Về việc dữ liệu có được dùng để huấn luyện mô hình hay không: trang Trung tâm Quyền riêng tư của Anthropic (phạm vi áp dụng cho tài khoản cá nhân Free/Pro/Max) nêu dữ liệu chỉ được dùng để train khi (1) bạn TỰ NGUYỆN BẬT tùy chọn cải thiện mô hình, (2) hội thoại bị gắn cờ để rà soát an toàn, hoặc (3) bạn tham gia chương trình như Trusted Tester. Hội thoại ở chế độ Ẩn danh (Incognito) được loại trừ kể cả khi đã bật cải thiện mô hình. Phản hồi (thumbs up/down) có thể lưu tới 5 năm.", size=8.5)
    add_callout(doc, "CHƯA XÁC MINH ĐƯỢC — phải đọc kỹ", "Trang quyền riêng tư đã đối chiếu KHÔNG mô tả mặc định của tài khoản Team/Enterprise — Anthropic dành một bài riêng cho sản phẩm thương mại mà chúng tôi chưa xác minh được. Vì vậy cẩm nang KHÔNG khẳng định \"dùng gói công ty thì dữ liệu chắc chắn không bị train\". Người dùng Cowork ở An Bình Foods vẫn phải áp dụng 5 điều cấm (Chương 9) như khi dùng tài khoản cá nhân, cho tới khi Ban Hành chính xác nhận bằng văn bản từ nguồn chính thức.", accent=RED, bg="#FEF2F2", icon="⚠")

    add_heading(doc, "14.4 Ba chế độ phê duyệt — chọn cái nào", level=2)
    add_table(doc, ["Chế độ", "Cách hoạt", "Khi nào dùng"], [
        ["MANUAL\nHỏi trước khi làm", "Dừng lại xin phép ở từng hành động", "MẶC ĐỊNH CHO NGƯỜI MỚI. Dùng khi bạn chưa tin chắc việc nó sắp làm"],
        ["AUTO\nTự duyệt", "Claude tự rà soát rủi ro (rò rỉ dữ liệu ra ngoài, nội dung web độc hại) và chặn hành động nguy hiểm", "Khi đã hiểu tác vụ và tin tưởng phạm vi; VẪN TỐN HẠN MỨC nhiều hơn vì có thêm lớp kiểm tra an toàn"],
        ["SKIP\nLàm không hỏi", "Không dừng, KHÔNG KIỂM TRA TỰ ĐỘNG", "KHÔNG dùng cho việc nhạy cảm. Chỉ khi tin tưởng tuyệt đối mọi nguồn liên quan"],
    ], col_widths=[1.3, 3.0, 2.8])
    p(doc, "Hai điểm an toàn tuyệt đối, theo tài liệu chính thức:", size=8.5, bold=True)
    p(doc, "XÓA FILE VĨNH VIỄN LUÔN CẦN BẠN CHO PHÉP RÕ RÀNG, ở CẢ BA chế độ. Không có chế độ nào cho phép nó tự xóa không hỏi.", bullet=True, size=8.5)
    p(doc, "Người dùng CHỊU TRÁCH NHIỆM với mọi hành động Claude thực hiện thay mình, gồm: nội dung đã đăng ra ngoài, giao dịch mua bán, dữ liệu bị thay đổi, kết quả của tác vụ hẹn giờ, và thao tác trên ứng dụng.", bullet=True, size=8.5)
    add_callout(doc, "Khuyến nghị cho nhân viên An Bình Foods", "Luôn bắt đầu ở MANUAL. Chỉ chuyển sang Auto khi đã chạy việc đó vài lần và biết chắc nó sẽ làm gì. KHÔNG DÙNG SKIP với công việc liên quan số liệu công ty.", accent=GREEN, bg="#ECFDF5", icon="✓")

    add_heading(doc, "14.5 Dùng Cowork cho việc ở An Bình Foods", level=2)
    p(doc, "Cowork mạnh nhất với công việc NHIỀU FILE, LẶP LẠI, CÓ QUY TRÌNH RÕ. Anthropic minh họa bằng các nhóm: báo cáo định kỳ gộp từ nhiều nguồn, đối chiếu bảng tính theo vùng, rà soát hợp đồng hàng loạt, phân tích ghi chú trao đổi với khách, và tạo spreadsheet/slide/document định dạng sẵn.", size=8.5)
    p(doc, "Bốn bước của một lần giao việc (KHÔNG dùng công thức 5 thành tố như với ChatGPT — ở đây cái cần là KẾT QUẢ CUỐI CÙNG):", size=8.5)
    add_table(doc, ["Bước", "Việc"], [
        ["1. MỤC TIÊU + TIÊU CHÍ ĐẠT", "Nói rõ kết quả phải trông thế nào, cái gì là đạt"],
        ["2. PHẠM VI", "Thư mục / những file nào được phép chạm vào"],
        ["3. CHẾ ĐỘ PHÊ DUYỆT", "Manual nếu lần đầu làm việc này"],
        ["4. BẠN RÀ SOÁT", "Xem việc nó đã làm, đối chiếu với file gốc"],
    ], col_widths=[2.2, 4.9])

    def cowork_example(title, prompt, note_title, note):
        add_heading(doc, title, level=3)
        add_code_block(doc, prompt)
        add_callout(doc, note_title, note, accent=BLUE, bg="#EFF6FF", icon="💡")

    cowork_example("Ví dụ 1 — Gộp và đối chiếu bảng tính (Kế toán / Kinh doanh)",
        "Trong thư mục \"Doi chieu/Quy III\" có các file báo bán hàng của từng vùng và file ngân sách.\nHãy gộp tất cả vào một tab tổng hợp, rồi tạo một tab riêng cho từng vùng.\nGẮN CỜ mọi khoản chênh lệch quá 5% so với ngân sách.\nVới mỗi chỗ bị gắn cờ, ghi rõ TÊN FILE GỐC và DÒNG SỐ LIỆU để tôi tự kiểm.\nCHỈ TẠO FILE MỚI — không chỉnh sửa hay xóa file gốc. Chế độ: hỏi tôi trước mỗi hành động ghi file.",
        "Hai chỗ đáng để ý trong prompt trên",
        "\"ghi rõ tên file gốc và dòng số liệu\" = bắt Cowork để dấu vết cho bạn kiểm, giống hệt nguyên tắc \"trích nguồn có link\" ở Chương 5. Và \"chỉ tạo file mới\" = giữ dữ liệu gốc nguyên vẹn.")

    cowork_example("Ví dụ 2 — Soạn bộ email đòi công nợ (Kế toán)",
        "Đọc file \"cong-no-da-an.txt\" (đã ẩn tên khách thật, chỉ còn \"Khách A\", \"Khách B\").\nVới từng khoản quá hạn 30 ngày, soạn một email đòi nợ giọng lịch sự, có bảng số tiền và hạn trả.\nLƯU từng email vào thư mục \"draft-email/\", KHÔNG GỬI.\nLập bảng: file nào | khách nào | số tiền | ngày gửi dự kiến, để tôi đối chiếu.",
        "Vì sao ví dụ này bắt buộc phải \"KHÔNG GỬI\" và dùng tên đã ẩn",
        "Đây đúng là chỗ Cowork khác ChatGPT. ChatGPT chỉ trả lời — bạn chưa paste thì chưa ai nhận gì. Cowork CÓ THỂ TỰ THỰC HIỆN HÀNH ĐỘNG. Nên mọi việc có hệ quả ra bên ngoài (gửi email, cập nhật file thật, đăng bài, đặt hàng) phải DỪNG Ở BẢN NHÁP để người duyệt.")

    cowork_example("Ví dụ 3 — Rà soát hợp đồng nhà cung cấp hàng loạt (Mua hàng / Pháp chế)",
        "Thư mục \"Hop dong NCC 2026\" có 9 hợp đồng. Đối chiếu từng hợp đồng với bảng tiêu chí \"checklist-phu-hop.md\":\nđiều khoản thanh toán, thời gian giao, phạt chậm, trách nhiệm chất lượng.\nVới mỗi hợp đồng, tạo một memo nêu: ĐIỂM LỆCH so với checklist | MỨC NGHIÊM TRỌNG (Cao/Trung bình/Thấp) kèm lý do | câu chữ đề xuất để đàm phán.\nTRÍCH NGUYÊN VĂN điều khoản và SỐ ĐIỀU của từng hợp đồng để pháp chế kiểm lại.\nKHÔNG tự kết luận hợp đồng nào \"đạt\".",
        "Ranh giới quan trọng",
        "Ví dụ này khớp nhóm use case \"rà soát hợp đồng hàng loạt\" mà Anthropic nêu — và cho thấy ranh giới: Cowork LẬP DANH SÁCH ĐIỂM LỆCH để người có chuyên môn quyết, không tự kết luận.")

    cowork_example("Ví dụ 4 — Báo cáo tuần từ nhiều nguồn (Tổ vận hành / Hành chính)",
        "Gộp các nguồn sau cho tuần vừa rồi: file ghi chú sản xuất trong \"Ghi chú SX/\",\nbiên bản họp trong \"Bien ban/\", và danh sách khiếu nại tôi dán bên dưới.\nTạo báo cáo: (1) Tóm tắt 5 dòng cho Ban Giám đốc, (2) Bảng việc đã xong / đang làm / vướng,\n(3) 3 việc cần Ban Giám đốc quyết.\nSAU KHI XONG: tự liệt kê những chỗ bạn phải ĐOÁN vì thiếu dữ liệu, để tôi bổ sung.",
        "Câu cuối quan trọng nhất",
        "\"Liệt kê những chỗ bạn phải đoán\" là phiên bản dành cho agent của \"3 câu thần chú\" ở Chương 5. Tác vụ nhiều bước rất cần nó, vì sai ở bước 2 sẽ lan sang bước 3, 4, 5.")

    add_heading(doc, "14.6 Rủi ro riêng của Cowork — khác với ChatGPT/Gemini", level=2)
    p(doc, "Tài liệu \"Dùng Claude Cowork an toàn\" của Anthropic nêu rõ Cowork CÓ RỦI RO RIÊNG do bản chất agent và có quyền truy cập internet. Bốn thứ phải nhớ:", size=8.5)
    risks = [
        ("1. Prompt injection là mối đe dọa chính.",
         "Nguy hiểm xảy ra khi Cowork ĐỌC NỘI DUNG KHÔNG ĐÁNG TIN CÙNG LÚC CÓ QUYỀN LÀM VIỆC HỆ QUẢ (xóa file, chạy lệnh, bấm nút). Một trang web, một email, một tài liệu chia sẻ có thể chứa dòng chữ giả làm chỉ dẫn để dẫn agent làm bậy.",
         "PHÒNG BẰNG: giới hạn quyền duyệt web ở site thật sự cần; cân nhắc kỹ trước khi cài plugin/MCP (chúng mở rộng phạm vi hành động); chặn ứng dụng nhạy cảm khỏi quyền thao tác máy tính."),
        ("2. Nó \"thấy\" mọi thứ trong ứng dụng đã cấp quyền.",
         "Với chế độ thao tác máy tính, Cowork XIN PHÉP THEO TỪNG ỨNG DỤNG nhưng KHÔNG CÓ TƯỜNG RIÊNG giữa nó và màn hình — mọi thứ đang hiện trên màn hình của ứng dụng đã cho phép, nó đều nhìn thấy.",
         "PHÒNG BẰNG: trước khi bật, đóng mọi cửa sổ có dữ liệu nhạy cảm (bảng lương, hợp đồng, tờ khai)."),
        ("3. Sai hàng loạt, không sai một chỗ.",
         "Cowork tách việc lớn thành nhiều phần chạy song song. Prompt mơ hồ thì LỖI CŨNG ĐƯỢC NHÂN BẢN ra tất cả các phần.",
         "PHÒNG BẰNG: lần đầu luôn để Manual; luôn có bước \"liệt kê chỗ bạn phải đoán\"."),
        ("4. Giám sát phạm vi — nhất là tác vụ hẹn giờ.",
         "Bạn có thể đặt lịch để nó tự chạy định kỳ, và nó vẫn chạy khi bạn đóng laptop. KHÔNG CÓ AI GIÁM SÁT THEO THỜI GIAN THỰC.",
         "PHÒNG BẰNG: đừng đặt lịch cho việc liên quan dữ liệu thật của công ty khi chưa chạy tay thành công nhiều lần; theo dõi xem nó có chạm vào tài nguyên bất ngờ không."),
    ]
    for rtitle, rbody, rfix in risks:
        p(doc, rtitle, size=9, bold=True, space_after=1, name="Be Vietnam Pro")
        p(doc, rbody, size=8.5, space_after=1)
        p(doc, rfix, size=8.5, color=BLUE_DARK, space_after=5)

    add_heading(doc, "Bốn điều KHÔNG được tin / KHÔNG được nói với đồng nghiệp", level=3)
    p(doc, "Các tuyên bố bên dưới KHÔNG có trong tài liệu Anthropic:", size=8, color=SLATE_500, italic=True)
    add_table(doc, ["Tuyên bố hay gặp", "Thực tế theo nguồn chính thức"], [
        ["\"Chạy hoàn toàn trên máy bạn, dữ liệu không rời khỏi máy\"", "SAI. Tác vụ chạy trong môi trường cô lập trên máy chủ Anthropic; file từ máy bạn cũng được xử lý trên server"],
        ["\"Cowork thay được nhân viên\"", "Không. Đầu ra là MEMO/BẢN NHÁP để người có chuyên môn rà soát; bạn chịu trách nhiệm cho mọi hành động nó thay bạn làm"],
        ["\"Cứ trả phí là dữ liệu không bao giờ bị train\"", "CHƯA XÁC MINH ĐƯỢC cho Team/Enterprise. Với cá nhân: cần TỰ NGUYỆN BẬT tùy chọn cải thiện mô hình nó mới dùng để train"],
        ["\"Nó tự học và giỏi dần theo thời gian\"", "Không có mô tả nào về tự học liên phiên — mỗi tác vụ chạy trong môi trường tạm, bị xóa sau phiên"],
    ], col_widths=[2.7, 4.4])

    add_heading(doc, "Ranh giới pháp lý", level=3)
    p(doc, "Luật Trí tuệ nhân tạo 134/2025/QH15 KHÔNG CÓ CHƯƠNG RIÊNG cho \"agentic AI\" — không suy diễn rằng có. Luật điều chỉnh qua khái niệm HỆ THỐNG AI CÓ \"các mức độ tự chủ khác nhau, có khả năng tự thích ứng sau triển khai\", kèm các nguyên tắc: AI PHỤC VỤ CON NGƯỜI, KHÔNG THAY THẾ thẩm quyền và trách nhiệm của con người; phải DUY TRÌ KHẢ NĂNG CON NGƯỜI KIỂM SOÁT VÀ CAN THIỆP với mọi quyết định/hành động của hệ thống AI (Điều 4, Điều 14); phân loại rủi ro theo mức tác động (Điều 9); bên triển khai chịu trách nhiệm bồi thường (Điều 29).", size=8.5)
    p(doc, "THỰC HÀNH ĐÚNG TINH THẦN LUẬT = luôn giữ con người trong vòng duyệt, tức đúng các mục 14.4 và 14.6 ở trên. Nghị định/thông tư hướng dẫn thi hành: chưa tra được văn bản hiệu lực tại thời điểm soạn — cập nhật ở kỳ rà soát quý.", size=8.5, bold=True)

    add_heading(doc, "14.7 Nguồn cho phần Claude Cowork", level=3)
    p(doc, "Đối chiếu 09/2026. TRƯỚC KHI IN HOẶC GIẢNG, MỞ LẠI 4 URL ĐẦU — tính năng, trạng thái beta và giá đang thay đổi nhanh.", size=8, color=SLATE_500, italic=True)
    cowork_sources = [
        "Sản phẩm Claude Cowork (cập nhật, dùng làm chuẩn về use case và khả năng): claude.com/product/cowork",
        "Bắt đầu với Claude Cowork — kiến trúc cloud, quyền thư mục, hạn mức, thiết bị, gói cần: support.claude.com/en/articles/13345190-get-started-with-claude-cowork",
        "Dùng Claude Cowork an toàn — 3 chế độ phê duyệt, prompt injection, trách nhiệm người dùng, phạm vi quyền: support.claude.com/en/articles/13364135-use-claude-cowork-safely",
        "Dữ liệu của tôi có dùng để huấn luyện mô hình không (phạm vi: Free/Pro/Max): privacy.claude.com/en/articles/10023580-is-my-data-used-for-model-training",
        "Bảng giá chính thức: claude.com/pricing",
        "Khi nào chọn Cowork, khi nào chọn Chat (khóa học chính thức): academy.claude.com/tutorials/choosing-between-claude-cowork-or-chat",
        "Khóa học \"Introduction to Claude Cowork\" (Anthropic, tiếng Anh): anthropic.skilljar.com/introduction-to-claude-cowork",
    ]
    for idx, s in enumerate(cowork_sources, 1):
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Inches(0.2)
        para.paragraph_format.space_after = Pt(2)
        r = para.add_run(f"{idx}. {s}")
        r.font.size = Pt(7.5); r.font.color.rgb = SLATE_500; r.font.name = "Inter"
    add_callout(doc, "Ghi chú minh bạch", "KHÔNG TÌM THẤY thông cáo báo chí chính thức riêng cho Cowork trên trang tin của Anthropic tại thời điểm đối chiếu. Các mốc \"ra mắt dưới dạng research preview tháng 01/2026\", \"GA tháng 04/2026\" chỉ thấy trên BÁO CHÍ BÊN THỨ BA — cẩm nang này KHÔNG dùng các mốc đó làm sự kiện đã xác minh, và KHÔNG trích trang hướng dẫn do cộng đồng lập làm nguồn chính thức.", accent=NAVY, bg="#F8FAFB", icon="ⓘ")

    # Thẻ prompt
    doc.add_page_break()
    add_heading(doc, "Phụ lục — Thẻ Prompt bỏ túi (in riêng 1 mặt A4 ép plastic)", level=1)
    p(doc, "Cắt theo khung dưới đây, ép plastic để để ở bàn làm việc. Mặt trước: công thức + kỹ thuật. Mặt sau: quy trình + checklist + 5 điều cấm + 3 câu thần chú.", size=8, color=SLATE_500, italic=True)
    # Mặt trước
    tbl = doc.add_table(rows=1, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(3.55); tbl.columns[1].width = Inches(3.55)
    for idx, (title, body) in enumerate([
        ("MẶT TRƯỚC — CÔNG THỨC & KỸ THUẬT", "5 THÀNH TỐ (quy ước nội bộ):\n1. Vai trò — AI đóng vai ai?\n2. Bối cảnh — Việc gì, cho ai, vì sao?\n3. Nhiệm vụ — Làm gì?\n4. Ràng buộc — Bao nhiêu chữ, giọng gì, không làm gì\n5. Định dạng — email, bảng, bullet...\n\n4 KỸ THUẬT:\n• Đóng vai  • Đưa tài liệu\n• Cho ví dụ  • Chia nhỏ & lặp lại\n\n3 CÂU THẦN CHÚ:\n\"Hỏi lại thay vì đoán\"\n\"Chê 3 điểm yếu của câu trả lời\"\n\"Trích nguồn, không có thì ghi 'chưa kiểm chứng'\""),
        ("MẶT SAU — QUY TRÌNH & RANH GIỚI", "QUY TRÌNH 4 BƯỚC:\n1. Bạn ra ý (bullet)  →  2. AI viết nháp\n3. Bạn kiểm sự thật ★  →  4. AI làm mịn\n\nCHECKLIST TRƯỚC KHI GỬI:\n☐ Số liệu đúng?  ☐ Tên đúng?\n☐ Điều luật có thật?  ☐ Giọng hợp người nhận?\n☐ Còn dữ liệu nhạy cảm?\n\n5 ĐIỀU CẤM (tài khoản cá nhân):\n1. CCCD/lương/HĐLĐ  2. Giá vốn/công thức/DSKH\n3. TK ngân hàng/MST/BCTC  4. Giao AI quyết định nhân sự/ký thay\n5. Đăng ra ngoài khi chưa kiểm chứng"),
    ]):
        cell = tbl.cell(0, idx)
        shade_cell(cell, "#EFF6FF" if idx == 0 else "#FFFBEB")
        set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
        pp = cell.paragraphs[0]
        r = pp.add_run(title)
        r.bold = True; r.font.size = Pt(7.5); r.font.color.rgb = NAVY; r.font.name = "Be Vietnam Pro"
        pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pp2 = cell.add_paragraph()
        r2 = pp2.add_run(body)
        r2.font.size = Pt(7); r2.font.color.rgb = SLATE_700; r2.font.name = "Inter"

    p(doc, "An Bình Foods — Tài liệu lưu hành nội bộ. Vui lòng không phát tán ra ngoài khi chưa có phê duyệt.", size=7, color=SLATE_400, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    doc.save(OUT_CAM_NANG)
    print(f"Saved {OUT_CAM_NANG}")

# ── Build: Bản rút gọn ──
def build_rut_gon():
    doc = Document()
    set_margins(doc.sections[0], top=0.5, bottom=0.5, left=0.6, right=0.6)
    style_document(doc)
    # override normal size for compact
    doc.styles["Normal"].font.size = Pt(9)
    add_footer(doc, "An Bình Foods  ·  Bản rút gọn 4 trang  ·  v2.0 — 09/2026  ·  Review: 12/2026")

    cover_page(doc, "Bản rút gọn — Dùng AI cho công việc văn phòng", "4 trang  ·  Cỡ chữ 14pt  ·  In đen trắng được",
               ["An Bình Foods  ·  Lưu hành nội bộ  ·  v2.0 — 09/2026", "Dành cho người không quen đọc tài liệu dài, người lớn tuổi", "Mọi ví dụ đều dùng được ngay — thay phần trong [ngoặc vuông]"])
    # Compact content — reuse key sections condensed
    sections = [
        ("Trang 1 — Hỏi AI thế nào cho ra việc?", [
            ("Trước khi gõ, trả lời 3 câu (30 giây):", ["Tôi muốn AI làm gì? — động từ rõ: soạn, tóm tắt, biên tập, gợi ý, dịch, tạo ảnh...", "Ai sẽ đọc kết quả? — sếp, khách, đồng nghiệp, đăng Facebook — mỗi đối tượng cần giọng khác.", "Kết quả trông thế nào là đạt? — độ dài, định dạng, giọng văn."]),
            ("Công thức kiểm tra (quy ước nội bộ, không phải chuẩn hãng):", ["Vai trò — AI đóng vai ai?", "Bối cảnh — Việc gì, cho ai, vì sao?", "Nhiệm vụ — Làm gì", "Ràng buộc — bao nhiêu chữ, giọng gì, không làm gì", "Định dạng — email, bảng, bullet..."]),
            ("Ví dụ dở vs hay:", ["Dở: \"Viết giúp tôi email gửi khách hàng.\" → thiếu hết, AI đoán mò.", "Hay: \"Bạn là NVKD. Soạn email cho siêu thị TP.HCM về giao chậm 2 ngày do mưa bão, giọng chân thành, bù 5% đơn sau, 150 chữ, có tiêu đề + chữ ký.\""]),
            ("4 mẹo:", ["Đóng vai: \"Bạn là [vai], hãy...\"", "Đưa tài liệu: tải file lên rồi \"Dựa vào file đính kèm, hãy...\"", "Cho ví dụ: dán 1-2 mẫu → \"Viết theo phong cách này cho [SP mới].\"", "Chia nhỏ: việc lớn → 3 bước; xong nói \"Ngắn hơn 30%, giọng trang trọng hơn.\""]),
            ("Ba câu để AI tự kiểm tra (dán vào cuối prompt):", ["\"Nếu thiếu thông tin, hãy hỏi lại thay vì đoán.\"", "\"Hãy tự chê 3 điểm yếu của câu trả lời vừa rồi.\"", "\"Mọi số liệu/điều luật phải có nguồn kèm link; không có thì ghi 'chưa kiểm chứng'.\""]),
        ]),
        ("Trang 2 — Quy trình & tạo văn bản", [
            ("Quy trình 4 bước — dán ở bàn:", ["1. BẠN RA Ý (5-10'): bullet ý chính, mục đích, đối tượng, 3-5 ý phải có", "2. AI VIẾT NHÁP (2-3'): dán prompt 5 ô → AI viết nháp", "3. BẠN KIỂM (10-15') ★ — số liệu đúng? tên đúng? điều luật có thật? giọng hợp người nhận? Sửa trực tiếp.", "4. AI LÀM MỊN (2-3'): \"Biên tập mượt, giữ nguyên số liệu tôi đã sửa.\" → Gửi đi", "★ TUYỆT ĐỐI KHÔNG BỎ BƯỚC 3. Bạn là người ký, bạn chịu trách nhiệm."]),
            ("Checklist trước khi gửi:", ["Số liệu đúng chưa? · Tên/đơn vị đúng chưa? · Điều luật có tồn tại không? · Giọng hợp người nhận chưa? · Còn dữ liệu nhạy cảm nào lộ không?"]),
            ("5 prompt dùng ngay:", ["Email: \"Bạn là NVHC. Soạn email cho [đối tượng] về [việc], [số] chữ, giọng [trang trọng/thân thiện], có tiêu đề + chữ ký.\"",
                                     "Tóm tắt họp: Tải biên bản lên, prompt \"Tóm tắt 3 phần: (1) Quyết định chính (5 bullet), (2) Bảng Việc | Người | Hạn, (3) Việc chưa chốt. Thiếu hạn → 'chưa rõ'.\"",
                                     "Báo cáo tuần: \"Dựa vào ghi chú: [dán]. Viết báo cáo tuần cho BGĐ: Tiêu đề, Tóm tắt 3 dòng, Kết quả, Khó khăn, Đề xuất. Dưới 400 chữ.\"",
                                     "Dịch: \"Dịch đoạn sau sang tiếng Anh thương mại, giữ số liệu/tên riêng. Sau bản dịch, giải thích 3 cụm từ quan trọng.\"",
                                     "Biên tập: \"Biên tập đoạn sau cho mượt, sửa chính tả, thống nhất giọng [trang trọng/thân thiện], GIỮ NGUYÊN số liệu. Đoạn: [dán].\""]),
        ]),
        ("Trang 3 — Tạo ảnh & dữ liệu phải ẩn", [
            ("Tạo ảnh — prompt nên có:", ["[Chủ thể] + [bối cảnh] + [phong cách] + [ánh sáng/màu] + [tỷ lệ] + [điều loại trừ]", "Hay: \"Túi mít sấy 100g trên bàn gỗ sáng, cạnh vài lát mít tươi và lọ mật ong nhỏ, tối giản, ánh sáng tự nhiên ấm, nền mờ, 4:5, không chữ.\"", "Dở: \"Tạo ảnh mít sấy đẹp.\" → chung chung, khó dùng."]),
            ("Ba giới hạn:", ["Chữ trong ảnh: tiếng Việt có dấu hay sai/lệch; càng dài càng dễ sai (kinh nghiệm cộng đồng, không phải spec hãng). Xử lý: tạo ảnh không chữ, ghép chữ bằng Canva/PowerPoint.", "Logo/SP: đừng bắt AI vẽ lại logo — sẽ ra bản gần giống nhưng sai. Dùng ảnh chụp thật, chỉ nhờ AI tạo bối cảnh.", "Dùng ảnh AI: không dùng cho bao bì chính thức, chứng nhận, quảng cáo cam kết thành phần/xuất xứ. Dùng cho MXH → ghi \"Ảnh minh họa\"."]),
            ("Tỷ lệ khung hình:", ["16:9 slide · 1:1 bài vuông · 4:5 ảnh dọc · 9:16 Reels. Gemini hỗ trợ trực tiếp; với ChatGPT, 4:5 thường phải crop."]),
            ("Dữ liệu phải ẩn trước khi dán vào AI:", ["Tên khách hàng → \"Khách A\", \"Đại lý miền Bắc\"", "Số tiền thật → tỷ lệ %, hoặc \"X đồng\"", "CCCD/mã số thuế → xóa hẳn", "Công thức SP → \"sản phẩm sấy giòn vị mật ong\"", "Danh sách NV → số lượng + vị trí, không tên", "Giá vốn/báo giá mật → \"phân khúc trung cấp\""]),
        ]),
        ("Trang 4 — 5 điều cấm & khi lỡ dán nhạy cảm", [
            ("5 điều cấm (tài khoản cá nhân):", ["1. Họ tên + CCCD, lương, HĐLĐ, sức khỏe NV → đổi \"Anh A\", che số", "2. Giá vốn, công thức, DS khách hàng, HĐ/báo giá mật → mô tả chung chung", "3. TK ngân hàng, MST, tờ khai, BCTC chưa công bố → chỉ dùng tỷ lệ/%", "4. Giao AI quyết định nhân sự, lương, kỷ luật, ký thay VB pháp lý → AI chỉ soạn nháp", "5. Đăng ra ngoài nội dung AI tạo chưa kiểm chứng → kiểm xong mới gửi"]),
            ("Bật/tắt chia sẻ huấn luyện (làm một lần):", ["ChatGPT: avatar → Settings → Data controls → tắt \"Improve the model for everyone\" (chỉ ảnh hưởng hội thoại sau khi tắt)", "Gemini: vào activity của tài khoản Google để quản lý lịch sử"]),
            ("Lỡ dán nhạy cảm thì sao?", ["1. Xóa hội thoại ngay (ChatGPT: ... → Delete; Gemini: xóa ở Activity)", "2. Đổi mật khẩu nếu đã dán thông tin đăng nhập", "3. Báo quản lý trực tiếp", "4. Về sau luôn thử bằng dữ liệu giả"]),
            ("Dấu hiệu AI đang bịa & cách bắt lỗi:", ["Nêu điều luật rất cụ thể nhưng tìm Google không ra; số liệu \"theo Tổng cục TK\" nhưng không có link; trả lời quá mượt, không nói \"tôi không chắc\".", "Cách bắt: bắt AI trích nguồn có link → tự mở link kiểm tra; yêu cầu \"hãy tìm trên mạng và chỉ trả lời dựa trên kết quả\"; hỏi vặn \"Bạn có chắc không? Không chắc thì nói 'tôi không chắc'.\""]),
            ("Tuyệt đối không giao cho AI một mình:", ["Tính lương, quyết định nhân sự để kỷ luật, lập BCTC/tờ khai để nộp, soạn HĐ không qua chuyên môn, hứa với khách về chất lượng/hạn dùng/chứng nhận — phải dựa trên hồ sơ QC thật."]),
        ]),
    ]
    for title, groups in sections:
        add_heading(doc, title, level=1)
        for gtitle, bullets in groups:
            add_heading(doc, gtitle, level=2)
            for b in bullets:
                p(doc, b, bullet=True, size=8.5, space_after=1)
    p(doc, "Hết bản rút gọn. Bản đầy đủ ~32 trang có 15 template, lộ trình 30 ngày, FAQ và nguồn tham khảo ở cẩm nang chính. Thắc mắc → nhóm Zalo \"Hỗ trợ AI — An Bình Foods\".", size=8, color=SLATE_500, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.save(OUT_RUT_GON)
    print(f"Saved {OUT_RUT_GON}")

def build_ke_hoach():
    doc = Document()
    set_margins(doc.sections[0])
    style_document(doc)
    add_footer(doc, "An Bình Foods  ·  Kế hoạch đào tạo AI  ·  v2.0 — 09/2026  ·  Review: 12/2026  ·  Lưu hành nội bộ")
    cover_page(doc, "Kế hoạch đào tạo AI", "Cho nhân viên văn phòng  ·  2 buổi × 90 phút  ·  Kèm rubric & hỗ trợ sau đào tạo",
               ["Phiên bản 2.0 — 09/2026 (đã điều chỉnh theo audit)", "Chủ sở hữu: Ban Hành chính & Chuyển đổi số", "Đối tượng: toàn văn phòng  ·  ChatGPT & Gemini (tài khoản cá nhân)"])
    # Mục 0
    add_heading(doc, "0. Thay đổi so với v1.0 (sau audit)", level=1)
    add_table(doc, ["Thay đổi", "Lý do"], [
        ["Chia 180' → 2 buổi × 90', cách nhau 7-14 ngày", "Chú ý người lớn giảm sau ~90'; chuẩn 2025 là spaced learning"],
        ["Thêm 40% breakout theo phòng ban ở Buổi 2", "\"Một giáo án cho mọi người\" là nguyên nhân hàng đầu khiến NV thấy đào tạo vô ích"],
        ["Học viên MANG VIỆC THẬT vào lớp (đã ẩn dữ liệu)", "Demo chung không tạo năng lực; chuẩn là 40-50% hands-on trên việc thật"],
        ["Thêm pre/post test + rubric chấm output", "Quiz 10 câu chỉ đo ghi nhớ, không đo kỹ năng viết prompt"],
        ["Chỉ định Owner + Champion, office hours, rà soát mỗi quý", "Không có hỗ trợ sau đào tạo thì rơi rụng sau 2 tuần; AI đổi tính năng theo quý"],
        ["Gắn nhãn \"quy ước nội bộ\" cho khung 5/6 thành tố", "Audit phát hiện gán các khung cho OpenAI/Google như chuẩn chính thức — không đúng"],
        ["Sửa phần pháp lý VN", "Xóa nghĩa vụ \"công khai nguồn train\" sai; cập nhật trạng thái hiệu lực"],
    ], col_widths=[3.2, 3.9])
    p(doc, "Chi tiết audit và bằng chứng: file 03-bao-cao-audit.md trong thư mục này.", size=7.5, color=SLATE_500, italic=True)
    # Mục 1
    add_heading(doc, "1. Mục tiêu đào tạo (đo được ở 3 cấp độ)", level=1)
    add_table(doc, ["Cấp độ", "Mục tiêu", "Cách đo"], [
        ["Kiến thức", "Hiểu AI làm được/không làm được, nắm 5 điều cấm", "Pre-test & post-test cùng 10 câu — đo mức tăng, yêu cầu ≥ 8/10"],
        ["Kỹ năng", "Viết prompt ra kết quả dùng được", "Chấm 3 prompt theo rubric 4 mức — đạt mức 3 trở lên"],
        ["Hành vi", "Dùng AI đều đặn trong việc thật", "Khảo sát 30 ngày: tần suất, số tác vụ chuẩn hóa, giờ tiết kiệm; ≥ 60% dùng hàng tuần"],
    ], col_widths=[1.1, 2.7, 3.3])
    p(doc, "Chỉ số kinh doanh đi kèm: tổng giờ tiết kiệm mỗi phòng ban mỗi tuần, do trưởng phòng xác nhận khi chấm template.", size=8, color=SLATE_500, italic=True)
    # Mục 2
    add_heading(doc, "2. Hình thức tổ chức", level=1)
    for t in ["Lộ trình: 2 buổi × 90 phút, cách nhau 7-14 ngày. Buổi 1 — Nền tảng. Buổi 2 — Áp dụng trên việc thật từng phòng ban.",
              "Yêu cầu mỗi học viên mang đến Buổi 2: 1 email / 1 báo cáo / 1 bảng tính thật đã ẩn dữ liệu nhạy cảm (đổi tên thành \"Khách A\", xóa CCCD, đổi số tiền → tỷ lệ).",
              "Hình thức: trực tiếp tại phòng họp, máy chiếu + loa. Mỗi học viên mang laptop/điện thoại đã cài ChatGPT & Gemini.",
              "Sĩ số: 15-20 người/buổi. Chia bàn theo phòng ban ngay từ đầu.",
              "Giảng viên: 1 điều hành chính + 1 trợ giảng. Bố trí ngồi cặp mạnh-yếu.",
              "Tài liệu phát tay: Cẩm nang (A4) + Thẻ Prompt bỏ túi (A4 ép plastic) + bản rút gọn 4 trang chữ 14pt.",
              "Chuẩn bị trước Buổi 1 (gửi trước 3 ngày): tài khoản ChatGPT/Gemini, video 5 phút, pre-test 10 câu, danh sách dữ liệu cấm dán."]:
        p(doc, t, bullet=True, size=8.5)
    # Mục 3,4
    add_heading(doc, "3. Chương trình Buổi 1 — Nền tảng (90')", level=1)
    add_table(doc, ["Khối", "Thời lượng", "Nội dung", "Hình thức"], [
        ["Mở đầu", "7'", "Vì sao học AI bây giờ + xử lý nỗi lo \"AI có lấy việc mình không?\"", "Diễn giải + hỏi đáp"],
        ["Khối 1\nHiểu đúng về AI", "18'", "AI là gì, ChatGPT vs Gemini, AI giỏi/dở/bịa. Demo prompt dở vs tốt.", "Giảng + demo"],
        ["Khối 2\nCách hỏi hay", "35'", "Công thức 5 thành tố (quy ước nội bộ) + 4 kỹ thuật + 3 câu thần chú + 2 bài tập nhanh", "Giảng + demo + bài tập"],
        ["Giải lao", "8'", "—", "—"],
        ["Khối 3\nAn toàn & ranh giới", "17'", "5 điều cấm (tài khoản cá nhân), bắt lỗi AI bịa, quy trình 4 bước, tắt Improve the model", "Giảng + tình huống"],
        ["Giao việc", "5'", "3 prompt về nhà + cử Champion + dặn mang việc thật đến Buổi 2", "—"],
    ], col_widths=[1.1, 0.7, 3.7, 1.6])
    p(doc, "Thực hành chiếm ≥ 30% Buổi 1 (2 bài tập nhanh tại chỗ).", size=8, color=SLATE_500, italic=True)

    add_heading(doc, "4. Chương trình Buổi 2 — Áp dụng theo phòng ban (90')", level=1)
    add_table(doc, ["Khối", "Thời lượng", "Nội dung", "Hình thức"], [
        ["Ôn & chữa bài", "12'", "2-3 học viên trình bày prompt tốt nhất; giảng viên chỉ ra vì sao nó hoạt động", "HV trình bày"],
        ["Breakout\ntheo phòng ban", "40'", "Mỗi bàn làm trên việc thật: chọn tác vụ → viết template → chạy thử → trưởng phòng duyệt theo rubric", "Workshop"],
        ["Phản biện chéo", "15'", "Mỗi phòng cử 1 người sang bàn khác, đóng vai phản biện: chỉ ra 3 lỗ hổng", "Peer review"],
        ["Tạo ảnh", "13'", "Demo tạo ảnh + ranh giới đỏ (bao bì, chứng nhận, quảng cáo)", "Demo"],
        ["Bế mạc", "10'", "Post-test (10 câu giống pre-test), khảo sát, công bố office hours + nhóm Zalo", "—"],
    ], col_widths=[1.1, 0.7, 3.7, 1.6])
    p(doc, "Thực hành chiếm ≥ 60% Buổi 2 — tổng toàn khóa ≥ 45%.", size=8, color=SLATE_500, italic=True)

    # Mục 5 rubric
    add_heading(doc, "5. Rubric chấm prompt/output (4 mức)", level=1)
    add_table(doc, ["Tiêu chí", "Mức 1 — Không đạt", "Mức 2 — Cơ bản", "Mức 3 — Đạt", "Mức 4 — Tốt"], [
        ["Đủ thành tố", "Dưới 2/5", "3/5", "4-5/5", "5/5 + biết cắt bỏ phần thừa"],
        ["Ràng buộc cụ thể", "Không có", "Có 1 ràng buộc", "Có ràng buộc định lượng", "Có cả \"không được làm gì\""],
        ["An toàn dữ liệu", "Còn tên/số thật nhạy cảm", "Che một phần", "Không còn dữ liệu cấm", "Có quy trình che để người khác lặp lại"],
        ["Kiểm chứng được", "Nhận KQ không soát", "Có đọc lại", "Tự kiểm 1 số liệu/tên", "Ghi rõ mục nào AI tạo, mục nào người xác nhận"],
    ], col_widths=[1.2, 1.4, 1.4, 1.5, 1.5])
    p(doc, "Ngưỡng đạt: mức 3 trở lên ở cả 4 tiêu chí. Trưởng phòng ký xác nhận trên template của phòng mình.", size=8, color=SLATE_500, italic=True)

    # Mục 6-12 condensed
    add_heading(doc, "6. Bài tập về nhà & chuẩn đầu ra", level=1)
    add_table(doc, ["Việc", "Thời điểm", "Ai chịu trách nhiệm"], [
        ["Mỗi HV nộp 3 prompt + KQ thật, tự chấm theo rubric", "Trong 7 ngày giữa 2 buổi", "Cá nhân"],
        ["Mỗi phòng nộp 1 template chuẩn hóa, có xác nhận trưởng phòng", "Nộp tại Buổi 2", "Trưởng phòng + Champion"],
        ["Khảo sát áp dụng 30 ngày", "Sau khóa 30 ngày", "Owner chương trình"],
        ["Showcase 1 ca hay mỗi tháng", "Hàng tháng", "Owner + Champion"],
    ], col_widths=[2.8, 1.6, 2.7])

    add_heading(doc, "7. Hỗ trợ sau đào tạo", level=1)
    for t in ["Owner: 1 người thuộc Ban Hành chính & Chuyển đổi số — sở hữu tài liệu, lịch cập nhật, số liệu áp dụng.",
              "Champion mỗi phòng: 1 người thạo nhất, chỗ hỏi đầu tiên; dự office hours.",
              "Kênh hỏi đáp: nhóm Zalo \"Hỗ trợ AI — An Bình Foods\"; trả lời trong 24h làm việc.",
              "Office hours: 30 phút, mỗi 2 tuần — kèm 1-1; mở đầu bằng \"AI News 5 phút\".",
              "Thư viện template: Google Drive/Notion theo phòng ban, có phiên bản, do trưởng phòng duyệt.",
              "Video xem lại: 3 video 3-5 phút (đăng ký / prompt 5 thành tố / tạo ảnh)."]:
        p(doc, t, bullet=True, size=8.5)

    add_heading(doc, "8. Cập nhật & bảo trì tài liệu", level=1)
    for t in ["Lưu dạng số (Google Docs/Notion) là bản gốc; bản in chỉ là snapshot có ghi ngày.",
              "Footer mọi tài liệu: \"Phiên bản X.Y — Tháng/Năm — Owner: [tên] — Review kế tiếp: [tháng]\".",
              "Rà soát mỗi quý (nửa ngày): model/tính năng mới, đổi giao diện, cập nhật tên gọi, rà soát pháp lý mới.",
              "Ưu tiên cập nhật trước: bảng so sánh ChatGPT vs Gemini và mục tạo ảnh (xuống cấp nhanh nhất)."]:
        p(doc, t, bullet=True, size=8.5)

    add_heading(doc, "9. Tài liệu trong bộ này", level=1)
    add_table(doc, ["File", "Vai trò"], [
        ["00-ke-hoach-dao-tao-AI.docx", "Kế hoạch này — để lãnh đạo duyệt"],
        ["01-cam-nang-su-dung-AI.docx", "Cẩm nang phát tay — để học viên mang về"],
        ["02-slide-de-cuong.md → .pptx", "Đề cương slide — để dựng PowerPoint/Canva"],
        ["03-bao-cao-audit.md", "Báo cáo kiểm toán nội dung — bằng chứng đối chiếu"],
        ["04-ban-rut-gon.docx", "Bản rút gọn 4 trang chữ 14pt — cho người lớn tuổi"],
    ], col_widths=[2.2, 4.9])

    add_heading(doc, "10. Checklist hậu cần", level=1)
    p(doc, "Trước Buổi 1:", size=9, bold=True)
    for t in ["Máy chiếu, mic, loa, wifi (+ 4G dự phòng)", "Mỗi HV có tài khoản ChatGPT & Gemini đăng nhập được", "Gửi video 5 phút + pre-test 10 câu", "In cẩm nang, thẻ prompt, bản rút gọn 4 trang chữ 14pt", "5-6 file mẫu demo: biên bản 2 trang, bảng Excel, ảnh SP, công văn, đoạn văn lủng củng", "Tạo Google Form pre-test, post-test (giống hệt), khảo sát"]:
        p(doc, t, bullet=True, size=8.5)
    p(doc, "Trước Buổi 2:", size=9, bold=True)
    for t in ["Nhắc HV mang việc thật đã ẩn dữ liệu (nhắc 2 lần: 3 ngày và 1 ngày trước)", "Trưởng phòng đã duyệt template của phòng", "Lập nhóm Zalo hỏi đáp + công bố lịch office hours", "Chỉ định Owner + Champion từng phòng"]:
        p(doc, t, bullet=True, size=8.5)
    p(doc, "Sau khóa:", size=9, bold=True)
    for t in ["Chấm bài theo rubric, ghi nhận phòng làm tốt", "Chạy khảo sát 30 ngày, báo cáo lãnh đạo số giờ tiết kiệm", "Đưa lịch rà soát quý vào calendar của Owner"]:
        p(doc, t, bullet=True, size=8.5)

    add_heading(doc, "11. Rủi ro & cách xử lý", level=1)
    add_table(doc, ["Rủi ro", "Xử lý"], [
        ["HV lớn tuổi ngại công nghệ, choáng thuật ngữ", "Bản rút gọn 4 trang chữ 14pt + 3 video + ngồi cặp mạnh-yếu + đổi tên kỹ thuật sang tiếng Việt đời thường"],
        ["Nỗi lo \"AI thay việc\" → chống đối ngầm", "Nói thẳng ngay mở đầu Buổi 1: AI lấy việc lặp lại, không lấy việc phán đoán; cam kết nhân sự của công ty"],
        ["HV không mang việc thật → Buổi 2 quay về demo", "Bắt buộc nộp trước 1 việc thật qua form 24h trước; bàn chưa nộp dùng bộ dữ liệu mẫu giả lập"],
        ["HV dán dữ liệu nhạy cảm trong thực hành", "Nhắc 5 điều cấm ngay đầu Buổi 1; trợ giảng quét màn hình; luôn dùng dữ liệu đã che"],
        ["Sau đào tạo rơi rụng", "Office hours + showcase hàng tháng + khảo sát 30 ngày + template phải được trưởng phòng duyệt"],
        ["HV nghỉ giữa hai buổi", "Video tổng kết + cho phép học bù; Champion truyền lại"],
        ["Wifi yếu / không đăng nhập được", "Tài khoản dự phòng + ảnh chụp màn hình backup cho mọi demo"],
        ["Nhân sự vắng nhiều vì bận đơn hàng", "2 khung giờ cho mỗi buổi; xin duyệt thời lượng tính vào giờ làm"],
    ], col_widths=[2.0, 5.1])

    add_heading(doc, "12. Cần xác nhận trước khi chốt in ấn", level=1)
    for idx, t in enumerate([
        "Logo & màu sắc: theo docs/design-system.md (xanh #2563EB) hay bộ nhận diện riêng?",
        "Ngôn ngữ: 100% tiếng Việt (đề xuất) hay song ngữ Việt-Anh cho thuật ngữ?",
        "In ấn: in màu toàn bộ hay đen trắng (ảnh hưởng highlight 5 màu)?",
        "Tài khoản demo: tạo 1-2 tài khoản Plus/Advanced dùng chung để demo tính năng trả phí, hay chỉ bản miễn phí?",
        "Owner chương trình: chỉ định ai sở hữu tài liệu và lịch cập nhật quý? (bắt buộc)",
        "Có cho phép dùng dữ liệu thật đã che danh tính không, hay yêu cầu 100% dữ liệu giả trong đào tạo?",
    ], 1):
        p(doc, f"{idx}. {t}", size=8.5)
    p(doc, "Sau khi lãnh đạo duyệt bản 2.0 này, dựng slide PowerPoint và xuất PDF để in.", size=8, color=SLATE_500, italic=True)

    doc.save(OUT_KE_HOACH)
    print(f"Saved {OUT_KE_HOACH}")

import docx.enum.table

if __name__ == "__main__":
    build_cam_nang()
    build_rut_gon()
    build_ke_hoach()
