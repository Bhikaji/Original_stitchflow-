-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: kenerp_kend2c
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_trail`
--

DROP TABLE IF EXISTS `audit_trail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_trail` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `at_iso` varchar(40) DEFAULT NULL,
  `user_name` varchar(190) DEFAULT NULL,
  `area` varchar(120) DEFAULT NULL,
  `action` varchar(60) DEFAULT NULL,
  `record_ref` varchar(190) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `row_seq` (`row_seq`),
  KEY `idx_audit_at` (`at_iso`),
  KEY `idx_audit_area` (`area`)
) ENGINE=InnoDB AUTO_INCREMENT=30843 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_trail`
--

LOCK TABLES `audit_trail` WRITE;
/*!40000 ALTER TABLE `audit_trail` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_trail` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_trail_changes`
--

DROP TABLE IF EXISTS `audit_trail_changes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_trail_changes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `audit_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `change_txt` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_atc_audit` (`audit_id`),
  CONSTRAINT `fk_atc_audit` FOREIGN KEY (`audit_id`) REFERENCES `audit_trail` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_trail_changes`
--

LOCK TABLES `audit_trail_changes` WRITE;
/*!40000 ALTER TABLE `audit_trail_changes` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_trail_changes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_details`
--

DROP TABLE IF EXISTS `company_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `company_details` (
  `id` tinyint(4) NOT NULL DEFAULT 1,
  `name` varchar(255) DEFAULT NULL,
  `reg` varchar(255) DEFAULT NULL,
  `reg2` varchar(255) DEFAULT NULL,
  `works` varchar(255) DEFAULT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `gst_no` varchar(20) DEFAULT NULL,
  `pan` varchar(20) DEFAULT NULL,
  `state` varchar(120) DEFAULT NULL,
  `state_code` varchar(8) DEFAULT NULL,
  `jurisdiction` varchar(120) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_details`
--

LOCK TABLES `company_details` WRITE;
/*!40000 ALTER TABLE `company_details` DISABLE KEYS */;
INSERT INTO `company_details` VALUES (1,'KEN GLOBAL DESIGNS PRIVATE LIMITED','Reg. Office: 18/20, Back Side of Hotel City Inn, Industrial Estate, Ichalkaranji - 416115','Tal. Hatkanangale, Dist. Kolhapur, Maharashtra, India','Works: Gat No. 298 & 299, At Kondigre, Tal. Shirol, Dist. Kolhapur - 416102','Tel: +91 230 2438538 | Email: office@kenindia.in',NULL,NULL,'Maharashtra','27','Ichalkaranji',NULL,'2026-09-06 11:01:15');
/*!40000 ALTER TABLE `company_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `costing_rows`
--

DROP TABLE IF EXISTS `costing_rows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `costing_rows` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `costing_id` varchar(40) NOT NULL,
  `section` enum('fabric','sewing') NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `item` varchar(255) DEFAULT NULL,
  `cons` decimal(16,4) NOT NULL DEFAULT 0.0000,
  `uom` varchar(24) DEFAULT NULL,
  `rate` decimal(16,2) NOT NULL DEFAULT 0.00,
  `wastage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cr_costing` (`costing_id`),
  CONSTRAINT `fk_cr_costing` FOREIGN KEY (`costing_id`) REFERENCES `costings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `costing_rows`
--

LOCK TABLES `costing_rows` WRITE;
/*!40000 ALTER TABLE `costing_rows` DISABLE KEYS */;
/*!40000 ALTER TABLE `costing_rows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `costings`
--

DROP TABLE IF EXISTS `costings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `costings` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `cost_no` varchar(24) DEFAULT NULL,
  `cost_date` date DEFAULT NULL,
  `style_image` longtext DEFAULT NULL,
  `brand` varchar(190) DEFAULT NULL,
  `label` varchar(190) DEFAULT NULL,
  `style` varchar(190) DEFAULT NULL,
  `style_description` text DEFAULT NULL,
  `total_qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `fabric_quality` varchar(255) DEFAULT NULL,
  `trim_fabric` varchar(255) DEFAULT NULL,
  `factory` varchar(190) DEFAULT NULL,
  `wash_type` varchar(190) DEFAULT NULL,
  `size_ratio` varchar(190) DEFAULT NULL,
  `sam` decimal(16,2) NOT NULL DEFAULT 0.00,
  `fob` decimal(16,2) NOT NULL DEFAULT 0.00,
  `cm` decimal(16,2) NOT NULL DEFAULT 0.00,
  `washing` decimal(16,2) NOT NULL DEFAULT 0.00,
  `photoshoot` decimal(16,2) NOT NULL DEFAULT 0.00,
  `transportation` decimal(16,2) NOT NULL DEFAULT 0.00,
  `testing` decimal(16,2) NOT NULL DEFAULT 0.00,
  `garment_rejection_pct` decimal(6,2) NOT NULL DEFAULT 0.00,
  `finance_pct` decimal(6,2) NOT NULL DEFAULT 0.00,
  `narration` text DEFAULT NULL,
  `order_value` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_making` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_production` decimal(18,2) NOT NULL DEFAULT 0.00,
  `margin` decimal(18,2) NOT NULL DEFAULT 0.00,
  `cmp` decimal(18,2) NOT NULL DEFAULT 0.00,
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `style_id` varchar(40) DEFAULT NULL,
  `buyer_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `idx_costings_id` (`id`),
  UNIQUE KEY `uq_cost_no` (`cost_no`),
  KEY `idx_cost_brand` (`brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `costings`
--

LOCK TABLES `costings` WRITE;
/*!40000 ALTER TABLE `costings` DISABLE KEYS */;
/*!40000 ALTER TABLE `costings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `custom_report_fields`
--

DROP TABLE IF EXISTS `custom_report_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `custom_report_fields` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` varchar(40) NOT NULL,
  `field_role` enum('source','breakdown','metric') NOT NULL,
  `field_key` varchar(190) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_crf_rep` (`report_id`),
  CONSTRAINT `fk_crf_rep` FOREIGN KEY (`report_id`) REFERENCES `custom_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_report_fields`
--

LOCK TABLES `custom_report_fields` WRITE;
/*!40000 ALTER TABLE `custom_report_fields` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_report_fields` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `custom_report_filters`
--

DROP TABLE IF EXISTS `custom_report_filters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `custom_report_filters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `report_id` varchar(40) NOT NULL,
  `filter_key` varchar(190) NOT NULL,
  `filter_value` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_crfl_rep` (`report_id`),
  CONSTRAINT `fk_crfl_rep` FOREIGN KEY (`report_id`) REFERENCES `custom_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_report_filters`
--

LOCK TABLES `custom_report_filters` WRITE;
/*!40000 ALTER TABLE `custom_report_filters` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_report_filters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `custom_reports`
--

DROP TABLE IF EXISTS `custom_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `custom_reports` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `name` varchar(190) NOT NULL,
  `folder` varchar(190) DEFAULT NULL,
  `source` varchar(60) DEFAULT NULL,
  `chart_type` varchar(40) DEFAULT NULL,
  `report_format` varchar(40) DEFAULT NULL,
  `date_from` varchar(20) DEFAULT NULL,
  `date_to` varchar(20) DEFAULT NULL,
  `sort_col` varchar(120) DEFAULT NULL,
  `sort_dir` varchar(8) DEFAULT NULL,
  `created_by` varchar(190) DEFAULT NULL,
  `created_at_ms` bigint(20) DEFAULT NULL,
  `updated_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `row_seq` (`row_seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custom_reports`
--

LOCK TABLES `custom_reports` WRITE;
/*!40000 ALTER TABLE `custom_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gst_api_settings`
--

DROP TABLE IF EXISTS `gst_api_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `gst_api_settings` (
  `id` tinyint(4) NOT NULL DEFAULT 1,
  `provider` varchar(60) DEFAULT NULL,
  `environment` varchar(40) DEFAULT NULL,
  `base_url` varchar(255) DEFAULT NULL,
  `lookup_path` varchar(255) DEFAULT NULL,
  `query_param` varchar(60) DEFAULT NULL,
  `auth_type` varchar(40) DEFAULT NULL,
  `api_key` text DEFAULT NULL,
  `proxy_endpoint` varchar(255) DEFAULT NULL,
  `timeout_secs` int(11) DEFAULT NULL,
  `business_type` varchar(60) DEFAULT NULL,
  `last_checked` varchar(60) DEFAULT NULL,
  `tog_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `tog_proxy` tinyint(1) NOT NULL DEFAULT 1,
  `tog_demo` tinyint(1) NOT NULL DEFAULT 1,
  `tog_autofill` tinyint(1) NOT NULL DEFAULT 1,
  `tog_typing` tinyint(1) NOT NULL DEFAULT 1,
  `tog_autocreate` tinyint(1) NOT NULL DEFAULT 0,
  `extra_json` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gst_api_settings`
--

LOCK TABLES `gst_api_settings` WRITE;
/*!40000 ALTER TABLE `gst_api_settings` DISABLE KEYS */;
INSERT INTO `gst_api_settings` VALUES (1,'custom','Production','https://www.gstinapi.in','/v1/gstin/{gstin}','gstin','apiKey','gak_25746143c64043b6b5cb2fe34057717e','https://kend2c.kenerp.com/api/gst/verify.php',30,'Supplier','2026-08-27T08:31:18.786Z',1,1,0,1,1,0,'{\"connectionOk\":false}','2026-09-06 10:51:01');
/*!40000 ALTER TABLE `gst_api_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inward_attachments`
--

DROP TABLE IF EXISTS `inward_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inward_attachments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `inward_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `name` varchar(190) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `data` longtext DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ina_inward` (`inward_id`),
  CONSTRAINT `fk_ina_inward` FOREIGN KEY (`inward_id`) REFERENCES `inwards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inward_attachments`
--

LOCK TABLES `inward_attachments` WRITE;
/*!40000 ALTER TABLE `inward_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `inward_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inward_items`
--

DROP TABLE IF EXISTS `inward_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inward_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `inward_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `classification` varchar(190) DEFAULT NULL,
  `name` varchar(190) DEFAULT NULL,
  `specs` text DEFAULT NULL,
  `color` varchar(190) DEFAULT NULL,
  `unit` varchar(24) DEFAULT NULL,
  `po_rate` decimal(16,2) NOT NULL DEFAULT 0.00,
  `gst` decimal(6,2) NOT NULL DEFAULT 0.00,
  `rec_qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ini_inward` (`inward_id`),
  KEY `idx_ini_name` (`name`),
  KEY `idx_ini_item_id` (`item_id`),
  CONSTRAINT `fk_ini_inward` FOREIGN KEY (`inward_id`) REFERENCES `inwards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4661 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inward_items`
--

LOCK TABLES `inward_items` WRITE;
/*!40000 ALTER TABLE `inward_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `inward_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inwards`
--

DROP TABLE IF EXISTS `inwards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inwards` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `inward_no` varchar(24) NOT NULL,
  `entry_type` varchar(40) DEFAULT NULL,
  `opening_remark` text DEFAULT NULL,
  `jw_ref` varchar(24) DEFAULT NULL,
  `vendor` varchar(190) DEFAULT NULL,
  `challan` varchar(120) DEFAULT NULL,
  `inward_date` date DEFAULT NULL,
  `po_ref` varchar(24) DEFAULT NULL,
  `grn` varchar(60) DEFAULT NULL,
  `invoice_no` varchar(120) DEFAULT NULL,
  `invoice_date` date DEFAULT NULL,
  `supplier` varchar(190) DEFAULT NULL,
  `supplier_id` varchar(40) DEFAULT NULL,
  `vehicle` varchar(60) DEFAULT NULL,
  `bin` varchar(120) DEFAULT NULL,
  `received_by` varchar(190) DEFAULT NULL,
  `warehouse` varchar(190) DEFAULT NULL,
  `warehouse_id` varchar(40) DEFAULT NULL,
  `freight` decimal(16,2) NOT NULL DEFAULT 0.00,
  `freight_gst` decimal(6,2) NOT NULL DEFAULT 0.00,
  `freight_hsn` varchar(24) DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Completed',
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `vendor_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_inward_no` (`inward_no`),
  UNIQUE KEY `idx_inwards_id` (`id`),
  KEY `idx_in_po` (`po_ref`),
  KEY `idx_in_date` (`inward_date`),
  KEY `idx_in_supplier` (`supplier`),
  KEY `idx_inw_supplier_id` (`supplier_id`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inwards`
--

LOCK TABLES `inwards` WRITE;
/*!40000 ALTER TABLE `inwards` DISABLE KEYS */;
/*!40000 ALTER TABLE `inwards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_sizes`
--

DROP TABLE IF EXISTS `item_sizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item_sizes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `item_id` varchar(40) NOT NULL,
  `size` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_item_sizes` (`item_id`),
  CONSTRAINT `fk_item_sizes` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_sizes`
--

LOCK TABLES `item_sizes` WRITE;
/*!40000 ALTER TABLE `item_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `items` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `code` varchar(24) DEFAULT NULL,
  `name` varchar(190) NOT NULL,
  `category` varchar(190) DEFAULT NULL,
  `classification` varchar(190) DEFAULT NULL,
  `material_type` varchar(190) DEFAULT NULL,
  `quality` varchar(190) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `unit` varchar(24) DEFAULT NULL,
  `width` varchar(120) DEFAULT NULL,
  `hsn` varchar(24) DEFAULT NULL,
  `gst` decimal(6,2) DEFAULT NULL,
  `image` longtext DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `has_color` tinyint(1) NOT NULL DEFAULT 0,
  `color_name` varchar(190) DEFAULT NULL,
  `moq` varchar(60) DEFAULT NULL,
  `item_rate` varchar(60) DEFAULT NULL,
  `item_mrp` varchar(60) DEFAULT NULL,
  `cgst` varchar(60) DEFAULT NULL,
  `sgst` varchar(60) DEFAULT NULL,
  `igst` varchar(60) DEFAULT NULL,
  `purchase_rate` varchar(60) DEFAULT NULL,
  `sale_rate` varchar(60) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_item_name` (`name`),
  UNIQUE KEY `idx_items_id` (`id`),
  KEY `idx_item_code` (`code`),
  KEY `idx_item_category` (`category`),
  KEY `idx_item_classification` (`classification`)
) ENGINE=InnoDB AUTO_INCREMENT=13404 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (13394,'imtppxpa7w3ffl','ITM-0001','Fabric','Fabric','Fabric',NULL,NULL,NULL,'m',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13395,'imtppxpa714xyj','ITM-0002','Thread','Trims','Thread',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13396,'imtppxpa7p88mw','ITM-0003','Buttons','Trims','Button',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13397,'imtppxpa73dprm','ITM-0004','Zipper','Trims','Zipper',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13398,'imtppxpa7wkla8','ITM-0005','Labels','Trims','Label - Main/Size',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13399,'imtppxpa7celqy','ITM-0006','Elastic','Trims','Elastic',NULL,NULL,NULL,'m',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13400,'imtppxpa7gkvsw','ITM-0007','Poly Bag','Packaging','Poly Bag',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13401,'imtppxpa7dsxxz','ITM-0008','Carton','Packaging','Carton',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13402,'imtppxpa70030a','ITM-0009','Sticker','Packaging','Sticker',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13403,'imtppxpa7pzf9d','ITM-0010','Hang Tag','Packaging','Hang Tag',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12');
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobwork_garment_sizes`
--

DROP TABLE IF EXISTS `jobwork_garment_sizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobwork_garment_sizes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `garment_id` bigint(20) unsigned NOT NULL,
  `size` varchar(40) NOT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id`),
  KEY `idx_jwgs_g` (`garment_id`),
  CONSTRAINT `fk_jwgs_g` FOREIGN KEY (`garment_id`) REFERENCES `jobwork_garments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobwork_garment_sizes`
--

LOCK TABLES `jobwork_garment_sizes` WRITE;
/*!40000 ALTER TABLE `jobwork_garment_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_garment_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobwork_garments`
--

DROP TABLE IF EXISTS `jobwork_garments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobwork_garments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `jobwork_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `style` varchar(190) DEFAULT NULL,
  `portal` varchar(190) DEFAULT NULL,
  `descr` varchar(255) DEFAULT NULL,
  `colour` varchar(190) DEFAULT NULL,
  `order_qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `rate` decimal(16,2) NOT NULL DEFAULT 0.00,
  `received_qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `extra_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jwg_jw` (`jobwork_id`),
  KEY `idx_jwg_style` (`style`),
  CONSTRAINT `fk_jwg_jw` FOREIGN KEY (`jobwork_id`) REFERENCES `jobworks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobwork_garments`
--

LOCK TABLES `jobwork_garments` WRITE;
/*!40000 ALTER TABLE `jobwork_garments` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_garments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobwork_issues`
--

DROP TABLE IF EXISTS `jobwork_issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobwork_issues` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `jobwork_id` varchar(40) NOT NULL,
  `line_kind` enum('issue','extra') NOT NULL DEFAULT 'issue',
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `issue_date` date DEFAULT NULL,
  `classification` varchar(190) DEFAULT NULL,
  `item` varchar(190) DEFAULT NULL,
  `inward_no` varchar(24) DEFAULT NULL,
  `po_ref` varchar(24) DEFAULT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `actual_qty` decimal(16,3) DEFAULT NULL,
  `unit` varchar(24) DEFAULT NULL,
  `cons` decimal(16,4) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `dc_no` varchar(24) DEFAULT NULL,
  `pod` longtext DEFAULT NULL,
  `pod_name` varchar(255) DEFAULT NULL,
  `pod_kind` varchar(40) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jwi_jw` (`jobwork_id`),
  KEY `idx_jwi_item` (`item`),
  KEY `idx_jwi_inward` (`inward_no`),
  KEY `idx_jwi_item_id` (`item_id`),
  CONSTRAINT `fk_jwi_jw` FOREIGN KEY (`jobwork_id`) REFERENCES `jobworks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobwork_issues`
--

LOCK TABLES `jobwork_issues` WRITE;
/*!40000 ALTER TABLE `jobwork_issues` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_issues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobwork_receipt_sizes`
--

DROP TABLE IF EXISTS `jobwork_receipt_sizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobwork_receipt_sizes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `receipt_id` bigint(20) unsigned NOT NULL,
  `size` varchar(40) NOT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id`),
  KEY `idx_jwrs_r` (`receipt_id`),
  CONSTRAINT `fk_jwrs_r` FOREIGN KEY (`receipt_id`) REFERENCES `jobwork_receipts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobwork_receipt_sizes`
--

LOCK TABLES `jobwork_receipt_sizes` WRITE;
/*!40000 ALTER TABLE `jobwork_receipt_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_receipt_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobwork_receipts`
--

DROP TABLE IF EXISTS `jobwork_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobwork_receipts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `jobwork_id` varchar(40) NOT NULL,
  `rid` varchar(40) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `rcpt_date` date DEFAULT NULL,
  `descr` varchar(255) DEFAULT NULL,
  `colour` varchar(190) DEFAULT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `qc` varchar(120) DEFAULT NULL,
  `warehouse` varchar(190) DEFAULT NULL,
  `consumption` decimal(16,4) NOT NULL DEFAULT 0.0000,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jwrc_jw` (`jobwork_id`),
  CONSTRAINT `fk_jwr_jw` FOREIGN KEY (`jobwork_id`) REFERENCES `jobworks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobwork_receipts`
--

LOCK TABLES `jobwork_receipts` WRITE;
/*!40000 ALTER TABLE `jobwork_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobwork_return_items`
--

DROP TABLE IF EXISTS `jobwork_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobwork_return_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `name` varchar(190) DEFAULT NULL,
  `unit` varchar(24) DEFAULT NULL,
  `ret_qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `return_type` varchar(120) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jwri_ret` (`return_id`),
  KEY `idx_jwri_name` (`name`),
  CONSTRAINT `fk_jwri_ret` FOREIGN KEY (`return_id`) REFERENCES `jobwork_returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobwork_return_items`
--

LOCK TABLES `jobwork_return_items` WRITE;
/*!40000 ALTER TABLE `jobwork_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobwork_returns`
--

DROP TABLE IF EXISTS `jobwork_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobwork_returns` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `return_no` varchar(24) NOT NULL,
  `return_date` date DEFAULT NULL,
  `jw_ref` varchar(24) DEFAULT NULL,
  `vendor` varchar(190) DEFAULT NULL,
  `warehouse` varchar(190) DEFAULT NULL,
  `challan` varchar(120) DEFAULT NULL,
  `vehicle` varchar(60) DEFAULT NULL,
  `received_by` varchar(190) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Draft',
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `vendor_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_jwret_no` (`return_no`),
  UNIQUE KEY `idx_jobwork_returns_id` (`id`),
  KEY `idx_jwret_jw` (`jw_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobwork_returns`
--

LOCK TABLES `jobwork_returns` WRITE;
/*!40000 ALTER TABLE `jobwork_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobwork_styles`
--

DROP TABLE IF EXISTS `jobwork_styles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobwork_styles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `jobwork_id` varchar(40) NOT NULL,
  `style` varchar(190) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_jws_jw` (`jobwork_id`),
  KEY `idx_jws_style` (`style`),
  CONSTRAINT `fk_jws_jw` FOREIGN KEY (`jobwork_id`) REFERENCES `jobworks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobwork_styles`
--

LOCK TABLES `jobwork_styles` WRITE;
/*!40000 ALTER TABLE `jobwork_styles` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_styles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobworks`
--

DROP TABLE IF EXISTS `jobworks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobworks` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `doc_type` enum('jobwork','sample') NOT NULL DEFAULT 'jobwork',
  `jw_no` varchar(24) NOT NULL,
  `jw_date` date DEFAULT NULL,
  `vendor` varchar(190) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expected_date` date DEFAULT NULL,
  `receive_date` date DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Issued',
  `notes` text DEFAULT NULL,
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `vendor_id` varchar(40) DEFAULT NULL,
  `process_type_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_jw_no` (`doc_type`,`jw_no`),
  UNIQUE KEY `idx_jobworks_id` (`id`),
  KEY `idx_jw_vendor` (`vendor`),
  KEY `idx_jw_status` (`status`),
  KEY `idx_jw_date` (`jw_date`),
  KEY `idx_jw_vendor_id` (`vendor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobworks`
--

LOCK TABLES `jobworks` WRITE;
/*!40000 ALTER TABLE `jobworks` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobworks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kv_store`
--

DROP TABLE IF EXISTS `kv_store`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `kv_store` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `k` varchar(120) NOT NULL,
  `v` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_kv_store_k` (`k`)
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kv_store`
--

LOCK TABLES `kv_store` WRITE;
/*!40000 ALTER TABLE `kv_store` DISABLE KEYS */;
INSERT INTO `kv_store` VALUES (1,'hash:auditTrail','d751713988987e9331980363e24189ce','2026-09-06 11:01:16'),(2,'hash:companyDetails','116473e0cf4551ed571f50934330faed','2026-09-06 11:01:15'),(3,'hash:costing','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(4,'hash:customReports','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(5,'hash:gstApiSettings','ba6690e47a02ab86fc6177a4774687c6','2026-09-06 10:51:01'),(6,'hash:inward','d751713988987e9331980363e24189ce','2026-09-06 11:01:15'),(7,'hash:items','e4bd31a07ede8bace3b5b71017e3af2d','2026-09-06 11:20:12'),(8,'hash:jobwork','d751713988987e9331980363e24189ce','2026-09-06 11:01:16'),(9,'hash:jobworkreturn','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(10,'hash:listmasters','016dba5ef508396cf7b63a96bdcb03b8','2026-09-06 11:20:12'),(11,'hash:loginSettings','53592e6196705ea74c6543ef3f62d386','2026-09-06 11:01:15'),(12,'hash:mastersLeftover','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(13,'hash:menuSettings','5c4bbf78cec94fb3385d92b64e00a7e9','2026-09-06 11:01:15'),(14,'hash:parties','d751713988987e9331980363e24189ce','2026-09-06 11:01:15'),(15,'hash:po','d751713988987e9331980363e24189ce','2026-09-06 11:20:12'),(16,'hash:processinward','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(17,'hash:processoutward','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(18,'hash:purchasereturn','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(19,'hash:sale','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(20,'hash:sample','d751713988987e9331980363e24189ce','2026-09-06 11:01:16'),(21,'hash:seq','4468ae8f94a13463159aa2ade4262798','2026-09-06 11:08:41'),(22,'hash:styles','d751713988987e9331980363e24189ce','2026-09-06 11:01:15'),(23,'hash:topLeftover','da6d41ff419a5d4562c5daae37e30276','2026-09-06 11:20:12'),(24,'hash:users','d816ed55d258e71ec2dfcaf6c74dcefd','2026-09-06 11:01:15'),(25,'initialized','1','2026-08-27 06:23:22'),(26,'menuSettingsExtra','{\"labels\":[],\"mainSections\":[],\"masterSections\":[],\"customMainGroups\":[],\"customMasterGroups\":[],\"hiddenMain\":[],\"hiddenMaster\":[],\"customMainItems\":[],\"customMasterItems\":[],\"mainGroupOrder\":[\"Home\",\"Operations\",\"Returns\",\"Catalog\",\"Analytics\",\"Settings\"],\"masterGroupOrder\":[\"Records\",\"Buying\",\"Product\",\"Commercial\",\"Production\",\"Location\",\"Governance\"]}','2026-08-28 07:18:16'),(27,'parentorphan:classifications:Fabric','Fabric','2026-08-28 07:18:16'),(94,'toplevel:_revision','1788693515071','2026-09-06 11:20:12'),(95,'toplevel:notifications','[]','2026-09-06 11:20:12'),(96,'toplevel:partners','[]','2026-09-06 11:20:12');
/*!40000 ALTER TABLE `kv_store` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_settings`
--

DROP TABLE IF EXISTS `login_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_settings` (
  `id` tinyint(4) NOT NULL DEFAULT 1,
  `slide_interval` int(11) NOT NULL DEFAULT 6,
  `extra_json` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_settings`
--

LOCK TABLES `login_settings` WRITE;
/*!40000 ALTER TABLE `login_settings` DISABLE KEYS */;
INSERT INTO `login_settings` VALUES (1,6,NULL,'2026-09-06 11:01:15');
/*!40000 ALTER TABLE `login_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_slides`
--

DROP TABLE IF EXISTS `login_slides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_slides` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `slide_id` varchar(60) DEFAULT NULL,
  `name` varchar(190) DEFAULT NULL,
  `fit` varchar(40) DEFAULT NULL,
  `position` varchar(60) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `data` longtext DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `extra_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_slides`
--

LOCK TABLES `login_slides` WRITE;
/*!40000 ALTER TABLE `login_slides` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_slides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `master_id_sequences`
--

DROP TABLE IF EXISTS `master_id_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `master_id_sequences` (
  `master_key` varchar(40) NOT NULL,
  `seq_value` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`master_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_id_sequences`
--

LOCK TABLES `master_id_sequences` WRITE;
/*!40000 ALTER TABLE `master_id_sequences` DISABLE KEYS */;
INSERT INTO `master_id_sequences` VALUES ('addresses',1),('boms',0),('businessTypes',3),('categories',4),('classifications',11),('colours',6),('countries',1),('customers',1),('districts',10),('fabrics',6),('firms',1),('freightChargesList',4),('gstRates',7),('gstTypes',2),('items',10),('materialTypes',8),('partyStatuses',2),('paymentTermsList',7),('processTypes',3),('qcResults',0),('qualities',3),('raisedForList',6),('returnTypes',6),('states',11),('suppliers',0),('talukas',8),('transportModes',6),('uoms',10),('warehouses',5),('washTypes',8);
/*!40000 ALTER TABLE `master_id_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `master_values`
--

DROP TABLE IF EXISTS `master_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `master_values` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `master_key` varchar(40) NOT NULL,
  `value` varchar(255) NOT NULL,
  `master_id` varchar(24) DEFAULT NULL,
  `parent_value` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_master_value` (`master_key`,`value`),
  KEY `idx_master_key` (`master_key`),
  KEY `idx_master_parent` (`master_key`,`parent_value`)
) ENGINE=InnoDB AUTO_INCREMENT=11871 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_values`
--

LOCK TABLES `master_values` WRITE;
/*!40000 ALTER TABLE `master_values` DISABLE KEYS */;
INSERT INTO `master_values` VALUES (11726,'customers','Myntra D2C','CUS-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11727,'colours','White','COL-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11728,'colours','Black','COL-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11729,'colours','Navy Blue','COL-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11730,'colours','Red','COL-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11731,'colours','Maroon','COL-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11732,'colours','Beige','COL-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11733,'fabrics','Cotton 240 GSM','FAB-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11734,'fabrics','Cotton 180 GSM','FAB-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11735,'fabrics','Polyester','FAB-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11736,'fabrics','Viscose','FAB-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11737,'fabrics','Silk','FAB-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11738,'fabrics','Linen','FAB-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11739,'sizes','S',NULL,NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11740,'sizes','M',NULL,NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11741,'sizes','L',NULL,NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11742,'sizes','XL',NULL,NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11743,'sizes','XXL',NULL,NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11744,'categories','Fabric','CAT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11745,'categories','Trims','CAT-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11746,'categories','Packaging','CAT-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11747,'categories','Other','CAT-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11748,'classifications','Fabric','CLS-0001','Fabric',1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11749,'classifications','Label - Main/Size','CLS-0002','Trims',1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11750,'classifications','Button','CLS-0003','Trims',1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11751,'classifications','Zipper','CLS-0004','Trims',1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11752,'classifications','Elastic','CLS-0005','Trims',1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11753,'classifications','Thread','CLS-0006','Trims',1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11754,'classifications','Hang Tag','CLS-0007','Packaging',1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11755,'classifications','Poly Bag','CLS-0008','Packaging',1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11756,'classifications','Carton','CLS-0009','Packaging',1,8,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11757,'classifications','Sticker','CLS-0010','Packaging',1,9,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11758,'classifications','Other','CLS-0011','Other',1,10,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11759,'materialTypes','Woven','MAT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11760,'materialTypes','Knit','MAT-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11761,'materialTypes','Plastic','MAT-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11762,'materialTypes','Metal','MAT-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11763,'materialTypes','Paper','MAT-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11764,'materialTypes','Cotton','MAT-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11765,'materialTypes','Synthetic','MAT-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11766,'materialTypes','Other','MAT-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11767,'qualities','Standard','QUA-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11768,'qualities','Premium','QUA-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11769,'qualities','Economy','QUA-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11770,'firms','KEN Global Designs Pvt. Ltd.','FIR-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11771,'addresses','Ken Global Designs Private Limited ΓÇô Head Office','ADD-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11772,'raisedForList','Production','RFL-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11773,'raisedForList','Merchandising','RFL-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11774,'raisedForList','Sampling','RFL-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11775,'raisedForList','Store / Warehouse','RFL-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11776,'raisedForList','Accounts','RFL-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11777,'raisedForList','Management','RFL-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11778,'countries','India','CNT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11779,'states','Maharashtra','STA-0001','India',1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11780,'states','Gujarat','STA-0002','India',1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11781,'states','Karnataka','STA-0003','India',1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11782,'states','Tamil Nadu','STA-0004','India',1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11783,'states','Delhi','STA-0005','India',1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11784,'states','Haryana','STA-0006','India',1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11785,'states','Punjab','STA-0007','India',1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11786,'states','Rajasthan','STA-0008','India',1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11787,'states','Uttar Pradesh','STA-0009','India',1,8,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11788,'states','West Bengal','STA-0010','India',1,9,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11789,'states','Telangana','STA-0011','India',1,10,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11790,'districts','Pune','DIS-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11791,'districts','Mumbai Suburban','DIS-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11792,'districts','Thane','DIS-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11793,'districts','Nashik','DIS-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11794,'districts','Ahmedabad','DIS-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11795,'districts','Surat','DIS-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11796,'districts','Bengaluru Urban','DIS-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11797,'districts','Ludhiana','DIS-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11798,'districts','Tiruppur','DIS-0009',NULL,1,8,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11799,'districts','Gurugram','DIS-0010',NULL,1,9,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11800,'talukas','Haveli','TAL-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11801,'talukas','Mulshi','TAL-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11802,'talukas','Maval','TAL-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11803,'talukas','Andheri','TAL-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11804,'talukas','Borivali','TAL-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11805,'talukas','Kalyan','TAL-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11806,'talukas','Choryasi','TAL-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11807,'talukas','Palladam','TAL-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11808,'partyStatuses','Active','STS-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11809,'partyStatuses','Inactive','STS-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11810,'businessTypes','Buyer','BTY-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11811,'businessTypes','Supplier','BTY-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11812,'businessTypes','Vendor','BTY-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11813,'gstTypes','CGST & SGST','GTY-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11814,'gstTypes','IGST','GTY-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11815,'paymentTermsList','Advance','PAY-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11816,'paymentTermsList','7 days credit','PAY-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11817,'paymentTermsList','15 days credit','PAY-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11818,'paymentTermsList','30 days credit','PAY-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11819,'paymentTermsList','45 days credit','PAY-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11820,'paymentTermsList','60 days credit','PAY-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11821,'paymentTermsList','Against Delivery','PAY-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11822,'freightChargesList','Included','FRT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11823,'freightChargesList','Extra','FRT-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11824,'freightChargesList','To Pay','FRT-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11825,'freightChargesList','Not Applicable','FRT-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11826,'transportModes','Road','TRN-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11827,'transportModes','Rail','TRN-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11828,'transportModes','Air','TRN-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11829,'transportModes','Sea','TRN-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11830,'transportModes','Courier','TRN-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11831,'transportModes','Self Pickup','TRN-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11832,'warehouses','Main Store','WH-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11833,'warehouses','Fabric Store','WH-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11834,'warehouses','Trims Store','WH-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11835,'warehouses','Finished Goods Store','WH-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11836,'warehouses','Rejection Store','WH-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11837,'gstRates','0','GST-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11838,'gstRates','0.25','GST-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11839,'gstRates','3','GST-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11840,'gstRates','5','GST-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11841,'gstRates','12','GST-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11842,'gstRates','18','GST-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11843,'gstRates','28','GST-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11844,'uoms','m','UOM-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11845,'uoms','kg','UOM-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11846,'uoms','pcs','UOM-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11847,'uoms','sets','UOM-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11848,'uoms','dozen','UOM-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11849,'uoms','rolls','UOM-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11850,'uoms','box','UOM-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11851,'uoms','gross','UOM-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11852,'uoms','yard','UOM-0009',NULL,1,8,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11853,'uoms','litre','UOM-0010',NULL,1,9,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11854,'returnTypes','Leftover Material','RTN-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11855,'returnTypes','Rejected / Damaged','RTN-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11856,'returnTypes','Excess Issued','RTN-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11857,'returnTypes','Wrong Material','RTN-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11858,'returnTypes','Cutting Waste','RTN-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11859,'returnTypes','Other','RTN-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11860,'washTypes','Normal Wash','WAS-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11861,'washTypes','Enzyme','WAS-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11862,'washTypes','Enzyme Softener','WAS-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11863,'washTypes','Stone Wash','WAS-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11864,'washTypes','Acid Wash','WAS-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11865,'washTypes','Silicon Softener','WAS-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11866,'washTypes','Garment Dye','WAS-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11867,'washTypes','No Wash','WAS-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11868,'processTypes','Embroidery','PRT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11869,'processTypes','Washing','PRT-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11870,'processTypes','Printing','PRT-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12');
/*!40000 ALTER TABLE `master_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_settings`
--

DROP TABLE IF EXISTS `menu_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `menu_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `menu_area` enum('main','master') NOT NULL,
  `item_key` varchar(60) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_menu` (`menu_area`,`item_key`)
) ENGINE=InnoDB AUTO_INCREMENT=533 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_settings`
--

LOCK TABLES `menu_settings` WRITE;
/*!40000 ALTER TABLE `menu_settings` DISABLE KEYS */;
INSERT INTO `menu_settings` VALUES (489,'main','dashboard',0),(490,'main','po',1),(491,'main','inward',2),(492,'main','jobwork',3),(493,'main','processoutward',4),(494,'main','processinward',5),(495,'main','sample',6),(496,'main','sale',7),(497,'main','costing',8),(498,'main','purchasereturn',9),(499,'main','masters',10),(500,'main','partneronboarding',11),(501,'main','gstapi',12),(502,'main','reports',13),(503,'main','reporting',14),(504,'main','usermanagement',15),(505,'master','styles',0),(506,'master','items',1),(507,'master','partyrecords',2),(508,'master','companydetails',3),(509,'master','loginpage',4),(510,'master','menumaster',5),(511,'master','raisedForList',6),(512,'master','warehouses',7),(513,'master','returnTypes',8),(514,'master','categories',9),(515,'master','classifications',10),(516,'master','qualities',11),(517,'master','sizes',12),(518,'master','qcResults',13),(519,'master','uoms',14),(520,'master','washTypes',15),(521,'master','gstRates',16),(522,'master','gstTypes',17),(523,'master','paymentTermsList',18),(524,'master','freightChargesList',19),(525,'master','transportModes',20),(526,'master','businessTypes',21),(527,'master','partyStatuses',22),(528,'master','processTypes',23),(529,'master','countries',24),(530,'master','states',25),(531,'master','usermanagement',26),(532,'master','audit',27);
/*!40000 ALTER TABLE `menu_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parties`
--

DROP TABLE IF EXISTS `parties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parties` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `code` varchar(24) DEFAULT NULL,
  `legal_name` varchar(190) NOT NULL,
  `short_name` varchar(190) NOT NULL,
  `site_code` varchar(120) DEFAULT NULL,
  `pan` varchar(20) DEFAULT NULL,
  `gst_no` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `country` varchar(120) DEFAULT NULL,
  `state` varchar(120) DEFAULT NULL,
  `district` varchar(120) DEFAULT NULL,
  `taluka` varchar(120) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `pin` varchar(16) DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Active',
  `business_type` varchar(190) DEFAULT NULL,
  `gst_type` varchar(40) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_party_legal` (`legal_name`),
  UNIQUE KEY `idx_parties_id` (`id`),
  KEY `idx_party_short` (`short_name`),
  KEY `idx_party_gst` (`gst_no`),
  KEY `idx_party_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parties`
--

LOCK TABLES `parties` WRITE;
/*!40000 ALTER TABLE `parties` DISABLE KEYS */;
/*!40000 ALTER TABLE `parties` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `party_bill_tos`
--

DROP TABLE IF EXISTS `party_bill_tos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `party_bill_tos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `party_id` varchar(40) NOT NULL,
  `name` varchar(190) DEFAULT NULL,
  `gst_no` varchar(20) DEFAULT NULL,
  `pan` varchar(20) DEFAULT NULL,
  `gst_type` varchar(40) DEFAULT NULL,
  `country` varchar(120) DEFAULT NULL,
  `state` varchar(120) DEFAULT NULL,
  `district` varchar(120) DEFAULT NULL,
  `taluka` varchar(120) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `pin` varchar(16) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `extra_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_billto_party` (`party_id`),
  KEY `idx_billto_gst` (`gst_no`),
  CONSTRAINT `fk_billto_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `party_bill_tos`
--

LOCK TABLES `party_bill_tos` WRITE;
/*!40000 ALTER TABLE `party_bill_tos` DISABLE KEYS */;
/*!40000 ALTER TABLE `party_bill_tos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `party_business_types`
--

DROP TABLE IF EXISTS `party_business_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `party_business_types` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `party_id` varchar(40) NOT NULL,
  `business_type` varchar(120) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_pbt_party` (`party_id`),
  CONSTRAINT `fk_pbt_party` FOREIGN KEY (`party_id`) REFERENCES `parties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `party_business_types`
--

LOCK TABLES `party_business_types` WRITE;
/*!40000 ALTER TABLE `party_business_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `party_business_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_inward_item_sizes`
--

DROP TABLE IF EXISTS `process_inward_item_sizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `process_inward_item_sizes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint(20) unsigned NOT NULL,
  `size` varchar(40) NOT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id`),
  KEY `idx_pris_item` (`item_id`),
  CONSTRAINT `fk_pris_item` FOREIGN KEY (`item_id`) REFERENCES `process_inward_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_inward_item_sizes`
--

LOCK TABLES `process_inward_item_sizes` WRITE;
/*!40000 ALTER TABLE `process_inward_item_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_inward_item_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_inward_items`
--

DROP TABLE IF EXISTS `process_inward_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `process_inward_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `inward_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `style` varchar(190) DEFAULT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `rate` decimal(16,2) NOT NULL DEFAULT 0.00,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prii_in` (`inward_id`),
  CONSTRAINT `fk_prii_in` FOREIGN KEY (`inward_id`) REFERENCES `process_inwards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_inward_items`
--

LOCK TABLES `process_inward_items` WRITE;
/*!40000 ALTER TABLE `process_inward_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_inward_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_inwards`
--

DROP TABLE IF EXISTS `process_inwards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `process_inwards` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `in_no` varchar(24) NOT NULL,
  `in_date` date DEFAULT NULL,
  `outward_ref` varchar(40) DEFAULT NULL,
  `process_type` varchar(120) DEFAULT NULL,
  `processor` varchar(190) DEFAULT NULL,
  `warehouse` varchar(190) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Received',
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `vendor_id` varchar(40) DEFAULT NULL,
  `process_type_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_pri_no` (`in_no`),
  UNIQUE KEY `idx_process_inwards_id` (`id`),
  KEY `idx_pri_out` (`outward_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_inwards`
--

LOCK TABLES `process_inwards` WRITE;
/*!40000 ALTER TABLE `process_inwards` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_inwards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_outward_item_sizes`
--

DROP TABLE IF EXISTS `process_outward_item_sizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `process_outward_item_sizes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `item_id` bigint(20) unsigned NOT NULL,
  `size` varchar(40) NOT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id`),
  KEY `idx_pros_item` (`item_id`),
  CONSTRAINT `fk_pros_item` FOREIGN KEY (`item_id`) REFERENCES `process_outward_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_outward_item_sizes`
--

LOCK TABLES `process_outward_item_sizes` WRITE;
/*!40000 ALTER TABLE `process_outward_item_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_outward_item_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_outward_items`
--

DROP TABLE IF EXISTS `process_outward_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `process_outward_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `outward_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `style` varchar(190) DEFAULT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `rate` decimal(16,2) NOT NULL DEFAULT 0.00,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_proi_out` (`outward_id`),
  CONSTRAINT `fk_proi_out` FOREIGN KEY (`outward_id`) REFERENCES `process_outwards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_outward_items`
--

LOCK TABLES `process_outward_items` WRITE;
/*!40000 ALTER TABLE `process_outward_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_outward_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_outwards`
--

DROP TABLE IF EXISTS `process_outwards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `process_outwards` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `out_no` varchar(40) NOT NULL,
  `out_date` date DEFAULT NULL,
  `process_type` varchar(120) DEFAULT NULL,
  `processor` varchar(190) DEFAULT NULL,
  `jw_ref` varchar(24) DEFAULT NULL,
  `expected_date` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Open',
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `vendor_id` varchar(40) DEFAULT NULL,
  `process_type_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_pro_no` (`out_no`),
  UNIQUE KEY `idx_process_outwards_id` (`id`),
  KEY `idx_pro_jw` (`jw_ref`),
  KEY `idx_pro_type` (`process_type`),
  KEY `idx_pro_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_outwards`
--

LOCK TABLES `process_outwards` WRITE;
/*!40000 ALTER TABLE `process_outwards` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_outwards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_bom`
--

DROP TABLE IF EXISTS `purchase_order_bom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_bom` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `po_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `row_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pob_po` (`po_id`),
  CONSTRAINT `fk_pob_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_bom`
--

LOCK TABLES `purchase_order_bom` WRITE;
/*!40000 ALTER TABLE `purchase_order_bom` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_bom` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `po_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `classification` varchar(190) DEFAULT NULL,
  `classification_id` varchar(40) DEFAULT NULL,
  `name` varchar(190) DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `specs` text DEFAULT NULL,
  `color` varchar(190) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `unit` varchar(24) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  `rate` decimal(16,2) NOT NULL DEFAULT 0.00,
  `cgst_pct` decimal(6,2) NOT NULL DEFAULT 0.00,
  `sgst_pct` decimal(6,2) NOT NULL DEFAULT 0.00,
  `igst_pct` decimal(6,2) NOT NULL DEFAULT 0.00,
  `cgst_amt` decimal(16,2) NOT NULL DEFAULT 0.00,
  `sgst_amt` decimal(16,2) NOT NULL DEFAULT 0.00,
  `igst_amt` decimal(16,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(16,2) NOT NULL DEFAULT 0.00,
  `amount` decimal(16,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(16,2) NOT NULL DEFAULT 0.00,
  `extra_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_poi_po` (`po_id`),
  KEY `idx_poi_name` (`name`),
  KEY `idx_poi_item_id` (`item_id`),
  CONSTRAINT `fk_poi_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_styles`
--

DROP TABLE IF EXISTS `purchase_order_styles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_styles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `po_id` varchar(40) NOT NULL,
  `style` varchar(190) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_pos_po` (`po_id`),
  KEY `idx_pos_style` (`style`),
  CONSTRAINT `fk_pos_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_styles`
--

LOCK TABLES `purchase_order_styles` WRITE;
/*!40000 ALTER TABLE `purchase_order_styles` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_styles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_orders` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `po_no` varchar(24) NOT NULL,
  `firm` varchar(255) DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `supplier` varchar(190) DEFAULT NULL,
  `supplier_id` varchar(40) DEFAULT NULL,
  `supplier_trade` varchar(190) DEFAULT NULL,
  `bill_to` varchar(255) DEFAULT NULL,
  `ship_to` varchar(255) DEFAULT NULL,
  `gst_type` varchar(40) DEFAULT NULL,
  `po_type` varchar(60) DEFAULT NULL,
  `buyer` varchar(190) DEFAULT NULL,
  `buyer_id` varchar(40) DEFAULT NULL,
  `bom_type` varchar(60) DEFAULT NULL,
  `classification` varchar(190) DEFAULT NULL,
  `classification_id` varchar(40) DEFAULT NULL,
  `category` varchar(190) DEFAULT NULL,
  `category_id` varchar(40) DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Draft',
  `delivery_address` text DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `close_date` date DEFAULT NULL,
  `raised_for` varchar(120) DEFAULT NULL,
  `raised_for_id` varchar(40) DEFAULT NULL,
  `qtn_no` varchar(120) DEFAULT NULL,
  `qtn_date` date DEFAULT NULL,
  `pay_terms` varchar(120) DEFAULT NULL,
  `pay_terms_id` varchar(40) DEFAULT NULL,
  `freight_charges` varchar(120) DEFAULT NULL,
  `pnf` varchar(60) DEFAULT NULL,
  `transit_insurance` varchar(120) DEFAULT NULL,
  `transport_mode` varchar(120) DEFAULT NULL,
  `transport_mode_id` varchar(40) DEFAULT NULL,
  `narration` text DEFAULT NULL,
  `terms` longtext DEFAULT NULL,
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_po_no` (`po_no`),
  UNIQUE KEY `idx_purchase_orders_id` (`id`),
  KEY `idx_po_date` (`po_date`),
  KEY `idx_po_supplier` (`supplier`),
  KEY `idx_po_status` (`status`),
  KEY `idx_po_supplier_id` (`supplier_id`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_return_items`
--

DROP TABLE IF EXISTS `purchase_return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_return_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `return_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `classification` varchar(190) DEFAULT NULL,
  `name` varchar(190) DEFAULT NULL,
  `specs` text DEFAULT NULL,
  `color` varchar(190) DEFAULT NULL,
  `unit` varchar(24) DEFAULT NULL,
  `rate` decimal(16,2) NOT NULL DEFAULT 0.00,
  `rec_qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `ret_qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pri_ret` (`return_id`),
  KEY `idx_pri_name` (`name`),
  CONSTRAINT `fk_pri_ret` FOREIGN KEY (`return_id`) REFERENCES `purchase_returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_return_items`
--

LOCK TABLES `purchase_return_items` WRITE;
/*!40000 ALTER TABLE `purchase_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_returns`
--

DROP TABLE IF EXISTS `purchase_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_returns` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `return_no` varchar(24) NOT NULL,
  `return_date` date DEFAULT NULL,
  `po_ref` varchar(24) DEFAULT NULL,
  `inward_no` varchar(24) DEFAULT NULL,
  `supplier` varchar(190) DEFAULT NULL,
  `debit_note` varchar(120) DEFAULT NULL,
  `vehicle` varchar(60) DEFAULT NULL,
  `warehouse` varchar(190) DEFAULT NULL,
  `returned_by` varchar(190) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Draft',
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `supplier_id` varchar(40) DEFAULT NULL,
  `warehouse_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_pr_no` (`return_no`),
  UNIQUE KEY `idx_purchase_returns_id` (`id`),
  KEY `idx_pr_po` (`po_ref`),
  KEY `idx_pr_inward` (`inward_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_returns`
--

LOCK TABLES `purchase_returns` WRITE;
/*!40000 ALTER TABLE `purchase_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sale_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` varchar(40) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `descr` varchar(255) DEFAULT NULL,
  `qty` decimal(16,3) NOT NULL DEFAULT 0.000,
  `rate` decimal(16,2) NOT NULL DEFAULT 0.00,
  `disc_pct` decimal(6,2) NOT NULL DEFAULT 0.00,
  `tax_pct` decimal(6,2) NOT NULL DEFAULT 0.00,
  `amount` decimal(16,2) NOT NULL DEFAULT 0.00,
  `extra_json` longtext DEFAULT NULL,
  `item_id` varchar(40) DEFAULT NULL,
  `color_id` varchar(40) DEFAULT NULL,
  `unit_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sli_sale` (`sale_id`),
  CONSTRAINT `fk_sli_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sales` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(40) NOT NULL,
  `sale_no` varchar(24) NOT NULL,
  `sale_date` date DEFAULT NULL,
  `customer` varchar(190) DEFAULT NULL,
  `channel` varchar(120) DEFAULT NULL,
  `pay_status` varchar(40) DEFAULT NULL,
  `pay_mode` varchar(60) DEFAULT NULL,
  `invoice_no` varchar(120) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'Open',
  `created_at_ms` bigint(20) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `customer_id` varchar(40) DEFAULT NULL,
  `transport_mode_id` varchar(40) DEFAULT NULL,
  `pay_terms_id` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_sale_no` (`sale_no`),
  UNIQUE KEY `idx_sales_id` (`id`),
  KEY `idx_sale_customer` (`customer`),
  KEY `idx_sale_date` (`sale_date`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sequences`
--

DROP TABLE IF EXISTS `sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sequences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `seq_key` varchar(40) NOT NULL,
  `seq_value` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_sequences_seq_key` (`seq_key`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sequences`
--

LOCK TABLES `sequences` WRITE;
/*!40000 ALTER TABLE `sequences` DISABLE KEYS */;
INSERT INTO `sequences` VALUES (1,'costing',0,'2026-08-27 06:23:22'),(2,'dc',0,'2026-09-06 11:01:15'),(3,'inward',0,'2026-09-06 11:01:15'),(4,'item',10,'2026-09-06 11:01:15'),(5,'jobwork',0,'2026-09-06 11:01:15'),(6,'jobworkreturn',0,'2026-08-27 06:23:22'),(7,'openingstock',0,'2026-08-27 06:23:22'),(8,'party',0,'2026-08-28 06:48:46'),(9,'po',0,'2026-09-06 11:01:15'),(10,'processinward',0,'2026-08-27 06:23:22'),(11,'processoutward',0,'2026-08-27 06:23:22'),(12,'purchasereturn',0,'2026-08-27 06:23:22'),(13,'sale',0,'2026-08-28 06:48:46'),(14,'sample',0,'2026-09-06 11:01:15'),(15,'sampledc',1,'2026-08-30 11:29:01'),(16,'style',0,'2026-09-06 11:01:15'),(17,'user',3,'2026-08-27 06:23:22');
/*!40000 ALTER TABLE `sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `status_history`
--

DROP TABLE IF EXISTS `status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `status_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `doc_type` varchar(40) NOT NULL,
  `doc_id` varchar(40) NOT NULL,
  `doc_no` varchar(40) DEFAULT NULL,
  `from_status` varchar(40) DEFAULT NULL,
  `to_status` varchar(40) DEFAULT NULL,
  `changed_by` varchar(190) DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sh_doc` (`doc_type`,`doc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `status_history`
--

LOCK TABLES `status_history` WRITE;
/*!40000 ALTER TABLE `status_history` DISABLE KEYS */;
INSERT INTO `status_history` VALUES (1,'po','mtb5274adycu8','PO-0001',NULL,'Draft','System Administrator','2026-08-27 06:25:28'),(2,'inward','mtb55kagklm80','IN-0001',NULL,'Completed','System Administrator','2026-08-27 06:28:05'),(3,'jobwork','mtb56jmsfjwc5','JW-0001',NULL,'Issued','System Administrator','2026-08-27 06:28:51'),(4,'po','mtb5274adycu8','PO-0001',NULL,'Draft','StitchFlow User','2026-08-27 08:26:22'),(5,'inward','mtb55kagklm80','IN-0001',NULL,'Completed','StitchFlow User','2026-08-27 08:26:22'),(6,'jobwork','mtb56jmsfjwc5','JW-0001',NULL,'Issued','StitchFlow User','2026-08-27 08:26:22'),(7,'po','mtb5274adycu8','PO-0001','Draft','Submitted','System Administrator','2026-08-27 08:55:11'),(8,'po','mtb5274adycu8','PO-0001','Submitted','Approved','System Administrator','2026-08-27 08:55:11'),(9,'po','mtb5274adycu8','PO-0001','Approved','Partially Received','System Administrator','2026-08-27 08:55:30'),(10,'inward','mtbaf4rjqrsk0','IN-0002',NULL,'Completed','System Administrator','2026-08-27 08:55:30'),(11,'po','mtb5274adycu8','PO-0001','Partially Received','Closed','System Administrator','2026-08-27 08:57:20'),(12,'po','mtb5274adycu8','PO-0001','Closed','Partially Received','System Administrator','2026-08-27 08:57:23'),(13,'po','mtbal6emqjnuk','PO-0001',NULL,'Draft','System Administrator','2026-08-27 09:00:11'),(14,'po','mtbal6en8owye','PO-0002',NULL,'Submitted','System Administrator','2026-08-27 09:00:11'),(15,'inward','mtbal6enthr05','IN-0001',NULL,'Completed','System Administrator','2026-08-27 09:00:12'),(16,'inward','mtbal6enl6xy6','IN-0002',NULL,'Completed','System Administrator','2026-08-27 09:00:12'),(17,'jobwork','mtbal6en0gktc','JW-0001',NULL,'Completed','System Administrator','2026-08-27 09:00:12'),(18,'jobwork','mtbal6enp9cgj','JW-0002',NULL,'In Progress','System Administrator','2026-08-27 09:00:12'),(19,'sale','mtbal6en81dmm','SL-0001',NULL,'Completed','System Administrator','2026-08-27 09:00:12'),(20,'sale','mtbal6entslym','SL-0002',NULL,'Open','System Administrator','2026-08-27 09:00:12'),(21,'po','mtcfgxwvs3arz','PO-0001',NULL,'Draft','System Administrator','2026-08-28 04:04:39'),(22,'po','mtcfgxx22uk60','PO-0002',NULL,'Submitted','System Administrator','2026-08-28 04:04:39'),(23,'inward','mtcfgxx2jw01j','IN-0001',NULL,'Completed','System Administrator','2026-08-28 04:04:39'),(24,'inward','mtcfgxx2yzcmq','IN-0002',NULL,'Completed','System Administrator','2026-08-28 04:04:39'),(25,'jobwork','mtcfgxx2synvn','JW-0001',NULL,'Completed','System Administrator','2026-08-28 04:04:39'),(26,'jobwork','mtcfgxx3c6nbk','JW-0002',NULL,'In Progress','System Administrator','2026-08-28 04:04:39'),(27,'sale','mtcfgxx3cviov','SL-0001',NULL,'Completed','System Administrator','2026-08-28 04:04:39'),(28,'sale','mtcfgxx3y7ppm','SL-0002',NULL,'Open','System Administrator','2026-08-28 04:04:39'),(29,'jobwork','mtcfgxx2synvn','JW-0001','Completed','Issued','System Administrator','2026-08-28 06:48:31'),(30,'inward','mtcmdypiel1y5','IN-0001',NULL,'Completed','System Administrator','2026-08-28 07:18:16'),(31,'inward','mtcnzwxsip7ca','IN-0002',NULL,'Completed','System Administrator','2026-08-28 08:03:20'),(32,'inward','mtco165495yol','IN-0003',NULL,'Completed','System Administrator','2026-08-28 08:04:19'),(33,'inward','mtco21ogly690','IN-0004',NULL,'Completed','System Administrator','2026-08-28 08:05:00'),(34,'po','mtfp3gyfmxfl8','PO-0001',NULL,'Draft','System Administrator','2026-08-30 10:57:24'),(35,'po','mtfp3gyfmxfl8','PO-0001','Draft','Submitted','System Administrator','2026-08-30 11:05:56'),(36,'po','mtfp3gyfmxfl8','PO-0001','Submitted','Approved','System Administrator','2026-08-30 11:09:16'),(37,'po','mtfp3gyfmxfl8','PO-0001','Approved','Partially Received','System Administrator','2026-08-30 11:15:30'),(38,'inward','mtfpqqrotu9go','IN-0005',NULL,'Completed','System Administrator','2026-08-30 11:15:30'),(39,'po','mtfp3gyfmxfl8','PO-0001','Partially Received','Received','System Administrator','2026-08-30 11:25:45'),(40,'inward','mtfq3wy7tydb1','IN-0006',NULL,'Completed','System Administrator','2026-08-30 11:25:45'),(41,'jobwork','mtfq69zzxlofp','JW-0001',NULL,'Issued','System Administrator','2026-08-30 11:27:35'),(42,'jobwork','mtfq6m509fivf','JW-0002',NULL,'Issued','System Administrator','2026-08-30 11:27:50'),(43,'jobwork','mtfq779wfaxnq','JW-0003',NULL,'Issued','System Administrator','2026-08-30 11:28:18'),(44,'sample','mtfq84f0xag30','SMP-0001',NULL,'Issued','System Administrator','2026-08-30 11:29:01'),(45,'jobwork','mtfq69zzxlofp','JW-0001','Issued','Completed','System Administrator','2026-08-30 11:34:39'),(46,'po','mtl4mcdv0ih6g','PO-0002',NULL,'Draft','System Administrator','2026-09-03 06:10:51'),(47,'po','mtl4mcdv0ih6g','PO-0002','Draft','Submitted','System Administrator','2026-09-03 06:15:04'),(48,'po','mtl4mcdv0ih6g','PO-0002','Submitted','Approved','System Administrator','2026-09-03 06:15:21'),(49,'po','mtl4mcdv0ih6g','PO-0002','Approved','Partially Received','System Administrator','2026-09-03 06:17:37'),(50,'inward','mtl4v1rt36t60','IN-0007',NULL,'Completed','System Administrator','2026-09-03 06:17:37'),(51,'jobwork','mtl50gi9u5xdf','JW-0004',NULL,'Issued','System Administrator','2026-09-03 06:21:50'),(52,'jobwork','mtl50gi9u5xdf','JW-0004','Issued','Partially Received','System Administrator','2026-09-03 06:46:23'),(54,'po','test_6a9d4594eeabf','PO-TEST-1788691860',NULL,'Draft','TestRunner','2026-09-06 10:51:01'),(55,'po','test_6a9d45a0cd8e2','PO-TEST-1788691872',NULL,'Draft','TestRunner','2026-09-06 10:51:12'),(56,'po','test_6a9d45ab14241','PO-TEST-1788691883',NULL,'Draft','TestRunner','2026-09-06 10:51:23'),(57,'po','test_6a9d45bbd8cf2','PO-E2E-1788691899',NULL,'Draft','StitchFlow User','2026-09-06 10:51:39'),(58,'po','test_6a9d471f30116','PO-TEST-1788692255',NULL,'Draft','TestRunner','2026-09-06 10:57:35'),(59,'po','test_6a9d47d1e1cfe','PO-E2E-1788692433',NULL,'Draft','StitchFlow User','2026-09-06 11:00:34'),(60,'po','test_6a9d49b9d95e6','PO-E2E-1788692921',NULL,'Draft','StitchFlow User','2026-09-06 11:08:41'),(61,'po','test_6a9d4c4403efd','PO-E2E-1788693572',NULL,'Draft','StitchFlow User','2026-09-06 11:19:32');
/*!40000 ALTER TABLE `status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `styles`
--

DROP TABLE IF EXISTS `styles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `styles` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(24) NOT NULL,
  `internal_id` varchar(190) NOT NULL,
  `portal_id` varchar(190) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `buyer` varchar(190) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `extra_json` longtext DEFAULT NULL,
  `created_by` varchar(120) DEFAULT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_style_internal` (`internal_id`),
  UNIQUE KEY `idx_styles_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `styles`
--

LOCK TABLES `styles` WRITE;
/*!40000 ALTER TABLE `styles` DISABLE KEYS */;
/*!40000 ALTER TABLE `styles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_modules`
--

DROP TABLE IF EXISTS `user_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_modules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(24) NOT NULL,
  `module` varchar(60) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_um_user` (`user_id`),
  CONSTRAINT `fk_um_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_modules`
--

LOCK TABLES `user_modules` WRITE;
/*!40000 ALTER TABLE `user_modules` DISABLE KEYS */;
INSERT INTO `user_modules` VALUES (109,'USR-0001','*',0),(110,'USR-0002','dashboard',0),(111,'USR-0002','po',1),(112,'USR-0002','inward',2),(113,'USR-0002','jobwork',3),(114,'USR-0002','processoutward',4),(115,'USR-0002','processinward',5),(116,'USR-0002','sample',6),(117,'USR-0002','sale',7),(118,'USR-0002','costing',8),(119,'USR-0002','styles',9),(120,'USR-0002','itemmaster',10),(121,'USR-0002','parties',11),(122,'USR-0002','purchasereturn',12),(123,'USR-0002','reports',13),(124,'USR-0002','reporting',14),(125,'USR-0002','masters',15),(126,'USR-0002','audit',16),(127,'USR-0002','partneronboarding',17),(128,'USR-0002','gstapi',18),(129,'USR-0003','dashboard',0),(130,'USR-0003','po',1),(131,'USR-0003','inward',2),(132,'USR-0003','reports',3);
/*!40000 ALTER TABLE `user_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(24) NOT NULL,
  `scope` enum('modules','inwardTypes','masters') NOT NULL,
  `perm_key` varchar(80) NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT 0,
  `can_create` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_perm` (`user_id`,`scope`,`perm_key`),
  CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permissions`
--

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `row_seq` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(24) NOT NULL,
  `name` varchar(190) NOT NULL,
  `username` varchar(120) NOT NULL,
  `pin_hash` varchar(120) DEFAULT NULL,
  `role` varchar(40) NOT NULL DEFAULT 'Custom',
  `status` varchar(40) NOT NULL DEFAULT 'Active',
  `access_level` varchar(40) DEFAULT NULL,
  `extra_json` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`row_seq`),
  UNIQUE KEY `row_seq` (`row_seq`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `idx_users_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (19,'USR-0001','System Administrator','admin','sha256:03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Admin','Active','Full',NULL,'2026-08-27 05:55:08','2026-09-06 11:01:15'),(20,'USR-0002','Production Manager','manager','sha256:03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Manager','Active','Full',NULL,'2026-08-28 04:31:33','2026-09-06 11:01:15'),(21,'USR-0003','Store Operator','store','sha256:03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','Store','Active','Full',NULL,'2026-08-28 04:31:33','2026-09-06 11:01:15');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `v_item_stock`
--

DROP TABLE IF EXISTS `v_item_stock`;
/*!50001 DROP VIEW IF EXISTS `v_item_stock`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `v_item_stock` AS SELECT
 1 AS `item_key`,
  1 AS `item_id`,
  1 AS `item_name`,
  1 AS `stock_qty` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_po_received`
--

DROP TABLE IF EXISTS `v_po_received`;
/*!50001 DROP VIEW IF EXISTS `v_po_received`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `v_po_received` AS SELECT
 1 AS `po_no`,
  1 AS `item_id`,
  1 AS `item_name`,
  1 AS `color_id`,
  1 AS `color`,
  1 AS `po_qty`,
  1 AS `received_qty` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `v_stock_ledger`
--

DROP TABLE IF EXISTS `v_stock_ledger`;
/*!50001 DROP VIEW IF EXISTS `v_stock_ledger`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `v_stock_ledger` AS SELECT
 1 AS `txn_date`,
  1 AS `txn_type`,
  1 AS `ref_no`,
  1 AS `item_id`,
  1 AS `item_name`,
  1 AS `color_id`,
  1 AS `unit_id`,
  1 AS `qty_in`,
  1 AS `qty_out` */;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `warehouse_addresses`
--

DROP TABLE IF EXISTS `warehouse_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `warehouse_addresses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `warehouse` varchar(255) NOT NULL,
  `address` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_warehouse_addresses_warehouse` (`warehouse`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouse_addresses`
--

LOCK TABLES `warehouse_addresses` WRITE;
/*!40000 ALTER TABLE `warehouse_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouse_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'kenerp_kend2c'
--

--
-- Final view structure for view `v_item_stock`
--

/*!50001 DROP VIEW IF EXISTS `v_item_stock`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`kenerp_kend2c`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_item_stock` AS select coalesce(`sl`.`item_id`,`sl`.`item_name`) AS `item_key`,max(`sl`.`item_id`) AS `item_id`,max(`sl`.`item_name`) AS `item_name`,greatest(0,sum(`sl`.`qty_in`) - sum(`sl`.`qty_out`)) AS `stock_qty` from `v_stock_ledger` `sl` where `sl`.`item_id` is not null and `sl`.`item_id` <> '' or `sl`.`item_name` is not null and `sl`.`item_name` <> '' group by coalesce(`sl`.`item_id`,`sl`.`item_name`) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_po_received`
--

/*!50001 DROP VIEW IF EXISTS `v_po_received`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`kenerp_kend2c`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_po_received` AS select `p`.`po_no` AS `po_no`,`li`.`item_id` AS `item_id`,`li`.`name` AS `item_name`,`li`.`color_id` AS `color_id`,`li`.`color` AS `color`,`li`.`qty` AS `po_qty`,coalesce((select sum(`ii`.`rec_qty`) from (`inward_items` `ii` join `inwards` `iw` on(`iw`.`id` = `ii`.`inward_id`)) where `iw`.`po_ref` = `p`.`po_no` and (`li`.`item_id` is not null and `ii`.`item_id` is not null and `ii`.`item_id` = `li`.`item_id` or lcase(trim(`ii`.`name`)) = lcase(trim(`li`.`name`)))),0) AS `received_qty` from (`purchase_order_items` `li` join `purchase_orders` `p` on(`p`.`id` = `li`.`po_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_stock_ledger`
--

/*!50001 DROP VIEW IF EXISTS `v_stock_ledger`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`kenerp_kend2c`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_stock_ledger` AS select `w`.`inward_date` AS `txn_date`,'inward' AS `txn_type`,`w`.`inward_no` AS `ref_no`,`i`.`item_id` AS `item_id`,`i`.`name` AS `item_name`,`i`.`color_id` AS `color_id`,`i`.`unit_id` AS `unit_id`,`i`.`rec_qty` AS `qty_in`,0 AS `qty_out` from (`inward_items` `i` join `inwards` `w` on(`w`.`id` = `i`.`inward_id`)) union all select `jr`.`return_date` AS `txn_date`,'jobwork_return' AS `txn_type`,`jr`.`return_no` AS `ref_no`,`ji`.`item_id` AS `item_id`,`ji`.`name` AS `item_name`,`ji`.`color_id` AS `color_id`,`ji`.`unit_id` AS `unit_id`,`ji`.`ret_qty` AS `qty_in`,0 AS `qty_out` from (`jobwork_return_items` `ji` join `jobwork_returns` `jr` on(`jr`.`id` = `ji`.`return_id`)) union all select coalesce(`x`.`issue_date`,`j`.`jw_date`) AS `txn_date`,'jobwork_issue' AS `txn_type`,`j`.`jw_no` AS `ref_no`,`x`.`item_id` AS `item_id`,`x`.`item` AS `item_name`,`x`.`color_id` AS `color_id`,`x`.`unit_id` AS `unit_id`,0 AS `qty_in`,`x`.`qty` AS `qty_out` from (`jobwork_issues` `x` join `jobworks` `j` on(`j`.`id` = `x`.`jobwork_id`)) where `j`.`doc_type` = 'jobwork' union all select `pr`.`return_date` AS `txn_date`,'purchase_return' AS `txn_type`,`pr`.`return_no` AS `ref_no`,`pi`.`item_id` AS `item_id`,`pi`.`name` AS `item_name`,`pi`.`color_id` AS `color_id`,`pi`.`unit_id` AS `unit_id`,0 AS `qty_in`,`pi`.`ret_qty` AS `qty_out` from (`purchase_return_items` `pi` join `purchase_returns` `pr` on(`pr`.`id` = `pi`.`return_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-06 18:00:39
