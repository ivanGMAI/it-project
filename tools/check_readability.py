"""Проверка читаемости диаграмм при печати.

Для каждого diagrams/*.svg: размер холста, самый мелкий и типичный шрифт, и какой высоты будут
прописные буквы, если вписать диаграмму в рабочее поле листа (поля по ГОСТ 7.32-2017:
левое 30, правое 15, верхнее и нижнее 20 мм). Порог — ряд размеров шрифта ГОСТ 2.304-81:
2,5 мм — минимальный рекомендуемый размер, 1,8 мм — «не рекомендуется».

Запуск: python3 tools/check_readability.py
"""
import re
import statistics
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

PT_MM = 25.4 / 72      # Graphviz пишет SVG в пунктах
PX_MM = 25.4 / 96      # bpmn-js пишет SVG в CSS-пикселях
CAP = 0.716            # высота прописной буквы Arial / Liberation Sans в долях кегля
SHEETS = {             # рабочее поле листа, мм (ширина, высота)
    "A4 книжн.": (165, 257),
    "A4 альб.": (257, 165),
    "A3 альб.": (375, 257),
}
GOOD, MIN = 2.5, 1.8

root = Path(__file__).resolve().parent.parent / "diagrams"


def number(value):
    return float(re.match(r"[\d.]+", value).group())


def fonts(svg, default):
    sizes = []
    # Размер берём у <text>; вложенные <tspan> (bpmn-js) наследуют его и отдельно не считаются.
    for el in svg.iter():
        if not el.tag.endswith("}text") and el.tag != "text":
            continue
        if not "".join(el.itertext()).strip():
            continue
        size = el.get("font-size")
        style = el.get("style", "")
        m = re.search(r"font-size:\s*([\d.]+)", style)
        if m:
            size = m.group(1)
        sizes.append(number(size) if size else default)
    return sizes


rows = []
for path in sorted(root.glob("*.svg")):
    svg = ET.parse(path).getroot()
    width, height = svg.get("width"), svg.get("height")
    unit = PT_MM if width.endswith("pt") else PX_MM
    w_mm, h_mm = number(width) * unit, number(height) * unit
    sizes = fonts(svg, 14 if unit == PT_MM else 12)
    smallest, typical = min(sizes), statistics.median(sizes)
    caps = {}
    for sheet, (cw, ch) in SHEETS.items():
        scale = min(cw / w_mm, ch / h_mm)
        caps[sheet] = (smallest * unit * scale * CAP, typical * unit * scale * CAP)
    rows.append((path.stem, w_mm, h_mm, smallest, typical, caps))

print(f"{'диаграмма':32} {'холст, мм':>14}  " + "  ".join(f"{s:>18}" for s in SHEETS))
print(f"{'':32} {'':>14}  " + "  ".join(f"{'мин / типичн., мм':>18}" for _ in SHEETS))
verdicts = []
for name, w, h, smallest, typical, caps in rows:
    cells = []
    fits = None
    for sheet, (cmin, ctyp) in caps.items():
        mark = "✓" if cmin >= GOOD else ("~" if cmin >= MIN else "✗")
        cells.append(f"{cmin:5.2f} / {ctyp:4.2f} {mark:>3}")
        if fits is None and cmin >= MIN:
            fits = sheet
    print(f"{name:32} {w:6.0f}×{h:<6.0f}  " + "  ".join(f"{c:>18}" for c in cells))
    verdicts.append((name, fits))

print("\n✓ ≥ 2,5 мм (рекомендуемый минимум ГОСТ 2.304)   ~ 1,8–2,5 мм (допустимо)   ✗ < 1,8 мм")


# ---------- контраст текста и заливки (WCAG 2.x: мелкий текст ≥ 4,5:1) ----------
NAMED = {"white": "#ffffff", "black": "#000000", "none": None, "transparent": None}


def hex_color(value):
    if not value:
        return None
    value = NAMED.get(value.strip().lower(), value.strip())
    if value and re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return value
    return None


def luminance(color):
    channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def shapes(group):
    for el in group.iter():
        tag = el.tag.split("}")[-1]
        fill = hex_color(el.get("fill"))
        if fill is None:
            continue
        if tag == "polygon":
            pts = [tuple(map(float, p.split(","))) for p in el.get("points").split()]
        elif tag == "ellipse":
            cx, cy, rx, ry = (float(el.get(k)) for k in ("cx", "cy", "rx", "ry"))
            pts = [(cx - rx, cy - ry), (cx + rx, cy + ry)]
        elif tag == "path":
            nums = list(map(float, re.findall(r"-?[\d.]+", el.get("d", ""))))
            pts = list(zip(nums[0::2], nums[1::2]))
        else:
            continue
        if pts:
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            yield (min(xs), min(ys), max(xs), max(ys)), fill


print("\nКонтраст текста и заливки (порог 4,5:1):")
for path in sorted(root.glob("*.svg")):
    svg = ET.parse(path).getroot()
    worst = None
    for group in svg.iter("{http://www.w3.org/2000/svg}g"):
        if group.get("class") not in ("node", "cluster"):
            continue
        boxes = list(shapes(group))
        for text in group.iter("{http://www.w3.org/2000/svg}text"):
            if not "".join(text.itertext()).strip() or text.get("x") is None:
                continue
            x, y = float(text.get("x")), float(text.get("y"))
            fg = hex_color(text.get("fill")) or "#000000"
            inside = [(abs((b[2] - b[0]) * (b[3] - b[1])), f) for b, f in boxes
                      if b[0] <= x <= b[2] and b[1] <= y <= b[3]]
            bg = min(inside)[1] if inside else "#ffffff"
            ratio = contrast(fg, bg)
            if worst is None or ratio < worst[0]:
                worst = (ratio, fg, bg, "".join(text.itertext()).strip()[:30])
    if worst:
        mark = "✓" if worst[0] >= 4.5 else "✗"
        print(f"  {path.stem:32} {worst[0]:5.1f}:1 {mark}  худший: «{worst[3]}» {worst[1]} на {worst[2]}")
    else:
        print(f"  {path.stem:32}   —    чёрный текст на белом (bpmn-js)")
print("\nНаименьший лист, на котором самый мелкий текст не меньше 1,8 мм:")
for name, fits in verdicts:
    print(f"  {name:32} {fits or 'не помещается даже на A3 — делить или выносить в приложение'}")
sys.exit(0)
