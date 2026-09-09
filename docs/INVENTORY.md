# StitchFlow ERP — Complete Inventory & MySQL Mapping

Derived from a full analysis of `StitchFlow_QA_Fixed_v5.html` (the single source of
truth). Every module, master, sub-module, field, dropdown source, calculation,
validation, status flow and dependency found in the source is listed here with the
MySQL table(s) that now store it.

---

## 1. Modules (db collection → tables)

| # | Module (menu) | db key | Header table | Detail tables |
|---|---------------|--------|--------------|---------------|
| 1 | Dashboard | (derived) | — | computed from all tables, unchanged |
| 2 | Purchase Order | `po` | `purchase_orders` | `purchase_order_items`, `purchase_order_styles`, `purchase_order_bom` |
| 3 | Material Inward (PO Receipt / Opening Stock / Job Work Return entry types) | `inward` | `inwards` | `inward_items`, `inward_attachments` |
| 4 | Job Work | `jobwork` | `jobworks` (doc_type='jobwork') | `jobwork_styles`, `jobwork_issues` (issue+extra lines incl. POD), `jobwork_garments`, `jobwork_garment_sizes`, `jobwork_receipts`, `jobwork_receipt_sizes` |
| 5 | Process PO / Outward | `processoutward` | `process_outwards` | `process_outward_items`, `process_outward_item_sizes` |
| 6 | Process Inward | `processinward` | `process_inwards` | `process_inward_items`, `process_inward_item_sizes` |
| 7 | Sample | `sample` | `jobworks` (doc_type='sample') | same detail tables as Job Work |
| 8 | Sale | `sale` | `sales` | `sale_items` |
| 9 | Costing | `costing` | `costings` | `costing_rows` (sections fabric / sewing=trims) |
| 10 | Purchase Return | `purchasereturn` | `purchase_returns` | `purchase_return_items` |
| 11 | Job Work Return | `jobworkreturn` | `jobwork_returns` | `jobwork_return_items` |
| 12 | Partner Onboarding + Vendor/Buyer | `masters.parties` | `parties` | `party_business_types`, `party_bill_tos` |
| 13 | GST API Connection | `gstApiSettings` | `gst_api_settings` | — |
| 14 | Reports (GRN / issues / WIP / FG received / stock) | (derived) | — | computed, unchanged; SQL views `v_stock_ledger`, `v_item_stock`, `v_po_received` mirror them |
| 15 | Reporting (custom pivot reports) | `customReports` | `custom_reports` | `custom_report_fields` (sources/dimensions/metrics), `custom_report_filters` |
| 16 | Audit Trail | `auditTrail` | `audit_trail` | `audit_trail_changes` |
| 17 | User Management | `users` | `users` | `user_modules`, `user_permissions` (scopes: modules / inwardTypes / masters) |
| 18 | Masters | `masters.*` | see §2 | — |
| 19 | Document number sequences | `seq` | `sequences` | po, inward, jobwork, processoutward, processinward, sample, sale, costing, item, party, purchasereturn, jobworkreturn, openingstock, dc, style, user |
| 20 | Status transitions | (implicit) | `status_history` | server-side log per document |

## 2. Masters (all 40+ found in the source)

### Simple list masters → `master_values` (master_key column), with
`master_id` (CAT-0001-style IDs from `masterIds`), `is_active` (`masterStatus`),
`parent_value` (`parentMap`), sort order and audit columns:

Buying: **raisedForList** (Raised For)
Product: **categories**, **classifications**, **qualities** (Quality Master), **sizes** (Size Master), **qcResults** (QC Result), **uoms** (UOM), **washTypes** (Wash Type)
Production: **processTypes** (Embroidery / Washing / Printing …)
Commercial: **gstRates** (GST %), **gstTypes** (GST Type), **paymentTermsList**, **freightChargesList**, **transportModes**, **businessTypes**, **partyStatuses**
Geography (parent-linked): **countries** ← **states** ← **districts** ← **talukas**
Others found in the source: **suppliers**, **customers**, **colours**, **fabrics**, **materialTypes**, **firms**, **addresses**, **boms**, **warehouses** (+ `warehouse_addresses` for dispatch addresses), **returnTypes**

Master ID counters (`masterIdSeq`) → `master_id_sequences`.

### Special masters (dedicated tables)

