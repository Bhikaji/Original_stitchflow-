const fs = require('fs');

// Read app-core.js
const code = fs.readFileSync('assets/js/app-core.js', 'utf8');

// Set up a mock environment
const window = {
  location: { search: '' },
  addEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  document: {
    createElement: () => ({ setAttribute: () => {}, click: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {} },
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null
  }
};
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval: () => {},
  clearInterval: () => {},
  addEventListener: () => {},
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  window,
  document: window.document,
  navigator: { userAgent: 'node' },
  location: window.location,
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  localStorage: {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;

const vm = require('vm');
try {
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  console.log("app-core.js evaluated successfully!");
} catch (e) {
  console.error("Evaluation error:", e);
  process.exit(1);
}

// Test 1: masterIdPrefix
console.log("\n--- Testing masterIdPrefix ---");
const masterIdPrefix = sandbox.masterIdPrefix;
const ensureMasterIds = sandbox.ensureMasterIds;
const masterIdFor = sandbox.masterIdFor;
const findMasterId = sandbox.findMasterId;
const normalizeOpt = sandbox.normalizeOpt;
const itemOptsFor = sandbox.itemOptsFor;
const renameMasterVal = sandbox.renameMasterVal;
const delMaster = sandbox.delMaster;
const addMasterVal = sandbox.addMasterVal;
const db = vm.runInContext('db', sandbox);

const prefixes = {
  classifications: masterIdPrefix('classifications'),
  processTypes: masterIdPrefix('processTypes'),
  uoms: masterIdPrefix('uoms'),
  categories: masterIdPrefix('categories'),
  sizes: masterIdPrefix('sizes'),
  warehouses: masterIdPrefix('warehouses'),
  qualities: masterIdPrefix('qualities')
};
console.log("Prefixes:", JSON.stringify(prefixes, null, 2));
if (prefixes.classifications !== 'CLS' || prefixes.processTypes !== 'PRT' || prefixes.uoms !== 'UOM' || prefixes.qualities !== 'QLT') {
  console.error("FAILED prefix test!");
  process.exit(1);
}

// Test 2: Master IDs generation & ensureMasterIds
console.log("\n--- Testing masterIdFor & ensureMasterIds ---");
db.masters.masterIds = null;
ensureMasterIds();
console.log("Initial masterIds keys count:", Object.keys(db.masters.masterIds).length);
const clsId = masterIdFor('classifications', 'Fabric');
console.log("Fabric classification ID:", clsId);
if (!clsId || !clsId.startsWith('CLS-')) {
  console.error("FAILED masterIdFor test:", clsId);
  process.exit(1);
}

// Test 3: normalizeOpt
console.log("\n--- Testing normalizeOpt ---");
const optPlain = normalizeOpt('Fabric', 'classifications');
console.log("normalizeOpt('Fabric', 'classifications'):", optPlain);
if (!optPlain.l.includes('[' + clsId + '] Fabric')) {
  console.error("FAILED normalizeOpt label test:", optPlain);
  process.exit(1);
}

// Test 4: itemOptsFor
console.log("\n--- Testing itemOptsFor ---");
const fabricItems1 = itemOptsFor('Fabric');
const fabricItems2 = itemOptsFor('[' + clsId + '] Fabric');
const fabricItems3 = itemOptsFor(clsId);
console.log("Items for 'Fabric':", fabricItems1.length);
console.log("Items for '[CLS-0001] Fabric':", fabricItems2.length);
console.log("Items for 'CLS-0001':", fabricItems3.length);
if (fabricItems1.length === 0 || fabricItems1.length !== fabricItems2.length || fabricItems1.length !== fabricItems3.length) {
  console.error("FAILED itemOptsFor test!");
  process.exit(1);
}

// Test 5: renameMasterVal renaming
console.log("\n--- Testing renameMasterVal ID preservation ---");
addMasterVal('uoms', 'Metre', true);
const metreId = masterIdFor('uoms', 'Metre');
console.log("Metre UOM ID:", metreId);
renameMasterVal('uoms', 'Metre', 'Mtr');
const mtrId = masterIdFor('uoms', 'Mtr');
console.log("Mtr UOM ID after rename:", mtrId);
if (mtrId !== metreId) {
  console.error("FAILED renameMasterVal test! Expected ID to be preserved:", metreId, "got:", mtrId);
  process.exit(1);
}

console.log("\nALL TESTS PASSED SUCCESSFULLY!");
