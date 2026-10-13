/**
 * StitchFlow ERP — Standard Production & Stock Reports
 * File: assets/js/modules/reports.js
 */

/* ================= REPORTS ================= */
const REPORT_TYPES = [
  { k: 'fabric_inout_summary', l: 'Fabric Inward & Outward Summary' },
  { k: 'trims_inout_summary', l: 'Trims Inward & Outward Summary' },
  { k: 'fabric_grn', l: 'Fabric Inward' },
  { k: 'trims_grn', l: 'Trims Inward' },
  { k: 'fabric_po_grn', l: 'Fabric PO Outstanding' },
  { k: 'trims_po_grn', l: 'Trims PO Outstanding' },
  { k: 'fabric_issue', l: 'Fabric Issue' },
  { k: 'trims_issue', l: 'Trims Issue' },
  { k: 'intransit_material', l: 'In-transit Material (POD Pending)' },
  { k: 'wip', l: 'WIP (Work in Progress)' },
  { k: 'fg_received', l: 'FG Received' },
  { k: 'stock', l: 'Stock Report (Fabric · Trims · FG)' },
  { k: 'item_ledger', l: 'Item Ledger (Fabric & Trims)' }
];
window.REPORT_TYPES = REPORT_TYPES;
let repState = { type: 'fabric_grn', from: '', to: '', page: 1, size: 25, preset: 'last', lastN: 30, lastUnit: 'days', includeToday: true, grouped: false, groupBy: [] };
window.repState = repState;

/* Sale dashboard / numbers date filter compatibility */
let SDATE = { from: '', to: '', preset: 'all' };
window.SDATE = SDATE;
function sfActive() {
  if (!SDATE) return false;
  return !!(SDATE.from || SDATE.to || (SDATE.preset && SDATE.preset !== 'all'));
}
function inRange(d, from, to) { return (!from || d >= from) && (!to || d <= to); }
function defaultFrom() { const x = new Date(); x.setDate(x.getDate() - 30); return x.toISOString().slice(0, 10); }


function rdpAddDays(iso, n) {
  const d = dpParse(iso) || new Date();
  d.setDate(d.getDate() + n);
  return dpISO(d);
}
function rdpAddMonths(iso, n) {
  const d = dpParse(iso) || new Date();
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const max = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, max));
  return dpISO(d);
}
function rdpYesterday() { return rdpAddDays(today(), -1); }
function rdpFromPreset(d) {
  d = d || {};
  const inc = d.includeToday !== false;
  const end = inc ? today() : rdpYesterday();
  const p = d.preset || 'last';
  if (p === 'today') return { from: today(), to: today() };
  if (p === 'yesterday') return { from: rdpYesterday(), to: rdpYesterday() };
  if (p === 'last') {
    const n = Math.max(1, parseInt(d.lastN, 10) || 30);
    const u = d.lastUnit || 'days';
    const from = u === 'weeks' ? rdpAddDays(end, -(n * 7)) : (u === 'months' ? rdpAddMonths(end, -n) : rdpAddDays(end, -n));
    return { from: from, to: end };
  }
  if (p === 'mtd' || p === 'ptd') {
    const t = dpParse(end);
    return { from: dpISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: end };
  }
  if (p === 'qtd') {
    const t = dpParse(end);
    const q = Math.floor(t.getMonth() / 3) * 3;
    return { from: dpISO(new Date(t.getFullYear(), q, 1)), to: end };
  }
  if (p === 'ytd') {
    const t = dpParse(end);
    return { from: dpISO(new Date(t.getFullYear(), 0, 1)), to: end };
  }
  if (p === 'thisMonth') {
    const t = new Date();
    return { from: dpISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: dpISO(new Date(t.getFullYear(), t.getMonth() + 1, 0)) };
  }
  if (p === 'lastMonth') {
    const t = new Date();
    return { from: dpISO(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: dpISO(new Date(t.getFullYear(), t.getMonth(), 0)) };
  }
  if (/^q[1-4]$/.test(p)) {
    const y = new Date().getFullYear();
    const qi = parseInt(p[1], 10) - 1;
    return { from: dpISO(new Date(y, qi * 3, 1)), to: dpISO(new Date(y, qi * 3 + 3, 0)) };
  }
  return { from: d.from || defaultFrom(), to: d.to || today() };
}
function rdpSyncRepState() {
  const r = repState;
  if (!r.preset) r.preset = 'last';
  if (!r.lastN) r.lastN = 30;
  if (!r.lastUnit) r.lastUnit = 'days';
  if (r.includeToday == null) r.includeToday = true;
  if (r.preset !== 'custom' || !r.from || !r.to) {
    const x = rdpFromPreset(r);
    r.from = x.from; r.to = x.to;
  }
}
function rdpPretty(iso) {
  const d = dpParse(iso); if (!d) return '';
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return mon[d.getMonth()] + ' ' + d.getDate();
}
function rdpPrettyLong(iso) {
  const d = dpParse(iso); if (!d) return '';
  return DP_MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}
function rdpParseTyped(str) {
  const raw = String(str == null ? '' : str).trim();
  if (!/^\d{2}-\d{2}-\d{4}$/.test(raw)) return '';
  const iso = dpToISO(raw);
  const d = dpParse(iso);
  if (!d) return '';
  if (dpToDisplay(iso) !== raw) return '';
  return iso;
}
function rdpMaskDmy(el) {
  if (!el) return;
  const start = el.selectionStart;
  const old = String(el.value || '');
  let digits = old.replace(/\D/g, '').slice(0, 8);
  let out = digits;
  if (digits.length > 4) out = digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4);
  else if (digits.length > 2) out = digits.slice(0, 2) + '-' + digits.slice(2);
  if (out !== old) {
    el.value = out;
    try {
      let pos = out.length;
      if (typeof start === 'number') {
        const before = old.slice(0, start).replace(/\D/g, '').length;
        if (before <= 2) pos = before;
        else if (before <= 4) pos = before + 1;
        else pos = before + 2;
      }
      el.setSelectionRange(pos, pos);
    } catch (e) { }
  }
}
function rdpCommitTyped(which, val, silent) {
  if (!RDP.draft) return false;
  const iso = rdpParseTyped(val);
  const inp = which === 'from' ? $('rdpFromInp') : $('rdpToInp');
  if (!iso) {
    if (inp) inp.value = dpToDisplay(RDP.draft[which]);
    if (String(val || '').trim()) toast('Enter date as DD-MM-YYYY', 'red');
    return false;
  }
  RDP.nav = 'custom';
  RDP.draft.preset = 'custom';
  const same = RDP.draft[which] === iso;
  RDP.draft[which] = iso;
  if (which === 'from' && RDP.draft.to && iso > RDP.draft.to) RDP.draft.to = iso;
  if (which === 'to' && RDP.draft.from && iso < RDP.draft.from) RDP.draft.from = iso;
  const end = dpParse(iso);
  if (end) RDP.view = new Date(end.getFullYear(), end.getMonth(), 1);
  if (silent) {
    if (inp) inp.value = dpToDisplay(iso);
    return true;
  }
  if (same) { if (inp) inp.value = dpToDisplay(iso); return true; }
  rdpPaint();
  const again = which === 'from' ? $('rdpFromInp') : $('rdpToInp');
  if (again) { try { again.focus(); } catch (e) { } }
  return true;
}
function rdpRangeLabel(from, to) {
  const a = dpParse(from), b = dpParse(to);
  if (!a || !b) return '';
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sameDay = from === to;
  const sameMon = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const sameYr = a.getFullYear() === b.getFullYear();
  if (sameDay) return mon[a.getMonth()] + ' ' + a.getDate() + ', ' + a.getFullYear();
  if (sameMon) return mon[a.getMonth()] + ' ' + a.getDate() + '\u2013' + b.getDate() + ', ' + a.getFullYear();
  if (sameYr) return mon[a.getMonth()] + ' ' + a.getDate() + '\u2013' + mon[b.getMonth()] + ' ' + b.getDate() + ', ' + a.getFullYear();
  return mon[a.getMonth()] + ' ' + a.getDate() + ', ' + a.getFullYear() + '\u2013' + mon[b.getMonth()] + ' ' + b.getDate() + ', ' + b.getFullYear();
}
function rdpLabel(r) {
  r = r || repState;
  const p = r.preset || 'last';
  if (p === 'today') return 'Today';
  if (p === 'yesterday') return 'Yesterday';
  if (p === 'last') {
    const n = r.lastN || 30;
    const u = r.lastUnit === 'weeks' ? (n === 1 ? 'week' : 'weeks') : (r.lastUnit === 'months' ? (n === 1 ? 'month' : 'months') : (n === 1 ? 'day' : 'days'));
    return 'Last ' + n + ' ' + u;
  }
  if (p === 'mtd' || p === 'ptd') return 'Month to date';
  if (p === 'qtd') return 'Quarter to date';
  if (p === 'ytd') return 'Year to date';
  if (p === 'thisMonth') return 'This month';
  if (p === 'lastMonth') return 'Last month';
  if (p === 'q1') return 'Q1';
  if (p === 'q2') return 'Q2';
  if (p === 'q3') return 'Q3';
  if (p === 'q4') return 'Q4';
  return 'Custom range';
}
function rdpTriggerHtml() {
  rdpSyncRepState();
  const r = repState;
  return '<button type="button" class="rdp-trig" id="rdpTrig" onclick="rdpToggle(event)">' +
    '<span class="rdp-calic"><svg class="i" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3.25" y="4.75" width="13.5" height="12" rx="2"/><path d="M3.25 8.25h13.5M7 3.5v2.5M13 3.5v2.5"/></svg></span><span>' + esc(rdpLabel(r)) + '</span>' + ic('chevron', 14) +
    '</button>' +
    '<span class="rdp-chip">' + esc(rdpRangeLabel(r.from, r.to)) + '</span>';
}

