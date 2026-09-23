import sys, re
path = 'c:/xampp/htdocs/stitchflow/assets/js/app-core.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"  const shipTo = CBOX\['po-shipto'\];\s*if \(shipTo\) {\s*shipTo\.opts = supplierShipToOptions\(supplier\)\.map\(normalizeOpt\);\s*if \(!shipTo\.opts\.some\(function \(o\) { return o\.v === shipTo\.val; }\)\) {\s*shipTo\.val = ''; shipTo\.display = null;\s*const inp = qs\('\[data-cb-input=\"po-shipto\"\]'\);\s*if \(inp\) inp\.value = '';\s*} else {\s*const selected = shipTo\.opts\.find\(function \(o\) { return o\.v === shipTo\.val; }\);\s*shipTo\.display = selected\.l;\s*const inp = qs\('\[data-cb-input=\"po-shipto\"\]'\);\s*if \(inp\) inp\.value = selected\.l;\s*}\s*}"
content, n = re.subn(pattern, '', content)

if n > 0:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Replaced {n} occurrences')
else:
    print('Not found')
