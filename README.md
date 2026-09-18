# StitchFlow ERP — PHP + MySQL Edition

Complete PHP + MySQL implementation of the **StitchFlow ERP — QA Fixed v5** application.
The attached HTML application is the single source of truth: its UI/UX, modules, masters,
fields, workflows, calculations, validations, statuses and business logic are preserved
**exactly** — the original front-end is served unchanged, while all data now lives in a
fully normalized MySQL database behind a PHP API that re-enforces every business rule
server-side.

---

## Architecture

```
stitchflow-php/
├── index.php                  Front controller — serves the original StitchFlow UI
├── setup.php                  Installer — creates the database, all tables, views, seed
├── config.php                 DB credentials (or env: STITCHFLOW_DB_HOST/NAME/USER/PASS)
├── schema.sql                 Normalized MySQL schema (56 tables + views)
├── app/app.html               The original application (byte-identical UI) + sync layer
├── assets/server-sync.js      Loads db from MySQL at startup, persists every save
└── api/
    ├── bootstrap.php          PDO connection + helpers
    ├── data.php               GET: assemble db from MySQL · POST: validate + persist
    ├── users.php              GET/POST users collection (compatibility endpoint)
    ├── masters.php            GET/POST masters branch (compatibility endpoint)
    ├── lib/
    │   ├── persist.php        db JSON → normalized tables (transactional)
    │   ├── assemble.php       normalized tables → db JSON (lossless round trip)
    │   ├── validate.php       server-side business-rule enforcement
    │   └── endpoint.php       shared engine for the per-module / per-master endpoints
    ├── modules/               ONE PHP FILE PER MODULE (17 files, full REST CRUD)
    │   ├── dashboard.php          computed dashboard summary + stock
    │   ├── po.php                 Purchase Order
    │   ├── materialinward.php     Material Inward (PO Receipt / Opening Stock / JW Return)
    │   ├── jobwork.php            Job Work (issues, extras, garments, sizes, receipts, POD)
    │   ├── processoutward.php     Process PO / Outward
    │   ├── processinward.php      Process Inward
    │   ├── sample.php             Sample
    │   ├── sale.php               Sale
    │   ├── costing.php            Costing
    │   ├── purchasereturn.php     Purchase Return
    │   ├── jobworkreturn.php      Job Work Return
    │   ├── partneronboarding.php  Partner Onboarding (Vendor/Buyer records)
    │   ├── gstapi.php             GST API Connection settings
    │   ├── reports.php            Standard reports (stock/poreceived/grn/issues/wip/fgreceived)
    │   ├── reporting.php          Custom pivot reports (saved reports CRUD)
    │   ├── audittrail.php         Audit Trail
    │   └── usermanagement.php     Users (PINs hashed sha256 like the app)
    └── masters/               ONE PHP FILE PER MASTER (36 files, full CRUD)
        ├── styles.php items.php parties.php            (record masters)
        ├── companydetails.php loginpage.php menumaster.php (singleton masters)
        └── raisedfor.php categories.php classifications.php qualities.php sizes.php
            qcresults.php uoms.php washtypes.php processtypes.php gstrates.php
            gsttypes.php paymentterms.php freightcharges.php transportmodes.php
            businesstypes.php partystatuses.php countries.php states.php districts.php
            talukas.php suppliers.php customers.php colours.php fabrics.php
            materialtypes.php firms.php addresses.php boms.php warehouses.php
            returntypes.php                              (list masters)
```

### Per-module / per-master endpoint API

Every module and master file supports:

* `GET` — list with `?q=` search, field filters (e.g. `?status=Approved`), `?sort=&dir=`,
  `?page=&per=` pagination; `?id=`/`?no=` single record; `?usage=<value>` in-use detection
* `POST` / `PUT` — add or edit (duplicate + required-field + all business-rule validation)
* `DELETE` — delete; if the record is in use the response returns the `usedBy` list as a
  warning while still deleting (exact v5 behaviour)

All endpoints operate on the same normalized MySQL schema through the assemble/persist
layer, so anything created via the API instantly appears in the UI and vice-versa.

**Why this design?** The requirement was that the UI/UX must be *exactly* the attached
application and that no calculation, validation, status flow or workflow may change.
The only architecture that guarantees 100% behavioural fidelity is to keep the original
front-end intact and replace its storage engine: on load, the app receives its `db`
document assembled from the normalized MySQL tables; on every save, the PHP layer
validates the complete business state (the same rules the UI enforces) and decomposes it
into proper relational tables — headers, line items, size-wise rows, attachments, audit
records, permissions and master values, each in its own table with keys and indexes.

Round-trip fidelity is verified: a database saved through the API and read back is
**functionally identical** (0 mismatches across every module, master, size matrix,
attachment and permission — automated deep-compare test).

## Requirements

* PHP ≥ 8.1 with `pdo_mysql` and `mbstring`
* MySQL ≥ 5.7 / MariaDB ≥ 10.4

## Installation

