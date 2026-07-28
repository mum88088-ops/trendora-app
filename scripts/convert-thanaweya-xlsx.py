# -*- coding: utf-8 -*-
"""Convert thanaweya xlsx -> data/thanaweya-2026.tsv.gz"""
import gzip, os, re, sys, zipfile, xml.etree.ElementTree as ET
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "thanaweya-2026.tsv.gz")

def col_idx(ref):
    m = re.match(r"([A-Z]+)", ref)
    n = 0
    for c in m.group(1):
        n = n * 26 + (ord(c) - 64)
    return n - 1

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/convert-thanaweya-xlsx.py <file.xlsx>")
        sys.exit(1)
    xlsx = sys.argv[1]
    z = zipfile.ZipFile(xlsx)
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings = ["".join((t.text or "") for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")) for si in root.findall("m:si", NS)]
    print("sharedStrings", len(strings))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    count = 0
    with gzip.open(OUT, "wt", encoding="utf-8", compresslevel=9) as out:
        with z.open("xl/worksheets/sheet1.xml") as fh:
            row_vals = {}
            for _e, elem in ET.iterparse(fh, events=("end",)):
                tag = elem.tag.split("}")[-1]
                if tag == "c":
                    ref = elem.attrib.get("r", "")
                    t = elem.attrib.get("t")
                    v = elem.find("m:v", NS)
                    raw = v.text if v is not None else ""
                    if t == "s" and raw != "":
                        raw = strings[int(raw)]
                    if ref:
                        row_vals[col_idx(ref)] = raw
                    elem.clear()
                elif tag == "row":
                    rnum = int(elem.attrib.get("r", "0"))
                    if rnum > 1 and 0 in row_vals:
                        seat = str(row_vals.get(0, "")).strip()
                        name = str(row_vals.get(1, "")).strip().replace("\t", " ").replace("\n", " ")
                        deg = str(row_vals.get(2, "")).strip()
                        status = str(row_vals.get(3, "")).strip().replace("\t", " ").replace("\n", " ")
                        if seat:
                            out.write(f"{seat}\t{name}\t{deg}\t{status}\n")
                            count += 1
                            if count % 100000 == 0:
                                print(" rows", count)
                    row_vals = {}
                    elem.clear()
    print("DONE", count, OUT, os.path.getsize(OUT))

if __name__ == "__main__":
    main()