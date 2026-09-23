import re, sys

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r"\? \(gst \? 'GST:' \+ gst : 'NAME:' \+ String\(r\.name \|\| ''\)\.trim\(\)\.toLowerCase\(\)\)"
    replacement = "? String(r.label || '').toLowerCase()"

    content, n = re.subn(pattern, replacement, content)

    if n > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Replaced {n} occurrences in {path}")
    else:
        print(f"Target not found in {path}")

fix_file('c:/xampp/htdocs/stitchflow/app/app1.html')
fix_file('c:/xampp/htdocs/stitchflow/app/demo/KEND2C- Sales.html')
