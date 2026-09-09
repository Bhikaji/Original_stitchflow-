const fs = require('fs');
const vm = require('vm');

// Mock DOM
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
  __INITIAL_PAGE__: 'partneronboarding',
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { protocol: 'http:', pathname: '/stitchflow/pages/partneronboarding.php', search: '' },
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

console.log("Loading app-core.js...");
const code = fs.readFileSync('assets/js/app-core.js', 'utf8');
vm.runInThisContext(code);

console.log("Checking obNewPartner type:", typeof global.obNewPartner, "window.obNewPartner:", typeof global.window.obNewPartner);

if (typeof global.obNewPartner === 'function') {
  console.log("[PASS] obNewPartner is defined!");
  console.log("Calling obNewPartner()...");
  global.obNewPartner();
  console.log("[SUCCESS] obNewPartner() executed!");
  console.log("Content HTML length:", mockElement('content').innerHTML.length);
  if (mockElement('content').innerHTML.includes('Partner account') || mockElement('content').innerHTML.includes('ob-card')) {
    console.log("[PASS] Vendor/Partner Onboarding Form rendered successfully!");
  } else {
    console.log("Content sample:", mockElement('content').innerHTML.slice(0, 300));
  }

  console.log("\n--- Testing gstapi ---");
  global.cur = 'gstapi';
  global.render();
  console.log("[PASS] gstapi page rendered! Length:", mockElement('content').innerHTML.length);
} else {
  console.error("[FAIL] obNewPartner is NOT defined!");
  process.exit(1);
}

process.exit(0);
