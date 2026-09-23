import sys, re
path = 'c:/xampp/htdocs/stitchflow/assets/js/app-core.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"  const shipTo = CBOX\['po-shipto'\];[\s\S]*?if \(inp\) inp\.value = selected\.l;\s*}\s*}"
content, n = re.subn(pattern, '', content)

if n > 0:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Replaced {n} occurrences')
else:
    print('Not found')
