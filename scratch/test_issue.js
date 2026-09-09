let cur = 'po';
let pageView = null;
const MODULES = { po: {}, inward: {}, jobwork: {} };
const window = { __INITIAL_PAGE__: 'po' };

let uiStateInitialized = false;
function restoreUiState() {
  if (!uiStateInitialized) {
    uiStateInitialized = true;
    if (window.__INITIAL_PAGE__ && MODULES[window.__INITIAL_PAGE__]) {
      cur = window.__INITIAL_PAGE__;
      pageView = null;
    }
  }
}

function openForm(m) {
  pageView = { kind: 'form', m: m, id: null };
  render();
}

function go(m) {
  cur = m;
  pageView = null;
  render();
}

function render() {
  restoreUiState();
  console.log("render() called! cur =", cur, "pageView =", pageView);
}

console.log("=== Initial render ===");
render();

console.log("\n=== User clicks 'Create PO' ===");
openForm('po');

console.log("\n=== User clicks 'Inward' in sidebar ===");
go('inward');
