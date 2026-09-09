const db = {
  jobwork: [
    {
      id: "mtsazg8776a7o",
      no: "JW-0001",
      garments: [
        {
          style: "CS-1000",
          portal: "MYN-456",
          desc: "CS-1000",
          sizes: { "S": 5 },
          orderQty: 5
        }
      ]
    }
  ],
  processoutward: [],
  processinward: []
};

function qaStyleKey(v) { return String(v || '').split(' · ')[0].trim().toLowerCase(); }
function pf(v) { return parseFloat(v) || 0; }
function fmtNum(v) { return Number(v || 0).toLocaleString('en-IN'); }

function testValidation(jwRef, procType, items, id) {
  const jw = (db.jobwork || []).find(j => j.no === jwRef);
  for (let k = 0; k < items.length; k++) {
    const key = qaStyleKey(items[k].style);
    let avail = 0;
    let label = 'QC-passed finished-goods';
    if (jw) {
      label = 'Job Work order';
      const jwQty = (jw.garments || []).filter(g => qaStyleKey(g.style || g.desc) === key).reduce((a, g) => a + (pf(g.orderQty) || Object.values(g.sizes || {}).reduce((x, n) => x + pf(n), 0)), 0);
      const prior = (db.processoutward || []).filter(r => r.id !== id && r.jwRef === jwRef && r.processType === procType && !/cancel/i.test(r.status || '')).reduce((a, r) => a + (r.items || []).filter(i => qaStyleKey(i.style) === key).reduce((z, i) => z + pf(i.qty), 0), 0);
      const back = (db.processinward || []).filter(r => !/cancel/i.test(r.status || '') && (db.processoutward || []).some(o => o.no === r.outwardRef && o.jwRef === jwRef && o.processType === procType)).reduce((a, r) => a + (r.items || []).filter(i => qaStyleKey(i.style) === key).reduce((z, i) => z + pf(i.qty), 0), 0);
      avail = Math.max(0, jwQty - prior + back);
    } else {
      const received = 0; // qaFgAvailable(key)
      const prior = (db.processoutward || []).filter(r => r.id !== id && !r.jwRef && !/cancel/i.test(r.status || '')).reduce((a, r) => a + (r.items || []).filter(i => qaStyleKey(i.style) === key).reduce((z, i) => z + pf(i.qty), 0), 0);
      const back = (db.processinward || []).filter(r => !/cancel/i.test(r.status || '') && (db.processoutward || []).some(o => o.no === r.outwardRef && !o.jwRef)).reduce((a, r) => a + (r.items || []).filter(i => qaStyleKey(i.style) === key).reduce((z, i) => z + pf(i.qty), 0), 0);
      avail = Math.max(0, received - prior + back);
    }
    if (pf(items[k].qty) > avail) {
      return 'Process quantity exceeds ' + label + ' availability of ' + fmtNum(avail) + '.';
    }
  }
  return null;
}

// Test with 5 (should PASS)
console.log("Test 5 pcs:", testValidation("JW-0001", "PRT-0001", [{ style: "CS-1000", qty: 5 }]));

// Test with 6 (should FAIL)
console.log("Test 6 pcs:", testValidation("JW-0001", "PRT-0001", [{ style: "CS-1000", qty: 6 }]));
