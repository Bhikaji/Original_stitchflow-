import re

path = 'c:/xampp/htdocs/stitchflow/assets/js/app-core.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "? (gst ? 'GST:' + gst : 'NAME:' + String(r.name || '').trim().toLowerCase())"
replacement = "? String(r.label || '').toLowerCase()"

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Target not found')
