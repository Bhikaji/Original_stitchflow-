/* ===== Partner onboarding + GST API connection ===== */
function gstSettingsKey(){ return 'garmentErpGstSettings'; }
function gstSettingsRead(){
  try{
    if(db.gstApiSettings && typeof db.gstApiSettings==='object') return Object.assign({}, db.gstApiSettings);
    return JSON.parse(localStorage.getItem(gstSettingsKey())||'{}');
  }catch(e){ return {}; }
}
function gstSettingsWrite(d){
  db.gstApiSettings=d;
  try{ localStorage.setItem(gstSettingsKey(), JSON.stringify(d)); }catch(e){}
  if(typeof saveDB==='function') saveDB();
}
function gstSettingsDefaults(p){
  return { baseUrl:'', lookupPath:'/v1/gstin/{gstin}', queryParam:'gstin', authType:'apiKey' };
}
function gstToggles(){
  const t=(gstSettingsRead().toggles)||{};
  return Object.assign({enabled:true,proxy:true,demo:true,autofill:true,typing:true,autocreate:false}, t);
}
function gstinValid(gstin){
  gstin=String(gstin||'').trim().toUpperCase();
  if(!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return false;
  const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let factor=2,sum=0;
  for(let i=13;i>=0;i--){ const code=chars.indexOf(gstin[i]); const product=code*factor; sum+=Math.floor(product/36)+product%36; factor=factor===2?1:2; }
  return chars[(36-(sum%36))%36]===gstin[14];
}
function gstStateName(code){
  const states={'01':'Jammu and Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','26':'Dadra and Nagar Haveli and Daman and Diu','27':'Maharashtra','29':'Karnataka','30':'Goa','32':'Kerala','33':'Tamil Nadu','34':'Puducherry','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh'};
  return states[String(code||'').padStart(2,'0')]||'';
}
function demoGstProfile(gstin){
  const code=gstin.slice(0,2);
  const map={'27':['Maharashtra','Nagpur','Nagpur','440001'],'29':['Karnataka','Bengaluru','Bengaluru Urban','560001'],'24':['Gujarat','Ahmedabad','Ahmedabad','380001'],'07':['Delhi','New Delhi','New Delhi','110001'],'09':['Uttar Pradesh','Noida','Gautam Buddha Nagar','201301']};
  const x=map[code]||[gstStateName(code)||'State not mapped','City not mapped','District not mapped','000000'];
  return { gstin:gstin, pan:gstin.slice(2,12), legalName:'Demo GST Taxpayer '+gstin.slice(2,7), tradeName:'Demo Trade Name', status:'ACTIVE', stateCode:code, state:x[0], city:x[1], district:x[2], pincode:x[3], principalAddress:'Demo principal place of business, '+x[1]+', '+x[0]+' - '+x[3] };
}
function normalizeGstProviderResponse(payload, gstin){
  let x=payload||{};
  for(let i=0;i<6;i++){ const next=x&&(x.normalizedProfile||x.profile||x.result||x.response||x.data); if(!next||next===x||typeof next!=='object'||Array.isArray(next)) break; x=next; }
  const a=x.principalPlace||x.principal_place||x.pradr||x.principalAddress||x.address||{};
  const ad=a.addr||a;
  const gstinValue=String(x.gstin||x.GSTIN||x.gstinNo||gstin||'').toUpperCase();
  const stateCode=String(x.stateCode||x.state_code||x.stateCd||(/^\d{2}$/.test(String(x.stcd||''))?x.stcd:'')||(/^\d{2}/.test(gstinValue)?gstinValue.slice(0,2):'')).padStart(2,'0');
  const stateName=gstStateName(stateCode)||x.stateName||x.state||ad.state||'';
  const address=typeof a==='string'?a:[ad.flno,ad.bno,ad.bnm,ad.building,ad.st,ad.street,ad.loc,ad.locality,ad.dst,ad.district,ad.state,ad.pncd,ad.pincode,ad.addressLine1,ad.addressLine2,ad.city].filter(Boolean).join(', ');
  const pan=x.pan||x.PAN||x.panNo||(gstinValue.length===15?gstinValue.slice(2,12):'');
  return { legalName:x.legalName||x.legal_name||x.lgnm||x.legalNameOfBusiness||'', tradeName:x.tradeName||x.trade_name||x.tradeNam||'', pan:pan, state:stateName, stateCode:stateCode, city:x.city||ad.loc||ad.city||'', district:x.district||ad.dst||ad.district||'', pincode:x.pincode||x.pin||ad.pncd||ad.pincode||'', principalAddress:address, gstin:gstinValue, status:String(x.status||x.taxpayerStatus||x.sts||'ACTIVE').toUpperCase() };
}
function gstHasLiveApi(cfg){
  cfg=cfg||gstSettingsRead();
  return !!(String(cfg.baseUrl||'').trim() || String(cfg.proxyEndpoint||'').trim());
}
function gstBuildLookupUrl(cfg, gstin){
  let path=cfg.lookupPath||'/v1/gstin/{gstin}';
  let url=String(cfg.baseUrl||'').replace(/\/$/,'');
  if(path.indexOf('{gstin}')>-1) url+= (path.charAt(0)==='/'?'':'/') + path.replace('{gstin}',encodeURIComponent(gstin));
  else {
    url+= (path?((path.charAt(0)==='/'?'':'/')+path.replace(/^\//,'')):'');
    url+=(url.indexOf('?')>-1?'&':'?')+encodeURIComponent(cfg.queryParam||'gstin')+'='+encodeURIComponent(gstin);
  }
  return url;
}
function gstAuthHeaders(cfg){
  const h={'Accept':'application/json'};
  const key=String(cfg.apiKey||'').trim();
  if(!key || cfg.authType==='none') return h;
  if(cfg.authType==='bearer'){ h.Authorization='Bearer '+key; return h; }
  h['X-API-Key']=key; h['apiKey']=key; h['apikey']=key;
  return h;
}
async function gstFetchProfile(gstin){
  const cfg=gstSettingsRead(); const tog=gstToggles();
  gstin=String(gstin||'').trim().toUpperCase();
  if(!gstinValid(gstin)) throw new Error('Invalid GSTIN format or checksum');
  if(tog.enabled===false) throw new Error('GST auto-fetch is disabled in GST API connection');
  const live=gstHasLiveApi(cfg);
  if(!live){
    return { profile: demoGstProfile(gstin), raw:{ mode:'demo', reason:'No Base URL or proxy configured', gstin:gstin }, mode:'demo' };
  }
  const timeout=Math.max(1,Math.min(180, Number(cfg.timeout)||30))*1000;
  if(tog.proxy && cfg.proxyEndpoint){
    const c=new AbortController(), t=setTimeout(function(){c.abort();}, timeout);
    const r=await fetch(cfg.proxyEndpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({gstin:gstin}), signal:c.signal });
    clearTimeout(t);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const raw=await r.json();
    return { profile: normalizeGstProviderResponse(raw,gstin), raw:raw, mode:'proxy' };
  }
  const url=gstBuildLookupUrl(cfg,gstin);
  const h=gstAuthHeaders(cfg);
  const c=new AbortController(), t=setTimeout(function(){c.abort();}, timeout);
  const r=await fetch(url,{ headers:h, signal:c.signal });
  clearTimeout(t);
  if(!r.ok) throw new Error('HTTP '+r.status);
  const raw=await r.json();
  return { profile: normalizeGstProviderResponse(raw,gstin), raw:raw, mode:'live' };
}

obEditId=null;
function partnersDb(){
  if(!db.masters) db.masters={};
  if(!db.masters.parties) db.masters.parties=[];
  
  if(db.partners && db.partners.length > 0) {
    db.partners.forEach(function(legacy) {
      const idx = db.masters.parties.findIndex(function(p) { return p.partnerId === legacy.id || p.id === legacy.id; });
      if(idx >= 0) {
         db.masters.parties[idx] = Object.assign({}, db.masters.parties[idx], legacy, { id: db.masters.parties[idx].id });
      }
    });
    delete db.partners;
  }

  db.masters.parties.forEach(function(p){
    if(!p.displayName) p.displayName = p.legalName || p.shortName || '';
    if(!p.shortName) p.shortName = p.legalName || '';
    if(!p.roles || !p.roles.length) {
      p.roles = [];
      const bt = p.businessTypes || (p.businessType ? [p.businessType] : []);
      if(bt.indexOf('Supplier')>-1) p.roles.push('VENDOR');
      if(bt.indexOf('Customer')>-1) p.roles.push('BUYER');
      if(!p.roles.length) p.roles.push('VENDOR');
    }
    if(!p.registrations || !p.registrations.length) {
      if(p.gstNo) {
        p.registrations = [{
          gstin: p.gstNo,
          legalName: p.legalName,
          tradeName: p.shortName,
          pan: p.pan,
          principalAddress: p.address,
          city: p.city,
          district: p.district,
          state: p.state,
          pincode: p.pin
        }];
      } else {
        p.registrations = [];
      }
    }
  });

  return db.masters.parties;
}
function nextPartnerCode(){
  const n=(partnersDb().length||0)+1;
  return 'PRT-'+String(n).padStart(4,'0');
}
function obField(root,f){ const el=qs('[data-ob="'+f+'"]',root||document); return el?(el.type==='checkbox'?el.checked:el.value):''; }
function obSet(root,f,v){ const el=qs('[data-ob="'+f+'"]',root||document); if(!el)return; if(el.type==='checkbox') el.checked=!!v; else el.value=v==null?'':v; }

function renderPartnerOnboarding(){
  const list=partnersDb();
  if(obEditId==='new' || (obEditId && list.some(function(x){return x.id===obEditId;}))){
    renderPartnerForm(obEditId==='new'?null:list.find(function(x){return x.id===obEditId;}));
    return;
  }
  $('tb-title').textContent='Partner onboarding';
  $('tb-sub').textContent='Onboard buyer and vendor accounts with GSTIN auto-fetch';
  const rows=list.slice().reverse().map(function(p){
    const roles=(p.roles||[]).join(', ')||'—';
    const gst=((p.registrations||[])[0]||{}).gstin||'—';
    return '<tr><td><b>'+esc(p.code||'')+'</b></td><td>'+esc(p.displayName||'')+'</td><td>'+esc(roles)+'</td><td>'+esc(gst)+'</td><td>'+esc(p.status||'Draft')+'</td>'+
      '<td class="actions-cell no-print" onclick="event.stopPropagation()">'+
        '<button class="btn-icon" title="Edit" onclick="obEditPartner(\''+p.id+'\')">'+ic('pencil',15)+'</button>'+
        '<button class="btn-icon danger" title="Delete" onclick="obDeletePartner(\''+p.id+'\')">'+ic('trash',15)+'</button>'+
      '</td></tr>';
  }).join('') || '<tr><td colspan="6"><div class="empty"><h3>No partners yet</h3><p>Create a partner and verify GSTIN to auto-fetch legal name, trade name and address.</p></div></td></tr>';
  $('content').innerHTML='<div class="ob-wrap"><div class="ob-notice"><div>ⓘ</div><div><strong>GST auto-fetch</strong> Enter a 15-character GSTIN and click Verify (or type all 15 digits). Data is pulled from the provider configured in <a href="#" onclick="go(\'gstapi\');return false">GST API connection</a>.</div></div><div class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>Partner code</th><th>Account name</th><th>Roles</th><th>GSTIN</th><th>Status</th><th class="num no-print">Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
}

function obDeletePartner(id){
  const rec=partnersDb().find(function(x){return x.id===id;});
  if(!rec) return;
  const goDel=function(){
    fetch('api/modules/partneronboarding.php?id=' + encodeURIComponent(id), { method: 'DELETE' })
    .then(res => res.json())
    .then(res => {
      if(!res.ok) throw new Error(res.error || 'Server error');
      if(db.masters && db.masters.parties) {
        db.masters.parties = db.masters.parties.filter(function(x){return x.id!==id;});
      }
      toast((rec.code||rec.displayName||'Partner')+' deleted','green');
      obEditId=null; renderPartnerOnboarding();
    })
    .catch(err => {
      toast(err.message, 'red');
    });
  };
  if(typeof confirmDelete==='function'){
    confirmDelete({kind:'partner', name:rec.displayName||rec.code||'this partner', confirmText:'Delete permanently'}, goDel);
  } else if(confirm('Delete '+(rec.displayName||rec.code)+'?')) goDel();
}
function obNewPartner(){ obEditId='new'; render(); }
function obEditPartner(id){ obEditId=id; render(); }
function obBackList(){ obEditId=null; render(); }

function obRegHtml(r,i){
  r=r||{};
  return '<div class="ob-repeat" data-ob-reg>'+
    '<div class="ob-repeat-h"><div><b>GST registration</b> <span class="ob-badge">GSTIN '+(i+1)+'</span></div>'+
    '<button type="button" class="btn-icon danger" onclick="this.closest(\'[data-ob-reg]\').remove();obUpdateSummary()">×</button></div>'+
    '<div class="grid-fixed">'+
      field('GSTIN *','<div class="ob-inline"><input class="inp ob-gstin" data-ob="gstin" maxlength="15" value="'+esc(r.gstin||'')+'" placeholder="27ABCDE1234F1Z5" oninput="obGstinTyped(this)"><button type="button" class="btn btn-ghost btn-sm" onclick="obVerifyGstin(this)">Verify</button></div><div class="ob-ver" data-ob-ver></div>')+
      field('PAN','<input class="inp" data-ob="pan" maxlength="10" value="'+esc(r.pan||'')+'" placeholder="Auto from GSTIN" disabled title="Auto-filled from GSTIN">')+
      field('State / GST state code *','<input class="inp" data-ob="state" value="'+esc(r.state||'')+'" placeholder="Maharashtra / 27">')+
      field('GST legal name *','<input class="inp" data-ob="legalName" value="'+esc(r.legalName||'')+'" placeholder="Fetched from GST provider">')+
      field('Trade name *','<input class="inp" data-ob="tradeName" value="'+esc(r.tradeName||'')+'" placeholder="Brand / trade name">')+
    '</div>'+
    '<div class="grid-fixed" style="margin-top:8px">'+
      field('City *','<input class="inp" data-ob="city" value="'+esc(r.city||'')+'">')+
      field('District *','<input class="inp" data-ob="district" value="'+esc(r.district||'')+'">')+
      field('State *','<input class="inp" data-ob="placeState" value="'+esc(r.placeState||'')+'">')+
      field('PIN code *','<input class="inp" data-ob="pincode" maxlength="6" value="'+esc(r.pincode||'')+'">')+
    '</div>'+
    '<div class="ob-mini">Principal place of business</div>'+
    '<div class="grid-fixed">'+field('Full GST address *','<textarea class="inp" data-ob="principalAddress" rows="2" placeholder="Full GST principal address">'+esc(r.principalAddress||'')+'</textarea>')+'</div></div>';
}
function obToggleBrand(btn){
  const box=btn.closest('[data-ob-brand]'); if(!box) return;
  const hid=qs('[data-ob="status"]',box);
  const on=!(hid&&hid.value==='ACTIVE');
  if(hid) hid.value=on?'ACTIVE':'INACTIVE';
  btn.classList.toggle('on',on);
  const lab=qs('[data-ob-stlbl]',box); if(lab) lab.textContent=on?'Active':'Inactive';
}
function obBrandHtml(b,i){
  b=b||{};
  return '<div class="ob-repeat" data-ob-brand><div class="ob-repeat-h"><div><b>Brand '+(i+1)+'</b></div><button type="button" class="btn-icon danger" onclick="this.closest(\'[data-ob-brand]\').remove();obUpdateSummary()">×</button></div><div class="grid-fixed">'+
    field('Brand name *','<input class="inp" data-ob="brandName" value="'+esc(b.brandName||'')+'" placeholder="e.g. UrbanLine">')+
    field('Status','<input type="hidden" data-ob="status" value="'+(b.status==='INACTIVE'?'INACTIVE':'ACTIVE')+'"><button type="button" class="gst-sw'+(b.status==='INACTIVE'?'':' on')+'" title="Active / Inactive" onclick="obToggleBrand(this)"><span></span></button><div class="fhint" data-ob-stlbl>'+(b.status==='INACTIVE'?'Inactive':'Active')+'</div>')+
    '</div></div>';
}
function obContactHtml(c,i){
  c=c||{};
  return '<div class="ob-repeat" data-ob-contact><div class="ob-repeat-h"><div><b>Contact '+(i+1)+'</b></div><button type="button" class="btn-icon danger" onclick="this.closest(\'[data-ob-contact]\').remove();obUpdateSummary()">×</button></div><div class="grid-fixed">'+
    field('Name','<input class="inp" data-ob="name" value="'+esc(c.name||'')+'">')+
    field('Mobile','<input class="inp" data-ob="mobile" value="'+esc(c.mobile||'')+'" placeholder="+91 ...">')+
    field('Email','<input class="inp" data-ob="email" value="'+esc(c.email||'')+'" placeholder="name@company.com">')+
    '</div></div>';
}
function obTogglePartnerStatus(btn){
  const hid=$('ob-status');
  const on=!(hid&&hid.value==='Active');
  if(hid) hid.value=on?'Active':'Inactive';
  btn.classList.toggle('on',on);
  const lab=$('ob-status-lbl'); if(lab) lab.textContent=on?'Active':'Inactive';
}
function renderPartnerForm(rec){
  rec=rec||{};
  $('tb-title').textContent=rec.id?'Edit partner':'New partner';
  $('tb-sub').textContent='GSTIN verify auto-fills legal name, trade name, PAN and address';
  $('tb-actions').innerHTML='<button class="btn btn-ghost" onclick="obBackList()">'+ic('back',16)+'Back</button><button class="btn btn-primary" onclick="obSubmitPartner()">Save partner</button>';
  const roles=rec.roles||[];
  const regs=rec.registrations&&rec.registrations.length?rec.registrations:[{}];
  const brands=rec.brands&&rec.brands.length?rec.brands:[{}];
  const contacts=rec.contacts&&rec.contacts.length?rec.contacts:[{}];
  $('content').innerHTML='<div class="ob-wrap"><div>'+
    '<div class="ob-card"><div class="ob-head"><div><div class="ob-title"><span class="ob-num">01</span><h3 style="margin:0">Partner account</h3></div><p class="ob-help">One commercial account even if the partner has several brands or GSTINs.</p></div></div>'+
    '<div class="grid-fixed">'+field('Account / group name *','<input class="inp" id="ob-name" value="'+esc(rec.displayName||'')+'" placeholder="e.g. ABC Retail Group" oninput="obUpdateSummary()">')+field('Short name *','<input class="inp" id="ob-short" value="'+esc(rec.shortName||'')+'" placeholder="e.g. ABC Retail">')+
    '<div class="field" id="ob-biztype" style="max-width:none"><label class="lbl">Business Type *</label><div class="ob-check">'+
      [['BUYER','Buyer'],['VENDOR','Vendor'],['JOB_WORKER','Job worker']].map(function(r){return '<label><input type="checkbox" data-ob-role="'+r[0]+'"'+(roles.indexOf(r[0])>-1?' checked':'')+' onchange="obUpdateSummary()"> '+r[1]+'</label>';}).join('')+
    '</div></div>'+
    '<div class="field" id="ob-pstatus"><label class="lbl">Vendor / Buyer Status *</label>'+
      '<input type="hidden" id="ob-status" value="'+esc((rec.status==='Inactive'||rec.status==='INACTIVE')?'Inactive':'Active')+'">'+
      '<button type="button" class="gst-sw'+((rec.status==='Inactive'||rec.status==='INACTIVE')?'':' on')+'" title="Active / Inactive" onclick="obTogglePartnerStatus(this)"><span></span></button>'+
      '<div class="fhint" id="ob-status-lbl">'+((rec.status==='Inactive'||rec.status==='INACTIVE')?'Inactive':'Active')+'</div></div></div>'+
    '<div class="ob-card"><div class="ob-head"><div><div class="ob-title"><span class="ob-num">02</span><h3 style="margin:0">GST registrations</h3></div><p class="ob-help">Verify GSTIN to auto-fetch taxpayer data from the configured API provider.</p></div><button type="button" class="btn btn-primary btn-sm" onclick="obAddReg()">＋ Add GSTIN</button></div><div id="ob-regs">'+regs.map(obRegHtml).join('')+'</div></div>'+
    '<div class="ob-card"><div class="ob-head"><div><div class="ob-title"><span class="ob-num">03</span><h3 style="margin:0">Brands</h3></div><p class="ob-help">Brands can be shared across GST registrations.</p></div><button type="button" class="btn btn-primary btn-sm" onclick="obAddBrand()">＋ Add brand</button></div><div id="ob-brands">'+brands.map(obBrandHtml).join('')+'</div></div>'+
    '<div class="ob-card"><div class="ob-head"><div><div class="ob-title"><span class="ob-num">04</span><h3 style="margin:0">Contacts</h3></div><p class="ob-help">Accounts, merchandising, logistics and payment contacts.</p></div><button type="button" class="btn btn-primary btn-sm" onclick="obAddContact()">＋ Add contact</button></div><div id="ob-contacts">'+contacts.map(obContactHtml).join('')+'</div></div>'+
    '<div class="ob-foot"><span class="muted" id="ob-foot">Complete required fields and save</span><div style="display:flex;gap:8px"><button class="btn btn-ghost" onclick="obBackList()">Cancel</button><button class="btn btn-primary" onclick="obSubmitPartner()">Submit</button></div></div>'+
    '</div></div></div>';
  obUpdateSummary();
}
function obAddReg(){ const h=$('ob-regs'); if(!h)return; h.insertAdjacentHTML('beforeend', obRegHtml({}, qsa('[data-ob-reg]',h).length)); obUpdateSummary(); }
function obAddBrand(){ const h=$('ob-brands'); if(!h)return; h.insertAdjacentHTML('beforeend', obBrandHtml({}, qsa('[data-ob-brand]',h).length)); obUpdateSummary(); }
function obAddContact(){ const h=$('ob-contacts'); if(!h)return; h.insertAdjacentHTML('beforeend', obContactHtml({}, qsa('[data-ob-contact]',h).length)); obUpdateSummary(); }
function obCardData(sel){
  return qsa(sel).map(function(card){
    const o={};
    qsa('[data-ob]',card).forEach(function(el){ o[el.getAttribute('data-ob')]=el.type==='checkbox'?el.checked:el.value; });
    return o;
  });
}
function obUpdateSummary(){
  const roles=qsa('[data-ob-role]:checked').length;
  const regs=qsa('[data-ob-reg]').length, brands=qsa('[data-ob-brand]').length, contacts=qsa('[data-ob-contact]').length;
  if($('ob-sum-roles')) $('ob-sum-roles').textContent=roles;
  if($('ob-sum-regs')) $('ob-sum-regs').textContent=regs;
  if($('ob-sum-brands')) $('ob-sum-brands').textContent=brands;
  if($('ob-sum-contacts')) $('ob-sum-contacts').textContent=contacts;
  const name=(($('ob-name')||{}).value||'').trim();
  const gstOk=qsa('[data-ob-reg] [data-ob="gstin"]').some(function(el){return gstinValid(el.value);});
  const pct=Math.round([name,roles,regs,gstOk].filter(Boolean).length/4*100);
  if($('ob-sum-pct')) $('ob-sum-pct').textContent=pct+'%';
  if($('ob-sum-bar')) $('ob-sum-bar').style.width=pct+'%';
}
function obApplyProfile(card, p){
  if(!card||!p) return;
  const derived=obPanFromGstin(obField(card,'gstin'));
  obSet(card,'pan', derived || p.pan || '');
  const panEl=qs('[data-ob="pan"]',card); if(panEl) panEl.disabled=true;
  if(p.legalName) obSet(card,'legalName',p.legalName);
  if(p.tradeName) obSet(card,'tradeName',p.tradeName);
  if(p.state||p.stateCode) obSet(card,'state',[p.state,p.stateCode].filter(Boolean).join(' / '));
  if(p.state) obSet(card,'placeState',p.state);
  if(p.principalAddress) obSet(card,'principalAddress',p.principalAddress);
  if(p.city) obSet(card,'city',p.city);
  if(p.district) obSet(card,'district',p.district);
  if(p.pincode) obSet(card,'pincode',p.pincode);
  const name=$('ob-name');
  if(name && !String(name.value||'').trim() && (p.tradeName||p.legalName)) name.value=p.tradeName||p.legalName;
}
async function obVerifyGstin(btn){
  const card=btn&&btn.closest('[data-ob-reg]'); if(!card) return;
  const inp=qs('[data-ob="gstin"]',card), ver=qs('[data-ob-ver]',card);
  const gstin=String((inp&&inp.value)||'').trim().toUpperCase();
  if(inp) inp.value=gstin;
  obFillPanFromGstin(card);
  if(!gstinValid(gstin)){ if(ver){ver.className='ob-ver err';ver.textContent='Invalid GSTIN format or checksum.';} return; }
  if(ver){ver.className='ob-ver warn';ver.textContent='Fetching GST profile…';}
  try{
    const res=await gstFetchProfile(gstin);
    const tog=gstToggles();
    if(tog.autofill!==false) obApplyProfile(card, res.profile);
    if(ver){ver.className='ob-ver ok';ver.textContent=(res.mode==='demo'?'Demo profile auto-filled.':'Official GST data received.')+' Review before saving.';}
    toast(res.mode==='demo'?'Demo GST profile auto-filled':'GST profile fetched','green');
    obUpdateSummary();
  }catch(e){
    if(ver){ver.className='ob-ver err';ver.textContent=e.message||'Lookup failed';}
    toast(e.message||'GST lookup failed','red');
  }
}
obTypeTimer=null;
function obPanFromGstin(gstin){
  gstin=String(gstin||'').toUpperCase().replace(/\s/g,'');
  return gstin.length>=12 ? gstin.slice(2,12) : '';
}
function obFillPanFromGstin(card){
  if(!card) return;
  const gst=qs('[data-ob="gstin"]',card), pan=qs('[data-ob="pan"]',card);
  if(!gst||!pan) return;
  const p=obPanFromGstin(gst.value);
  if(p){ pan.value=p; pan.disabled=true; }
}
function obGstinTyped(el){
  el.value=String(el.value||'').toUpperCase().replace(/\s/g,'');
  obFillPanFromGstin(el.closest('[data-ob-reg]'));
  const tog=gstToggles();
  if(el.value.length===15 && gstinValid(el.value) && tog.enabled!==false && tog.typing){
    clearTimeout(obTypeTimer);
    const card=el.closest('[data-ob-reg]');
    obTypeTimer=setTimeout(function(){ if(card) obVerifyGstin(qs('button',card)); },450);
  }
  obUpdateSummary();
}
function obNeed(el, msg){
  if(typeof clearReqMarks==='function') clearReqMarks();
  if(typeof reqBad==='function') return reqBad(el, msg);
  toast(msg,'red'); return false;
}
function obRegField(card, key){ return card ? qs('[data-ob="'+key+'"]', card) : null; }
function obSubmitPartner(){
  if(typeof clearReqMarks==='function') clearReqMarks();
  const displayName=(($('ob-name')||{}).value||'').trim();
  const shortName=(($('ob-short')||{}).value||'').trim();
  if(!displayName) return obNeed('ob-name','Account / group name is required');
  if(!shortName) return obNeed('ob-short','Short name is required');
  const roles=qsa('[data-ob-role]:checked').map(function(el){return el.getAttribute('data-ob-role');});
  if(!roles.length){
    const fld=$('ob-biztype')||qs('.ob-check');
    if(fld){
      fld.classList.add('field-bad');
      qsa('.ob-check label', fld).forEach(function(lb){ lb.classList.add('inp-bad'); });
      try{ fld.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){}
      fld.classList.remove('req-flash'); void fld.offsetWidth; fld.classList.add('req-flash');
      setTimeout(function(){ fld.classList.remove('req-flash'); }, 600);
    }
    return toast('Select at least one Business Type','red');
  }
  const cards=qsa('[data-ob-reg]');
  if(!cards.length) return toast('Add at least one GST registration','red');
  const reqKeys=[
    ['gstin','GSTIN is required'],
    ['state','State / GST state code is required'],
    ['legalName','GST legal name is required'],
    ['tradeName','Trade name is required'],
    ['city','City is required'],
    ['district','District is required'],
    ['placeState','State is required'],
    ['pincode','PIN code is required'],
    ['principalAddress','Full GST address is required']
  ];
  for(let i=0;i<cards.length;i++){
    const card=cards[i], n=i+1;
    const gstEl=obRegField(card,'gstin');
    const gstin=((gstEl&&gstEl.value)||'').trim();
    if(!gstinValid(gstin)) return obNeed(gstEl,'GST registration '+n+': enter a valid GSTIN');
    for(let k=0;k<reqKeys.length;k++){
      if(reqKeys[k][0]==='gstin') continue;
      const el=obRegField(card,reqKeys[k][0]);
      const val=((el&&el.value)||'').trim();
      if(!val) return obNeed(el,'GST registration '+n+': '+reqKeys[k][1]);
    }
  }
  const registrations=obCardData('[data-ob-reg]');
  
  const types=[];
  if(roles.indexOf('VENDOR')>-1||roles.indexOf('JOB_WORKER')>-1) types.push('Supplier');
  if(roles.indexOf('BUYER')>-1||roles.indexOf('BRAND_OWNER')>-1) types.push('Customer');
  if(!types.length) types.push('Supplier');
  
  const g=(registrations||[])[0]||{};
  const legal=g.legalName||displayName;
  const short=shortName||g.tradeName||displayName;

  const rec={
    id: (obEditId && obEditId!=='new') ? obEditId : uid(),
    code: (($('ob-code')||{}).value==='AUTO-GENERATED' || !$('ob-code')) ? nextPartnerCode() : $('ob-code').value,
    displayName:displayName, shortName:short, roles:roles, status:(($('ob-status')||{}).value==='Inactive'?'Inactive':'Active'),
    registrations:registrations, brands:obCardData('[data-ob-brand]'), contacts:obCardData('[data-ob-contact]'),
    updatedAt:Date.now(),
    legalName:legal, gstNo:g.gstin||'', pan:g.pan||'', address:g.principalAddress||'', city:g.city||'', district:g.district||'', state:g.placeState||g.state||'', pin:g.pincode||'', businessType:types
  };
  
  const btn = window.event ? window.event.target : null;
  if(btn) btn.disabled = true;

  fetch('api/modules/partneronboarding.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rec)
  })
  .then(res => res.json())
  .then(res => {
    if(btn) btn.disabled = false;
    if(!res.ok) throw new Error(res.error || 'Server error');
    
    const arr=partnersDb();
    const ix=arr.findIndex(function(x){return x.id===rec.id;});
    if(ix>=0) arr[ix]=Object.assign({},arr[ix],res.record || rec);
    else { if(!rec.createdAt) rec.createdAt=Date.now(); arr.push(res.record || rec); }
    
    toast(rec.code+' saved — GST data stored on the partner','green');
    obEditId=null; renderPartnerOnboarding();
  })
  .catch(err => {
    if(btn) btn.disabled = false;
    toast(err.message, 'red');
  });
}

function renderGstApi(){
  const d=Object.assign({ provider:'custom', environment:'Production', timeout:30, businessType:'Supplier', queryParam:'gstin', authType:'apiKey', toggles:gstToggles() }, gstSettingsDefaults('custom'), gstSettingsRead());
  const tog=Object.assign({enabled:true,proxy:true,demo:true,autofill:true,typing:true,autocreate:false}, d.toggles||{});
  function sw(k,title,sub){ return '<div class="gst-tog"><button type="button" class="gst-sw'+(tog[k]?' on':'')+'" data-gst-tog="'+k+'" onclick="gstFlipTog(this)"><span></span></button><div><strong>'+title+'</strong><small>'+sub+'</small></div></div>'; }
  $('content').innerHTML='<div class="ob-wrap">'+
    '<div class="gst-panel"><h3>GST API connection</h3><p class="sub">Connect a third-party GST provider. Partner onboarding Verify uses this config to auto-fetch taxpayer data.</p><div class="gst-rule"></div>'+
    '<div class="grid-fixed">'+
      field('API Provider','<select class="inp" id="gstProvider" onchange="gstProviderChanged()"><option value="custom"'+(d.provider!=='sandbox'?' selected':'')+'>Custom provider</option><option value="sandbox"'+(d.provider==='sandbox'?' selected':'')+'>Sandbox / test provider</option></select>')+
      field('Environment','<div class="gst-segbar"><button type="button" class="gst-seg'+(d.environment!=='Production'?' on':'')+'" data-gst-env="Sandbox" onclick="gstSetEnv(this)">Sandbox</button><button type="button" class="gst-seg'+(d.environment==='Production'?' on':'')+'" data-gst-env="Production" onclick="gstSetEnv(this)">Production</button></div>')+
      field('Base URL','<input class="inp" id="gstBaseUrl" value="'+esc(d.baseUrl||'')+'" placeholder="https://api.example.com">')+
      field('GSTIN lookup path','<input class="inp" id="gstLookupPath" value="'+esc(d.lookupPath||'')+'" placeholder="/v1/gstin/{gstin}">')+
      field('Query param for GSTIN','<input class="inp" id="gstQueryParam" value="'+esc(d.queryParam||'gstin')+'">')+
      field('Auth type','<select class="inp" id="gstAuthType"><option value="apiKey"'+(d.authType==='apiKey'?' selected':'')+'>API key</option><option value="bearer"'+(d.authType==='bearer'?' selected':'')+'>Bearer token</option><option value="none"'+(d.authType==='none'?' selected':'')+'>No authentication</option></select>')+
    '</div>'+
    '<div class="grid3" style="margin-top:12px">'+
      field('API Key / Token','<input class="inp" id="gstApiKey" type="password" value="'+esc(d.apiKey||'')+'" placeholder="Enter API key or token"><div class="fhint">Keep the secret on the ERP server in production.</div>')+
      field('ERP proxy endpoint (optional)','<input class="inp" id="gstProxyEndpoint" value="'+esc(d.proxyEndpoint||'')+'" placeholder="https://your-erp.example/api/gst/verify">')+
      field('Request timeout (seconds)','<input class="inp" id="gstTimeout" type="number" min="1" max="180" value="'+(d.timeout||30)+'">')+
    '</div><div class="gst-lock">🔒 Never send GST provider credentials from the browser in production. Use the ERP server-side proxy.</div></div>'+
    '<div class="gst-panel"><h3>Auto-fetch behaviour</h3><p class="sub">What happens when a user enters a GSTIN on Partner onboarding.</p>'+
    '<div class="grid-fixed">'+sw('enabled','Enable GST auto-fetch','Turn partner lookup on')+sw('proxy','Server-side proxy','Keep API key on server and avoid CORS')+sw('demo','Demo mode','Sample data without credentials')+sw('autofill','Auto-fill partner form','Name, address, PAN and GST data')+sw('typing','Validate GSTIN while typing','Auto-lookup at 15th character')+sw('autocreate','Auto-create empty party','Create a party if lookup fails')+'</div></div>'+
    '<div class="gst-panel"><h3>Connection status</h3>'+
    '<div class="gst-status"><span class="gst-pill" id="gstStatusBadge">Ready</span><span id="gstLastChecked">Last checked — never</span><span id="gstStatusMsg" style="margin-left:auto;font-size:11px"></span></div>'+
    '<div style="height:14px"></div><h3>Try a GSTIN lookup</h3><p class="sub">Fetch a profile and preview how it maps into Partner onboarding.</p>'+
    '<div class="grid2"><div>'+field('GSTIN','<input class="inp ob-gstin" id="gstLookup" maxlength="15" value="27AABCO1234M1ZG" placeholder="27ABCDE1234F1Z5" oninput="gstLookupTyped()"><div class="gst-val" id="gstLookupValidation"></div>')+'</div><div style="display:flex;align-items:end;padding-bottom:18px"><button class="btn btn-primary" id="gstFetchBtn" onclick="gstFetchPreview()">Fetch &amp; preview</button></div></div>'+
    '<div class="gst-preview" id="gstPreview"><div class="gst-preview-h"><strong>Normalized GST profile</strong><span class="gst-pill" id="gstPreviewStatus">Active</span></div><div class="gst-preview-b"><div class="gst-col"><h4>Mapped fields</h4><dl id="gstMapped" class="gst-kv"></dl></div><div class="gst-col"><h4>Raw provider response</h4><pre id="gstRaw" class="gst-raw"></pre></div></div></div>'+
    '<div class="ob-tip" style="margin-top:14px"><strong>How this works</strong> — Partner onboarding reads this configuration when Verify is clicked. The GSTIN is validated locally, then legal name, trade name, PAN, state, city, district, address and PIN are mapped. Demo mode generates a local sample so you can preview without credentials.</div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn btn-ghost" onclick="gstSettingsTest()">Test connection</button><button class="btn btn-primary" onclick="gstSettingsSave()">Save settings</button><button class="btn btn-ghost" onclick="go(\'partneronboarding\')">← Partner onboarding</button></div>'+
    '</div></div>';
  gstRefreshStatus(d.lastChecked||'');
}
function gstCollect(){
  const tog={};
  qsa('[data-gst-tog]').forEach(function(b){ tog[b.getAttribute('data-gst-tog')]=b.classList.contains('on'); });
  const envBtn=qs('.gst-seg.on[data-gst-env]');
  return {
    provider:(($('gstProvider')||{}).value)||'custom',
    environment: envBtn?envBtn.getAttribute('data-gst-env'):'Production',
    baseUrl:(($('gstBaseUrl')||{}).value||'').trim(),
    lookupPath:(($('gstLookupPath')||{}).value||'').trim(),
    queryParam:(($('gstQueryParam')||{}).value||'gstin').trim(),
    authType:(($('gstAuthType')||{}).value)||'apiKey',
    apiKey:(($('gstApiKey')||{}).value)||'',
    proxyEndpoint:(($('gstProxyEndpoint')||{}).value||'').trim(),
    timeout:Math.max(1,Math.min(180, Number(($('gstTimeout')||{}).value)||30)),
    businessType:'Supplier',
    toggles:tog,
    lastChecked:(gstSettingsRead().lastChecked)||''
  };
}
function gstFlipTog(btn){ btn.classList.toggle('on'); gstRefreshStatus(); }
function gstSetEnv(btn){ qsa('[data-gst-env]').forEach(function(b){ b.classList.toggle('on',b===btn); }); }
function gstProviderChanged(){
  const def=gstSettingsDefaults(($('gstProvider')||{}).value);
  if($('gstBaseUrl')) $('gstBaseUrl').value=def.baseUrl;
  if($('gstLookupPath')) $('gstLookupPath').value=def.lookupPath;
  if($('gstQueryParam')) $('gstQueryParam').value=def.queryParam;
  if($('gstAuthType')) $('gstAuthType').value=def.authType;
}
function gstRefreshStatus(last){
  const d=gstCollect();
  const demo=!!(d.toggles&&d.toggles.demo);
  if($('gstLastChecked')) $('gstLastChecked').textContent=last?'Last checked '+new Date(last).toLocaleString():'Last checked — never';
  if($('gstStatusBadge')){ $('gstStatusBadge').textContent=demo?'Connected':'Ready'; $('gstStatusBadge').style.background=demo?'#cdfee1':'#fff2c2'; $('gstStatusBadge').style.color=demo?'#0c5132':'#8a6116'; }
  const live=gstHasLiveApi(d);
  if($('gstStatusMsg')) $('gstStatusMsg').textContent=live?(d.proxyEndpoint?'Live API via server proxy':'Live third-party API — auto-connect after Save'):'Add Base URL + API key from any GST provider (no extra files)';
  if($('gstStatusBadge') && live){ $('gstStatusBadge').textContent=(gstSettingsRead().connectionOk?'Connected':'Ready'); $('gstStatusBadge').style.background=gstSettingsRead().connectionOk?'#cdfee1':'#fff2c2'; $('gstStatusBadge').style.color=gstSettingsRead().connectionOk?'#0c5132':'#8a6116'; }
}
function gstSettingsSave(){
  const d=gstCollect();
  if(gstHasLiveApi(d)){
    d.toggles=d.toggles||{};
    d.toggles.enabled=true;
    d.toggles.demo=false;
  }
  gstSettingsWrite(d);
  toast('GST API settings saved'+(gstHasLiveApi(d)?' — connecting to provider…':''),'green');
  gstRefreshStatus(d.lastChecked||'');
  if(gstHasLiveApi(d)) gstSettingsTest();
}
async function gstSettingsTest(){
  const d=gstCollect();
  gstSettingsWrite(d);
  if(!gstHasLiveApi(d)){
    const now=new Date().toISOString(); d.lastChecked=now; d.connectionOk=false; gstSettingsWrite(d); gstRefreshStatus(now);
    toast('Add Base URL (or proxy) + API key from your GST provider, then Test connection','red');
    return;
  }
  const sample=(($('gstLookup')||{}).value||'27AABCO1234M1ZG').trim().toUpperCase();
  toast('Testing third-party GST API…','green');
  try{
    const res=await gstFetchProfile(gstinValid(sample)?sample:'27AABCO1234M1ZG');
    const now=new Date().toISOString();
    const saved=gstCollect(); saved.lastChecked=now; saved.connectionOk=res.mode!=='demo';
    if(saved.toggles) saved.toggles.demo=false;
    gstSettingsWrite(saved); gstRefreshStatus(now);
    if(res.mode==='demo') toast('Still in demo — enter Base URL and API key','red');
    else toast('Connected to third-party GST API — auto-fetch is on','green');
  }catch(e){
    const now=new Date().toISOString();
    const saved=gstCollect(); saved.lastChecked=now; saved.connectionOk=false; gstSettingsWrite(saved); gstRefreshStatus(now);
    const msg=String(e.message||e);
    if(/Failed to fetch|NetworkError|CORS|abort/i.test(msg)){
      toast('Provider blocked the browser (CORS). Use ERP proxy endpoint, or a provider that allows browser calls. No extra files needed.','red');
    } else toast('Connection failed: '+msg,'red');
  }
}
function gstLookupTyped(){
  const el=$('gstLookup'); if(!el) return;
  el.value=String(el.value||'').toUpperCase().replace(/\s/g,'');
  const g=el.value, v=$('gstLookupValidation');
  if(!v) return;
  if(g.length===15){ const ok=gstinValid(g); v.textContent=ok?'GSTIN format and checksum are valid.':'Invalid GSTIN format or checksum.'; v.className='gst-val '+(ok?'ok':'bad'); }
  else { v.textContent=g?'Enter 15 characters to validate.':''; v.className='gst-val warn'; }
}
async function gstFetchPreview(){
  const el=$('gstLookup'); const g=String((el&&el.value)||'').trim().toUpperCase();
  if(el) el.value=g;
  if(!gstinValid(g)){ if($('gstLookupValidation')){ $('gstLookupValidation').textContent='Invalid GSTIN format or checksum.'; $('gstLookupValidation').className='gst-val bad'; } return; }
  const b=$('gstFetchBtn'); if(b){ b.disabled=true; b.textContent='Fetching…'; }
  try{
    const res=await gstFetchProfile(g);
    const p=res.profile||{};
    if($('gstPreview')) $('gstPreview').classList.add('show');
    if($('gstPreviewStatus')) $('gstPreviewStatus').textContent=p.status||'Received';
    const rows=[['GSTIN',p.gstin||g],['PAN',p.pan],['Legal name',p.legalName],['Trade name',p.tradeName],['State',(p.state||'')+(p.stateCode?' ('+p.stateCode+')':'')],['City',p.city],['District',p.district],['PIN code',p.pincode],['Address',p.principalAddress]];
    if($('gstMapped')) $('gstMapped').innerHTML=rows.map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1]||'—')+'</dd>';}).join('');
    if($('gstRaw')) $('gstRaw').textContent=JSON.stringify(res.raw,null,2);
    const now=new Date().toISOString(); const saved=gstCollect(); saved.lastChecked=now; gstSettingsWrite(saved); gstRefreshStatus(now);
    toast(res.mode==='demo'?'Demo GST profile preview ready':'GST profile fetched','green');
  }catch(e){
    if($('gstLookupValidation')){ $('gstLookupValidation').textContent='Lookup failed: '+(e.message||e); $('gstLookupValidation').className='gst-val bad'; }
    toast(e.message||'GST lookup failed','red');
  }finally{ if(b){ b.disabled=false; b.textContent='Fetch & preview'; } }
}

