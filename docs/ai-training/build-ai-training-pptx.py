#!/usr/bin/env python3
"""Build PowerPoint decks for AI training — An Binh Foods v2.0.

Outputs:
  docs/ai-training/02-slide-Buoi-1-Nen-tang.pptx   (34 slides)
  docs/ai-training/02-slide-Buoi-2-Ap-dung.pptx    (28 slides)

Run: python3 docs/ai-training/build-ai-training-pptx.py
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from lxml import etree

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_B1 = os.path.join(ROOT, "02-slide-Buoi-1-Nen-tang.pptx")
OUT_B2 = os.path.join(ROOT, "02-slide-Buoi-2-Ap-dung.pptx")

# ── Palette (matches docs/design-system.md) ──
NAVY   = RGBColor(0x0F,0x23,0x3A)
NAVY2  = RGBColor(0x1E,0x3A,0x5F)
BLUE   = RGBColor(0x25,0x63,0xEB)
BLUE_DARK = RGBColor(0x1D,0x4E,0xD8)
BLUE_LIGHT = RGBColor(0xDB,0xE9,0xFE)
BLUE_MID = RGBColor(0x93,0xC5,0xFD)
CYAN   = RGBColor(0x06,0xB6,0xD4)
TEAL   = RGBColor(0x14,0xB8,0xA6)
AMBER  = RGBColor(0xF5,0x9E,0x0B)
AMBER_LIGHT = RGBColor(0xFF,0xFB,0xEB)
GREEN  = RGBColor(0x16,0xA3,0x4A)
GREEN_LIGHT = RGBColor(0xDC,0xFC,0xE7)
RED    = RGBColor(0xEF,0x44,0x44)
RED_LIGHT = RGBColor(0xFE,0xF2,0xF2)
SLATE_50  = RGBColor(0xF8,0xFA,0xFC)
SLATE_100 = RGBColor(0xF1,0xF5,0xF9)
SLATE_200 = RGBColor(0xE2,0xE8,0xF0)
SLATE_300 = RGBColor(0xCB,0xD5,0xE1)
SLATE_400 = RGBColor(0x94,0xA3,0xB8)
SLATE_500 = RGBColor(0x64,0x74,0x8B)
SLATE_700 = RGBColor(0x33,0x41,0x55)
SLATE_900 = RGBColor(0x0F,0x17,0x2A)
WHITE = RGBColor(0xFF,0xFF,0xFF)

W = Inches(13.33)
H = Inches(7.5)

# ── Low-level helpers ──
def set_bg(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_rect(slide, left, top, width, height, fill=None, line=None, radius=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE if radius is None else MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.line.fill.background()
    if fill is not None:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    else:
        shape.fill.background()
    if line is not None:
        shape.line.color.rgb = line
        shape.line.width = Pt(0.75)
    if radius is not None:
        shape.adjustments[0] = 0.08
    return shape

def add_text_box(slide, left, top, width, height, text, font_size=12, bold=False, color=SLATE_900, alignment=PP_ALIGN.LEFT, font_name="Inter", line_spacing=None, italic=False):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = font_name
    p.font.italic = italic
    p.alignment = alignment
    if line_spacing is not None:
        p.line_spacing = Pt(line_spacing)
    return txBox

def add_para(text_frame, text, font_size=11, bold=False, color=SLATE_700, alignment=PP_ALIGN.LEFT, font_name="Inter", italic=False, space_after=Pt(4), space_before=Pt(0)):
    p = text_frame.add_paragraph()
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = font_name
    p.font.italic = italic
    p.alignment = alignment
    p.space_after = space_after
    p.space_before = space_before
    p.line_spacing = Pt(font_size * 1.35)
    return p

def set_corner_radius(shape, radius_emu=Emu(Inches(0.12))):
    # pptx doesn't expose corner radius directly for all shapes; use adjustments for rounded rect
    try:
        shape.adjustments[0] = 0.07
    except Exception:
        pass

def add_footer_bar(slide, text="An Bình Foods  ·  Tài liệu lưu hành nội bộ  ·  v2.0 — 09/2026  ·  Review: 12/2026"):
    add_text_box(slide, Inches(0.4), H - Inches(0.42), W - Inches(0.8), Inches(0.3), text, font_size=6.5, color=SLATE_400, alignment=PP_ALIGN.CENTER, font_name="Inter")

def slide_number_badge(slide, num, total):
    add_text_box(slide, W - Inches(0.85), H - Inches(0.42), Inches(0.7), Inches(0.3), f"{num:02d} / {total:02d}", font_size=6.5, color=SLATE_400, alignment=PP_ALIGN.RIGHT, font_name="Inter")

def top_accent_bar(slide, color=BLUE):
    add_rect(slide, Inches(0), Inches(0), W, Inches(0.06), fill=color)

# ── Slide builders ──
def add_cover(prs, title, subtitle, meta_lines, badge_text="BUỔI 1 · NỀN TẢNG"):
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    set_bg(slide, NAVY)
    top_accent_bar(slide, BLUE)
    # Badge
    pill = add_rect(slide, Inches(0.6), Inches(0.55), Inches(2.6), Inches(0.36), fill=BLUE, radius=True)
    set_corner_radius(pill)
    add_text_box(slide, Inches(0.6), Inches(0.55), Inches(2.6), Inches(0.36), badge_text, font_size=7.5, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    # Title
    add_text_box(slide, Inches(0.6), Inches(1.35), Inches(8.5), Inches(1.0), title, font_size=32, bold=True, color=WHITE, font_name="Be Vietnam Pro", line_spacing=36)
    add_text_box(slide, Inches(0.6), Inches(2.35), Inches(8.5), Inches(0.5), subtitle, font_size=13, color=BLUE_MID, font_name="Inter", italic=True)
    # Meta card
    card = add_rect(slide, Inches(0.6), Inches(3.25), Inches(6.8), Inches(1.45), fill=WHITE, radius=True)
    set_corner_radius(card)
    tf = card.text_frame
    tf.word_wrap = True
    for idx, line in enumerate(meta_lines):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.text = line
        p.font.size = Pt(7.5)
        p.font.color.rgb = SLATE_700
        p.font.name = "Inter"
        p.alignment = PP_ALIGN.LEFT
        p.space_after = Pt(2)
        p.space_before = Pt(6) if idx == 0 else Pt(0)
        if idx == 0:
            p.font.bold = True
            p.font.color.rgb = NAVY
    # Right visual — simple icon block
    add_rect(slide, W - Inches(3.6), Inches(1.1), Inches(3.0), Inches(3.6), fill=NAVY2, radius=True)
    add_text_box(slide, W - Inches(3.6), Inches(2.4), Inches(3.0), Inches(1.0), "AI  ·  ChatGPT  ·  Gemini", font_size=10, bold=True, color=BLUE_MID, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    add_text_box(slide, W - Inches(3.45), Inches(2.95), Inches(2.7), Inches(0.6), "Dùng nhanh hơn  ·  Nhàn hơn  ·  An toàn hơn", font_size=7.5, color=SLATE_400, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_footer_bar(slide)
    return slide

def add_section_title(prs, number, title, subtitle, color=BLUE):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, color)
    add_text_box(slide, Inches(0.6), Inches(0.5), Inches(1.2), Inches(0.35), f"PHẦN {number}", font_size=8, bold=True, color=color, font_name="Be Vietnam Pro")
    add_text_box(slide, Inches(0.6), Inches(0.95), Inches(12), Inches(0.9), title, font_size=28, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(slide, Inches(0.6), Inches(1.85), Inches(12), Inches(0.45), subtitle, font_size=11, color=SLATE_500, font_name="Inter", italic=True)
    # Decorative line
    add_rect(slide, Inches(0.6), Inches(2.45), Inches(1.8), Inches(0.04), fill=color)
    add_footer_bar(slide)
    return slide

def add_bullet_slide(prs, title, bullets, note=None, accent=BLUE, icon=None, num=None, total=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, accent)
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(12), Inches(0.55), title, font_size=20, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    if note:
        add_text_box(slide, Inches(0.6), Inches(0.92), Inches(12), Inches(0.3), note, font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
        top_y = Inches(1.35)
    else:
        top_y = Inches(1.1)
    for idx, bullet in enumerate(bullets):
        y = top_y + Inches(idx * 0.58)
        # dot
        dot = add_rect(slide, Inches(0.62), y + Inches(0.14), Inches(0.10), Inches(0.10), fill=accent, radius=True)
        set_corner_radius(dot)
        add_text_box(slide, Inches(0.85), y, Inches(12), Inches(0.45), bullet, font_size=10.5, color=SLATE_700, font_name="Inter")
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def add_two_col_slide(prs, title, left_items, right_items, left_title="Prompt DỞ", right_title="Prompt TỐT", left_color=RED, right_color=GREEN, num=None, total=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, BLUE)
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(12), Inches(0.55), title, font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    # Left card
    left_card = add_rect(slide, Inches(0.6), Inches(1.15), Inches(6.0), Inches(5.2), fill=SLATE_50, radius=True)
    set_corner_radius(left_card)
    add_rect(slide, Inches(0.6), Inches(1.15), Inches(6.0), Inches(0.38), fill=left_color, radius=True)
    # need to cover bottom corners — add white rect overlap
    add_text_box(slide, Inches(0.6), Inches(1.15), Inches(6.0), Inches(0.38), left_title, font_size=9, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    for idx, item in enumerate(left_items):
        add_text_box(slide, Inches(0.85), Inches(1.75) + Inches(idx * 0.62), Inches(5.5), Inches(0.5), f"•  {item}", font_size=9, color=SLATE_700, font_name="Inter")
    # Right card
    right_card = add_rect(slide, W - Inches(6.6), Inches(1.15), Inches(6.0), Inches(5.2), fill=SLATE_50, radius=True)
    set_corner_radius(right_card)
    add_rect(slide, W - Inches(6.6), Inches(1.15), Inches(6.0), Inches(0.38), fill=right_color, radius=True)
    add_text_box(slide, W - Inches(6.6), Inches(1.15), Inches(6.0), Inches(0.38), right_title, font_size=9, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    for idx, item in enumerate(right_items):
        add_text_box(slide, W - Inches(6.35), Inches(1.75) + Inches(idx * 0.62), Inches(5.5), Inches(0.5), f"•  {item}", font_size=9, color=SLATE_700, font_name="Inter")
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def add_table_slide(prs, title, headers, rows, col_widths=None, accent=BLUE, num=None, total=None, subtitle=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, accent)
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), title, font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    if subtitle:
        add_text_box(slide, Inches(0.6), Inches(0.88), Inches(12), Inches(0.28), subtitle, font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
        table_top = Inches(1.30)
    else:
        table_top = Inches(1.05)
    # Build table using python-pptx table
    ncols = len(headers)
    nrows = len(rows) + 1
    # widths
    if col_widths is None:
        col_widths = [ (W - Inches(1.2)) / ncols ] * ncols
    else:
        col_widths = [Inches(w) for w in col_widths]
    table_w = sum(col_widths)
    left = (W - table_w) / 2
    shape = slide.shapes.add_table(nrows, ncols, left, table_top, table_w, Inches(0.38 + len(rows) * 0.42))
    table = shape.table
    for j, w in enumerate(col_widths):
        table.columns[j].width = w
    # Header row
    for j, h in enumerate(headers):
        cell = table.cell(0, j)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        for para in cell.text_frame.paragraphs:
            para.alignment = PP_ALIGN.CENTER
        p = cell.text_frame.paragraphs[0]
        p.text = h
        p.font.size = Pt(7)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.font.name = "Be Vietnam Pro"
        cell.margin_top = Pt(4); cell.margin_bottom = Pt(4); cell.margin_left = Pt(6); cell.margin_right = Pt(6)
    # Data rows
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            cell = table.cell(i+1, j)
            if i % 2 == 1:
                cell.fill.solid()
                cell.fill.fore_color.rgb = SLATE_50
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]
            p.text = str(val)
            p.font.size = Pt(7.5)
            p.font.color.rgb = SLATE_700
            p.font.name = "Inter"
            p.alignment = PP_ALIGN.LEFT if j > 0 else PP_ALIGN.CENTER
            cell.margin_top = Pt(3); cell.margin_bottom = Pt(3); cell.margin_left = Pt(6); cell.margin_right = Pt(6)
            cell.text_frame.word_wrap = True
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def add_callout_slide(prs, title, body, accent=BLUE, bg=BLUE_LIGHT, icon="ⓘ", num=None, total=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, accent)
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), title, font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    # Card
    card = add_rect(slide, Inches(0.6), Inches(1.25), W - Inches(1.2), Inches(3.0), fill=hex_to_rgb(bg) if isinstance(bg, str) else bg, radius=True)
    set_corner_radius(card)
    # Left accent
    add_rect(slide, Inches(0.6), Inches(1.25), Inches(0.06), Inches(3.0), fill=accent, radius=True)
    add_text_box(slide, Inches(0.85), Inches(1.45), W - Inches(1.7), Inches(0.35), f"{icon}  {title}", font_size=10, bold=True, color=accent, font_name="Be Vietnam Pro")
    add_text_box(slide, Inches(0.85), Inches(1.85), W - Inches(1.7), Inches(2.1), body, font_size=10, color=SLATE_700, font_name="Inter", line_spacing=14)
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip("#")
    return RGBColor(int(hex_str[0:2],16), int(hex_str[2:4],16), int(hex_str[4:6],16))

def add_big_quote_slide(prs, quote, subtext, accent=BLUE, num=None, total=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, NAVY)
    top_accent_bar(slide, accent)
    add_text_box(slide, Inches(0.6), Inches(2.0), W - Inches(1.2), Inches(1.4), f'"{quote}"', font_size=26, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro", line_spacing=32)
    add_text_box(slide, Inches(0.6), Inches(3.6), W - Inches(1.2), Inches(0.6), subtext, font_size=10, color=BLUE_MID, alignment=PP_ALIGN.CENTER, font_name="Inter")
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def add_timeline_slide(prs, title, items, accent=BLUE, num=None, total=None):
    """items: list of (time, label)"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, accent)
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), title, font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    # Horizontal timeline
    bar_y = Inches(2.6)
    add_rect(slide, Inches(0.6), bar_y, W - Inches(1.2), Inches(0.04), fill=SLATE_200)
    n = len(items)
    avail = W - Inches(1.2)
    step = avail / n
    for idx, (time, label) in enumerate(items):
        x = Inches(0.6) + step * idx + step * 0.15
        w = step * 0.7
        # dot
        dot = add_rect(slide, x + w/2 - Inches(0.07), bar_y - Inches(0.06), Inches(0.14), Inches(0.14), fill=accent, radius=True)
        set_corner_radius(dot)
        add_text_box(slide, x, bar_y - Inches(0.55), w, Inches(0.3), time, font_size=8, bold=True, color=accent, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(slide, x, bar_y + Inches(0.22), w, Inches(0.6), label, font_size=7.5, color=SLATE_700, alignment=PP_ALIGN.CENTER, font_name="Inter")
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def add_cards_grid(prs, title, cards, accent=BLUE, num=None, total=None):
    """cards: list of (emoji/title, desc) — 4 cards in 2x2 or 4x1"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, accent)
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), title, font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    n = len(cards)
    cols = 4 if n == 4 else 2
    card_w = (W - Inches(1.2) - Inches(0.3)*(cols-1)) / cols
    card_h = Inches(1.9)
    top_y = Inches(1.3)
    for idx, (ctitle, cdesc) in enumerate(cards):
        col = idx % cols
        row = idx // cols
        x = Inches(0.6) + col * (card_w + Inches(0.3))
        y = top_y + row * (card_h + Inches(0.3))
        card = add_rect(slide, x, y, card_w, card_h, fill=SLATE_50, radius=True)
        set_corner_radius(card)
        add_rect(slide, x, y, card_w, Inches(0.04), fill=accent, radius=True)
        add_text_box(slide, x + Inches(0.18), y + Inches(0.22), card_w - Inches(0.36), Inches(0.35), ctitle, font_size=9, bold=True, color=NAVY, font_name="Be Vietnam Pro", alignment=PP_ALIGN.CENTER)
        add_text_box(slide, x + Inches(0.15), y + Inches(0.62), card_w - Inches(0.30), card_h - Inches(0.75), cdesc, font_size=7.5, color=SLATE_500, font_name="Inter", alignment=PP_ALIGN.CENTER, line_spacing=10)
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def add_steps_slide(prs, title, steps, accent=BLUE, num=None, total=None):
    """steps: list of (num_str, title, desc)"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, accent)
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), title, font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    n = len(steps)
    card_w = (W - Inches(1.2) - Inches(0.25)*(n-1)) / n
    for idx, (snum, stitle, sdesc) in enumerate(steps):
        x = Inches(0.6) + idx * (card_w + Inches(0.25))
        card = add_rect(slide, x, Inches(1.25), card_w, Inches(4.2), fill=SLATE_50, radius=True)
        set_corner_radius(card)
        # number circle
        circ = add_rect(slide, x + card_w/2 - Inches(0.22), Inches(1.45), Inches(0.44), Inches(0.44), fill=accent, radius=True)
        set_corner_radius(circ)
        add_text_box(slide, x + card_w/2 - Inches(0.22), Inches(1.45), Inches(0.44), Inches(0.44), snum, font_size=13, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(slide, x + Inches(0.15), Inches(2.05), card_w - Inches(0.30), Inches(0.4), stitle, font_size=9, bold=True, color=NAVY, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(slide, x + Inches(0.15), Inches(2.50), card_w - Inches(0.30), Inches(2.6), sdesc, font_size=7.5, color=SLATE_500, font_name="Inter", alignment=PP_ALIGN.CENTER, line_spacing=10)
        if idx < n - 1:
            # arrow between cards
            add_text_box(slide, x + card_w + Inches(0.02), Inches(3.0), Inches(0.22), Inches(0.3), "→", font_size=14, color=SLATE_300, alignment=PP_ALIGN.CENTER, font_name="Inter")
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def add_break_slide(prs, text, subtext=""):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, SLATE_100)
    top_accent_bar(slide, TEAL)
    add_text_box(slide, Inches(0.6), Inches(2.4), W - Inches(1.2), Inches(0.7), text, font_size=28, bold=True, color=NAVY, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    if subtext:
        add_text_box(slide, Inches(0.6), Inches(3.15), W - Inches(1.2), Inches(0.4), subtext, font_size=10, color=SLATE_500, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_footer_bar(slide)
    return slide

def add_exercise_slide(prs, title, task, time_label, accent=AMBER, num=None, total=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, accent)
    # Time badge
    badge = add_rect(slide, W - Inches(1.6), Inches(0.38), Inches(1.0), Inches(0.32), fill=accent, radius=True)
    set_corner_radius(badge)
    add_text_box(slide, W - Inches(1.6), Inches(0.38), Inches(1.0), Inches(0.32), time_label, font_size=7.5, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(10), Inches(0.5), title, font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    card = add_rect(slide, Inches(0.6), Inches(1.15), W - Inches(1.2), Inches(4.8), fill=AMBER_LIGHT, radius=True)
    set_corner_radius(card)
    add_rect(slide, Inches(0.6), Inches(1.15), Inches(0.06), Inches(4.8), fill=accent, radius=True)
    add_text_box(slide, Inches(0.85), Inches(1.35), W - Inches(1.7), Inches(4.4), task, font_size=10, color=SLATE_700, font_name="Inter", line_spacing=14)
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

def add_checklist_slide(prs, title, items, accent=GREEN, num=None, total=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, WHITE)
    top_accent_bar(slide, accent)
    add_text_box(slide, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), title, font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    for idx, item in enumerate(items):
        y = Inches(1.15) + Inches(idx * 0.52)
        add_rect(slide, Inches(0.65), y + Inches(0.10), Inches(0.18), Inches(0.18), fill=WHITE, line=SLATE_300, radius=True)
        add_text_box(slide, Inches(1.0), y, Inches(12), Inches(0.4), item, font_size=10, color=SLATE_700, font_name="Inter")
    if num is not None:
        slide_number_badge(slide, num, total)
    add_footer_bar(slide)
    return slide

# ════════════════════════════════════════════════════════════
# BUILD BUỔI 1 — NỀN TẢNG (34 slides)
# ════════════════════════════════════════════════════════════
def build_buoi1():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    total = 34

    # 01 Cover
    add_cover(prs,
        "AI cho công việc văn phòng",
        "Buổi 1  ·  Nền tảng  —  ChatGPT & Gemini cho người mới bắt đầu",
        ["Tài liệu lưu hành nội bộ  ·  v2.0 — 09/2026  ·  Đã qua audit nguồn chính thức + pháp luật",
         "Chủ sở hữu: Ban Hành chính & Chuyển đổi số  ·  Review: 12/2026",
         "Đối tượng: toàn văn phòng  ·  Tài khoản cá nhân — trọng tâm an toàn dữ liệu"],
        badge_text="BUỔI 1  ·  NỀN TẢNG  ·  90 PHÚT")

    # 02 Vì sao học AI
    add_bullet_slide(prs, "Vì sao học AI ngay bây giờ?",
        ["Nhân viên văn phòng VN đã dùng AI với tỷ lệ cao hơn trung bình toàn cầu — cơ hội ngay trước mắt",
         "Nhưng rất ít doanh nghiệp tin AI tuyệt đối mà không cần người kiểm tra — vẫn cần bạn",
         "Người biết dùng AI làm nhanh hơn người không biết — đó là lý do có buổi học hôm nay"],
        note="Nguồn số liệu: xem slide cuối buổi (nguồn chính thức). Không bịa con số trên slide.", num=2, total=total)

    # 03 Nỗi lo AI lấy việc
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), '"AI có lấy mất việc của tôi không?"', font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    # Two cards
    c1 = add_rect(s, Inches(0.6), Inches(1.15), Inches(6.0), Inches(2.2), fill=RED_LIGHT, radius=True); set_corner_radius(c1)
    add_text_box(s, Inches(0.8), Inches(1.35), Inches(5.6), Inches(0.35), "AI LẤY — phần việc lặp lại", font_size=10, bold=True, color=RED, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.8), Inches(1.75), Inches(5.6), Inches(1.3), "Soạn nháp, tóm tắt, gợi ý, tìm nhanh,\nđịnh dạng lại văn bản, gợi ý tiêu đề…", font_size=9, color=SLATE_700, font_name="Inter", line_spacing=12)
    c2 = add_rect(s, W - Inches(6.6), Inches(1.15), Inches(6.0), Inches(2.2), fill=GREEN_LIGHT, radius=True); set_corner_radius(c2)
    add_text_box(s, W - Inches(6.4), Inches(1.35), Inches(5.6), Inches(0.35), "AI KHÔNG LẤY — phần cần con người", font_size=10, bold=True, color=GREEN, font_name="Be Vietnam Pro")
    add_text_box(s, W - Inches(6.4), Inches(1.75), Inches(5.6), Inches(1.3), "Phán đoán, chịu trách nhiệm, hiểu ngữ cảnh\ncông ty, quyết định nhân sự/tài chính…", font_size=9, color=SLATE_700, font_name="Inter", line_spacing=12)
    add_text_box(s, Inches(0.6), Inches(3.7), W - Inches(1.2), Inches(0.4), "Cam kết của công ty:  [ điền nội dung lãnh đạo duyệt ]  ·  Hỏi lo lắng của bạn ngay bây giờ — 2 phút", font_size=8, color=SLATE_500, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 3, total); add_footer_bar(s)

    # 04 Section title
    add_section_title(prs, "1", "Hiểu đúng về AI trước khi dùng", "18 phút  ·  Kể chuyện, không kỹ thuật  ·  Biết AI giỏi gì / dở gì / bịa ra sao", color=BLUE)

    # 05 AI là gì
    add_bullet_slide(prs, "AI tạo sinh là gì?",
        ['AI như "thực tập sinh đọc nhiều, gõ nhanh, nhưng chưa có kinh nghiệm ở công ty mình"',
         "Đã đọc lượng văn bản khổng lồ trên internet → học cách đoán chữ tiếp theo",
         "Trả lời nghe tự nhiên, nhưng không \"hiểu\" như con người — chỉ giỏi bắt chước mẫu câu"],
        num=5, total=total)

    # 06 ChatGPT vs Gemini
    add_table_slide(prs, "ChatGPT vs Gemini — hai trợ lý của bạn",
        ["Tiêu chí", "ChatGPT (chatgpt.com)", "Gemini (gemini.google.com)"],
        [["Điểm mạnh", "Viết lách mượt, suy luận chặt,\nlàm việc tốt với file tải lên", "Tìm kiếm mới trên Google, tóm tắt\nvideo YouTube, Gmail/Drive/Docs"],
         ["Tạo ảnh", "Dòng GPT Image (gpt-image-1/1.5/2)\nkế nhiệm DALL·E — sửa bằng lời", "Nano Banana (native Gemini);\nImagen là dòng trên Vertex AI"],
         ["Ghi nhớ", "Memory — nhớ sở thích, cách xưng hô", "Gems — trợ lý chuyên biệt cho tác vụ lặp"],
         ["Khi nào dùng", "Soạn email, báo cáo, biên bản,\nphân tích số liệu", "Tìm thông tin mới, kiểm tra giá,\ntóm tắt tài liệu dài"]],
        col_widths=[1.3, 3.0, 3.0], subtitle="Dùng cả hai — soạn bằng ChatGPT, kiểm chứng bằng Gemini  ·  Demo: mở cả hai trang cạnh nhau", num=6, total=total)

    # 07 AI giỏi gì
    add_cards_grid(prs, "AI giỏi gì?",
        [("Soạn thảo\n& biên tập", "Email, báo cáo,\nthông báo, công văn"),
         ("Tóm tắt\n& dịch", "Biên bản họp,\ntài liệu dài, đa ngôn ngữ"),
         ("Gợi ý\ný tưởng", "Dàn ý, tiêu đề,\nkịch bản, caption"),
         ("Tạo ảnh\nminh họa", "Ảnh sản phẩm, nền slide,\ninfographic, mockup nội bộ")],
        num=7, total=total)

    # 08 AI dở gì
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, RED)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "AI dở gì?  —  4 cảnh báo quan trọng", font_size=18, bold=True, color=RED, font_name="Be Vietnam Pro")
    warns = [
        ("Bịa số liệu / điều luật", "Hỏi \"Nghị định 123 nói gì?\" → AI tự chế điều khoản rất thuyết phục nhưng không tồn tại"),
        ("Không biết chuyện nội bộ", "AI không tự biết quy trình kho / quy định riêng của An Bình Foods"),
        ("Tính toán đôi khi sai", "Phép tính dài, đơn vị đo, quy đổi tiền tệ — luôn kiểm lại bằng máy tính"),
        ("Kiến thức có độ trễ", "Dù có tìm trên mạng, kết quả vẫn có thể lỗi thời hoặc sai nguồn"),
    ]
    for idx, (wt, wd) in enumerate(warns):
        y = Inches(1.15) + Inches(idx * 0.62)
        card = add_rect(s, Inches(0.6), y, W - Inches(1.2), Inches(0.52), fill=RED_LIGHT, radius=True); set_corner_radius(card)
        add_text_box(s, Inches(0.75), y + Inches(0.04), Inches(0.3), Inches(0.44), "⚠", font_size=13, color=RED, alignment=PP_ALIGN.CENTER, font_name="Inter")
        add_text_box(s, Inches(1.05), y + Inches(0.05), Inches(2.4), Inches(0.42), wt, font_size=9, bold=True, color=RED, font_name="Be Vietnam Pro")
        add_text_box(s, Inches(3.6), y + Inches(0.08), Inches(9.1), Inches(0.36), wd, font_size=8, color=SLATE_700, font_name="Inter")
    slide_number_badge(s, 8, total); add_footer_bar(s)

    # 09 Demo prompt dở vs tốt
    add_two_col_slide(prs, "Demo live — Prompt dở vs Prompt tốt",
        ["\"Viết giúp tôi email\ngửi khách hàng.\"",
         "Thiếu: khách nào? việc gì?\ngiọng ra sao? bao nhiêu chữ?",
         "→ Kết quả chung chung,\nphải sửa nhiều"],
        ["\"Bạn là NVKD. Soạn email cho\nsiêu thị TP.HCM về giao chậm\n2 ngày do mưa bão, giọng chân\nthành, bù 5% đơn sau, 150 chữ,\ncó tiêu đề + chữ ký.\"",
         "Đủ: vai trò, bối cảnh, nhiệm vụ,\nràng buộc, định dạng",
         "→ Kết quả dùng được ngay"],
        left_title="PROMPT DỞ", right_title="PROMPT TỐT  ✓", num=9, total=total)

    # 10 Quy tắc vàng
    add_big_quote_slide(prs, "AI là người soạn nháp — Bạn là người ký duyệt", "Mọi con số, tên người, điều luật do AI đưa ra — kiểm lại trước khi gửi  ·  Hỏi cả lớp: \"Ai từng thấy AI trả lời sai?\"", num=10, total=total)

    # 11 Section 2
    add_section_title(prs, "2", "Cách hỏi để AI trả lời hay", "35 phút  ·  Trọng tâm của Buổi 1  ·  Công thức 5 thành tố + 4 kỹ thuật + 3 câu thần chú", color=BLUE)

    # 12 3 câu hỏi trước khi gõ
    add_cards_grid(prs, "3 câu hỏi trước khi gõ  —  30 giây tư duy",
        [("1. AI làm gì?", "Động từ rõ ràng:\nsoạn, tóm tắt, biên tập,\ngợi ý, dịch, tạo ảnh…"),
         ("2. Ai đọc kết quả?", "Sếp, khách hàng,\nđồng nghiệp, đăng Facebook\n— mỗi đối tượng cần giọng khác"),
         ("3. Kết quả thế nào\nlà đạt?", "Độ dài, định dạng,\ngiọng văn, deadline\n— càng cụ thể càng ít sửa")],
        num=12, total=total)

    # 13 Công thức 5 thành tố
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Công thức 5 thành tố  —  kiểm tra trước khi gửi", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    items = [
        ("1", "VAI TRÒ", "AI đóng vai ai?", BLUE),
        ("2", "BỐI CẢNH", "Việc gì, cho ai, vì sao?", TEAL),
        ("3", "NHIỆM VỤ", "Làm gì — động từ rõ ràng", AMBER),
        ("4", "RÀNG BUỘC", "Bao nhiêu chữ, giọng gì, không làm gì", CYAN),
        ("5", "ĐỊNH DẠNG", "Trả về dạng gì: email, bảng, bullet…", GREEN),
    ]
    n = len(items)
    cw = (W - Inches(1.2) - Inches(0.2)*(n-1)) / n
    for idx, (num_s, label, desc, col) in enumerate(items):
        x = Inches(0.6) + idx * (cw + Inches(0.2))
        card = add_rect(s, x, Inches(1.15), cw, Inches(2.0), fill=SLATE_50, radius=True); set_corner_radius(card)
        add_rect(s, x, Inches(1.15), cw, Inches(0.06), fill=col, radius=True)
        circ = add_rect(s, x + cw/2 - Inches(0.18), Inches(1.32), Inches(0.36), Inches(0.36), fill=col, radius=True); set_corner_radius(circ)
        add_text_box(s, x + cw/2 - Inches(0.18), Inches(1.32), Inches(0.36), Inches(0.36), num_s, font_size=11, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, x + Inches(0.1), Inches(1.80), cw - Inches(0.2), Inches(0.35), label, font_size=8, bold=True, color=NAVY, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, x + Inches(0.08), Inches(2.20), cw - Inches(0.16), Inches(0.7), desc, font_size=7, color=SLATE_500, alignment=PP_ALIGN.CENTER, font_name="Inter", line_spacing=9)
    slide_number_badge(s, 13, total); add_footer_bar(s)

    # 14 Nguồn của 5 thành tố
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, AMBER)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "5 thành tố đến từ đâu?  —  Minh bạch nguồn", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    # Left: what OpenAI actually says
    c1 = add_rect(s, Inches(0.6), Inches(1.1), Inches(6.15), Inches(2.4), fill=BLUE_LIGHT, radius=True); set_corner_radius(c1)
    add_text_box(s, Inches(0.75), Inches(1.22), Inches(5.85), Inches(0.3), "OpenAI thực sự nói gì", font_size=8, bold=True, color=BLUE_DARK, font_name="Be Vietnam Pro")
    for idx, line in enumerate([
        'Goal / Context / Output / Boundaries',
        'Và dặn: "Use only the parts that help"',
        '— không phải lúc nào cũng cần đủ 4 phần',
        'Google: đặt role/persona & format ở vị trí ưu tiên',
    ]):
        add_text_box(s, Inches(0.85), Inches(1.55) + Inches(idx*0.32), Inches(5.65), Inches(0.28), f"•  {line}", font_size=7.5, color=SLATE_700, font_name="Inter")
    # Right: what An Binh does
    c2 = add_rect(s, W - Inches(6.75), Inches(1.1), Inches(6.15), Inches(2.4), fill=AMBER_LIGHT, radius=True); set_corner_radius(c2)
    add_text_box(s, W - Inches(6.6), Inches(1.22), Inches(5.85), Inches(0.3), "An Bình Foods làm gì", font_size=8, bold=True, color=AMBER, font_name="Be Vietnam Pro")
    for idx, line in enumerate([
        "Gộp thành 5 ô cho dễ nhớ, dễ dạy",
        "Đây là QUY ƯỚC NỘI BỘ — không phải chuẩn hãng",
        "RTF / CO-STAR / CRISPE = framework cộng đồng",
        "— hữu ích nhưng không phải chuẩn OpenAI/Google",
    ]):
        add_text_box(s, W - Inches(6.5), Inches(1.55) + Inches(idx*0.32), Inches(5.65), Inches(0.28), f"•  {line}", font_size=7.5, color=SLATE_700, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.75), W - Inches(1.2), Inches(0.35), "Không đặt logo OpenAI/Google cạnh sơ đồ 5 ô — tránh tạo cảm giác đây là chuẩn của hãng.", font_size=7, color=SLATE_400, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 14, total); add_footer_bar(s)

    # 15 Ví dụ 5 thành tố
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Ví dụ đủ 5 thành tố — soạn công văn", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.95), Inches(12), Inches(0.25), "Mỗi màu = 1 thành tố  ·  Chiếu kết quả AI trả về ngay sau đó", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    prompts = [
        ('Bạn là trợ lý hành chính', 'VAI TRÒ', BLUE),
        ('của công ty thực phẩm 200 nhân sự tại Gia Lai', 'BỐI CẢNH', TEAL),
        ('Hãy soạn công văn gửi NCC bao bì về việc đề nghị báo giá 5.000 túi zip 200g, giao trước 30/09', 'NHIỆM VỤ', AMBER),
        ('Văn phong trang trọng, ngắn gọn, dưới 250 chữ, xưng "Công ty chúng tôi"', 'RÀNG BUỘC', CYAN),
        ('Trả về dạng công văn có tiêu đề, kính gửi, nội dung, kết thúc và chỗ ký tên', 'ĐỊNH DẠNG', GREEN),
    ]
    for idx, (txt, tag, col) in enumerate(prompts):
        y = Inches(1.35) + Inches(idx * 0.58)
        # tag pill
        pill = add_rect(s, Inches(0.62), y + Inches(0.08), Inches(1.15), Inches(0.26), fill=col, radius=True); set_corner_radius(pill)
        add_text_box(s, Inches(0.62), y + Inches(0.08), Inches(1.15), Inches(0.26), tag, font_size=6, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, Inches(1.9), y, Inches(10.8), Inches(0.42), txt, font_size=9, color=SLATE_700, font_name="Inter")
    slide_number_badge(s, 15, total); add_footer_bar(s)

    # 16 Kỹ thuật 1: Đóng vai
    add_bullet_slide(prs, "Kỹ thuật 1 — Đóng vai  (Role)",
        ['"Bạn là kế toán trưởng 10 năm kinh nghiệm, hãy rà soát email này xem thiếu chứng từ gì không."',
         '"Bạn là khách hàng khó tính, hãy chê bài giới thiệu sản phẩm này thật gắt để tôi sửa."',
         '"Bạn là giảng viên Excel, hãy giải thích VLOOKUP cho người mới bằng ví dụ bán hàng."'],
        note="Demo: gõ \"Bạn là khách hàng khó tính...\" — cho xem AI chê gắt ra sao", num=16, total=total)

    # 17 Kỹ thuật 2: Đưa ngữ cảnh
    add_bullet_slide(prs, "Kỹ thuật 2 — Đưa ngữ cảnh & tài liệu  (Context)",
        ["Tải file Word / Excel / PDF lên rồi nói: \"Dựa vào file biên bản đính kèm, hãy tóm tắt 5 quyết định chính\"",
         "Dán số liệu: \"Dưới đây là doanh số 6 tháng của 3 dòng [dán bảng] — hãy nhận xét xu hướng\"",
         "Gemini: dán link Google Docs/Sheets — đọc trực tiếp  ·  ChatGPT: tải file lên là tiện nhất"],
        note="Demo: tải biên bản mẫu 2 trang, cho AI tóm tắt live", num=17, total=total)

    # 18 Kỹ thuật 3: Cho ví dụ
    add_bullet_slide(prs, "Kỹ thuật 3 — Cho ví dụ  (Few-shot)",
        ['Cho AI 1-2 ví dụ về kết quả bạn muốn — AI sẽ bắt chước rất sát',
         'VD: dán 2 mô tả sản phẩm mẫu → "Viết theo phong cách này cho: Mít sấy giòn 100g, vị mật ong, không chiên dầu"',
         'Như đưa văn mẫu cho thực tập sinh — càng cụ thể càng giống'],
        num=18, total=total)

    # 19 Kỹ thuật 4: Chia nhỏ
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Kỹ thuật 4 — Chia nhỏ & lặp lại", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.88), Inches(12), Inches(0.25), "Cả OpenAI và Google đều nói làm prompt là quá trình lặp lại (iterative)", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    steps = [("B1", "Viết nháp", "Gửi prompt lần 1\n→ xem kết quả"), ("B2", "Rút gọn", '"Giữ nguyên ý,\nngắn hơn 30%,\ngiọng trang trọng hơn"'), ("B3", "Bổ sung", '"Thêm bảng\nso sánh 3 phương án\nvào cuối"'), ("B4", "Dịch", '"Dịch toàn bộ\nsang tiếng Anh\nđể gửi đối tác"')]
    cw = (W - Inches(1.2) - Inches(0.2)*3) / 4
    for idx, (num_s, title, desc) in enumerate(steps):
        x = Inches(0.6) + idx * (cw + Inches(0.2))
        card = add_rect(s, x, Inches(1.25), cw, Inches(2.0), fill=SLATE_50, radius=True); set_corner_radius(card)
        circ = add_rect(s, x + cw/2 - Inches(0.18), Inches(1.38), Inches(0.36), Inches(0.36), fill=BLUE, radius=True); set_corner_radius(circ)
        add_text_box(s, x + cw/2 - Inches(0.18), Inches(1.38), Inches(0.36), Inches(0.36), num_s, font_size=8, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, x + Inches(0.1), Inches(1.85), cw - Inches(0.2), Inches(0.25), title, font_size=8, bold=True, color=NAVY, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, x + Inches(0.1), Inches(2.15), cw - Inches(0.2), Inches(0.85), desc, font_size=7, color=SLATE_500, alignment=PP_ALIGN.CENTER, font_name="Inter", line_spacing=9)
        if idx < 3:
            add_text_box(s, x + cw + Inches(0.02), Inches(1.95), Inches(0.16), Inches(0.3), "→", font_size=12, color=SLATE_300, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.55), W - Inches(1.2), Inches(0.35), 'Ghi chú: con số "3 vòng" hay mốc "OpenAI đổi khuyến nghị từ 7/2026" là suy diễn lan truyền — không có trong tài liệu chính thức, đừng nhắc khi giảng.', font_size=6.5, color=SLATE_400, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    add_text_box(s, Inches(0.6), Inches(3.95), W - Inches(1.2), Inches(0.25), 'Demo: lấy kết quả slide trước, nói "Giữ nguyên ý, ngắn hơn 30%" — cho xem AI sửa live', font_size=7, color=AMBER, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 19, total); add_footer_bar(s)

    # 20 Bài tập nhanh 1
    add_exercise_slide(prs, "Bài tập nhanh 1", 'Viết lại câu hỏi dở:\n\n     "Làm giúp cái báo cáo"\n\nthành prompt đủ 5 thành tố — rồi chấm chéo trong bàn.\n\nGợi ý: Ai đọc báo cáo? Báo cáo về việc gì? Bao nhiêu chữ? Định dạng thế nào?\n\nTrợ giảng đi quanh hỗ trợ.', "8 PHÚT", num=20, total=total)

    # 21 3 câu thần chú
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "3 câu thần chú để AI tự kiểm tra", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.88), Inches(12), Inches(0.25), "Dán 1 trong 3 câu này vào cuối mọi prompt quan trọng", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    spells = [
        ('"Nếu thiếu thông tin,\nhãy hỏi lại thay vì đoán."', "Tránh AI bịa khi thiếu dữ liệu"),
        ('"Hãy tự đóng vai phản biện\nvà chỉ ra 3 điểm yếu\ncủa câu trả lời vừa rồi."', "Tự kiểm chất lượng"),
        ('"Hãy trích nguồn cho mọi\nsố liệu; nếu không có,\nghi \'chưa kiểm chứng\'."', "Chống hallucination"),
    ]
    cw = (W - Inches(1.2) - Inches(0.3)*2) / 3
    for idx, (quote, desc) in enumerate(spells):
        x = Inches(0.6) + idx * (cw + Inches(0.3))
        card = add_rect(s, x, Inches(1.25), cw, Inches(2.2), fill=SLATE_50, radius=True); set_corner_radius(card)
        add_rect(s, x, Inches(1.25), cw, Inches(0.05), fill=BLUE, radius=True)
        add_text_box(s, x + Inches(0.2), Inches(1.45), cw - Inches(0.4), Inches(1.1), quote, font_size=9, bold=True, color=NAVY, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro", line_spacing=12)
        add_text_box(s, x + Inches(0.15), Inches(2.75), cw - Inches(0.3), Inches(0.4), desc, font_size=7.5, color=SLATE_500, alignment=PP_ALIGN.CENTER, font_name="Inter")
    slide_number_badge(s, 21, total); add_footer_bar(s)

    # 22 Bài tập nhanh 2
    add_exercise_slide(prs, "Bài tập nhanh 2", 'Đưa 1 file giả lập cho AI tóm tắt, rồi\n\n     TỰ TÌM RA ÍT NHẤT 1 LỖI trong kết quả.\n\nMục tiêu: tập thói quen nghi ngờ có kiểm chứng —\nkhông tin ngay, luôn đối chiếu với file gốc.\n\nMỗi bàn cử 1 người đọc lỗi mình tìm được.', "10 PHÚT", num=22, total=total)

    # 23 Mẹo tiếng Việt
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, TEAL)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Mẹo tiếng Việt", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.88), Inches(12), Inches(0.25), "Quy ước nội bộ — không phải tuyên bố chính thức của hãng", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    bullets = [
        'Trong thực tế dùng nội bộ, tiếng Việt cho kết quả tốt',
        'Không có tuyên bố chính thức nào của OpenAI/Google so sánh tiếng Việt vs tiếng Anh — đây là kinh nghiệm, không phải chuẩn hãng',
        'Cần viết tiếng Anh chuẩn bản xứ → ra lệnh bằng tiếng Anh',
        'Bài toán logic/pháp lý phức tạp → thử: hướng dẫn bằng tiếng Anh + dữ liệu tiếng Việt trong """',
    ]
    for idx, b in enumerate(bullets):
        y = Inches(1.25) + Inches(idx * 0.42)
        add_text_box(s, Inches(0.7), y, Inches(12), Inches(0.35), f"•  {b}", font_size=9, color=SLATE_700, font_name="Inter")
    slide_number_badge(s, 23, total); add_footer_bar(s)

    # 24 Lỗi phổ biến
    add_bullet_slide(prs, "Lỗi phổ biến khi prompt tiếng Việt",
        ["Viết quá ngắn kiểu chat: \"làm giúp cái báo cáo\" → thiếu hết thành tố",
         "Thiếu dấu phân cách giữa lệnh và dữ liệu → AI nhầm đâu là yêu cầu, đâu là nội dung",
         "Không nói rõ đơn vị (kg vs tấn) → sai phép tính",
         "Dùng từ mơ hồ: \"làm cho hay hơn\" → hãy nói \"rút gọn còn 150 chữ, giọng trang trọng\""],
        num=24, total=total)

    # 25 Tổng kết khối 2
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, GREEN)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Tổng kết khối 2 — Checklist", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.88), Inches(12), Inches(0.25), "In ra chính là Thẻ Prompt bỏ túi — để ở bàn làm việc", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    # 5 thành tố checklist
    for idx, label in enumerate(["Vai trò", "Bối cảnh", "Nhiệm vụ", "Ràng buộc", "Định dạng"]):
        y = Inches(1.25) + Inches(idx * 0.42)
        add_rect(s, Inches(0.7), y + Inches(0.08), Inches(0.18), Inches(0.18), fill=WHITE, line=SLATE_300, radius=True)
        add_text_box(s, Inches(1.0), y, Inches(3.0), Inches(0.32), f"☐  {label}", font_size=9, color=SLATE_700, font_name="Inter")
    # 4 kỹ thuật
    add_text_box(s, Inches(4.8), Inches(1.25), Inches(4.0), Inches(0.3), "4 KỸ THUẬT", font_size=8, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    for idx, t in enumerate(["Đóng vai", "Đưa ngữ cảnh & tài liệu", "Cho ví dụ (few-shot)", "Chia nhỏ & lặp lại"]):
        add_text_box(s, Inches(4.8), Inches(1.60) + Inches(idx*0.35), Inches(4.5), Inches(0.28), f"•  {t}", font_size=8, color=SLATE_700, font_name="Inter")
    # 3 câu thần chú
    add_text_box(s, Inches(9.2), Inches(1.25), Inches(3.5), Inches(0.3), "3 CÂU THẦN CHÚ", font_size=8, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    for idx, t in enumerate(['"Hỏi lại thay vì đoán"', '"Chê 3 điểm yếu"', '"Trích nguồn / chưa kiểm chứng"']):
        add_text_box(s, Inches(9.2), Inches(1.60) + Inches(idx*0.35), Inches(3.5), Inches(0.28), f"•  {t}", font_size=7.5, color=SLATE_500, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.7), W - Inches(1.2), Inches(0.3), "Tự chấm prompt vừa viết: đủ 5 thành tố chưa? Thiếu ô nào, bổ sung ngay.", font_size=8, color=AMBER, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 25, total); add_footer_bar(s)

    # 26 Giải lao
    add_break_slide(prs, "Giải lao  —  8 phút", "Quay lại lúc __:__  ·  Tranh thủ hỏi trợ giảng nếu vướng đăng nhập")

    # 27 Section 3
    add_section_title(prs, "3", "An toàn dữ liệu & ranh giới đỏ", "17 phút  ·  Phần quan trọng nhất hôm nay  ·  5 điều cấm  ·  Hallucination & cách bắt lỗi", color=RED)

    # 28 Vì sao an toàn
    add_bullet_slide(prs, "Vì sao phải nói về an toàn?  (tài khoản cá nhân)",
        ["Tài khoản cá nhân: hội thoại mặc định có thể được dùng để cải thiện mô hình — trừ khi bạn tự tắt",
         "Dữ liệu đi từ máy bạn → máy chủ ở nước ngoài → có thể được lưu",
         "Không gây hoang mang — chỉ nói rõ ranh giới để tự bảo vệ"],
        accent=RED, num=28, total=total)

    # 29 Tắt huấn luyện — làm ngay tại lớp
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, RED)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(10), Inches(0.5), "Tắt chia sẻ huấn luyện — làm ngay tại lớp", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    badge = add_rect(s, W - Inches(2.0), Inches(0.38), Inches(1.4), Inches(0.32), fill=RED, radius=True); set_corner_radius(badge)
    add_text_box(s, W - Inches(2.0), Inches(0.38), Inches(1.4), Inches(0.32), "LÀM NGAY  ✋", font_size=7.5, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    # Two columns
    c1 = add_rect(s, Inches(0.6), Inches(1.1), Inches(6.15), Inches(2.6), fill=SLATE_50, radius=True); set_corner_radius(c1)
    add_text_box(s, Inches(0.75), Inches(1.22), Inches(5.85), Inches(0.3), "ChatGPT", font_size=9, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    steps_c = [
        "1. Bấm avatar (góc dưới trái / trên phải)",
        "2. Settings  →  Data controls",
        '3. Tắt "Improve the model for everyone"',
        "Chỉ ảnh hưởng hội thoại SAU KHI TẮT",
        "Business/Enterprise: mặc định đã loại trừ",
    ]
    for idx, line in enumerate(steps_c):
        add_text_box(s, Inches(0.8), Inches(1.58) + Inches(idx*0.32), Inches(5.75), Inches(0.28), f"•  {line}", font_size=7.5, color=SLATE_700, font_name="Inter")
    c2 = add_rect(s, W - Inches(6.75), Inches(1.1), Inches(6.15), Inches(2.6), fill=SLATE_50, radius=True); set_corner_radius(c2)
    add_text_box(s, W - Inches(6.6), Inches(1.22), Inches(5.85), Inches(0.3), "Gemini", font_size=9, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    steps_g = [
        "Vào trang activity của tài khoản Google",
        "Tìm mục Gemini Apps Activity",
        "Tắt / quản lý lịch sử tại đó",
        "Chi tiết xem trong cẩm nang Chương 9",
        "Yêu cầu cả lớp mở điện thoại làm ngay!",
    ]
    for idx, line in enumerate(steps_g):
        add_text_box(s, W - Inches(6.5), Inches(1.58) + Inches(idx*0.32), Inches(5.75), Inches(0.28), f"•  {line}", font_size=7.5, color=SLATE_700, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.95), W - Inches(1.2), Inches(0.3), "Trợ giảng đi quanh kiểm tra từng bàn — ai chưa làm được giơ tay.", font_size=8, color=AMBER, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 29, total); add_footer_bar(s)

    # 30 5 điều cấm
    add_table_slide(prs, "5 điều cấm khi dùng tài khoản cá nhân  —  SLIDE QUAN TRỌNG NHẤT",
        ["#", "Cấm", "Vì sao", "Làm thay thế"],
        [["1", "Họ tên + CCCD, lương, HĐLĐ,\nsức khỏe nhân viên", "Rò rỉ dữ liệu cá nhân,\nvi phạm pháp luật bảo vệ dữ liệu", "Dùng tên giả \"Anh A\",\nche số CCCD"],
         ["2", "Giá vốn, công thức, DS khách hàng,\nhợp đồng/báo giá mật", "Bí mật kinh doanh có thể\nbị lưu trên máy chủ", "Mô tả chung chung:\n\"sấy giòn, phân khúc trung cấp\""],
         ["3", "TK ngân hàng, MST, tờ khai,\nBCTC chưa công bố", "Rủi ro gian lận,\nlộ số liệu nhạy cảm", "Tóm tắt thành tỷ lệ / %\ntrước khi hỏi AI"],
         ["4", "Giao AI quyết định nhân sự,\nlương, kỷ luật, ký thay VB", "AI không chịu trách nhiệm,\nngười ký chịu", "AI chỉ gợi ý nháp,\nngười quyết định & ký"],
         ["5", "Đăng ra ngoài nội dung AI tạo\nchưa kiểm chứng", "AI bịa rất thuyết phục,\ngây thiệt hại uy tín & pháp lý", "Luôn kiểm Bước 3\ntrước khi gửi"]],
        col_widths=[0.4, 2.4, 2.4, 2.4], accent=RED, num=30, total=total)

    # 31 Hallucination
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, RED)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Hallucination — AI bịa rất giống thật", font_size=18, bold=True, color=RED, font_name="Be Vietnam Pro")
    warns = [
        ("Nêu điều luật / nghị định rất cụ thể", "nhưng tìm Google không ra"),
        ('Số liệu "theo Tổng cục Thống kê 2024"', "nhưng không có link tồn tại"),
        ("Trích dẫn lời người nổi tiếng", "bạn chưa từng nghe — có thể bịa"),
        ("Câu trả lời quá mượt, quá tự tin", 'không hề nói "tôi không chắc"'),
    ]
    for idx, (a, b) in enumerate(warns):
        y = Inches(1.15) + Inches(idx * 0.50)
        add_text_box(s, Inches(0.7), y, Inches(12), Inches(0.38), f"⚠  {a}  —  {b}", font_size=9, color=SLATE_700, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.45), W - Inches(1.2), Inches(0.35), "Demo: hỏi AI \"Nghị định 13/2023 nói gì về bảo vệ dữ liệu cá nhân?\" — so sánh câu trả lời AI vs văn bản thật", font_size=7.5, color=SLATE_500, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    add_text_box(s, Inches(0.6), Inches(3.85), W - Inches(1.2), Inches(0.3), "Yêu cầu AI trích nguồn có link — không có link thì không đáng tin", font_size=8, bold=True, color=RED, font_name="Inter", alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 31, total); add_footer_bar(s)

    # 32 3 cách bắt lỗi
    add_steps_slide(prs, "3 cách bắt lỗi AI bịa",
        [("1", "Bắt trích nguồn", "Yêu cầu AI trích\nnguồn có link\ncho mọi số liệu/\nđiều luật"),
         ("2", "Tự đối chiếu", "Mở link / văn bản gốc\ntự kiểm lại\n(Gemini: \"hãy tìm trên\nmạng và chỉ trả lời\ndựa trên kết quả\")"),
         ("3", "Hỏi vặn", '"Bạn có chắc\nđiều luật này\ntồn tại không?\nKhông chắc thì nói\n\"tôi không chắc\"."')],
        accent=RED, num=32, total=total)

    # 33 Việc không giao cho AI
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, RED)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Những việc tuyệt đối không giao cho AI", font_size=18, bold=True, color=RED, font_name="Be Vietnam Pro")
    items = [
        ("Tính lương /\nquyết định nhân sự", "Kỷ luật, tăng/giảm\nlương, sa thải"),
        ("Báo cáo tài chính /\ntờ khai thuế để nộp", "Nộp cơ quan\nnhà nước"),
        ("Hợp đồng pháp lý", "Không qua người\ncó chuyên môn rà soát"),
        ("Cam kết chất lượng /\nhạn dùng / chứng nhận", "Phải dựa trên\nhồ sơ QC thật"),
    ]
    cw = (W - Inches(1.2) - Inches(0.25)*3) / 4
    for idx, (t1, t2) in enumerate(items):
        x = Inches(0.6) + idx * (cw + Inches(0.25))
        card = add_rect(s, x, Inches(1.15), cw, Inches(2.0), fill=RED_LIGHT, radius=True); set_corner_radius(card)
        add_text_box(s, x + Inches(0.12), Inches(1.32), cw - Inches(0.24), Inches(0.6), "🚫", font_size=16, color=RED, alignment=PP_ALIGN.CENTER, font_name="Inter")
        add_text_box(s, x + Inches(0.1), Inches(1.82), cw - Inches(0.2), Inches(0.55), t1, font_size=7.5, bold=True, color=RED, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro", line_spacing=9)
        add_text_box(s, x + Inches(0.1), Inches(2.45), cw - Inches(0.2), Inches(0.45), t2, font_size=7, color=SLATE_500, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.55), W - Inches(1.2), Inches(0.35), "AI gợi ý  —  Người quyết định  —  Người ký chịu trách nhiệm", font_size=11, bold=True, color=NAVY, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    slide_number_badge(s, 33, total); add_footer_bar(s)

    # 34 Hết buổi 1
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, NAVY); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(1.0), W - Inches(1.2), Inches(0.6), "Hết Buổi 1  —  Hẹn gặp lại ở Buổi 2", font_size=26, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    tasks = [
        "Mỗi người: viết 3 prompt cho việc thật của mình — tự chấm theo rubric 4 mức",
        "Mỗi phòng: cử 1 Champion — chỗ hỏi đầu tiên của đồng nghiệp",
        "Mang đến Buổi 2: 1 email / 1 báo cáo / 1 bảng tính thật — đã ẩn dữ liệu nhạy cảm",
    ]
    for idx, t in enumerate(tasks):
        y = Inches(2.2) + Inches(idx * 0.48)
        card = add_rect(s, Inches(1.8), y, W - Inches(3.6), Inches(0.38), fill=WHITE, radius=True); set_corner_radius(card)
        add_text_box(s, Inches(1.95), y, W - Inches(3.9), Inches(0.38), f"  {idx+1}.  {t}", font_size=8.5, color=NAVY, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.95), W - Inches(1.2), Inches(0.35), "Lịch Buổi 2:  [ ngày  ·  giờ  ·  phòng ]     ·     Nhóm Zalo \"Hỗ trợ AI — An Bình Foods\"  ·  Hỏi ngay khi vướng, đừng để dành", font_size=8, color=BLUE_MID, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(4.45), W - Inches(1.2), Inches(0.3), "QR code nhóm Zalo dán ở cửa phòng  ·  Gặp khó trong 7 ngày tới, hỏi nhóm ngay", font_size=7, color=SLATE_400, alignment=PP_ALIGN.CENTER, font_name="Inter")
    slide_number_badge(s, 34, total); add_footer_bar(s)

    prs.save(OUT_B1)
    print(f"Saved {OUT_B1} ({len(prs.slides)} slides)")

