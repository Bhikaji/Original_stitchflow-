const fs = require('fs');
const src = fs.readFileSync('assets/js/app-core.js', 'utf8');
const start = src.indexOf('function inwardOptionsForItem');
const end = src.indexOf('function poRefFromInward');
const snippet = src.slice(start, end);
const script = `
  const db = { inward: [
    { no: 'IN-100', poRef: 'PO-1', supplier: 'A', date: '2026-09-01', entryType: 'PO Receipt', items: [{ name: 'Fabric (ITM-0001)', recQty: 10 }] },
    { no: 'IN-200', poRef: 'PO-2', supplier: 'B', date: '2026-09-02', entryType: 'Opening Stock', items: [{ name: 'Fabric (ITM-0001)', recQty: 8 }] },
    { no: 'IN-300', poRef: 'PO-3', supplier: 'C', date: '2026-09-03', entryType: 'Job Work Return', items: [{ name: 'Fabric (ITM-0001)', recQty: 2 }] },
    { no: 'IN-400', poRef: 'PO-4', supplier: 'D', date: '2026-09-04', entryType: 'PO Receipt', items: [{ name: 'Thread (ITM-0002)', recQty: 5 }] }
  ] };
  const pf = (n) => Number(n || 0);
  function bareItemName(v) { const s = String(v == null ? '' : v).trim(); const m = /^(.*?)\\s*\\([A-Za-z]{2,}-\\d+\\)$/.exec(s); return m ? m[1].trim() : s; }
  function lcName(v) { return String(v == null ? '' : v).trim().toLowerCase(); }
  function fmtNum(v) { return String(v); }
  function stockExcept(skipTr) { return { skipTr: skipTr || null }; }
  function inwardItemStock() { return 0; }
  ${snippet}
  const result = inwardOptionsForItem('Fabric (ITM-0001)');
  console.log('count=' + result.length);
  console.log('items=' + result.map(x => x.v).join(','));
`;
require('vm').runInNewContext(script, { console });
