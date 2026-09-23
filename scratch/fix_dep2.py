import sys
path = 'c:/xampp/htdocs/stitchflow/assets/js/app-core.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """  const shipTo = CBOX['po-shipto'];
  if (shipTo) {
    shipTo.opts = supplierShipToOptions(supplier).map(normalizeOpt);
    if (!shipTo.opts.some(function (o) { return o.v === shipTo.val; })) {
      shipTo.val = ''; shipTo.display = null;
      const inp = qs('[data-cb-input="po-shipto"]');
      if (inp) inp.value = '';
    } else {
      const selected = shipTo.opts.find(function (o) { return o.v === shipTo.val; });
      shipTo.display = selected.l;
      const inp = qs('[data-cb-input="po-shipto"]');
      if (inp) inp.value = selected.l;
    }
  }"""

if target in content:
    content = content.replace(target, '')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done!')
else:
    print('Not found')