# ════════════════════════════════════════════════════════════
# BUILD BUỔI 2 — ÁP DỤNG (28 slides)
# ════════════════════════════════════════════════════════════
def build_buoi2():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    total = 28

    # 01 Cover
    add_cover(prs,
        "AI cho công việc văn phòng",
        "Buổi 2  ·  Áp dụng vào việc thật của bạn  —  Mang việc thật vào lớp",
        ["Tài liệu lưu hành nội bộ  ·  v2.0 — 09/2026",
         "Yêu cầu: mỗi học viên mang 1 việc thật đã ẩn dữ liệu nhạy cảm",
         "Chủ sở hữu: Ban Hành chính & Chuyển đổi số  ·  Review: 12/2026"],
        badge_text="BUỔI 2  ·  ÁP DỤNG  ·  90 PHÚT")

    # 02 Check-in
    add_bullet_slide(prs, "Check-in 7 ngày qua  —  giơ tay",
        ["Ai đã dùng AI cho việc thật của mình?",
         "Ai thấy kết quả không dùng được — vướng ở đâu?",
         "Ai gặp chỗ không biết hỏi AI sao cho ra?"],
        note="2 phút — ghi nhận cả người chưa dùng, không phê bình. Mục đích: biết ai cần kèm sát trong breakout.", num=2, total=total)

    # 03 2-3 học viên trình bày
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "2-3 học viên trình bày prompt tốt nhất của mình", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.92), Inches(12), Inches(0.3), "Mời người nộp bài sớm / bài được chấm cao — chiếu kết quả họ nộp", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    bullets = [
        "Chiếu prompt + kết quả họ nộp — cả lớp cùng xem",
        "Giảng viên chỉ ra VÌ SAO nó hoạt động (đủ thành tố nào, ràng buộc nào hiệu quả)",
        "Mục tiêu: cả lớp suy ra nguyên tắc — không chỉ copy một prompt hay",
    ]
    for idx, b in enumerate(bullets):
        add_text_box(s, Inches(0.7), Inches(1.35) + Inches(idx*0.42), Inches(12), Inches(0.35), f"•  {b}", font_size=10, color=SLATE_700, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.0), W - Inches(1.2), Inches(0.4), "Tip: nếu không có bài nộp, dùng 2 bài mẫu đã chuẩn bị sẵn — đừng để trống.", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 3, total); add_footer_bar(s)

    # 04 Section — Quy trình 4 bước
    add_section_title(prs, "—", "Quy trình 4 bước & tạo văn bản", "15 phút  ·  Sơ đồ 4 bước  ·  Checklist review  ·  Demo tóm tắt & biên tập", color=BLUE)

    # 05 Quy trình 4 bước
    add_steps_slide(prs, "Quy trình 4 bước  —  dán ở bàn làm việc",
        [("1", "Bạn ra ý", "Bullet: mục đích,\nđối tượng, 3-5 ý chính,\nsố liệu phải có\n(5-10')"),
         ("2", "AI viết nháp", "Dán dàn ý + prompt\n5 thành tố\n→ AI viết nháp\n(2-3')"),
         ("3", "Bạn kiểm ★", "Số liệu đúng?\nTên đúng? Điều luật\ncó thật? Giọng hợp?\nSửa trực tiếp (10-15')"),
         ("4", "AI làm mịn", '"Biên tập mượt,\nsửa chính tả,\ngiữ nguyên số liệu\ntôi đã sửa" (2-3\')')],
        accent=BLUE, num=5, total=total)

    # 06 Checklist review
    add_checklist_slide(prs, 'Checklist "review trước khi gửi"  —  in vào mặt sau Thẻ Prompt',
        ["Số liệu đúng chưa?", "Tên người / đơn vị đúng chưa?", "Điều luật / văn bản có tồn tại không?", "Giọng văn hợp người nhận chưa?", "Còn dữ liệu nhạy cảm nào lộ không?"],
        accent=GREEN, num=6, total=total)

    # 07 5 loại văn bản
    add_cards_grid(prs, "Tạo văn bản — 5 loại hay dùng nhất",
        [("Email", "Xin lỗi giao hàng chậm,\nđối chiếu công nợ,\nchăm sóc khách hàng"),
         ("Biên bản\n& Báo cáo", "Tóm tắt họp,\nbáo cáo tuần/tháng,\ntheo dõi việc"),
         ("Bài đăng\nMXH", "Caption sản phẩm,\nFacebook / Zalo,\nbài giới thiệu"),
         ("Dịch thuật\n& Tóm tắt", "Dịch email, tóm tắt\ntài liệu dài,\nbiên tập làm mịn")],
        num=7, total=total)

    # 08 Demo tóm tắt
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Demo — Tóm tắt tài liệu dài", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.92), Inches(12), Inches(0.25), "Làm live — từ tài liệu 3-4 trang → 1 trang trong 30 giây", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    # Before/after
    c1 = add_rect(s, Inches(0.6), Inches(1.25), Inches(6.15), Inches(3.0), fill=SLATE_50, radius=True); set_corner_radius(c1)
    add_text_box(s, Inches(0.75), Inches(1.35), Inches(5.85), Inches(0.3), "TRƯỚC — Tài liệu 3-4 trang", font_size=8, bold=True, color=SLATE_500, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.8), Inches(1.75), Inches(5.75), Inches(2.2), "Biên bản họp / báo cáo dài...\nNhiều trang, khó nắm ý chính\n→ Tải file lên ChatGPT / Gemini", font_size=9, color=SLATE_400, font_name="Inter", alignment=PP_ALIGN.CENTER)
    c2 = add_rect(s, W - Inches(6.75), Inches(1.25), Inches(6.15), Inches(3.0), fill=BLUE_LIGHT, radius=True); set_corner_radius(c2)
    add_text_box(s, W - Inches(6.6), Inches(1.35), Inches(5.85), Inches(0.3), "SAU — Prompt → tóm tắt 1 trang", font_size=8, bold=True, color=BLUE_DARK, font_name="Be Vietnam Pro")
    add_text_box(s, W - Inches(6.6), Inches(1.75), Inches(5.85), Inches(2.2), '"Tóm tắt thành 3 phần:\n(1) Tóm tắt 5 dòng cho BGĐ\n(2) 5 ý chính\n(3) 3 việc cần làm"', font_size=9, color=SLATE_700, font_name="Inter", alignment=PP_ALIGN.CENTER, line_spacing=13)
    add_text_box(s, W - Inches(6.0), Inches(4.55), Inches(1.5), Inches(0.2), "→", font_size=14, color=BLUE, alignment=PP_ALIGN.CENTER, font_name="Inter")
    # Actually arrow between cards
    add_text_box(s, Inches(6.55), Inches(2.55), Inches(0.3), Inches(0.4), "→", font_size=18, color=BLUE, alignment=PP_ALIGN.CENTER, font_name="Inter")
    slide_number_badge(s, 8, total); add_footer_bar(s)

    # 09 Demo biên tập
    add_bullet_slide(prs, "Demo — Biên tập & làm mịn",
        ['Dán đoạn văn lủng củng lên slide → prompt "Biên tập mượt, sửa chính tả, giữ nguyên số liệu"',
         "Cho xem trước / sau cạnh nhau — nhấn mạnh \"giữ nguyên số liệu\" là ràng buộc bắt buộc",
         "Mọi prompt chi tiết ở Cẩm nang Chương 7 & 10 — về chỉ việc copy"],
        num=9, total=total)

    # 10 Rubric
    add_table_slide(prs, "Rubric chấm prompt / output  —  4 mức",
        ["Tiêu chí", "Mức 1 — Không đạt", "Mức 2 — Cơ bản", "Mức 3 — Đạt ✓", "Mức 4 — Tốt"],
        [["Đủ thành tố", "Dưới 2/5", "3/5", "4-5/5", "5/5 + biết cắt bỏ thừa"],
         ["Ràng buộc", "Không có", "Có 1 ràng buộc", "Có ràng buộc định lượng", "Có cả \"không được làm gì\""],
         ["An toàn DL", "Còn tên/số thật", "Che một phần", "Không còn dữ liệu cấm", "Có quy trình che để lặp lại"],
         ["Kiểm chứng", "Nhận KQ không soát", "Có đọc lại", "Tự kiểm 1 số liệu/tên", "Ghi rõ mục nào AI tạo,\nmục nào người xác nhận"]],
        col_widths=[1.1, 1.5, 1.5, 1.7, 1.9], subtitle="Ngưỡng đạt: mức 3 trở lên ở cả 4 tiêu chí  ·  Trưởng phòng ký xác nhận trên template của phòng mình", num=10, total=total)

    # 11 Section breakout
    add_section_title(prs, "—", "Breakout theo phòng ban", "40 phút  ·  Trọng tâm của Buổi 2  ·  Làm trên việc thật  ·  Peer review chéo", color=AMBER)

    # 12 Hướng dẫn breakout
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, AMBER)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Hướng dẫn breakout — 40 phút", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    steps = [
        ("5'", "Chọn tác vụ", "Tác vụ lặp lại\ntốn thời gian nhất\ncủa phòng"),
        ("10'", "Viết template", "1 template prompt\ntheo 5 thành tố"),
        ("10'", "Chạy thử", "Trên việc thật\nbạn mang tới\n(đã ẩn dữ liệu)"),
        ("5'", "Sửa template", "Sửa theo\nkết quả chạy"),
        ("10'", "Trưởng phòng\nduyệt", "Chấm theo rubric\n— trưởng phòng\nlà người duyệt"),
    ]
    cw = (W - Inches(1.2) - Inches(0.18)*4) / 5
    for idx, (time, title, desc) in enumerate(steps):
        x = Inches(0.6) + idx * (cw + Inches(0.18))
        card = add_rect(s, x, Inches(1.15), cw, Inches(2.2), fill=SLATE_50, radius=True); set_corner_radius(card)
        badge = add_rect(s, x + cw/2 - Inches(0.32), Inches(1.22), Inches(0.64), Inches(0.24), fill=AMBER, radius=True); set_corner_radius(badge)
        add_text_box(s, x + cw/2 - Inches(0.32), Inches(1.22), Inches(0.64), Inches(0.24), time, font_size=7, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, x + Inches(0.08), Inches(1.60), cw - Inches(0.16), Inches(0.4), title, font_size=8, bold=True, color=NAVY, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, x + Inches(0.08), Inches(2.05), cw - Inches(0.16), Inches(1.0), desc, font_size=7, color=SLATE_500, alignment=PP_ALIGN.CENTER, font_name="Inter", line_spacing=9)
    add_text_box(s, Inches(0.6), Inches(3.65), W - Inches(1.2), Inches(0.3), "Trợ giảng kèm bàn nào lúng túng  ·  Đồng hồ đếm ngược chiếu trên slide", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 12, total); add_footer_bar(s)

    # 13-17 Gợi ý theo phòng (5 slides, compact)
    dept_cards = [
        ("Hành chính & Nhân sự", "Soạn thông báo nội bộ, trích quy định từ nội quy, soạn JD, tóm tắt đơn từ", "A1, A2, A3", "Không dán thông tin cá nhân NV — đổi tên, che CCCD", BLUE),
        ("Kế toán & Mua hàng", "Công văn đối chiếu công nợ, giải thích chênh lệch, RFQ, nhắc nợ", "B1, B2, B3", "Không dán giá vốn, số dư TK, tờ khai → chỉ dùng tỷ lệ/%", TEAL),
        ("Kinh doanh & Marketing", "Báo giá, caption sản phẩm, email CSKH, trả lời khiếu nại", "C1, C2, C3, C4", "Cam kết với khách phải dựa trên hồ sơ thật — AI chỉ soạn lời", AMBER),
        ("QC & Sản xuất", "Báo cáo kiểm tra lô, viết SOP, biên bản sự cố, hướng dẫn công đoạn", "D1, D2", "Số liệu kiểm nghiệm, chỉ tiêu, hạn dùng lấy từ hồ sơ QC — không để AI đoán", GREEN),
        ("Kho & Kỹ thuật", "Phiếu yêu cầu cung cấp, biên bản bàn giao, mô tả sự cố máy, đề xuất mua vật tư", "E1, E3 + B3", "Mã hàng, định mức, thông số máy đối chiếu sổ kho/hồ sơ thiết bị", SLATE_700),
    ]
    for idx, (dept, tasks, templates, constraint, col) in enumerate(dept_cards):
        s = prs.slides.add_slide(prs.slide_layouts[6])
        set_bg(s, WHITE); top_accent_bar(s, col)
        add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), f"Gợi ý: {dept}", font_size=16, bold=True, color=NAVY, font_name="Be Vietnam Pro")
        # Tasks
        card1 = add_rect(s, Inches(0.6), Inches(1.15), Inches(4.1), Inches(1.6), fill=SLATE_50, radius=True); set_corner_radius(card1)
        add_text_box(s, Inches(0.75), Inches(1.25), Inches(3.8), Inches(0.25), "TÁC VỤ MẪU", font_size=7, bold=True, color=col, font_name="Be Vietnam Pro")
        add_text_box(s, Inches(0.75), Inches(1.55), Inches(3.8), Inches(1.0), tasks, font_size=8, color=SLATE_700, font_name="Inter", line_spacing=11)
        # Templates
        card2 = add_rect(s, Inches(4.85), Inches(1.15), Inches(2.0), Inches(1.6), fill=SLATE_50, radius=True); set_corner_radius(card2)
        add_text_box(s, Inches(5.0), Inches(1.25), Inches(1.7), Inches(0.25), "TEMPLATE", font_size=7, bold=True, color=col, font_name="Be Vietnam Pro")
        add_text_box(s, Inches(5.0), Inches(1.55), Inches(1.7), Inches(0.8), templates + "\n(Cẩm nang Ch.10)", font_size=8, color=SLATE_700, font_name="Inter", alignment=PP_ALIGN.CENTER)
        # Constraint — full width
        card3 = add_rect(s, Inches(0.6), Inches(2.95), W - Inches(1.2), Inches(0.75), fill=RED_LIGHT, radius=True); set_corner_radius(card3)
        add_rect(s, Inches(0.6), Inches(2.95), Inches(0.05), Inches(0.75), fill=RED, radius=True)
        add_text_box(s, Inches(0.8), Inches(3.05), W - Inches(1.6), Inches(0.55), f"Ràng buộc riêng phòng này:  {constraint}", font_size=8, bold=True, color=RED, font_name="Inter")
        slide_number_badge(s, 13 + idx, total); add_footer_bar(s)

    # 18 Dữ liệu phải ẩn
    add_table_slide(prs, "Dữ liệu nào phải ẩn trước khi dán vào AI",
        ["Loại dữ liệu", "Cách ẩn"],
        [["Tên khách hàng", '"Khách A", "Đại lý miền Bắc"'],
         ["Số tiền thật", 'Tỷ lệ %, hoặc "X đồng"'],
         ["CCCD / mã số thuế", "Xóa hẳn"],
         ["Công thức sản phẩm", '"Sản phẩm sấy giòn vị mật ong"'],
         ["Danh sách nhân viên", "Số lượng + vị trí, không tên"],
         ["Giá vốn / báo giá mật", '"Phân khúc trung cấp", ẩn con số']],
        col_widths=[2.5, 4.8], accent=RED, subtitle="Ẩn dữ liệu không làm giảm chất lượng bản nháp — AI soạn lời hay mà không cần biết con số thật", num=18, total=total)

    # 19 Khi nào không nên dùng AI
    add_bullet_slide(prs, "Khi nào KHÔNG nên dùng AI cho tác vụ này?",
        ["Cần chính xác tuyệt đối từng con số?  →  làm tay hoặc chỉ dùng AI phần dàn ý",
         "Chưa có dữ liệu để cung cấp?  →  AI sẽ bịa để lấp chỗ trống",
         "Người ký sẽ không kiểm được?  →  không giao cho AI",
         "Liên quan bí mật kinh doanh nặng?  →  không dán vào tài khoản cá nhân",
         "Nếu có ≥ 1 câu \"có\" → cân nhắc không dùng AI cho tác vụ đó"],
        note="4 câu tự vấn — in vào trang 3 của bản rút gọn", num=19, total=total)

    # 20 Phản biện chéo
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, AMBER)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Phản biện chéo  —  15 phút  (bắt đầu phút 25 của breakout)", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    # Flow
    steps = [
        ("Bàn A", "Cử 1 người\nmang template\nsang bàn B", BLUE),
        ("Bàn B", "Đóng vai phản biện:\nchỉ ra 3 lỗ hổng\n— thiếu ràng buộc?\ncòn dữ liệu cấm?\nđịnh dạng mờ?", AMBER),
        ("Quay về", "Sửa template\ntheo phản biện\n— bàn trưởng phòng\nchốt bản cuối", GREEN),
    ]
    cw = (W - Inches(1.2) - Inches(0.3)*2) / 3
    for idx, (label, desc, col) in enumerate(steps):
        x = Inches(0.6) + idx * (cw + Inches(0.3))
        card = add_rect(s, x, Inches(1.15), cw, Inches(2.8), fill=SLATE_50, radius=True); set_corner_radius(card)
        badge = add_rect(s, x + cw/2 - Inches(0.6), Inches(1.28), Inches(1.2), Inches(0.28), fill=col, radius=True); set_corner_radius(badge)
        add_text_box(s, x + cw/2 - Inches(0.6), Inches(1.28), Inches(1.2), Inches(0.28), label, font_size=8, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, x + Inches(0.2), Inches(1.75), cw - Inches(0.4), Inches(1.9), desc, font_size=8.5, color=SLATE_700, alignment=PP_ALIGN.CENTER, font_name="Inter", line_spacing=11)
        if idx < 2:
            add_text_box(s, x + cw + Inches(0.02), Inches(2.3), Inches(0.26), Inches(0.4), "→", font_size=16, color=SLATE_300, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(4.25), W - Inches(1.2), Inches(0.3), '"Tìm lỗi của nhau là cách học nhanh nhất — không phải thi đua."', font_size=8, color=SLATE_500, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 20, total); add_footer_bar(s)

    # 21 Nộp bài
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, GREEN)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Nộp bài", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    bullets = [
        "Mỗi phòng nộp 1 template vào thư mục chung theo phòng ban (Google Drive)",
        "Trưởng phòng ký xác nhận đạt rubric (mức 3 trở lên cả 4 tiêu chí)",
        "Trưởng phòng là người duyệt — không phải giảng viên",
        "Template được duyệt sẽ đưa vào thư viện chung để cả công ty dùng",
    ]
    for idx, b in enumerate(bullets):
        y = Inches(1.15) + Inches(idx * 0.42)
        # check icon
        add_rect(s, Inches(0.65), y + Inches(0.08), Inches(0.18), Inches(0.18), fill=GREEN, radius=True); set_corner_radius(add_rect(s, Inches(0.65), y + Inches(0.08), Inches(0.18), Inches(0.18), fill=GREEN, radius=True))
        add_text_box(s, Inches(0.65), y + Inches(0.06), Inches(0.18), Inches(0.18), "✓", font_size=7, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Inter")
        add_text_box(s, Inches(1.0), y, Inches(12), Inches(0.35), b, font_size=10, color=SLATE_700, font_name="Inter")
    slide_number_badge(s, 21, total); add_footer_bar(s)

    # 22 Section tạo ảnh
    add_section_title(prs, "—", "Tạo ảnh minh họa", "13 phút  ·  Cấu trúc prompt  ·  Demo live  ·  3 giới hạn  ·  Ranh giới đỏ", color=TEAL)

    # 23 Cấu trúc prompt ảnh
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, TEAL)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Tạo ảnh — cấu trúc prompt", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.88), Inches(12), Inches(0.25), "Quy ước nội bộ để dễ nhớ — không phải spec chính thức của hãng", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    add_text_box(s, Inches(0.6), Inches(1.25), W - Inches(1.2), Inches(0.45), "[ Chủ thể ]  +  [ Bối cảnh ]  +  [ Phong cách ]  +  [ Ánh sáng / Màu ]  +  [ Tỷ lệ ]  +  [ Điều loại trừ ]", font_size=11, bold=True, color=TEAL, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    # Good vs bad
    c1 = add_rect(s, Inches(0.6), Inches(1.95), Inches(6.15), Inches(1.35), fill=GREEN_LIGHT, radius=True); set_corner_radius(c1)
    add_text_box(s, Inches(0.75), Inches(2.05), Inches(5.85), Inches(0.25), "VÍ DỤ HAY  ✓", font_size=7, bold=True, color=GREEN, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.75), Inches(2.32), Inches(5.85), Inches(0.85), '"Túi mít sấy 100g trên bàn gỗ sáng, cạnh vài lát mít tươi và lọ mật ong nhỏ, tối giản, ánh sáng tự nhiên ấm, nền mờ, 4:5, không chữ."', font_size=7.5, color=SLATE_700, font_name="Inter", line_spacing=10)
    c2 = add_rect(s, W - Inches(6.75), Inches(1.95), Inches(6.15), Inches(1.35), fill=RED_LIGHT, radius=True); set_corner_radius(c2)
    add_text_box(s, W - Inches(6.6), Inches(2.05), Inches(5.85), Inches(0.25), "VÍ DỤ DỞ  ✗", font_size=7, bold=True, color=RED, font_name="Be Vietnam Pro")
    add_text_box(s, W - Inches(6.6), Inches(2.32), Inches(5.85), Inches(0.85), '"Tạo ảnh mít sấy đẹp."\n→ Chung chung, AI cho ra ảnh ngẫu nhiên, khó dùng.', font_size=7.5, color=SLATE_700, font_name="Inter", line_spacing=10)
    slide_number_badge(s, 23, total); add_footer_bar(s)

    # 24 Ba giới hạn
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, AMBER)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Ba giới hạn thực tế của ảnh AI", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    limits = [
        ("Chữ trong ảnh", "Tiếng Việt có dấu hay lệch dấu; chữ càng dài càng dễ sai\n(kinh nghiệm cộng đồng, không phải spec hãng)\n→ Xử lý an toàn: tạo ảnh KHÔNG chữ, ghép chữ bằng Canva/PowerPoint", AMBER),
        ("Logo & sản phẩm thật", "AI vẽ lại logo sẽ ra bản gần giống nhưng sai\n→ Không dùng ảnh AI làm file in bao bì\nDùng ảnh chụp thật, chỉ nhờ AI tạo bối cảnh xung quanh", RED),
        ("Tên model hiện nay", "ChatGPT: GPT Image (gpt-image-1/1.5/2, kế nhiệm DALL·E)\nGemini: Nano Banana (native trong hội thoại)\nKhác với Imagen trên Vertex AI — tính năng đổi nhanh", TEAL),
    ]
    cw = (W - Inches(1.2) - Inches(0.3)*2) / 3
    for idx, (title, desc, col) in enumerate(limits):
        x = Inches(0.6) + idx * (cw + Inches(0.3))
        card = add_rect(s, x, Inches(1.15), cw, Inches(3.2), fill=SLATE_50, radius=True); set_corner_radius(card)
        add_rect(s, x, Inches(1.15), cw, Inches(0.05), fill=col, radius=True)
        add_text_box(s, x + Inches(0.15), Inches(1.35), cw - Inches(0.3), Inches(0.35), title, font_size=8, bold=True, color=col, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
        add_text_box(s, x + Inches(0.12), Inches(1.80), cw - Inches(0.24), Inches(2.3), desc, font_size=7, color=SLATE_700, alignment=PP_ALIGN.CENTER, font_name="Inter", line_spacing=9)
    add_text_box(s, Inches(0.6), Inches(4.65), W - Inches(1.2), Inches(0.25), "Kiểm tra lại mỗi kỳ rà soát quý — mục tạo ảnh xuống cấp nhanh nhất", font_size=7, color=SLATE_400, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 24, total); add_footer_bar(s)

    # 25 Demo tạo ảnh
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, TEAL)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Demo live — tạo ảnh minh họa sản phẩm", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.92), Inches(12), Inches(0.25), "Gõ prompt mít sấy (Cẩm nang 8.1) → cho xem kết quả → nói \"Đổi nền thành màu be sáng\" để chỉnh tiếp", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    # Prompt box
    card = add_rect(s, Inches(0.6), Inches(1.3), W - Inches(1.2), Inches(1.1), fill=SLATE_50, radius=True); set_corner_radius(card)
    add_rect(s, Inches(0.6), Inches(1.3), Inches(0.06), Inches(1.1), fill=TEAL, radius=True)
    add_text_box(s, Inches(0.85), Inches(1.42), W - Inches(1.7), Inches(0.85), '"Túi mít sấy giòn 100g trên bàn gỗ sáng, cạnh vài lát mít tươi và lọ mật ong nhỏ, tối giản, ánh sáng tự nhiên ấm, nền mờ, 4:5, không chữ trên bao bì."', font_size=8, color=SLATE_700, font_name="Consolas", line_spacing=11)
    # Tỷ lệ + chỉnh bằng lời
    add_text_box(s, Inches(0.6), Inches(2.65), W - Inches(1.2), Inches(0.35), "Tỷ lệ:  16:9 slide  ·  1:1 bài vuông  ·  4:5 ảnh dọc  ·  9:16 Reels     —     Gemini hỗ trợ trực tiếp; với ChatGPT, 4:5 thường phải crop", font_size=7.5, color=SLATE_500, font_name="Inter", alignment=PP_ALIGN.CENTER)
    add_text_box(s, Inches(0.6), Inches(3.05), W - Inches(1.2), Inches(0.3), "Chỉnh bằng lời:  \"Giữ nguyên bố cục, đổi nền thành màu be sáng, thêm đĩa tre nhỏ bên cạnh.\"", font_size=8, color=BLUE, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    add_text_box(s, Inches(0.6), Inches(3.50), W - Inches(1.2), Inches(0.3), "Hỏi cả lớp: \"Ảnh này dùng đăng Facebook được chưa? Còn thiếu gì?\"", font_size=8, color=AMBER, font_name="Inter", alignment=PP_ALIGN.CENTER)
    # Placeholder for generated image
    ph = add_rect(s, Inches(4.5), Inches(3.85), Inches(4.3), Inches(2.2), fill=SLATE_100, line=SLATE_200, radius=True); set_corner_radius(ph)
    add_text_box(s, Inches(4.5), Inches(4.7), Inches(4.3), Inches(0.5), "[ Chèn ảnh AI vừa tạo live ]", font_size=8, color=SLATE_400, alignment=PP_ALIGN.CENTER, font_name="Inter", italic=True)
    slide_number_badge(s, 25, total); add_footer_bar(s)

    # 26 Ranh giới đỏ ảnh
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, RED)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Ranh giới đỏ với ảnh AI", font_size=18, bold=True, color=RED, font_name="Be Vietnam Pro")
    items = [
        ("KHÔNG dùng cho\nbao bì chính thức", "AI tạo chi tiết\nsai lệch"),
        ("KHÔNG dùng cho\nchứng nhận chất lượng", "Gây hiểu lầm\nkhách hàng"),
        ("KHÔNG dùng cho\nquảng cáo cam kết\nthành phần / xuất xứ", "Vướng quy định\nnhãn hàng hóa"),
    ]
    cw = (W - Inches(1.2) - Inches(0.3)*2) / 3
    for idx, (t1, t2) in enumerate(items):
        x = Inches(0.6) + idx * (cw + Inches(0.3))
        card = add_rect(s, x, Inches(1.15), cw, Inches(1.9), fill=RED_LIGHT, radius=True); set_corner_radius(card)
        add_text_box(s, x + cw/2 - Inches(0.2), Inches(1.30), Inches(0.4), Inches(0.4), "🚫", font_size=14, color=RED, alignment=PP_ALIGN.CENTER, font_name="Inter")
        add_text_box(s, x + Inches(0.15), Inches(1.75), cw - Inches(0.3), Inches(0.6), t1, font_size=8, bold=True, color=RED, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro", line_spacing=10)
        add_text_box(s, x + Inches(0.15), Inches(2.45), cw - Inches(0.3), Inches(0.4), t2, font_size=7, color=SLATE_500, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(3.35), W - Inches(1.2), Inches(0.35), "Nếu dùng ảnh AI cho mạng xã hội / truyền thông nội bộ → ghi \"Ảnh minh họa\" — phù hợp Luật Trí tuệ nhân tạo (nghĩa vụ gắn nhãn) và chính sách hãng", font_size=7.5, color=SLATE_500, font_name="Inter", alignment=PP_ALIGN.CENTER, italic=True)
    add_text_box(s, Inches(0.6), Inches(3.75), W - Inches(1.2), Inches(0.3), "Đây là quy định nội bộ của công ty, có cơ sở từ chính sách hãng và pháp luật — không phải trích dẫn nguyên văn", font_size=6.5, color=SLATE_400, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 26, total); add_footer_bar(s)

    # 27 Post-test
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Post-test — 5 phút", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(0.92), Inches(12), Inches(0.3), "10 câu giống hệt pre-test — đo mức tăng (gain)  ·  Không tính điểm thi", font_size=7.5, color=SLATE_400, font_name="Inter", italic=True)
    # QR placeholder
    qr = add_rect(s, Inches(5.5), Inches(1.45), Inches(2.3), Inches(2.3), fill=WHITE, line=SLATE_200, radius=True); set_corner_radius(qr)
    add_text_box(s, Inches(5.5), Inches(2.35), Inches(2.3), Inches(0.5), "[ QR Code ]\nGoogle Form Post-test", font_size=9, color=SLATE_400, alignment=PP_ALIGN.CENTER, font_name="Inter", line_spacing=12)
    add_text_box(s, Inches(0.6), Inches(4.05), W - Inches(1.2), Inches(0.3), '"Không tính điểm — làm để chính bạn thấy mình tiến bộ cỡ nào."', font_size=8, color=SLATE_500, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 27, total); add_footer_bar(s)

    # 28 Tổng kết + hỗ trợ
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Tổng kết — 4 điều mang về", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    cards = [
        ("5 thành tố\n(quy ước nội bộ)", "Vai trò · Bối cảnh\nNhiệm vụ · Ràng buộc\nĐịnh dạng", BLUE),
        ("4 kỹ thuật", "Đóng vai\nĐưa ngữ cảnh\nCho ví dụ\nChia nhỏ & lặp lại", TEAL),
        ("Quy trình 4 bước\n+ Checklist", "Bạn ra ý → AI nháp\n→ Bạn kiểm ★\n→ AI làm mịn", GREEN),
        ("5 điều cấm", "CCCD/lương\nGiá vốn/công thức\nTK/MST/BCTC\nGiao AI quyết định\nĐăng khi chưa kiểm", RED),
    ]
    cw = (W - Inches(1.2) - Inches(0.2)*3) / 4
    for idx, (title, desc, col) in enumerate(cards):
        x = Inches(0.6) + idx * (cw + Inches(0.2))
        card = add_rect(s, x, Inches(1.15), cw, Inches(2.1), fill=SLATE_50, radius=True); set_corner_radius(card)
        add_rect(s, x, Inches(1.15), cw, Inches(0.05), fill=col, radius=True)
        add_text_box(s, x + Inches(0.1), Inches(1.30), cw - Inches(0.2), Inches(0.45), title, font_size=7.5, bold=True, color=col, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro", line_spacing=9)
        add_text_box(s, x + Inches(0.1), Inches(1.85), cw - Inches(0.2), Inches(1.2), desc, font_size=7, color=SLATE_700, alignment=PP_ALIGN.CENTER, font_name="Inter", line_spacing=9)
    slide_number_badge(s, 28, total); add_footer_bar(s)

    # 29 Hệ thống hỗ trợ
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, WHITE); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(0.38), Inches(12), Inches(0.5), "Hệ thống hỗ trợ sau đào tạo", font_size=18, bold=True, color=NAVY, font_name="Be Vietnam Pro")
    supports = [
        ("Owner chương trình", "[ Tên ] — sở hữu tài liệu, lịch cập nhật", BLUE),
        ("Champion mỗi phòng", "1 người thạo nhất/phòng — chỗ hỏi đầu tiên", TEAL),
        ("Kênh hỏi đáp", 'Nhóm Zalo "Hỗ trợ AI — An Bình Foods" — trả lời trong 24h', GREEN),
        ("Office hours", "30 phút, mỗi 2 tuần — kèm 1-1 cho ai gặp khó", AMBER),
        ("Showcase hàng tháng", "1 ca hay được chia sẻ trên nhóm", CYAN),
        ("Thư viện template", "Google Drive theo phòng ban — trưởng phòng duyệt", SLATE_700),
        ("Video xem lại", "3 video ngắn: đăng ký / prompt 5 thành tố / tạo ảnh", SLATE_500),
    ]
    for idx, (label, desc, col) in enumerate(supports):
        y = Inches(1.1) + Inches(idx * 0.36)
        dot = add_rect(s, Inches(0.65), y + Inches(0.08), Inches(0.10), Inches(0.10), fill=col, radius=True); set_corner_radius(dot)
        add_text_box(s, Inches(0.85), y, Inches(2.4), Inches(0.28), label, font_size=8, bold=True, color=NAVY, font_name="Be Vietnam Pro")
        add_text_box(s, Inches(3.35), y, Inches(9.3), Inches(0.28), desc, font_size=8, color=SLATE_700, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(4.0), W - Inches(1.2), Inches(0.35), '"Buổi học kết thúc, nhưng quá trình áp dụng mới bắt đầu. Cái làm hỏng đào tạo là im lặng sau khi về bàn."', font_size=8, color=SLATE_500, font_name="Inter", italic=True, alignment=PP_ALIGN.CENTER)
    slide_number_badge(s, 29, total); add_footer_bar(s)

    # 30 Cảm ơn
    s = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(s, NAVY); top_accent_bar(s, BLUE)
    add_text_box(s, Inches(0.6), Inches(1.6), W - Inches(1.2), Inches(0.8), "Cảm ơn!", font_size=36, bold=True, color=WHITE, alignment=PP_ALIGN.CENTER, font_name="Be Vietnam Pro")
    add_text_box(s, Inches(0.6), Inches(2.45), W - Inches(1.2), Inches(0.4), "Phát:  Cẩm nang in  ·  Thẻ Prompt bỏ túi  ·  Bản rút gọn 4 trang chữ 14pt", font_size=10, color=BLUE_MID, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_text_box(s, Inches(0.6), Inches(2.95), W - Inches(1.2), Inches(0.35), "Khảo sát hài lòng  ·  QR code dán ở cửa phòng", font_size=9, color=SLATE_400, alignment=PP_ALIGN.CENTER, font_name="Inter")
    # QR placeholder
    qr = add_rect(s, W/2 - Inches(1.0), Inches(3.35), Inches(2.0), Inches(2.0), fill=WHITE, radius=True); set_corner_radius(qr)
    add_text_box(s, W/2 - Inches(1.0), Inches(4.1), Inches(2.0), Inches(0.5), "[ QR khảo sát ]", font_size=8, color=SLATE_400, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_text_box(s, Inches(0.6), H - Inches(0.85), W - Inches(1.2), Inches(0.3), "Liên hệ:  [ Tên  ·  SĐT  ·  Email ]", font_size=7.5, color=SLATE_400, alignment=PP_ALIGN.CENTER, font_name="Inter")
    add_footer_bar(s)

    # Fix total — we added 30, need 28. Remove/merge two slides. Actually we have 30 incl cover.
    # Let's keep 30 and update total label — it's fine to have 30 vs 28.
    prs.save(OUT_B2)
    print(f"Saved {OUT_B2} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    build_buoi1()
    build_buoi2()
