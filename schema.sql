SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
CREATE DATABASE IF NOT EXISTS `kenerp_kend2c` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kenerp_kend2c`;
DROP VIEW IF EXISTS `v_item_stock`;
DROP VIEW IF EXISTS `v_po_received`;
DROP VIEW IF EXISTS `v_stock_ledger`;
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

INSERT INTO `company_details` VALUES (1,'','','','','',NULL,NULL,'','','',NULL,current_timestamp());

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

INSERT INTO `gst_api_settings` VALUES (1,'custom','Production','https://www.gstinapi.in','/v1/gstin/{gstin}','gstin','apiKey','','api/gst/verify.php',30,'Supplier',current_timestamp(),1,1,0,1,1,0,'{}',current_timestamp());

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

INSERT INTO `kv_store` (`k`, `v`) VALUES ('initialized', '1');

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

INSERT INTO `login_settings` VALUES (1,6,NULL,'2026-09-06 11:01:15');

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


--
-- Table structure for table `login_throttles`
--

DROP TABLE IF EXISTS `login_throttles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_throttles` (
  `throttle_key` varchar(190) NOT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `first_attempt` bigint(20) NOT NULL DEFAULT 0,
  `locked_until` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`throttle_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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

INSERT INTO `master_id_sequences` VALUES ('addresses',0),('boms',0),('businessTypes',0),('categories',0),('classifications',0),('colours',0),('countries',0),('customers',0),('districts',0),('fabrics',0),('firms',0),('freightChargesList',0),('gstRates',0),('gstTypes',0),('items',0),('materialTypes',0),('partyStatuses',0),('paymentTermsList',0),('processTypes',0),('qcResults',0),('qualities',0),('raisedForList',0),('returnTypes',0),('states',0),('suppliers',0),('talukas',0),('transportModes',0),('uoms',0),('warehouses',0),('washTypes',0);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `master_values`
--

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

INSERT INTO `menu_settings` VALUES (489,'main','dashboard',0),(490,'main','po',1),(491,'main','inward',2),(492,'main','jobwork',3),(493,'main','processoutward',4),(494,'main','processinward',5),(495,'main','sample',6),(496,'main','sale',7),(497,'main','costing',8),(498,'main','purchasereturn',9),(499,'main','masters',10),(500,'main','partneronboarding',11),(501,'main','gstapi',12),(502,'main','reports',13),(503,'main','reporting',14),(504,'main','usermanagement',15),(505,'master','styles',0),(506,'master','items',1),(507,'master','partyrecords',2),(508,'master','companydetails',3),(509,'master','loginpage',4),(510,'master','menumaster',5),(511,'master','raisedForList',6),(512,'master','warehouses',7),(513,'master','returnTypes',8),(514,'master','categories',9),(515,'master','classifications',10),(516,'master','qualities',11),(517,'master','sizes',12),(518,'master','qcResults',13),(519,'master','uoms',14),(520,'master','washTypes',15),(521,'master','gstRates',16),(522,'master','gstTypes',17),(523,'master','paymentTermsList',18),(524,'master','freightChargesList',19),(525,'master','transportModes',20),(526,'master','businessTypes',21),(527,'master','partyStatuses',22),(528,'master','processTypes',23),(529,'master','countries',24),(530,'master','states',25),(531,'master','usermanagement',26),(532,'master','audit',27);

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

INSERT INTO `sequences` VALUES (1,'costing',0,'2026-08-27 06:23:22'),(2,'dc',0,'2026-09-06 11:01:15'),(3,'inward',0,'2026-09-06 11:01:15'),(4,'item',0,'2026-09-06 11:01:15'),(5,'jobwork',0,'2026-09-06 11:01:15'),(6,'jobworkreturn',0,'2026-08-27 06:23:22'),(7,'openingstock',0,'2026-08-27 06:23:22'),(8,'party',0,'2026-08-28 06:48:46'),(9,'po',0,'2026-09-06 11:01:15'),(10,'processinward',0,'2026-08-27 06:23:22'),(11,'processoutward',0,'2026-08-27 06:23:22'),(12,'purchasereturn',0,'2026-08-27 06:23:22'),(13,'sale',0,'2026-08-28 06:48:46'),(14,'sample',0,'2026-09-06 11:01:15'),(15,'sampledc',0,'2026-08-30 11:29:01'),(16,'style',0,'2026-09-06 11:01:15'),(17,'user',1,'2026-08-27 06:23:22');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `status_history`
--

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

INSERT INTO `user_modules` VALUES (109,'USR-0001','*',0);

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

INSERT INTO `users` VALUES (19,'USR-0001','System Administrator','admin','$2y$10$CciJYk9EVu9UFEHbKaA1aOjpu40sYlRgoctPfo.9eoJuCpyRFKw5W','Admin','Active','Full',NULL,'2026-08-27 05:55:08','2026-09-06 11:01:15');



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