const RDP_NAV = [
  { k: 'today', l: 'Today' },
  { k: 'yesterday', l: 'Yesterday' },
  { k: 'last', l: 'Last' },
  { k: 'ptd', l: 'Period to date' },
  { k: 'thisMonth', l: 'This month' },
  { k: 'lastMonth', l: 'Last month' },
  { k: 'quarters', l: 'Quarters' },
  { k: 'custom', l: 'Custom range' }
];
let RDP = { open: false, el: null, nav: 'last', draft: null, view: null, pick: null, target: null };

function rdpNavOf(preset) {
  if (preset === 'today' || preset === 'yesterday' || preset === 'last' || preset === 'thisMonth' || preset === 'lastMonth' || preset === 'custom') return preset;
  if (preset === 'mtd' || preset === 'qtd' || preset === 'ytd' || preset === 'ptd') return 'ptd';
  if (/^q[1-4]$/.test(preset || '')) return 'quarters';
  return 'custom';
}
function rdpEnsure() {
  if (RDP.el) return RDP.el;
  const el = document.createElement('div');
  el.className = 'rdp-pop';
  el.id = 'rdpPop';
  el.addEventListener('mousedown', function (e) { e.stopPropagation(); });
  document.body.appendChild(el);
  RDP.el = el;
  return el;
}
function rdpHide() {
  RDP.open = false;
  if (RDP.el) RDP.el.classList.remove('show');
}
function rdpToggle(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (RDP.open) { rdpHide(); return; }
  rdpOpen();
}
function rdpOpen() {
  RDP.target = null;
  rdpSyncRepState();
  const r = repState;
  RDP.draft = {
    from: r.from, to: r.to, preset: r.preset || 'last',
    lastN: r.lastN || 30, lastUnit: r.lastUnit || 'days',
    includeToday: r.includeToday !== false
  };
  RDP.nav = rdpNavOf(RDP.draft.preset);
  const end = dpParse(RDP.draft.to) || new Date();
  RDP.view = new Date(end.getFullYear(), end.getMonth(), 1);
  RDP.pick = null;
  RDP.open = true;
  rdpPaint();
  const el = rdpEnsure();
  el.classList.add('show');
  const trig = $('rdpTrig');
  if (trig) {
    const box = trig.getBoundingClientRect();
    const w = Math.min(el.offsetWidth || 760, window.innerWidth - 16);
    let left = box.left;
    if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - w);
    let top = box.bottom + 6;
    if (top + 420 > window.innerHeight) top = Math.max(8, box.top - 6 - Math.min(el.offsetHeight || 400, window.innerHeight - 16));
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
  }
}
function dashboardDateFilter(kind, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (RDP.open) { rdpHide(); return; }
  const range = kind === 'fabric' ? dashFabricRange : dashTrimsRange;
  RDP.target = kind;
  RDP.draft = { from: range.from, to: range.to, preset: 'thisMonth', lastN: 30, lastUnit: 'days', includeToday: true };
  RDP.nav = 'thisMonth';
  const end = dpParse(range.to) || new Date();
  RDP.view = new Date(end.getFullYear(), end.getMonth(), 1);
  RDP.pick = null;
  RDP.open = true;
  rdpPaint();
  const el = rdpEnsure(), anchor = e && e.currentTarget;
  el.classList.add('show');
  if (anchor) {
    const box = anchor.getBoundingClientRect();
    const w = Math.min(el.offsetWidth || 760, window.innerWidth - 16);
    el.style.left = Math.round(Math.max(8, Math.min(box.left, window.innerWidth - 8 - w))) + 'px';
    el.style.top = Math.round(Math.min(box.bottom + 6, window.innerHeight - (el.offsetHeight || 400) - 8)) + 'px';
  }
}
function rdpApplyPreset(nav, preset) {
  RDP.nav = nav;
  if (preset) RDP.draft.preset = preset;
  else if (nav === 'last') RDP.draft.preset = 'last';
  else if (nav === 'ptd') RDP.draft.preset = RDP.draft.preset === 'qtd' || RDP.draft.preset === 'ytd' ? RDP.draft.preset : 'mtd';
  else if (nav === 'quarters') RDP.draft.preset = /^q[1-4]$/.test(RDP.draft.preset) ? RDP.draft.preset : 'q1';
  else if (nav === 'custom') { RDP.draft.preset = 'custom'; RDP.focus = 'from'; }
  else RDP.draft.preset = nav;
  if (RDP.draft.preset !== 'custom') {
    const x = rdpFromPreset(RDP.draft);
    RDP.draft.from = x.from; RDP.draft.to = x.to;
    RDP.pick = null;
    const end = dpParse(x.to) || new Date();
    RDP.view = new Date(end.getFullYear(), end.getMonth(), 1);
  }
  rdpPaint();
}
function rdpSetLastN(v) {
  RDP.draft.lastN = Math.max(1, parseInt(v, 10) || 30);
  RDP.draft.preset = 'last'; RDP.nav = 'last';
  const x = rdpFromPreset(RDP.draft);
  RDP.draft.from = x.from; RDP.draft.to = x.to;
  rdpPaint();
}
function rdpSetLastUnit(v) {
  RDP.draft.lastUnit = v || 'days';
  RDP.draft.preset = 'last'; RDP.nav = 'last';
  const x = rdpFromPreset(RDP.draft);
  RDP.draft.from = x.from; RDP.draft.to = x.to;
  rdpPaint();
}
function rdpSetInc(on) {
  RDP.draft.includeToday = !!on;
  if (RDP.nav === 'last' || RDP.draft.preset === 'last' || RDP.draft.preset === 'mtd' || RDP.draft.preset === 'qtd' || RDP.draft.preset === 'ytd') {
    const x = rdpFromPreset(RDP.draft);
    RDP.draft.from = x.from; RDP.draft.to = x.to;
  }
  rdpPaint();
}
function rdpShift(n) {
  RDP.view.setMonth(RDP.view.getMonth() + n);
  rdpPaint();
}
function rdpPick(iso) {
  RDP.nav = 'custom';
  RDP.draft.preset = 'custom';
  const focus = RDP.focus || 'from';
  if (focus === 'to') {
    RDP.draft.to = iso;
    if (!RDP.draft.from || iso < RDP.draft.from) RDP.draft.from = iso;
  } else {
    RDP.draft.from = iso;
    if (!RDP.draft.to || iso > RDP.draft.to) RDP.draft.to = iso;
    RDP.focus = 'to';
  }
  const end = dpParse(iso);
  if (end) RDP.view = new Date(end.getFullYear(), end.getMonth(), 1);
  rdpPaint();
}
function rdpMonthHtml(anchor) {
  const y = anchor.getFullYear(), m = anchor.getMonth();
  const first = new Date(y, m, 1);
  const lead = first.getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const from = RDP.draft.from, to = RDP.draft.to;
  const tIso = today();
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="dpc dpc-mute"></span>';
  for (let d = 1; d <= days; d++) {
    const iso = dpISO(new Date(y, m, d));
    const inR = from && to && iso >= from && iso <= to;
    const sel = iso === from || iso === to;
    const cls = 'dpc' + (sel ? ' dpc-sel' : '') + (inR ? ' dpc-in' : '') + (iso === tIso ? ' dpc-today' : '');
    cells += '<button type="button" class="' + cls + '" data-rdp-day="' + iso + '">' + d + '</button>';
  }
  return '<div class="rdp-cal">' +
    '<div class="rdp-cal-h">' + DP_MON[m] + ' ' + y + '</div>' +
    '<div class="dpop-dow">' + ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
    '<div class="dpop-grid">' + cells + '</div></div>';
}
function rdpPaint() {
  const el = rdpEnsure();
  const d = RDP.draft;
  const side = RDP_NAV.map(function (x) {
    return '<button type="button" class="rdp-si' + (RDP.nav === x.k ? ' on' : '') + '" data-rdp-nav="' + x.k + '">' + esc(x.l) + '</button>';
  }).join('');
  let extra = '';
  if (RDP.nav === 'last') {
    extra = '<div class="rdp-lastbar">Last ' +
      '<input class="inp rdp-n" id="rdpN" inputmode="numeric" value="' + esc(d.lastN) + '">' +
      '<select class="inp" id="rdpUnit">' +
      '<option value="days"' + (d.lastUnit === 'days' ? ' selected' : '') + '>Days</option>' +
      '<option value="weeks"' + (d.lastUnit === 'weeks' ? ' selected' : '') + '>Weeks</option>' +
      '<option value="months"' + (d.lastUnit === 'months' ? ' selected' : '') + '>Months</option>' +
      '</select>' +
      '<label class="rdp-check"><input type="checkbox" id="rdpInc"' + (d.includeToday ? ' checked' : '') + '> Include today</label></div>';
  } else if (RDP.nav === 'ptd') {
    extra = '<div class="rdp-lastbar"><div class="rdp-pills">' +
      [['mtd', 'Month to date'], ['qtd', 'Quarter to date'], ['ytd', 'Year to date']].map(function (x) {
        return '<button type="button" class="rdp-pill' + (d.preset === x[0] ? ' on' : '') + '" data-rdp-pre="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div></div>';
  } else if (RDP.nav === 'quarters') {
    extra = '<div class="rdp-lastbar"><div class="rdp-pills">' +
      [['q1', 'Q1'], ['q2', 'Q2'], ['q3', 'Q3'], ['q4', 'Q4']].map(function (x) {
        return '<button type="button" class="rdp-pill' + (d.preset === x[0] ? ' on' : '') + '" data-rdp-pre="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div></div>';
  } else if (RDP.nav === 'custom') {
    if (!RDP.focus) RDP.focus = 'from';
    extra = '<div class="rdp-dates">' +
      '<div class="rdp-date' + (RDP.focus === 'from' ? ' on' : '') + '" data-rdp-focus="from">' +
      '<input class="inp" id="rdpFromInp" data-rdp-focus="from" inputmode="numeric" maxlength="10" value="' + esc(dpToDisplay(d.from)) + '" placeholder="DD-MM-YYYY" autocomplete="off" spellcheck="false"></div>' +
      '<span class="rdp-arrow">→</span>' +
      '<div class="rdp-date' + (RDP.focus === 'to' ? ' on' : '') + '" data-rdp-focus="to">' +
      '<input class="inp" id="rdpToInp" data-rdp-focus="to" inputmode="numeric" maxlength="10" value="' + esc(dpToDisplay(d.to)) + '" placeholder="DD-MM-YYYY" autocomplete="off" spellcheck="false"></div>' +
      '</div>';
  }
  const left = new Date(RDP.view.getFullYear(), RDP.view.getMonth(), 1);
  const right = new Date(RDP.view.getFullYear(), RDP.view.getMonth() + 1, 1);
  el.innerHTML =
    '<div class="rdp-side">' + side + '</div>' +
    '<div class="rdp-main">' + extra +
    '<div class="rdp-cals">' +
    '<div style="display:flex;align-items:center">' +
    '<button type="button" class="dpop-nav" data-rdp-shift="-1" aria-label="Previous month">' + ic('back', 16) + '</button></div>' +
    rdpMonthHtml(left) + rdpMonthHtml(right) +
    '<div style="display:flex;align-items:center">' +
    '<button type="button" class="dpop-nav dpop-next" data-rdp-shift="1" aria-label="Next month">' + ic('back', 16) + '</button></div>' +
    '</div>' +
    '<div class="rdp-foot"><span class="rdp-sum">' + esc(rdpRangeLabel(d.from, d.to)) + '</span>' +
    '<div style="display:flex;gap:8px">' +
    '<button type="button" class="btn btn-ghost" data-rdp-act="cancel">Cancel</button>' +
    '<button type="button" class="btn btn-primary" data-rdp-act="apply">Apply</button>' +
    '</div></div></div>';
  if (!el._bound) {
    el._bound = true;
    el.addEventListener('click', function (e) {
      const foc = e.target.closest('[data-rdp-focus]');
      if (foc) {
        RDP.focus = foc.getAttribute('data-rdp-focus');
        qsa('.rdp-date', el).forEach(function (div) {
          div.classList.toggle('on', div.getAttribute('data-rdp-focus') === RDP.focus);
        });
        const inp = (e.target && e.target.matches && e.target.matches('input')) ? e.target : (RDP.focus === 'from' ? $('rdpFromInp') : $('rdpToInp'));
        if (inp) { try { inp.focus(); } catch (err) { } }
        return;
      }
      const nav = e.target.closest('[data-rdp-nav]');
      if (nav) { rdpApplyPreset(nav.getAttribute('data-rdp-nav')); return; }
      const pre = e.target.closest('[data-rdp-pre]');
      if (pre) { rdpApplyPreset(RDP.nav, pre.getAttribute('data-rdp-pre')); return; }
      const sh = e.target.closest('[data-rdp-shift]');
      if (sh) { rdpShift(+sh.getAttribute('data-rdp-shift')); return; }
      const day = e.target.closest('[data-rdp-day]');
      if (day) { rdpPick(day.getAttribute('data-rdp-day')); return; }
      const act = e.target.closest('[data-rdp-act]');
      if (act) {
        if (act.getAttribute('data-rdp-act') === 'apply') rdpApply();
        else rdpHide();
      }
    });
    el.addEventListener('mousedown', function (e) {
      const act = e.target.closest('[data-rdp-act]');
      if (act && act.getAttribute('data-rdp-act') === 'apply') {
        e.preventDefault();
        rdpApply();
      }
    });
    el.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'rdpN') rdpSetLastN(e.target.value);
      if (e.target && e.target.id === 'rdpUnit') rdpSetLastUnit(e.target.value);
      if (e.target && e.target.id === 'rdpInc') rdpSetInc(e.target.checked);
      if (e.target && e.target.id === 'rdpFromInp') rdpCommitTyped('from', e.target.value);
      if (e.target && e.target.id === 'rdpToInp') rdpCommitTyped('to', e.target.value);
    });
    el.addEventListener('input', function (e) {
      if (e.target && (e.target.id === 'rdpFromInp' || e.target.id === 'rdpToInp')) rdpMaskDmy(e.target);
    });
    el.addEventListener('keydown', function (e) {
      if (e.target && (e.target.id === 'rdpFromInp' || e.target.id === 'rdpToInp')) {
        if (e.key === 'Enter') { e.preventDefault(); rdpCommitTyped(e.target.id === 'rdpFromInp' ? 'from' : 'to', e.target.value); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key && e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
      }
    });
  }
}

/* ---------------------------------------------------------------------
   The range picker is shared by Reports, Sale Numbers and Sale Dashboard.
   After Apply we must refresh the page that opened it — never Reports
   unless we are actually on Reports.
   --------------------------------------------------------------------- */
function rdpCurrentPage() {
  let q = '';
  try { q = new URLSearchParams(location.search).get('page') || ''; } catch (e) { }
  if (q) return q;
  if (window.state && window.state.page) return window.state.page;
  return 'reports';
}
function rdpCallFirst(names) {
  for (let i = 0; i < names.length; i++) {
    const fn = window[names[i]];
    if (typeof fn === 'function') { fn(); return true; }
  }
  return false;
}
function rdpAfterApply() {
  const page = rdpCurrentPage();

  if (page === 'salenumbers' || page === 'saledashboard') {
    /* keep the Sale date filter in sync with the picker */
    SDATE.from = repState.from;
    SDATE.to = repState.to;
    SDATE.preset = repState.preset || 'custom';

    if (page === 'salenumbers') {
      rdpCallFirst(['renderSaleNumbers', 'renderSaleNumbersPage', 'renderSaleNums']);
    } else {
      rdpCallFirst(['renderSaleDashboard', 'renderSaleDash']);
    }
    return;                                /* never fall through to Reports */
  }

  if (page === 'reports' || page === 'report') {
    renderReports();
    return;
  }

  /* Any other host page: try its own renderer, else stay where we are */
  rdpCallFirst(['render' + page.charAt(0).toUpperCase() + page.slice(1)]);
}

function rdpApply() {
  const fromInp = $('rdpFromInp'), toInp = $('rdpToInp');
  if (fromInp) rdpCommitTyped('from', fromInp.value, true);
  if (toInp) rdpCommitTyped('to', toInp.value, true);
  const d = RDP.draft; if (!d || !d.from || !d.to) return;
  if (d.from > d.to) { const t = d.from; d.from = d.to; d.to = t; }
  if (RDP.target === 'fabric' || RDP.target === 'trims') {
    const range = { from: d.from, to: d.to };
    if (RDP.target === 'fabric') { dashFabricPreset = null; dashFabricRange = range; renderDashboardFabricWidget(); }
    else { dashTrimsPreset = null; dashTrimsRange = range; renderDashboardTrimsWidget(); }
    RDP.target = null;
    rdpHide();
    return;
  }
  repState.from = d.from;
  repState.to = d.to;
  repState.preset = d.preset;
  repState.lastN = d.lastN;
  repState.lastUnit = d.lastUnit;
  repState.includeToday = d.includeToday;
  repState.page = 1;
  rdpHide();
  rdpAfterApply();                         /* was: renderReports(); */
}
document.addEventListener('mousedown', function (e) {
  if (!RDP.open) return;
  const pop = RDP.el, trig = $('rdpTrig');
  if (pop && pop.contains(e.target)) return;
  if (trig && trig.contains(e.target)) return;
  rdpHide();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && RDP.open) { e.preventDefault(); rdpHide(); }
});

function goReport(k) {
  if (repState.type !== k) repState.groupBy = [];
  repState.type = k;
  repState.page = 1;
  renderReports();
}
function repToggleGrouped() {
  repState.grouped = !repState.grouped;
  if (!repState.grouped) repState.groupBy = [];
  repState.page = 1;
  renderReports();
}
function repGroupRows(header, rows, keys, nc) {
  const idxs = (keys || []).map(function (k) { return header.indexOf(k); }).filter(function (i) { return i >= 0; });
  if (!idxs.length) return rows.slice();
  const sorted = rows.slice().sort(function (a, b) {
    for (let n = 0; n < idxs.length; n++) {
      const i = idxs[n];
      const av = String(a[i] == null ? '' : a[i]), bv = String(b[i] == null ? '' : b[i]);
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });
  const out = [];
  let prev = null;
  sorted.forEach(function (row, ri) {
    for (let d = 0; d < idxs.length; d++) {
      const changed = !prev || idxs.slice(0, d + 1).some(function (i) {
        return String(prev[i] == null ? '' : prev[i]) !== String(row[i] == null ? '' : row[i]);
      });
      if (!changed) continue;
      let cnt = 0;
      const tot = header.map(function () { return 0; });
      for (let k = ri; k < sorted.length; k++) {
        const same = idxs.slice(0, d + 1).every(function (i) {
          return String(sorted[k][i] == null ? '' : sorted[k][i]) === String(row[i] == null ? '' : row[i]);
        });
        if (!same) break;
        cnt++;
        header.forEach(function (_, i) {
          if (nc[i]) tot[i] += parseFloat(String(sorted[k][i]).replace(/,/g, '')) || 0;
        });
      }
      const bits = ['<b>' + esc(header[idxs[d]]) + ': ' + esc(row[idxs[d]] == null || row[idxs[d]] === '' ? '—' : row[idxs[d]]) + '</b>',
      cnt + (cnt === 1 ? ' row' : ' rows')];
      header.forEach(function (h, i) {
        if (nc[i] && tot[i]) bits.push(esc(h) + ' ' + fmtNum(tot[i]));
      });
      out.push({ _g: true, depth: d, html: bits.join(' · '), cols: header.length });
    }
    out.push(row);
    prev = row;
  });
  return out;
}
let itemLedgerState = { category: '', classification: '', itemCode: '' };
function ledgerItemOptions() { return (db.masters.items || []).filter(function (it) { if (it.active === false) return false; if (it.category !== 'Fabric' && it.category !== 'Trims') return false; if (itemLedgerState.category && it.category !== itemLedgerState.category) return false; if (itemLedgerState.classification && it.classification !== itemLedgerState.classification) return false; return true; }).map(function (it) { return { v: it.code, l: it.name + (it.code ? ' (' + it.code + ')' : '') }; }); }
function setLedgerCategory(v) { itemLedgerState.category = v; itemLedgerState.classification = ''; itemLedgerState.itemCode = ''; renderReports(); }
function setLedgerClassification(v) { itemLedgerState.classification = v; itemLedgerState.itemCode = ''; renderReports(); }
function setLedgerItem(v) { itemLedgerState.itemCode = v; repState.page = 1; renderReportBody(); }
function clearItemLedgerFilters() { itemLedgerState = { category: '', classification: '', itemCode: '' }; clearReportFilters(); }
function itemLedgerRecord() { return (db.masters.items || []).find(function (it) { return it.code === itemLedgerState.itemCode; }) || null; }
function buildItemLedger(from, to) {
  const item = itemLedgerRecord(); if (!item) return { title: 'Item Ledger', header: ['Transaction Type', 'Transaction No.', 'Date', 'From / To', 'Order Ref No.', 'PO No.', 'Inward No.', 'Received Qty', 'Issued Qty', 'Balance'], rows: [], foot: null }; const nm = lcName(item.name), tx = [];
  (db.inward || []).forEach(function (r) { (r.items || []).forEach(function (i) { if (lcName(i.name) !== nm || pf(i.recQty) <= 0) return; const typ = r.entryType === 'Opening Stock' ? 'Opening Stock' : r.entryType === 'Job Work Return' ? 'Job Work Return Receipt' : 'Goods Receipt Note'; tx.push({ date: r.date, type: typ, no: r.no, party: r.supplier || r.vendor || 'Warehouse', order: r.jwRef || r.poRef || '—', po: r.poRef || '—', inward: r.no, rec: r.status === 'Rejected' ? 0 : pf(i.recQty), iss: 0 }); }); });
  (db.jobwork || []).forEach(function (r) { (r.issues || []).concat(r.extras || []).forEach(function (i) { if (lcName(i.item) !== nm) return; const q = issueLineQty(i); if (q <= 0) return; tx.push({ date: i.date || r.date, type: 'Delivery Challan', no: i.dcNo || r.no, party: r.vendor || 'Job Worker', order: r.no, po: i.poRef || '—', inward: i.inwardNo || '—', rec: 0, iss: q }); }); });
  (db.sample || []).forEach(function (r) { (r.extras || []).forEach(function (i) { if (lcName(i.item) !== nm) return; const q = issueLineQty(i); if (q <= 0) return; tx.push({ date: i.date || r.date, type: 'Sample Delivery Challan', no: i.dcNo || r.no, party: r.vendor || 'Job Worker', order: r.no, po: i.poRef || '—', inward: i.inwardNo || '—', rec: 0, iss: q }); }); });
  (db.purchasereturn || []).forEach(function (r) { (r.items || []).forEach(function (i) { if (lcName(i.name) !== nm || pf(i.retQty) <= 0) return; tx.push({ date: r.date, type: 'Purchase Return', no: r.no, party: r.supplier || 'Supplier', order: r.poRef || '—', po: r.poRef || '—', inward: r.inwardNo || '—', rec: 0, iss: pf(i.retQty) }); }); });
  (db.jobworkreturn || []).forEach(function (r) { (r.items || []).forEach(function (i) { if (lcName(i.name) !== nm || pf(i.retQty) <= 0) return; tx.push({ date: r.date, type: 'Job Work Return', no: r.no, party: r.vendor || 'Job Worker', order: r.jwRef || '—', po: '—', inward: '—', rec: pf(i.retQty), iss: 0 }); }); });
  tx.sort(function (a, b) { if (a.date !== b.date) return a.date < b.date ? -1 : 1; return String(a.no).localeCompare(String(b.no), undefined, { numeric: true }); }); let balance = 0, open = 0, totalRec = 0, totalIss = 0; tx.forEach(function (x) { if (from && x.date < from) open += x.rec - x.iss; }); balance = open; const rows = []; if (open) rows.push(['Opening Balance', '—', dpToDisplay(from) || from, '—', '—', '—', '—', '0', '0', fmtNum(open)]); tx.forEach(function (x) { if (!inRange(x.date, from, to)) return; balance += x.rec - x.iss; totalRec += x.rec; totalIss += x.iss; rows.push([x.type, x.no, dpToDisplay(x.date) || x.date, x.party, x.order, x.po, x.inward, x.rec ? fmtNum(x.rec) : '—', x.iss ? fmtNum(x.iss) : '—', fmtNum(balance)]); }); return { title: 'Item Ledger — ' + item.name + ' (' + item.code + ')', header: ['Transaction Type', 'Transaction No.', 'Date', 'From / To', 'Order Ref No.', 'PO No.', 'Inward No.', 'Received Qty', 'Issued Qty', 'Balance'], rows: rows, foot: ['', '', '', '', '', '', 'Total:', fmtNum(totalRec), fmtNum(totalIss), fmtNum(balance)] };
}

function clearReportFilters() {
  repState.from = defaultFrom(); repState.to = today(); repState.preset = 'last'; repState.lastN = 30; repState.lastUnit = 'days'; repState.includeToday = true; repState.grouped = false; repState.groupBy = []; repState.page = 1;
  if (typeof rdpHide === 'function') rdpHide(); renderReports(); toast('Report filters cleared', 'green');
}
function renderReports() {
  setTimeout(dpSyncAll, 0);
  if (typeof rdpHide === 'function') rdpHide();
  const r = repState;
  rdpSyncRepState();
  const curT = REPORT_TYPES.find(function (t) { return t.k === r.type; }) || REPORT_TYPES[0];
  const groups = [
    { name: 'Summary Reports', items: ['fabric_inout_summary', 'trims_inout_summary'] },
    { name: 'Inward', items: ['fabric_grn', 'trims_grn', 'fabric_po_grn', 'trims_po_grn'] },
    { name: 'Issues', items: ['fabric_issue', 'trims_issue', 'intransit_material'] },
    { name: 'Production', items: ['wip', 'fg_received'] },
    { name: 'Stock', items: ['stock', 'item_ledger'] }
  ];
  let side = '';
  groups.forEach(function (g) {
    side += '<div class="mnav-sec">' + g.name + '</div>';
    g.items.forEach(function (k) {
      const t = REPORT_TYPES.find(function (x) { return x.k === k; }); if (!t) return;
      side += '<button class="mnav-item' + (r.type === t.k ? ' active' : '') + '" onclick="goReport(\'' + t.k + '\')">' +
        '<span class="mn-ic">' + ic('chart', 16) + '</span><span class="mn-l">' + esc(t.l) + '</span></button>';
    });
  });
  $('content').innerHTML =
    '<div class="masters-wrap">' +
    '<aside class="mnav">' + side + '</aside>' +
    '<div class="panel mpanel">' +
    '<div class="mhead"><div><h3>' + esc(curT.l) + '</h3>' +
    '<p>Pick a date range and run the report. Large results are paged.</p></div></div>' +
    '<div class="mtools">' +
    rdpTriggerHtml() +
    (r.type === 'item_ledger' ?
      cbox('ledger-cat', { opts: ['Fabric', 'Trims'], value: itemLedgerState.category, placeholder: 'Category', onSet: setLedgerCategory }) +
      cbox('ledger-cls', { opts: itemLedgerState.category ? childValues('classifications', itemLedgerState.category) : (db.masters.classifications || []), value: itemLedgerState.classification, placeholder: 'Classification', onSet: setLedgerClassification }) +
      cbox('ledger-item', { opts: ledgerItemOptions(), value: itemLedgerState.itemCode, placeholder: 'Search Item Code / Name', onSet: setLedgerItem }) : '') +
    ((r.type === 'stock' || r.type === 'item_ledger') ? '' :
      '<label class="grp-toggle"><button type="button" class="sw' + (r.grouped ? ' on' : '') + '" onclick="repToggleGrouped()" aria-pressed="' + !!r.grouped + '"><span class="sw-knob"></span></button> Grouped Data</label>' +
      (r.grouped ? ('<div class="grp-by"><span class="grp-by-l">Group By</span>' +
        mcbox('rep-gby', {
          opts: [], selected: (r.groupBy || []).slice(), placeholder: 'Select columns…',
          onSet: function (sel) { repState.groupBy = sel.slice(); repState.page = 1; renderReportBody(); }
        }) +
        '</div>') : '')) +
    '<button type="button" class="btn btn-ghost btn-sm" onclick="' + (r.type === 'item_ledger' ? 'clearItemLedgerFilters()' : 'clearReportFilters()') + '">Clear filters</button>' +
    '<span class="rowcount" id="rep-count"></span>' +
    '</div>' +
    '<div id="rep-body"></div>' +
    '</div></div>';
  renderReportBody();
}
function renderReportBody() {
  setTimeout(function () { alignTables(); renumberSr(); }, 0);
  const r = repState;
  const from = r.from || defaultFrom(), to = r.to || today();
  const el = $('rep-body'); if (!el) return;
  if (r.type === 'fabric_inout_summary' || r.type === 'trims_inout_summary') {
    const rep = buildReport(r.type, from, to);
    renderSummaryReportBody(el, rep, from, to);
    if ($('rep-count')) $('rep-count').textContent = (rep.rows.length || 0) + ' days in range';
    return;
  }
  if (r.type === 'stock') {
    const secs = stockSections(from, to);
    el.innerHTML = secs.map(s =>
      '<div class="sec">' + s.title + '</div>' +
      '<div class="table-wrap"><table class="mini-table"><thead><tr>' +
      s.header.map((hh, i) => '<th' + (i > 0 ? ' class="num"' : '') + '>' + hh + '</th>').join('') + '</tr></thead><tbody>' +
      (s.rows.length ? s.rows.map(row => '<tr>' + row.map((c, i) => '<td class="' + (i > 0 ? 'num' : '') + '">' + c + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="' + s.header.length + '" style="text-align:center;color:var(--muted)">No data in range</td></tr>') +
      '</tbody></table></div>').join('');
    $('rep-count').textContent = 'Stock as on ' + (dpToDisplay(to) || to);
    return;
  }
  if (r.type === 'item_ledger' && !itemLedgerRecord()) { el.innerHTML = '<div class="empty"><div class="big">' + ic('chart', 28) + '</div><h3>Select an Item</h3><p>Choose Category, Classification and Item Code / Name to view every receipt and issue transaction.</p></div>'; if ($('rep-count')) $('rep-count').textContent = '0 records'; return; }
  const rep = buildReport(r.type, from, to);
  if (MCBOX['rep-gby']) {
    MCBOX['rep-gby'].opts = (rep.header || []).map(function (h) { return { v: h, l: h }; });
    MCBOX['rep-gby'].sel = (r.groupBy || []).filter(function (k) { return (rep.header || []).indexOf(k) > -1; });
    r.groupBy = MCBOX['rep-gby'].sel.slice();
    updateMcboxInput('rep-gby');
  }
  const nc = numColumns(rep.rows, rep.header.length);
  const groupedOn = r.grouped && (r.groupBy || []).length;
  const displayRows = groupedOn ? repGroupRows(rep.header, rep.rows, r.groupBy, nc) : rep.rows;
  const dataOnly = displayRows.filter(function (row) { return !(row && row._g); });
  const pg = groupedOn ? { rows: displayRows, total: dataOnly.length, from: dataOnly.length ? 1 : 0, to: dataOnly.length, page: 1, pages: 1, size: dataOnly.length || 25 }
    : slicePage(rep.rows, repState);
  $('rep-count').textContent = pg.total + ' records' + (groupedOn ? ' · grouped' : '');
  el.innerHTML =
    '<div class="sec">' + rep.title + ' <span style="text-transform:none;color:var(--muted);font-weight:600">' + (dpToDisplay(from) || from) + ' → ' + (dpToDisplay(to) || to) + '</span></div>' +
    (function () {
      const cls = function (i) { return nc[i] ? ' class="num"' : ''; };
      const pageRows = pg.rows;
      let sr = groupedOn ? 0 : (pg.from - 1);
      const body = pg.total
        ? pageRows.map(function (row) {
          if (row && row._g) {
            return '<tr class="rep-grp d' + (row.depth || 0) + '"><td colspan="' + (rep.header.length + 1) + '">' +
              row.html + '</td></tr>';
          }
          sr += 1;
          return '<tr><td class="srcol">' + sr + '</td>' + row.map(function (c, i) { return '<td' + cls(i) + '>' + c + '</td>'; }).join('') + '</tr>';
        }).join('')
        : '<tr><td colspan="' + (rep.header.length + 1) + '" style="text-align:center;color:var(--muted)">' +
        (groupedOn && !(r.groupBy || []).length ? 'Select columns to group by' : 'No records in selected date range') + '</td></tr>';
      return '<div class="table-wrap"><table class="mini-table"><thead><tr>' +
        '<th class="srcol">Sr. No.</th>' +
        rep.header.map(function (h, i) { return '<th' + cls(i) + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        body +
        '</tbody>' +
        (rep.foot && !groupedOn ? '<tfoot><tr class="tot-row"><td></td>' + rep.foot.map(function (c, i) {
          return '<td' + (nc[i] || numCell(c) ? ' class="num"' : '') + '>' + c + '</td>';
        }).join('') + '</tr></tfoot>' : '') +
        '</table></div>' + (groupedOn ? '' : pagerBar(pg, 'rep', r.type));
    })();
}
function numCell(c) {
  const s = String(c == null ? '' : c).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) return false;  /* a date is not a number */
  return /^[\d,.\s₹-]+$/.test(s) && /[\d]/.test(s);
}
/* which columns hold numbers — so the header, the values and the totals row
   all line up on the same edge */
function numColumns(rows, colCount) {
  const out = [];
  for (let i = 0; i < colCount; i++) {
    let seen = 0, allNum = true;
    for (let r = 0; r < rows.length; r++) {
      const v = String(rows[r][i] == null ? '' : rows[r][i]).trim();
      if (!v || v === '\u2014' || v === '-') continue;
      seen++;
      if (!numCell(v)) { allNum = false; break; }
    }
    out.push(seen > 0 && allNum);
  }
  return out;
}

function buildReport(type, from, to) {
  const inR = (d) => inRange(d, from, to);
  if (type === 'fabric_inout_summary' || type === 'trims_inout_summary') return buildSummaryInOutReport(type, from, to);
  if (type === 'item_ledger') return buildItemLedger(from, to);
  if (type === 'fabric_grn' || type === 'trims_grn') {
    const fab = type === 'fabric_grn';
    const header = ['Date', 'Inward No', 'PO Ref', 'Supplier', 'Item', 'Colour', 'Qty', 'Unit', 'Rate', 'Value'];
    const rows = [];
    db.inward.forEach(inw => (inw.items || []).forEach(i => {
      const isF = isFabricItem(i.name, i.category, i.classification);
      if ((fab ? isF : !isF) && pf(i.recQty) > 0 && inR(inw.date)) {
        const rate = pf(i.poRate != null ? i.poRate : i.rate);
        rows.push([dpToDisplay(inw.date) || inw.date, inw.no, inw.poRef || '—', inw.supplier, i.name, i.color || '—',
        fmtNum(pf(i.recQty)), i.unit || '', fmtNum(rate), fmtNum(pf(i.recQty) * rate)]);
      }
    }));
    rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const tq = rows.reduce((a, r) => a + parseFloat(String(r[6]).replace(/,/g, '')), 0);
    const tv = rows.reduce((a, r) => a + parseFloat(String(r[9]).replace(/,/g, '')), 0);
    return {
      title: (fab ? 'Fabric Inward Report' : 'Trims Inward Report'), header, rows,
      foot: ['', '', '', '', '', '', 'Total: ' + fmtNum(tq), '', '', 'Total: ' + fmtNum(tv), '', '']
    };
  }
  if (type === 'fabric_po_grn' || type === 'trims_po_grn') {
    const fab = type === 'fabric_po_grn';
    const header = ['PO No', 'PO Date', 'Supplier', 'Item', 'PO Qty', 'Received', 'Returned', 'Net Received', 'Pending', 'Excess', 'Unit', 'Rate', 'Value', 'Status'];
    const rows = [];
    db.po.forEach(function (p) {
      if (!inR(p.date)) return;
      (p.items || []).forEach(function (it) {
        const nm = String(it.name || '').trim();
        if (!nm) return;
        const isF = isFabricItem(nm, it.category, it.classification);
        if (fab ? !isF : isF) return;
        const ordered = pf(it.qty);
        const itemMatches = function (left, leftCodeValue, right, rightCodeValue) {
          const leftText = String(left || '').trim();
          const rightText = String(right || '').trim();
          const leftCode = /^\s*[\[(]([A-Za-z]{2,}-\d+)[\])]/.exec(leftText);
          const rightCode = /^\s*[\[(]([A-Za-z]{2,}-\d+)[\])]/.exec(rightText);
          const leftId = String(leftCodeValue || (leftCode && leftCode[1]) || '').trim().toLowerCase();
          const rightId = String(rightCodeValue || (rightCode && rightCode[1]) || '').trim().toLowerCase();
          if (leftId && rightId) return leftId === rightId;
          const clean = function (value) {
            return bareItemName(value).replace(/^\s*[\[(][A-Za-z]{2,}-\d+[\])]/, '').trim().toLowerCase();
          };
          return clean(left) === clean(right);
        };
        /* everything received against THIS po for THIS item */
        let recd = 0;
        db.inward.forEach(function (inw) {
          if (inw.poRef !== p.no && inw.poRef !== p.id) return;
          (inw.items || []).forEach(function (x) {
            if (itemMatches(nm, it.code || it.item_id, x.name, x.code || x.item_id)) recd += pf(x.recQty);
          });
        });
        /* material sent back to the supplier against this PO */
        let retd = 0;
        db.purchasereturn.forEach(function (r) {
          if (r.poRef !== p.no && r.poRef !== p.id) return;
          (r.items || []).forEach(function (x) {
            if (itemMatches(nm, it.code || it.item_id, x.name, x.code || x.item_id)) retd += pf(x.retQty);
          });
        });
        const net = recd - retd;
        const pending = Math.max(0, ordered - net);
        const excess = Math.max(0, net - ordered);
        const st = net <= 0 ? 'Not Received'
          : (pending > 0 ? 'Partially Received'
            : (excess > 0 ? 'Over Received' : 'Fully Received'));
        const rate = pf(it.rate);
        rows.push([p.no, dpToDisplay(p.date) || p.date, p.supplier || '\u2014', nm,
        fmtNum(ordered), fmtNum(recd), fmtNum(retd), fmtNum(net),
        fmtNum(pending), fmtNum(excess), it.unit || '', fmtNum(rate), fmtNum(pending * rate), st]);
      });
    });
    rows.sort(function (a, b) { return (a[0] + a[3]) < (b[0] + b[3]) ? -1 : 1; });
    const sum = function (idx) {
      return rows.reduce(function (a, r) { return a + parseFloat(String(r[idx]).replace(/,/g, '') || 0); }, 0);
    };
    return {
      title: (fab ? 'Fabric PO Outstanding Report' : 'Trims PO Outstanding Report'),
      header: header, rows: rows,
      foot: ['', '', '', 'Total:', fmtNum(sum(4)), fmtNum(sum(5)), fmtNum(sum(6)),
        fmtNum(sum(7)), fmtNum(sum(8)), fmtNum(sum(9)), '', '', fmtNum(sum(12)), '']
    };
  }
  if (type === 'fabric_issue' || type === 'trims_issue') {
    const fab = type === 'fabric_issue';
    const header = ['Date', 'JW No', 'Vendor', 'Item', 'Colour', 'Qty', 'Unit', 'Rate', 'Value', 'JW Status'];
    const rows = [];
    db.jobwork.forEach(j => (j.issues || []).forEach(i => {
      const isF = isFabricItem(i.item, i.category, i.classification);
      const issueQty = issueLineQty(i);
      if ((fab ? isF : !isF) && issueQty > 0 && inR(i.date || '')) {
        const inw = inwardByNo(i.inwardNo);
        const source = inw ? (inw.items || []).find(function (x) { return lcName(x.name) === lcName(i.item); }) : null;
        const rate = source ? pf(source.poRate != null ? source.poRate : source.rate) : 0;
        rows.push([dpToDisplay(i.date) || i.date || '', j.no, j.vendor, i.item, i.colour || '—',
        fmtNum(issueQty), i.unit || '', fmtNum(rate), fmtNum(issueQty * rate), j.status]);
      }
    }));
    rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const tq = rows.reduce((a, r) => a + parseFloat(String(r[5]).replace(/,/g, '')), 0);
    const tv = rows.reduce((a, r) => a + parseFloat(String(r[8]).replace(/,/g, '')), 0);
    return {
      title: (fab ? 'Fabric Issue Report' : 'Trims Issue Report'), header, rows,
      foot: ['', '', '', '', '', 'Total: ' + fmtNum(tq), '', '', 'Total: ' + fmtNum(tv), '']
    };
  }
  if (type === 'intransit_material') {
    const header = ['Issue Date', 'Module', 'DC No.', 'Reference No.', 'Job Worker', 'Item', 'Classification', 'Qty', 'UOM', 'Days In Transit', 'POD Status'];
    const pending = [];
    const pushLines = function (rec, list, moduleName) {
      if (!rec || rec.status === 'Cancelled') return;
      const podByDc = {};
      (list || []).forEach(function (line) {
        const key = String(line.dcNo || '').trim() || String(line.date || '').trim();
        if (key && line.pod) podByDc[key] = true;
      });
      (list || []).forEach(function (line) {
        const date = String(line.date || '').trim();
        const qty = pf(line.actualQty != null && line.actualQty !== '' ? line.actualQty : line.qty);
        const dcKey = String(line.dcNo || '').trim() || date;
        if (!line.item || qty <= 0 || line.pod || podByDc[dcKey] || !inR(date)) return;
        const issued = dpParse(date);
        const now = dpParse(today()) || new Date();
        const days = issued ? Math.max(0, Math.floor((now.getTime() - issued.getTime()) / 86400000)) : 0;
        pending.push({
          date: date, row: [
            dpToDisplay(date) || date || '—', moduleName, line.dcNo || 'Pending', rec.no || '—', rec.vendor || '—',
            bareItemName(line.item) || line.item, line.classification || '—', fmtNum(qty), line.unit || '', fmtNum(days), 'POD Pending'
          ]
        });
      });
    };
    (db.jobwork || []).forEach(function (r) {
      pushLines(r, r.issues, 'Job Work — Material');
      pushLines(r, r.extras, 'Job Work — Extra');
    });
    (db.sample || []).forEach(function (r) {
      pushLines(r, r.extras, 'Sample');
    });
    pending.sort(function (a, b) {
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return String(b.row[2]).localeCompare(String(a.row[2]), undefined, { numeric: true });
    });
    const rows = pending.map(function (x) { return x.row; });
    return {
      title: 'In-transit Material — POD Not Uploaded', header: header, rows: rows,
      foot: ['', '', '', '', '', '', 'Pending lines:', fmtNum(rows.length), '', '', '']
    };
  }
  if (type === 'wip') {
    const header = ['Job Work No', 'Job Worker / Vendor', 'Style (Internal ID)', 'A Job Work Qty', 'B Cons.', 'C Fabric Issue', 'D Fabric Return', 'E = C - D Actual Issue', 'F = E / B Garment Expected', 'G Garment Inward Pass', 'H Garment Inward Reject', 'I = F - G - H WIP'];
    const raw = [];
    (db.jobwork || []).forEach(function (j) {
      if (!inR(j.date || '') || j.status === 'Cancelled' || j.status === 'Closed') return;
      const orderQty = jwTotalOrder(j);
      const fabricIssue = (j.issues || []).concat(j.extras || []).filter(function (x) {
        return x.item && isFabricItem(x.item);
      }).reduce(function (a, x) { return a + issueLineQty(x); }, 0);
      const fabricReturn = jwFabricReturned(j);
      const actualIssue = Math.max(0, fabricIssue - fabricReturn);
      /* Consumption is metres issued per ordered garment, matching column B
         in the operational spreadsheet. Expected garments use the unrounded
         value while the report displays consumption to two decimals. */
      const consumption = orderQty > 0 ? fabricIssue / orderQty : 0;
      const garmentExpected = consumption > 0 ? Math.round(actualIssue / consumption) : 0;
      const receipts = jwReceipts(j);
      let inwardPass = 0, inwardReject = 0;
      if (receipts.length) {
        receipts.forEach(function (r) {
          const q = pf(r.qty), qc = String(r.qc || 'Pass').toLowerCase();
          if (/reject|fail/.test(qc)) inwardReject += q;
          else inwardPass += q;
        });
      } else {
        inwardPass = jwTotalReceived(j);
      }
      const wip = Math.max(0, garmentExpected - inwardPass - inwardReject);
      if (wip <= 0) return;
      const styles = jwStyleList(j).map(function (x) { return styleLabel(x) || x; }).join(', ');
      raw.push({
        no: j.no || '', vendor: j.vendor || '—', styles: styles || '—', orderQty: orderQty,
        consumption: consumption, fabricIssue: fabricIssue, fabricReturn: fabricReturn, actualIssue: actualIssue,
        garmentExpected: garmentExpected, inwardPass: inwardPass, inwardReject: inwardReject, wip: wip
      });
    });
    raw.sort(function (a, b) { return String(a.no).localeCompare(String(b.no), undefined, { numeric: true, sensitivity: 'base' }); });
    const totals = { orderQty: 0, fabricIssue: 0, fabricReturn: 0, actualIssue: 0, garmentExpected: 0, inwardPass: 0, inwardReject: 0, wip: 0 };
    const rows = raw.map(function (x) { Object.keys(totals).forEach(function (k) { totals[k] += pf(x[k]); }); return [x.no, x.vendor, x.styles, fmtNum(x.orderQty), x.consumption.toFixed(2), fmtNum(x.fabricIssue), fmtNum(x.fabricReturn), fmtNum(x.actualIssue), fmtNum(x.garmentExpected), fmtNum(x.inwardPass), fmtNum(x.inwardReject), fmtNum(x.wip)]; });
    return {
      title: 'WIP — Work in Progress', header: header, rows: rows,
      foot: ['', '', 'Total:', fmtNum(totals.orderQty), '', fmtNum(totals.fabricIssue), fmtNum(totals.fabricReturn), fmtNum(totals.actualIssue), fmtNum(totals.garmentExpected), fmtNum(totals.inwardPass), fmtNum(totals.inwardReject), fmtNum(totals.wip)]
    };
  }
  if (type === 'fg_received') {
    const header = ['Date', 'JW No', 'Vendor', 'Style', 'Colour', 'Qty', 'Consumption'];
    const rows = [];
    db.jobwork.forEach(j => jwReceipts(j).forEach(rx => {
      if (pf(rx.qty) > 0 && inR(rx.date || '')) rows.push([dpToDisplay(rx.date) || rx.date || '', j.no, j.vendor, rx.desc || '—', rx.colour || '—', fmtNum(pf(rx.qty)), fmtNum(pf(rx.consumption))]);
    }));
    rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const tq = rows.reduce((a, r) => a + parseFloat(String(r[5]).replace(/,/g, '')), 0);
    const tc = rows.reduce((a, r) => a + parseFloat(String(r[6]).replace(/,/g, '')), 0);
    return { title: 'FG Received Report', header, rows, foot: ['', '', '', '', '', 'Total: ' + fmtNum(tq), fmtNum(tc)] };
  }
  return { title: 'Report', header: [], rows: [], foot: null };
}

function stockSections(from, to) {
  const inR = (d) => inRange(d, from, to);
  const sections = [];
  // Fabric
  let fOpen = 0, fIn = 0, fOut = 0;
  db.inward.forEach(inw => (inw.items || []).forEach(i => {
    if (isFabricItem(i.name, i.category, i.classification) && pf(i.recQty) > 0) {
      if (inw.date < from) fOpen += pf(i.recQty); else if (inR(inw.date, from, to)) fIn += pf(i.recQty);
    }
  }));
  db.jobwork.forEach(j => (j.issues || []).forEach(i => {
    if (isFabricItem(i.item, i.category, i.classification) && issueLineQty(i) > 0) {
      if ((i.date || '') < from) fOpen -= issueLineQty(i); else if (inR(i.date || '', from, to)) fOut += issueLineQty(i);
    }
  }));
  sections.push({ title: '🧶 Fabric Stock', header: ['Item', 'Opening', 'GRN Received', 'Issued to JW', 'Closing'], rows: [['Fabric (m)', fmtNum(fOpen), fmtNum(fIn), fmtNum(fOut), fmtNum(fOpen + fIn - fOut)]] });
  // Trims
  const tMap = {};
  db.inward.forEach(inw => (inw.items || []).forEach(i => {
    if (!isFabricItem(i.name, i.category, i.classification) && pf(i.recQty) > 0) {
      tMap[i.name] = tMap[i.name] || { open: 0, inn: 0, out: 0 };
      if (inw.date < from) tMap[i.name].open += pf(i.recQty); else if (inR(inw.date, from, to)) tMap[i.name].inn += pf(i.recQty);
    }
  }));
  db.jobwork.forEach(j => (j.issues || []).forEach(i => {
    if (!isFabricItem(i.item, i.category, i.classification) && issueLineQty(i) > 0) {
      tMap[i.item] = tMap[i.item] || { open: 0, inn: 0, out: 0 };
      if ((i.date || '') < from) tMap[i.item].open -= issueLineQty(i); else if (inR(i.date || '', from, to)) tMap[i.item].out += issueLineQty(i);
    }
  }));
  sections.push({ title: '🧷 Trims Stock', header: ['Item', 'Opening', 'GRN Received', 'Issued to JW', 'Closing'], rows: Object.keys(tMap).map(k => [k, fmtNum(tMap[k].open), fmtNum(tMap[k].inn), fmtNum(tMap[k].out), fmtNum(tMap[k].open + tMap[k].inn - tMap[k].out)]) });
  // FG
  const fgMap = {};
  db.jobwork.forEach(j => jwReceipts(j).forEach(rx => {
    if (pf(rx.qty) > 0 && rx.desc) {
      fgMap[rx.desc] = fgMap[rx.desc] || { open: 0, inn: 0, out: 0 };
      if ((rx.date || '') < from) fgMap[rx.desc].open += pf(rx.qty); else if (inR(rx.date || '', from, to)) fgMap[rx.desc].inn += pf(rx.qty);
    }
  }));
  db.sale.forEach(s => (s.items || []).forEach(i => {
    if (pf(i.qty) > 0 && i.desc) {
      const skey = i.desc.indexOf(' · ') > -1 ? i.desc.split(' · ')[0] : i.desc;   // internal style ID
      fgMap[skey] = fgMap[skey] || { open: 0, inn: 0, out: 0 };
      if (s.date < from) fgMap[skey].open -= pf(i.qty); else if (inR(s.date, from, to)) fgMap[skey].out += pf(i.qty);
    }
  }));
  sections.push({ title: '👕 Finished Goods Stock (pcs)', header: ['Style', 'Opening', 'Received from JW', 'Sold', 'Closing'], rows: Object.keys(fgMap).map(k => [k, fmtNum(fgMap[k].open), fmtNum(fgMap[k].inn), fmtNum(fgMap[k].out), fmtNum(fgMap[k].open + fgMap[k].inn - fgMap[k].out)]) });
  return sections;
}

function exportReportCSV() {
  const r = repState;
  const from = r.from || defaultFrom(), to = r.to || today();
  let csv = '';
  /* (removed) a stray copy of the render code used to sit here — it referenced
     an undefined `el` and returned early, which broke the in/out summary export */
  if (r.type === 'stock') {
    stockSections(from, to).forEach(s => {
      csv += '\n' + s.title.replace(/[^\w ]/g, '').trim() + '\n' + s.header.join(',') + '\n' + s.rows.map(row => row.map(csvEsc).join(',')).join('\n') + '\n';
    });
  } else if (r.type === 'fabric_inout_summary' || r.type === 'trims_inout_summary') {
    const rep = buildReport(r.type, from, to);
    csv = rep.title + ' ' + (dpToDisplay(from) || from) + ' and ' + (dpToDisplay(to) || to) + '\n';
    if (rep.isFabric) {
      csv += 'Date,Opening Qty Meter,Opening Value Rs.,Inward Qty Meter,Inward Value Rs.,Outward Qty Meter,Outward Value Rs.,Closing Qty Meter,Closing Value Rs.\n';
      csv += ',,,Inward,Inward,"Job Work, Purchase Return, Sample","Job Work, Purchase Return, Sample",,\n';
    } else {
      csv += 'Date,Opening Value Rs.,Inward Value Rs.,Outward Value Rs.,Closing Value Rs.\n';
      csv += ',,Inward,"Job Work, Purchase Return, Sample",\n';
    }
    csv += rep.rows.map(row => row.map(csvEsc).join(',')).join('\n') + '\n';
    if (rep.foot) csv += rep.foot.map(csvEsc).join(',') + '\n';
    if (rep.footAvg) csv += rep.footAvg.map(csvEsc).join(',') + '\n';
  } else {
    const rep = buildReport(r.type, from, to);
    csv = rep.header.join(',') + '\n' + rep.rows.map(row => row.map(csvEsc).join(',')).join('\n');
    if (rep.foot) csv += '\n' + rep.foot.map(csvEsc).join(',');
  }
  try {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = r.type + '_' + from + '_to_' + to + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Report CSV exported', 'green');
  } catch (e) { toast('Download blocked in preview — open the file in a browser to export'); }
}