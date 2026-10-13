# StitchFlow ERP — Production Go-Live & Deployment Guide
**Target Application:** StitchFlow Garment Manufacturing ERP (D2C)  
**Target Architecture:** Apache / LiteSpeed / Nginx, PHP 8.1+, MySQL 5.7+ / MariaDB 10.4+, Vanilla ES6+  
**Target Environment:** cPanel Shared Hosting, Linux VPS, or Cloud Host  
**Document Version:** 1.0 (Production Release)  

---

## 1. Overview & Architecture Checklist

This document provides complete, step-by-step instructions for deploying StitchFlow ERP to a live production server. All architectural security hardening, multi-user concurrency protections, rate decimal precision upgrades, and performance optimizations have been pre-implemented in the codebase.

```
c:\xampp2\htdocs\stitchflow/ (or /home/{user}/public_html/)
├── api/
│   ├── auth.php              # Bcrypt session auth, rate-limiting & brute force protection
│   ├── bootstrap.php         # PDO connection & CSRF protection
│   ├── data.php              # Assembled ERP data sync endpoint (authenticated)
│   ├── health.php            # Production health check endpoint (HTTP 200/503)
│   ├── lib/
│   │   ├── assemble.php      # Role-based server-side data filtering
│   │   ├── persist.php       # Concurrency-safe delta persistence
│   │   └── validate.php      # Business rule engine
│   └── migrations/           # Self-contained database migrations
├── assets/
│   ├── css/app.css           # Compiled Polaris UI stylesheet (Toast z-index: 99999)
│   ├── js/modules/           # Standalone modular scripts per module and master
│   └── server-sync.js        # Concurrency delta synchronizer with _deleted tracking
├── backups/                  # Automated local compressed backups (.htaccess protected)
├── uploads/                  # Decoupled file attachments (.htaccess script-execution blocked)
├── config.php                # PDO config reader (loads .env / getenv)
├── index.php                 # Front controller router
├── schema.sql                # Production database schema (53 tables, 3 views, DECIMAL(16,4))
├── backup_database.php       # CLI database backup script with 14-copy local retention
└── .htaccess                 # Security headers, extension blocks, hotlink & directory listing defense
```

---

## 2. Server & Runtime Prerequisites

Ensure the target production server matches the following specification:

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **PHP Runtime** | PHP 8.1 | **PHP 8.2** |
| **PHP Extensions** | `pdo_mysql`, `mbstring`, `json`, `curl`, `openssl`, `zlib`, `gd` | All enabled by default in cPanel / EA4 |
| **Web Server** | Apache 2.4+ / LiteSpeed | Apache with `mod_rewrite`, `mod_headers`, and `AllowOverride All` |
| **Database** | MariaDB 10.4+ or MySQL 5.7+ | **MariaDB 10.6+** or **MySQL 8.0+** |
| **SSL / HTTPS** | TLS 1.2+ Certificate | Free Let's Encrypt / AutoSSL via cPanel |

### Recommended PHP Configuration (`php.ini` or cPanel MultiPHP INI Editor)
```ini
memory_limit = 512M
upload_max_filesize = 15M
post_max_size = 20M
max_execution_time = 120
max_input_vars = 5000
session.cookie_httponly = 1
session.cookie_secure = 1
session.use_strict_mode = 1
display_errors = Off
log_errors = On
```

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Database Setup & Schema Import

1. **Create the Database and User:**
   - In cPanel, navigate to **Databases → MySQL Databases**.
   - Create a new database, e.g.: `kenerp_stitchflow`.
   - Create a new database user, e.g.: `kenerp_produser`.
   - Generate a strong password (minimum 20 characters, mixed case, numbers, symbols).
   - Add the user to the database and assign **ALL PRIVILEGES**.

2. **Import `schema.sql`:**
   - Open **phpMyAdmin** or connect via SSH terminal.
   - Select the newly created database.
   - Click **Import** and select `schema.sql` from the repository root (or run via CLI):
     ```bash
     mysql -u kenerp_produser -p kenerp_stitchflow < schema.sql
     ```
   - **Verification:** Confirm that **53 base tables** and **3 views** (`v_stock_ledger`, `v_item_stock`, `v_po_received`) are created. Rate columns across 8 line item tables will be `DECIMAL(16, 4)`.

---

### Step 2: Codebase Upload

Choose one of the following methods:

