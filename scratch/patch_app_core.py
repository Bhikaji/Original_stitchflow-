import re
import os

file_path = r'c:\xampp\htdocs\stitchflow\assets\js\app-core.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"let p=db\.masters\.parties\.find\(function\(x\)\{return x\.partnerId===rec\.id \|\| String\(x\.gstNo\|\|''\)\.toUpperCase\(\)===String\(g\.gstin\|\|''\)\.toUpperCase\(\);\}\);"
replacement = "let p=db.masters.parties.find(function(x){return x.partnerId===rec.id;});"

new_content = re.sub(pattern, replacement, content)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched app-core.js")
else:
    print("Target string not found via regex in app-core.js")