* **Style Master** → `styles`: ID (STY-####), Internal ID (unique), Portal ID, Description, Buyer, Status
* **Item Master** → `items` + `item_sizes`: ID, Code (ITM-####), Name (unique), Category, Classification, Material Type, Quality, Description, UOM, Width, HSN, GST %, Image, Status + retired-but-preserved fields (hasColor, sizes, colorName, MOQ, itemRate, itemMRP, cgst/sgst/igst, purchaseRate, saleRate)
* **Vendor / Buyer (Partner Onboarding)** → `parties` + `party_business_types` + `party_bill_tos`: Code (PTY-####), Legal Name (unique), Short Name, Site Code, PAN, GSTIN, Address, Country/State/District/Taluka/City/PIN, Status, Business Types (multi), GST Type, Bill-To trades (each with own name, GSTIN, PAN, GST type and address block)
* **Company Details** → `company_details` (name, reg, reg2, works, contact, GST No, PAN, state, state code, jurisdiction)
* **Login Page** → `login_settings` + `login_slides` (interval, slide image data, fit, position, status)
* **Menu Master** → `menu_settings` (main menu + masters sub-menu ordering)
* **User Management** → `users`, `user_modules`, `user_permissions`

## 3. Key calculations preserved (unchanged — same JS executes)

* PO line: `amount = qty × rate`; `camt/samt/iamt = amount × pct/100`; `totalAmount = amount + taxes`; GST split CGST+SGST vs IGST determined by supplier state vs HOME_STATE (Maharashtra)
* PO line GST must equal the Item Master GST % (poGstMismatch)
* Job Work issue qty = Σ size-wise order qty × consumption per garment; Actual Qty overrides for stock
* Job Work received qty per garment = Σ receipts matching style+colour
* Stock: `received(inward + job-work returns) − issued(job-work issues + extras) − purchase returns` (also as SQL views)
* Per-inward stock for issues: `inward recQty − issues/extras (JW + Sample) − purchase returns on that inward`
* Sale line: `qty × rate × (1 − disc%) × (1 + gst%)`
* Costing: order value = totalQty × FOB; making/production totals, margin, CMP from fabric+trims+CM+wash+overheads with rejection % & finance %
* Process outward/inward: size-wise totals, pending = sent − received

## 4. Status flows preserved

* PO: Draft → Approved → Partially Received → Received → Closed / Cancelled (auto from inward quantities)
* Job Work / Sample: Issued → Partially Received → Completed / Closed / Cancelled (jwAutoStatus)
* Process Outward: Open → Partially Received → Received / Cancelled (auto from process inwards)
* Process Inward: Received / Cancelled · Inward: Completed · Sale: Open/… · Returns: Draft/…
* Every transition is additionally logged server-side in `status_history`

## 5. Validations (client preserved + re-enforced in PHP)

See README §"Server-side rule enforcement" — 19 rule groups, all covered by automated tests.

## 6. Dependencies / dropdown sources preserved

Item Master → PO items → Inward items → Stock → Job Work issues → Job Work Return
Style Master → PO styles / Job Work garments / Sample garments / Process items
Size Master → garment & process size matrices · Process Type master → Process Outward
GST % master → Item Master → PO lines · Vendor/Buyer (parties) → PO supplier & buyer,
Job Work vendor, Process processor, Sale customer · Warehouses → Inward / Returns /
Receipts · Raised For / Payment Terms / Freight / Transport masters → PO header
POD upload → locks job-work issue line date/qty (unchanged) · Supplier Invoice
attachment mandatory for Against-PO inward (unchanged)

## 7. PHP file map — one file per module and per master

Modules (api/modules/): dashboard.php · po.php · materialinward.php · jobwork.php ·
processoutward.php · processinward.php · sample.php · sale.php · costing.php ·
purchasereturn.php · jobworkreturn.php · partneronboarding.php · gstapi.php ·
reports.php · reporting.php · audittrail.php · usermanagement.php  (17 files)

Masters (api/masters/): styles.php · items.php · parties.php · companydetails.php ·
loginpage.php · menumaster.php · raisedfor.php · categories.php · classifications.php ·
qualities.php · sizes.php · qcresults.php · uoms.php · washtypes.php · processtypes.php ·
gstrates.php · gsttypes.php · paymentterms.php · freightcharges.php · transportmodes.php ·
businesstypes.php · partystatuses.php · countries.php · states.php · districts.php ·
talukas.php · suppliers.php · customers.php · colours.php · fabrics.php ·
materialtypes.php · firms.php · addresses.php · boms.php · warehouses.php ·
returntypes.php  (36 files)

Core (api/): data.php · users.php · masters.php · bootstrap.php ·
lib/persist.php · lib/assemble.php · lib/validate.php · lib/endpoint.php
Root: index.php · setup.php · config.php · schema.sql · app/app.html · assets/server-sync.js