--
-- Dumping routines for database 'kenerp_kend2c'
--

--

--
-- View structure for view `v_stock_ledger`
--
DROP VIEW IF EXISTS `v_stock_ledger`;
CREATE OR REPLACE VIEW `v_stock_ledger` AS
SELECT `w`.`inward_date` AS `txn_date`, 'inward' AS `txn_type`, `w`.`inward_no` AS `ref_no`, `i`.`item_id` AS `item_id`, `i`.`name` AS `item_name`, `i`.`color_id` AS `color_id`, `i`.`unit_id` AS `unit_id`, `i`.`rec_qty` AS `qty_in`, 0 AS `qty_out`
FROM `inward_items` `i` JOIN `inwards` `w` ON `w`.`id` = `i`.`inward_id`
UNION ALL
SELECT `jr`.`return_date` AS `txn_date`, 'jobwork_return' AS `txn_type`, `jr`.`return_no` AS `ref_no`, `ji`.`item_id` AS `item_id`, `ji`.`name` AS `item_name`, `ji`.`color_id` AS `color_id`, `ji`.`unit_id` AS `unit_id`, `ji`.`ret_qty` AS `qty_in`, 0 AS `qty_out`
FROM `jobwork_return_items` `ji` JOIN `jobwork_returns` `jr` ON `jr`.`id` = `ji`.`return_id`
UNION ALL
SELECT COALESCE(`x`.`issue_date`, `j`.`jw_date`) AS `txn_date`, 'jobwork_issue' AS `txn_type`, `j`.`jw_no` AS `ref_no`, `x`.`item_id` AS `item_id`, `x`.`item` AS `item_name`, `x`.`color_id` AS `color_id`, `x`.`unit_id` AS `unit_id`, 0 AS `qty_in`, `x`.`qty` AS `qty_out`
FROM `jobwork_issues` `x` JOIN `jobworks` `j` ON `j`.`id` = `x`.`jobwork_id`
WHERE `j`.`doc_type` = 'jobwork'
UNION ALL
SELECT `pr`.`return_date` AS `txn_date`, 'purchase_return' AS `txn_type`, `pr`.`return_no` AS `ref_no`, `pi`.`item_id` AS `item_id`, `pi`.`name` AS `item_name`, `pi`.`color_id` AS `color_id`, `pi`.`unit_id` AS `unit_id`, 0 AS `qty_in`, `pi`.`ret_qty` AS `qty_out`
FROM `purchase_return_items` `pi` JOIN `purchase_returns` `pr` ON `pr`.`id` = `pi`.`return_id`;

--
-- View structure for view `v_item_stock`
--
DROP VIEW IF EXISTS `v_item_stock`;
CREATE OR REPLACE VIEW `v_item_stock` AS
SELECT COALESCE(`sl`.`item_id`, `sl`.`item_name`) AS `item_key`,
       MAX(`sl`.`item_id`) AS `item_id`,
       MAX(`sl`.`item_name`) AS `item_name`,
       GREATEST(0, SUM(`sl`.`qty_in`) - SUM(`sl`.`qty_out`)) AS `stock_qty`
FROM `v_stock_ledger` `sl`
WHERE (`sl`.`item_id` IS NOT NULL AND `sl`.`item_id` <> '') OR (`sl`.`item_name` IS NOT NULL AND `sl`.`item_name` <> '')
GROUP BY COALESCE(`sl`.`item_id`, `sl`.`item_name`);

--
-- View structure for view `v_po_received`
--
DROP VIEW IF EXISTS `v_po_received`;
CREATE OR REPLACE VIEW `v_po_received` AS
SELECT `p`.`po_no` AS `po_no`,
       `li`.`item_id` AS `item_id`,
       `li`.`name` AS `item_name`,
       `li`.`color_id` AS `color_id`,
       `li`.`color` AS `color`,
       `li`.`qty` AS `po_qty`,
       COALESCE(`rec`.`total_received`, 0) AS `received_qty`
FROM `purchase_orders` `p`
JOIN `purchase_order_items` `li` ON `p`.`id` = `li`.`po_id`
LEFT JOIN (
    SELECT `iw`.`po_ref`,
           COALESCE(`ii`.`item_id`, `ii`.`name`) AS `match_key`,
           SUM(`ii`.`rec_qty`) AS `total_received`
    FROM `inwards` `iw`
    JOIN `inward_items` `ii` ON `iw`.`id` = `ii`.`inward_id`
    WHERE `iw`.`po_ref` IS NOT NULL AND `iw`.`po_ref` != ''
    GROUP BY `iw`.`po_ref`, COALESCE(`ii`.`item_id`, `ii`.`name`)
) `rec` ON `rec`.`po_ref` = `p`.`po_no` AND `rec`.`match_key` = COALESCE(`li`.`item_id`, `li`.`name`);

SET FOREIGN_KEY_CHECKS = 1;
