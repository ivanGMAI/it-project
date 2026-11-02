import sys
from pathlib import Path

from lxml import etree

USAGE = "python tools/check-bpmn.py <каталог XSD OMG: interrao-hack/backend/reference/bpmn/xsd>"


def main(xsd_dir: Path) -> int:
    schema = etree.XMLSchema(etree.parse(str(xsd_dir / "BPMN20.xsd")))
    src = Path(__file__).resolve().parent.parent / "diagrams" / "src"
    failed = 0
    for path in sorted(src.glob("*.bpmn")):
        if schema.validate(etree.parse(str(path))):
            print(f"{path.name}: OK")
        else:
            failed += 1
            print(f"{path.name}: {schema.error_log}")
    return 1 if failed else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(USAGE)
        sys.exit(2)
    sys.exit(main(Path(sys.argv[1])))
