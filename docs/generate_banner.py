from PIL import Image, ImageDraw, ImageFont
import os

banner_path = r"C:\work\Problem-Based-SRS\docs\banner.txt"
output_path = r"C:\work\Problem-Based-SRS\docs\banner.png"

with open(banner_path, "r", encoding="utf-8") as f:
    lines = f.read().rstrip("\n").split("\n")

# Colors
bg_color = (26, 10, 46)        # #1a0a2e - dark purple
border_color = (138, 92, 199)  # light purple for box-drawing chars
block_color = (200, 170, 255)  # bright lavender for block chars
text_color = (220, 210, 240)   # near-white purple for tagline
gradient_colors = {
    "░": (60, 40, 100),
    "▒": (110, 75, 160),
    "▓": (155, 105, 205),
}

box_chars = set("╔╗╚╝═║╭╮╰╯─│┌┐└┘├┤┬┴┼")
block_chars = set("█")

# Cell size for the grid (each character = one cell)
cell_w = 12
cell_h = 20
padding_x = 30
padding_y = 25

# Load font for text rendering (tagline, gradient chars)
font = None
font_candidates = [
    "C:/Windows/Fonts/consola.ttf",
    "C:/Windows/Fonts/cascadiamono.ttf",
    "C:/Windows/Fonts/cour.ttf",
]
for fc in font_candidates:
    if os.path.exists(fc):
        font = ImageFont.truetype(fc, cell_h - 2)
        print(f"Using font: {fc}")
        break
if font is None:
    font = ImageFont.load_default()

max_line_len = max(len(line) for line in lines)
img_w = max_line_len * cell_w + padding_x * 2
img_h = len(lines) * cell_h + padding_y * 2

img = Image.new("RGB", (img_w, img_h), bg_color)
draw = ImageDraw.Draw(img)

total_rows = len(lines)
border_thickness = 2

for row_idx, line in enumerate(lines):
    for col_idx, ch in enumerate(line):
        if ch == " ":
            continue
        x = padding_x + col_idx * cell_w
        y = padding_y + row_idx * cell_h

        if ch in block_chars:
            # Draw solid filled rectangle - no gaps
            draw.rectangle([x, y, x + cell_w, y + cell_h], fill=block_color)

        elif ch in gradient_colors:
            color = gradient_colors[ch]
            draw.rectangle([x, y, x + cell_w, y + cell_h], fill=color)

        elif ch == "╔":
            draw.line([(x + cell_w//2, y + cell_h), (x + cell_w//2, y + cell_h//2)], fill=border_color, width=border_thickness)
            draw.line([(x + cell_w//2, y + cell_h//2), (x + cell_w, y + cell_h//2)], fill=border_color, width=border_thickness)
        elif ch == "╗":
            draw.line([(x, y + cell_h//2), (x + cell_w//2, y + cell_h//2)], fill=border_color, width=border_thickness)
            draw.line([(x + cell_w//2, y + cell_h//2), (x + cell_w//2, y + cell_h)], fill=border_color, width=border_thickness)
        elif ch == "╚":
            draw.line([(x + cell_w//2, y), (x + cell_w//2, y + cell_h//2)], fill=border_color, width=border_thickness)
            draw.line([(x + cell_w//2, y + cell_h//2), (x + cell_w, y + cell_h//2)], fill=border_color, width=border_thickness)
        elif ch == "╝":
            draw.line([(x, y + cell_h//2), (x + cell_w//2, y + cell_h//2)], fill=border_color, width=border_thickness)
            draw.line([(x + cell_w//2, y), (x + cell_w//2, y + cell_h//2)], fill=border_color, width=border_thickness)
        elif ch == "═":
            if row_idx in (0, total_rows - 1):
                # Top/bottom border
                draw.line([(x, y + cell_h//2), (x + cell_w, y + cell_h//2)], fill=border_color, width=border_thickness)
            else:
                # Separator dash between PROBLEM and BASED
                draw.line([(x, y + cell_h//2), (x + cell_w, y + cell_h//2)], fill=border_color, width=border_thickness)
        elif ch == "║":
            draw.line([(x + cell_w//2, y), (x + cell_w//2, y + cell_h)], fill=border_color, width=border_thickness)

        else:
            # Regular text characters (tagline etc.)
            draw.text((x + 1, y + 1), ch, fill=text_color, font=font)

img.save(output_path, "PNG", optimize=True)
print(f"Banner saved: {output_path}")
print(f"Size: {img_w}x{img_h}")
