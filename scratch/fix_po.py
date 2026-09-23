import sys, re
path = 'c:/xampp/htdocs/stitchflow/assets/js/app-core.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add allShipToOptions
add_func = """function allShipToOptions() {
  const all = [];
  (db.masters.parties || []).forEach(function(pty) {
    if (pty.status === 'Inactive') return;
    const nm = pty.shortName || pty.legalName;
    if (!nm) return;
    const records = partyTradeRecords(nm, true);
    records.filter(function(r) { return !!r.gstNo; }).forEach(function(r) {
      all.push({ v: r.name + ' · ' + r.gstNo, l: r.label });
    });
  });
  const seen = {};
  return all.filter(function(o) {
    if (seen[o.l]) return false;
    seen[o.l] = true;
    return true;
  }).sort(function(a, b) { return String(a.l).localeCompare(String(b.l)); });
}
"""
if 'function allShipToOptions' not in content:
    content = content.replace('function supplierShipToOptions(name) {', add_func + '\nfunction supplierShipToOptions(name) {')

# 2. Change po-shipto field opts
content = content.replace("opts: supplierShipToOptions(r.supplier)", "opts: allShipToOptions()")

# 3. Remove the dependency update in onPoSupplierChange
pattern = r"  const shipTo = CBOX\['po-shipto'\];\s*if \(shipTo\) {[\s\S]*?renderCboxList\('po-shipto'\);\s*}"
content, n = re.subn(pattern, '', content)
if n > 0:
    print(f'Removed shipTo dependency ({n})')
else:
    print('shipTo dependency block not found')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