#### Method A: Automated Deployment via cPanel Git Version Control (Recommended)
1. In cPanel, navigate to **Files → Git Version Control**.
2. Click **Create**, clone your repository, and set the repository path.
3. Verify that [.cpanel.yml](file:///c:/xampp2/htdocs/stitchflow/.cpanel.yml) in your repository root points to your desired target directory:
   ```yaml
   ---
   deployment:
     tasks:
       - export DEPLOYPATH=${DEPLOYPATH:-/home/kenerp/public_html/stitchflow/}
       - /bin/mkdir -p $DEPLOYPATH
       - /bin/cp -R * $DEPLOYPATH
       - /bin/rm -rf $DEPLOYPATH/.git $DEPLOYPATH/.env $DEPLOYPATH/scratch $DEPLOYPATH/docs $DEPLOYPATH/*.sql $DEPLOYPATH/*.md $DEPLOYPATH/*.log $DEPLOYPATH/setup.php $DEPLOYPATH/migrate*.php $DEPLOYPATH/profile_load.php $DEPLOYPATH/extract_*.php
       - /bin/cp -f assets/css/app.css $DEPLOYPATH/assets/css/app.css
       - /bin/cp -f assets/js/app-core.js $DEPLOYPATH/assets/js/app-core.js
       - /bin/cp -f assets/server-sync.js $DEPLOYPATH/assets/server-sync.js
   ```
4. Click **Deploy HEAD Commit**.

#### Method B: Manual Upload via SFTP or cPanel File Manager
1. Create a zip archive of the repository **excluding**:
   - `.git/`, `.env`, `scratch/`, `docs/`, `*.sql`, `setup.php`, `migrate*.php`, `profile_load.php`, `extract_*.php`.
2. Upload and extract into your target web directory (e.g. `/home/kenerp/public_html/stitchflow/`).

---

### Step 3: Production Environment Configuration (`.env`)

In the application root directory on your production server, create a file named `.env`:

```env
# =====================================================================
# StitchFlow ERP — Production Environment Configuration
# =====================================================================

# Database Connection Settings
STITCHFLOW_DB_HOST=127.0.0.1
STITCHFLOW_DB_PORT=3306
STITCHFLOW_DB_NAME=kenerp_stitchflow
STITCHFLOW_DB_USER=kenerp_produser
STITCHFLOW_DB_PASS=YourStrongProductionPasswordHere!

# Automated Backup Settings (backup_database.php)
# STITCHFLOW_BACKUP_EMAIL=admin@yourcompany.com
# STITCHFLOW_DRIVE_FOLDER_ID=1COCYE739q8-5GUpf0J8HwT757Q5ZJSs0
# STITCHFLOW_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
# STITCHFLOW_GOOGLE_CLIENT_SECRET=your_client_secret
# STITCHFLOW_GOOGLE_REFRESH_TOKEN=your_refresh_token
```

> [!CAUTION]
> Never commit `.env` into public Git repositories. The repository [.gitignore](file:///c:/xampp2/htdocs/stitchflow/.gitignore) and [.htaccess](file:///c:/xampp2/htdocs/stitchflow/.htaccess) are pre-configured to block access to this file.

---

### Step 4: Directory Permissions & Security Setup

Run the following commands via SSH or configure via cPanel File Manager:

```bash
# 1. Standard file and directory permissions
find /path/to/stitchflow/ -type d -exec chmod 755 {} \;
find /path/to/stitchflow/ -type f -exec chmod 644 {} \;

# 2. Strict permission on .env file
chmod 600 /path/to/stitchflow/.env

# 3. Writable folders for uploads and local backups
chmod 755 /path/to/stitchflow/uploads
chmod 755 /path/to/stitchflow/uploads/attachments
chmod 700 /path/to/stitchflow/backups
```

#### Security Protection Verification:
Confirm that [.htaccess](file:///c:/xampp2/htdocs/stitchflow/.htaccess) is active. In your browser, test opening:
- `https://yourdomain.com/.env` → **Must return `403 Forbidden`**
- `https://yourdomain.com/config.php` → **Must return `403 Forbidden`**
- `https://yourdomain.com/uploads/attachments/` → **Must return `403 Forbidden`**

---

### Step 5: Automated Backup Cron Job Setup

StitchFlow includes a CLI-only backup script [backup_database.php](file:///c:/xampp2/htdocs/stitchflow/backup_database.php) that automatically dumps the MySQL database, compresses it using gzip, saves it locally in `backups/`, and keeps the latest 14 copies.

In cPanel, go to **Advanced → Cron Jobs** (or `crontab -e` on VPS):
```cron
# Run backup daily at 02:00 AM server time
0 2 * * * /usr/local/bin/php /home/kenerp/public_html/stitchflow/backup_database.php >/dev/null 2>&1
```

#### Test Backup Script via Terminal:
```bash
php backup_database.php
```
**Expected Output:**
```text
Local database backup created successfully: .../backups/stitchflow_2026-09-28_17-17-25.sql.gz (9.2 KB)
Cloud backup skipped: Google Drive credentials not configured. Local backup is safely retained.
```

---

## 4. Post-Deployment Verification & First-Time Login

### 1. Production Health Check
Open your browser and navigate to:
```text
https://yourdomain.com/api/health.php
```
**Expected JSON Response (HTTP 200):**
```json
{
  "status": "UP",
  "php_version": "8.2.x",
  "checks": {
    "php": "OK",
    "database": "OK",
    "storage": "OK"
  },
  "db_latency": "1.15ms",
  "total_time": "1.82ms"
}
```

---

### 2. Initial Administrator Login & Mandatory PIN Hardening (P0)

1. Open your ERP URL in the browser:
   ```text
   https://yourdomain.com/index.php
   ```
2. Log in using the seeded default administrator account:
   - **Username:** `admin`
   - **PIN:** `1234`
3. A yellow security banner will appear at the top of the interface:
   > **⚠️ Security Alert: Default Administrator PIN in Use**  
   > *The system administrator account is currently using the factory default PIN (1234). Update your PIN immediately to secure your ERP.*
4. Click **"Change PIN Now"** or navigate to **Settings → User Management** (`USR-0001`).
5. Change the PIN to a strong, private master PIN (minimum 6 digits recommended).
6. Click **Save User**.
7. **Log out** and **log back in** with your new PIN to confirm that Bcrypt password hashing is operational.

---

### 3. Configure Role-Based Staff Accounts

Navigate to **User Management** and create designated accounts for staff members:

| Role | Module Access | Sensitive Data Shielding |
| :--- | :--- | :--- |
| **Store** | Dashboard, PO, Inward (GRN), Job Work, Process Inward/Outward, Samples, Masters | Sales data, costing margins, and company bank account details are stripped server-side. |
| **Production** | Job Work, Process Inward/Outward, Samples, Cutting, Masters | Sales and purchasing prices are hidden. |
| **Accounts** | Purchase Orders, Inward, Sales, Costing, Purchase Returns, Reports | Full access to financial and transactional modules. |
| **Admin** | Unrestricted access across all modules, settings, user accounts, and system audit logs. | Unrestricted. |

---

## 5. Troubleshooting & FAQ

### Q1: The login page shows "Server Error / Cannot connect to database"
- **Cause:** Database credentials in `.env` do not match your MySQL setup.
- **Resolution:** Check `.env` values. Ensure `STITCHFLOW_DB_PORT=3306` (standard Linux/cPanel port) instead of local XAMPP port `3307`.

### Q2: Changes made in the ERP are not saving or throw "403 Forbidden"
- **Cause:** Missing CSRF token or session expiry.
- **Resolution:** Ensure `mod_headers` is enabled in Apache. Clear browser cache and re-login.

### Q3: How do I restore from a backup in an emergency?
To restore your database from the latest automated backup:
```bash
gunzip -c /path/to/stitchflow/backups/stitchflow_YYYY-MM-DD_HH-mm-ss.sql.gz | mysql -u kenerp_produser -p kenerp_stitchflow
```

---

## 6. Developer Sign-off Checklist

- [ ] `schema.sql` imported cleanly (53 tables, 3 views created).
- [ ] `.env` file configured with production database credentials.
- [ ] Directory permissions set (`uploads/` 755, `backups/` 700, `.env` 600).
- [ ] `/api/health.php` returns HTTP 200 `{"status": "UP"}`.
- [ ] Default `admin` PIN changed from `1234` to a secure master PIN.
- [ ] Backup cron job configured and tested in cPanel.
- [ ] `.htaccess` protection verified (direct access to `.env` or `config.php` returns 403).
