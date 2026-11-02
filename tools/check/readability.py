"""Проверка читаемости диаграмм при печати.

Для каждого diagrams/svg/*.svg: размер холста, самый мелкий и типичный шрифт, и какой высоты будут
прописные буквы, если вписать диаграмму в рабочее поле листа (поля по ГОСТ 7.32-2017:
левое 30, правое 15, верхнее и нижнее 20 мм). Порог — ряд размеров шрифта ГОСТ 2.304-81:
2,5 мм — минимальный рекомендуемый размер, 1,8 мм — «не рекомендуется».

Контраст текста и фона проверяет node tools/check/contrast.mjs (по настоящей отрисовке).

Запуск: python3 tools/check/readability.py
"""
import re
import statistics
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

PT_MM = 25.4 / 72      # Graphviz пишет SVG в пунктах
PX_MM = 25.4 / 96      # bpmn-js пишет SVG в CSS-пикселях
CAP = 0.727            # высота прописной буквы Inter в долях кегля
SHEETS = {             # рабочее поле листа, мм (ширина, высота)
    "A4 книжн.": (165, 257),
    "A4 альб.": (257, 165),
    "A3 альб.": (375, 257),
}
GOOD, MIN = 2.5, 1.8

root = Path(__file__).resolve().parents[2] / "diagrams" / "svg"


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


print("\nНаименьший лист, на котором самый мелкий текст не меньше 1,8 мм:")
for name, fits in verdicts:
    print(f"  {name:32} {fits or 'не помещается даже на A3 — делить или выносить в приложение'}")
sys.exit(0)