1. Create a MySQL user (or reuse an existing one) and put the credentials in
   `config.php` (or export `STITCHFLOW_DB_HOST`, `STITCHFLOW_DB_PORT`,
   `STITCHFLOW_DB_NAME`, `STITCHFLOW_DB_USER`, `STITCHFLOW_DB_PASS`).
2. Run the installer — it creates the database, all 56 tables/views and the root user:
   ```bash
   php setup.php
   ```
3. Serve the folder:
   ```bash
   # development
   php -d post_max_size=256M -d memory_limit=1024M -S 0.0.0.0:8000 -t .
   ```
   For Apache/nginx + php-fpm point the document root at this folder and raise
   `post_max_size` / `client_max_body_size` to ≥ 64 MB (attachments and POD images are
   stored as data-URIs inside the payload, exactly as the original application does).
4. Open the site and sign in exactly like the original app: **admin / PIN 1234**.

On the very first visit the application seeds its own default masters (categories,
classifications, sizes S–XXL, UOMs, GST rates, warehouses, process types Embroidery /
Washing / Printing, payment terms, etc.) and pushes them into MySQL — identical to the
original first-run behaviour.

## Automated database backups

`backup_database.php` is CLI-only. It creates a compressed MySQL dump and uploads it directly
to a Google Drive folder using a Google service account. It never accepts backup commands from
a browser and does not store Google credentials in the repository. An email notification is
sent only when `STITCHFLOW_BACKUP_EMAIL` is configured.

Create a Google Cloud service account, enable the Google Drive API, share the destination Drive
folder with the service account email as an Editor, and store the downloaded JSON key outside the
web root. Configure these environment variables for the cron account:

```bash
export STITCHFLOW_DRIVE_SERVICE_ACCOUNT_FILE=/home/kenerp/private/google-drive-backup.json
export STITCHFLOW_DRIVE_FOLDER_ID=1COCYE739q8-5GUpf0J8HwT757Q5ZJSs0
export STITCHFLOW_BACKUP_EMAIL=kenaiitdeparment@gmail.com
```

The PHP `curl` and `openssl` extensions must be enabled.

In cPanel, add a Cron Job with the schedule `0 */2 * * *` and this command:

```bash
export STITCHFLOW_DRIVE_SERVICE_ACCOUNT_FILE=/home/kenerp/private/google-drive-backup.json; export STITCHFLOW_DRIVE_FOLDER_ID=1COCYE739q8-5GUpf0J8HwT757Q5ZJSs0; export STITCHFLOW_BACKUP_EMAIL=kenaiitdeparment@gmail.com; /usr/local/bin/php /home/kenerp/public_html/stitchflow/backup_database.php
```

If cPanel blocks PHP `mail()`, the Drive upload still works; configure SMTP through the hosting
provider if email notifications are needed.

## Server-side rule enforcement (api/lib/validate.php)

Every save is checked against the same rules the UI enforces before anything is written
(rejected saves return HTTP 422 and surface as the familiar red toast):

* duplicate master values (case-insensitive), GST % format (0–100, ≤2 decimals), UOM format
* Item Master: duplicate names, numeric-only HSN
* Vendor/Buyer: duplicate legal/short names, duplicate GSTIN across all parties & trade names
* Style Master: duplicate Internal IDs · Users: duplicate usernames
* PO: ≥1 item, qty > 0, one line per item, delivery date ≥ PO date, line GST = qty × rate × GST%
* Material Inward: over-receipt guard (Σ received ≤ PO qty), duplicate supplier invoice per PO
* Purchase Return: Σ returned per inward+item ≤ received quantity
* Job Work / Sample: combined issue + extra qty per item + inward ≤ that inward's available
  stock (mirrors `inwardItemStock` / `jwValidateCombinedStock`, honouring Actual Qty)
* Job Work Return: Σ returned per JW+item ≤ issued quantity
* Process Inward: Σ received per outward + style + size ≤ quantity sent

v5 behaviour preserved: deleting an in-use master is *allowed with a warning* (dangling
reference), exactly like the source application — so the server does not hard-block it.

## Database highlights

* Decimal precision: `DECIMAL(16,3)` quantities, `DECIMAL(16,2)` amounts, `DECIMAL(6,2)` GST %
* Foreign keys with `ON DELETE CASCADE` between every header and its lines/sizes/attachments
* Unique constraints on document numbers, item names, style internal IDs, party legal names,
  usernames and `(master_key, value)`
* `status_history` — server-side log of every status transition with user + timestamp
* `v_stock_ledger` / `v_item_stock` — SQL views that reproduce the app's `itemStockQty()`
  (+inward, +job-work return, −job-work issues/extras, −purchase return)
* `v_po_received` — received-vs-ordered per PO line (drives Partially Received / Received)
* Created By / Updated By / Created Date / Updated Date on every master and transaction
* Lossless storage: any field the UI ever adds is kept via per-row `extra_json` overflow

See `docs/INVENTORY.md` for the complete module/master/field → table mapping.
