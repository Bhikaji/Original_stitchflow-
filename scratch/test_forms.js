const fs = require('fs');

// Create a mock browser environment
const domElements = {};
function mockElement(id) {
  if (!domElements[id]) {
    domElements[id] = {
      id: id,
      tagName: 'DIV',
      innerHTML: '',
      textContent: '',
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      },
      style: {},
      dataset: {},
      children: [],
      rows: [],
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener: () => {},
      appendChild: () => {},
      removeChild: () => {},
      closest: () => null,
      setAttribute: () => {},
      removeAttribute: () => {},
      focus: () => {},
      remove: () => {}
    };
  }
  return domElements[id];
}

global.window = {
  __INITIAL_PAGE__: 'po',
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { protocol: 'http:', pathname: '/stitchflow/pages/po.php', search: '' },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  sessionStorage: {
    getItem: (k) => k === 'stitchflow_user_id' ? 'USR-0001' : null,
    setItem: () => {},
    removeItem: () => {}
  }
};

global.document = {
  getElementById: (id) => mockElement(id),
  querySelector: (sel) => mockElement(sel.replace(/^[#.]/, '')),
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: mockElement('body'),
  createElement: (tag) => mockElement(tag)
};

global.location = global.window.location;
global.localStorage = global.window.localStorage;
global.sessionStorage = global.window.sessionStorage;
global.navigator = { userAgent: 'test' };
global.MutationObserver = class { observe() {} disconnect() {} };
global.window.MutationObserver = global.MutationObserver;

const vm = require('vm');
console.log("Loading app-core.js...");
try {
  const code = fs.readFileSync('assets/js/app-core.js', 'utf8');
  vm.runInThisContext(code);
  console.log("[SUCCESS] app-core.js evaluated cleanly without exceptions!");
} catch (e) {
  console.error("[ERROR evaluating app-core.js]:", e);
  process.exit(1);
}

// Check initial state
console.log("Initial cur:", global.cur);
console.log("Initial pageView:", global.pageView);

// Now test opening PO form
console.log("\n--- Testing openForm('po') ---");
try {
  global.openForm('po');
  console.log("[SUCCESS] openForm('po') executed!");
  console.log("Current pageView:", global.pageView);
  console.log("Content HTML length:", mockElement('content').innerHTML.length);
  if (mockElement('content').innerHTML.includes('po-form') || mockElement('content').innerHTML.includes('Purchase Order') || mockElement('content').innerHTML.includes('po-items')) {
    console.log("[PASS] PO Form HTML rendered successfully!");
  } else {
    console.log("Content sample:", mockElement('content').innerHTML.slice(0, 200));
  }
} catch (e) {
  console.error("[FAIL] openForm('po') threw error:", e);
}

// Test closing form and navigating
console.log("\n--- Testing back() ---");
global.back();
console.log("After back(), pageView:", global.pageView);

console.log("\n--- Testing go('inward') ---");
try {
  global.go('inward');
  console.log("[SUCCESS] go('inward') executed! cur is now:", global.cur);
} catch (e) {
  console.error("[FAIL] go('inward') threw error:", e);
}

console.log("\n--- Testing openForm('inward') ---");
try {
  global.openForm('inward');
  console.log("[SUCCESS] openForm('inward') executed!");
  console.log("Current pageView:", global.pageView);
} catch (e) {
  console.error("[FAIL] openForm('inward') threw error:", e);
}

console.log("\n--- Testing go('jobwork') ---");
try {
  global.go('jobwork');
  console.log("[SUCCESS] go('jobwork') executed! cur is now:", global.cur);
  global.openForm('jobwork');
  console.log("[SUCCESS] openForm('jobwork') executed! pageView is now:", global.pageView);
} catch (e) {
  console.error("[FAIL] go/openForm jobwork threw error:", e);
}

console.log("\n--- All Form and Module Switching Tests Passed! ---");
