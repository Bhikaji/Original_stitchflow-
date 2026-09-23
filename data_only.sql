SET FOREIGN_KEY_CHECKS=0;

-- Dumping data for table `audit_trail`
--

LOCK TABLES `audit_trail` WRITE;
/*!40000 ALTER TABLE `audit_trail` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_trail` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `audit_trail_changes`
--

LOCK TABLES `audit_trail_changes` WRITE;
/*!40000 ALTER TABLE `audit_trail_changes` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_trail_changes` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `company_details`
--

LOCK TABLES `company_details` WRITE;
/*!40000 ALTER TABLE `company_details` DISABLE KEYS */;
INSERT INTO `company_details` VALUES (1,'KEN GLOBAL DESIGNS PRIVATE LIMITED','Reg. Office: 18/20, Back Side of Hotel City Inn, Industrial Estate, Ichalkaranji - 416115','Tal. Hatkanangale, Dist. Kolhapur, Maharashtra, India','Works: Gat No. 298 & 299, At Kondigre, Tal. Shirol, Dist. Kolhapur - 416102','Tel: +91 230 2438538 | Email: office@kenindia.in',NULL,NULL,'Maharashtra','27','Ichalkaranji',NULL,'2026-09-06 11:01:15');
/*!40000 ALTER TABLE `company_details` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `costing_rows`
--

LOCK TABLES `costing_rows` WRITE;
/*!40000 ALTER TABLE `costing_rows` DISABLE KEYS */;
/*!40000 ALTER TABLE `costing_rows` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `costings`
--

LOCK TABLES `costings` WRITE;
/*!40000 ALTER TABLE `costings` DISABLE KEYS */;
/*!40000 ALTER TABLE `costings` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `custom_report_fields`
--

LOCK TABLES `custom_report_fields` WRITE;
/*!40000 ALTER TABLE `custom_report_fields` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_report_fields` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `custom_report_filters`
--

LOCK TABLES `custom_report_filters` WRITE;
/*!40000 ALTER TABLE `custom_report_filters` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_report_filters` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `custom_reports`
--

LOCK TABLES `custom_reports` WRITE;
/*!40000 ALTER TABLE `custom_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `custom_reports` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `gst_api_settings`
--

LOCK TABLES `gst_api_settings` WRITE;
/*!40000 ALTER TABLE `gst_api_settings` DISABLE KEYS */;
INSERT INTO `gst_api_settings` VALUES (1,'custom','Production','https://www.gstinapi.in','/v1/gstin/{gstin}','gstin','apiKey','gak_25746143c64043b6b5cb2fe34057717e','https://kend2c.kenerp.com/api/gst/verify.php',30,'Supplier','2026-08-27T08:31:18.786Z',1,1,0,1,1,0,'{\"connectionOk\":false}','2026-09-06 10:51:01');
/*!40000 ALTER TABLE `gst_api_settings` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `inward_attachments`
--

LOCK TABLES `inward_attachments` WRITE;
/*!40000 ALTER TABLE `inward_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `inward_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `inward_items`
--

LOCK TABLES `inward_items` WRITE;
/*!40000 ALTER TABLE `inward_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `inward_items` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `inwards`
--

LOCK TABLES `inwards` WRITE;
/*!40000 ALTER TABLE `inwards` DISABLE KEYS */;
/*!40000 ALTER TABLE `inwards` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `item_sizes`
--

LOCK TABLES `item_sizes` WRITE;
/*!40000 ALTER TABLE `item_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (13394,'imtppxpa7w3ffl','ITM-0001','Fabric','Fabric','Fabric',NULL,NULL,NULL,'m',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13395,'imtppxpa714xyj','ITM-0002','Thread','Trims','Thread',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13396,'imtppxpa7p88mw','ITM-0003','Buttons','Trims','Button',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13397,'imtppxpa73dprm','ITM-0004','Zipper','Trims','Zipper',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13398,'imtppxpa7wkla8','ITM-0005','Labels','Trims','Label - Main/Size',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13399,'imtppxpa7celqy','ITM-0006','Elastic','Trims','Elastic',NULL,NULL,NULL,'m',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13400,'imtppxpa7gkvsw','ITM-0007','Poly Bag','Packaging','Poly Bag',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13401,'imtppxpa7dsxxz','ITM-0008','Carton','Packaging','Carton',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13402,'imtppxpa70030a','ITM-0009','Sticker','Packaging','Sticker',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(13403,'imtppxpa7pzf9d','ITM-0010','Hang Tag','Packaging','Hang Tag',NULL,NULL,NULL,'pcs',NULL,NULL,NULL,NULL,1,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12');
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobwork_garment_sizes`
--

LOCK TABLES `jobwork_garment_sizes` WRITE;
/*!40000 ALTER TABLE `jobwork_garment_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_garment_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobwork_garments`
--

LOCK TABLES `jobwork_garments` WRITE;
/*!40000 ALTER TABLE `jobwork_garments` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_garments` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobwork_issues`
--

LOCK TABLES `jobwork_issues` WRITE;
/*!40000 ALTER TABLE `jobwork_issues` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_issues` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobwork_receipt_sizes`
--

LOCK TABLES `jobwork_receipt_sizes` WRITE;
/*!40000 ALTER TABLE `jobwork_receipt_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_receipt_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobwork_receipts`
--

LOCK TABLES `jobwork_receipts` WRITE;
/*!40000 ALTER TABLE `jobwork_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobwork_return_items`
--

LOCK TABLES `jobwork_return_items` WRITE;
/*!40000 ALTER TABLE `jobwork_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobwork_returns`
--

LOCK TABLES `jobwork_returns` WRITE;
/*!40000 ALTER TABLE `jobwork_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_returns` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobwork_styles`
--

LOCK TABLES `jobwork_styles` WRITE;
/*!40000 ALTER TABLE `jobwork_styles` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobwork_styles` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `jobworks`
--

LOCK TABLES `jobworks` WRITE;
/*!40000 ALTER TABLE `jobworks` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobworks` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `kv_store`
--

LOCK TABLES `kv_store` WRITE;
/*!40000 ALTER TABLE `kv_store` DISABLE KEYS */;
INSERT INTO `kv_store` VALUES (1,'hash:auditTrail','d751713988987e9331980363e24189ce','2026-09-06 11:01:16'),(2,'hash:companyDetails','116473e0cf4551ed571f50934330faed','2026-09-06 11:01:15'),(3,'hash:costing','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(4,'hash:customReports','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(5,'hash:gstApiSettings','ba6690e47a02ab86fc6177a4774687c6','2026-09-06 10:51:01'),(6,'hash:inward','d751713988987e9331980363e24189ce','2026-09-06 11:01:15'),(7,'hash:items','e4bd31a07ede8bace3b5b71017e3af2d','2026-09-06 11:20:12'),(8,'hash:jobwork','d751713988987e9331980363e24189ce','2026-09-06 11:01:16'),(9,'hash:jobworkreturn','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(10,'hash:listmasters','016dba5ef508396cf7b63a96bdcb03b8','2026-09-06 11:20:12'),(11,'hash:loginSettings','53592e6196705ea74c6543ef3f62d386','2026-09-06 11:01:15'),(12,'hash:mastersLeftover','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(13,'hash:menuSettings','5c4bbf78cec94fb3385d92b64e00a7e9','2026-09-06 11:01:15'),(14,'hash:parties','d751713988987e9331980363e24189ce','2026-09-06 11:01:15'),(15,'hash:po','d751713988987e9331980363e24189ce','2026-09-06 11:20:12'),(16,'hash:processinward','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(17,'hash:processoutward','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(18,'hash:purchasereturn','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(19,'hash:sale','d751713988987e9331980363e24189ce','2026-09-06 10:51:01'),(20,'hash:sample','d751713988987e9331980363e24189ce','2026-09-06 11:01:16'),(21,'hash:seq','4468ae8f94a13463159aa2ade4262798','2026-09-06 11:08:41'),(22,'hash:styles','d751713988987e9331980363e24189ce','2026-09-06 11:01:15'),(23,'hash:topLeftover','da6d41ff419a5d4562c5daae37e30276','2026-09-06 11:20:12'),(24,'hash:users','d816ed55d258e71ec2dfcaf6c74dcefd','2026-09-06 11:01:15'),(25,'initialized','1','2026-08-27 06:23:22'),(26,'menuSettingsExtra','{\"labels\":[],\"mainSections\":[],\"masterSections\":[],\"customMainGroups\":[],\"customMasterGroups\":[],\"hiddenMain\":[],\"hiddenMaster\":[],\"customMainItems\":[],\"customMasterItems\":[],\"mainGroupOrder\":[\"Home\",\"Operations\",\"Returns\",\"Catalog\",\"Analytics\",\"Settings\"],\"masterGroupOrder\":[\"Records\",\"Buying\",\"Product\",\"Commercial\",\"Production\",\"Location\",\"Governance\"]}','2026-08-28 07:18:16'),(27,'parentorphan:classifications:Fabric','Fabric','2026-08-28 07:18:16'),(94,'toplevel:_revision','1788693515071','2026-09-06 11:20:12'),(95,'toplevel:notifications','[]','2026-09-06 11:20:12'),(96,'toplevel:partners','[]','2026-09-06 11:20:12');
/*!40000 ALTER TABLE `kv_store` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `login_settings`
--

LOCK TABLES `login_settings` WRITE;
/*!40000 ALTER TABLE `login_settings` DISABLE KEYS */;
INSERT INTO `login_settings` VALUES (1,6,NULL,'2026-09-06 11:01:15');
/*!40000 ALTER TABLE `login_settings` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `login_slides`
--

LOCK TABLES `login_slides` WRITE;
/*!40000 ALTER TABLE `login_slides` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_slides` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `master_id_sequences`
--

LOCK TABLES `master_id_sequences` WRITE;
/*!40000 ALTER TABLE `master_id_sequences` DISABLE KEYS */;
INSERT INTO `master_id_sequences` VALUES ('addresses',1),('boms',0),('businessTypes',3),('categories',4),('classifications',11),('colours',6),('countries',1),('customers',1),('districts',10),('fabrics',6),('firms',1),('freightChargesList',4),('gstRates',7),('gstTypes',2),('items',10),('materialTypes',8),('partyStatuses',2),('paymentTermsList',7),('processTypes',3),('qcResults',0),('qualities',3),('raisedForList',6),('returnTypes',6),('states',11),('suppliers',0),('talukas',8),('transportModes',6),('uoms',10),('warehouses',5),('washTypes',8);
/*!40000 ALTER TABLE `master_id_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `master_values`
--

LOCK TABLES `master_values` WRITE;
/*!40000 ALTER TABLE `master_values` DISABLE KEYS */;
INSERT INTO `master_values` VALUES (11726,'customers','Myntra D2C','CUS-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11727,'colours','White','COL-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11728,'colours','Black','COL-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11729,'colours','Navy Blue','COL-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11730,'colours','Red','COL-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11731,'colours','Maroon','COL-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11732,'colours','Beige','COL-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11733,'fabrics','Cotton 240 GSM','FAB-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11734,'fabrics','Cotton 180 GSM','FAB-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11735,'fabrics','Polyester','FAB-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11736,'fabrics','Viscose','FAB-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11737,'fabrics','Silk','FAB-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11738,'fabrics','Linen','FAB-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11739,'sizes','S',NULL,NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11740,'sizes','M',NULL,NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11741,'sizes','L',NULL,NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11742,'sizes','XL',NULL,NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11743,'sizes','XXL',NULL,NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11744,'categories','Fabric','CAT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11745,'categories','Trims','CAT-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11746,'categories','Packaging','CAT-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11747,'categories','Other','CAT-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11748,'classifications','Fabric','CLS-0001','Fabric',1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11749,'classifications','Label - Main/Size','CLS-0002','Trims',1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11750,'classifications','Button','CLS-0003','Trims',1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11751,'classifications','Zipper','CLS-0004','Trims',1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11752,'classifications','Elastic','CLS-0005','Trims',1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11753,'classifications','Thread','CLS-0006','Trims',1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11754,'classifications','Hang Tag','CLS-0007','Packaging',1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11755,'classifications','Poly Bag','CLS-0008','Packaging',1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11756,'classifications','Carton','CLS-0009','Packaging',1,8,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11757,'classifications','Sticker','CLS-0010','Packaging',1,9,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11758,'classifications','Other','CLS-0011','Other',1,10,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11759,'materialTypes','Woven','MAT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11760,'materialTypes','Knit','MAT-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11761,'materialTypes','Plastic','MAT-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11762,'materialTypes','Metal','MAT-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11763,'materialTypes','Paper','MAT-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11764,'materialTypes','Cotton','MAT-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11765,'materialTypes','Synthetic','MAT-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11766,'materialTypes','Other','MAT-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11767,'qualities','Standard','QUA-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11768,'qualities','Premium','QUA-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11769,'qualities','Economy','QUA-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11770,'firms','KEN Global Designs Pvt. Ltd.','FIR-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11771,'addresses','Ken Global Designs Private Limited ΓÇô Head Office','ADD-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11772,'raisedForList','Production','RFL-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11773,'raisedForList','Merchandising','RFL-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11774,'raisedForList','Sampling','RFL-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11775,'raisedForList','Store / Warehouse','RFL-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11776,'raisedForList','Accounts','RFL-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11777,'raisedForList','Management','RFL-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11778,'countries','India','CNT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11779,'states','Maharashtra','STA-0001','India',1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11780,'states','Gujarat','STA-0002','India',1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11781,'states','Karnataka','STA-0003','India',1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11782,'states','Tamil Nadu','STA-0004','India',1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11783,'states','Delhi','STA-0005','India',1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11784,'states','Haryana','STA-0006','India',1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11785,'states','Punjab','STA-0007','India',1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11786,'states','Rajasthan','STA-0008','India',1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11787,'states','Uttar Pradesh','STA-0009','India',1,8,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11788,'states','West Bengal','STA-0010','India',1,9,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11789,'states','Telangana','STA-0011','India',1,10,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11790,'districts','Pune','DIS-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11791,'districts','Mumbai Suburban','DIS-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11792,'districts','Thane','DIS-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11793,'districts','Nashik','DIS-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11794,'districts','Ahmedabad','DIS-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11795,'districts','Surat','DIS-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11796,'districts','Bengaluru Urban','DIS-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11797,'districts','Ludhiana','DIS-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11798,'districts','Tiruppur','DIS-0009',NULL,1,8,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11799,'districts','Gurugram','DIS-0010',NULL,1,9,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11800,'talukas','Haveli','TAL-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11801,'talukas','Mulshi','TAL-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11802,'talukas','Maval','TAL-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11803,'talukas','Andheri','TAL-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11804,'talukas','Borivali','TAL-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11805,'talukas','Kalyan','TAL-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11806,'talukas','Choryasi','TAL-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11807,'talukas','Palladam','TAL-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11808,'partyStatuses','Active','STS-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11809,'partyStatuses','Inactive','STS-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11810,'businessTypes','Buyer','BTY-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11811,'businessTypes','Supplier','BTY-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11812,'businessTypes','Vendor','BTY-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11813,'gstTypes','CGST & SGST','GTY-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11814,'gstTypes','IGST','GTY-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11815,'paymentTermsList','Advance','PAY-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11816,'paymentTermsList','7 days credit','PAY-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11817,'paymentTermsList','15 days credit','PAY-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11818,'paymentTermsList','30 days credit','PAY-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11819,'paymentTermsList','45 days credit','PAY-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11820,'paymentTermsList','60 days credit','PAY-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11821,'paymentTermsList','Against Delivery','PAY-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11822,'freightChargesList','Included','FRT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11823,'freightChargesList','Extra','FRT-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11824,'freightChargesList','To Pay','FRT-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11825,'freightChargesList','Not Applicable','FRT-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11826,'transportModes','Road','TRN-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11827,'transportModes','Rail','TRN-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11828,'transportModes','Air','TRN-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11829,'transportModes','Sea','TRN-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11830,'transportModes','Courier','TRN-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11831,'transportModes','Self Pickup','TRN-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11832,'warehouses','Main Store','WH-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11833,'warehouses','Fabric Store','WH-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11834,'warehouses','Trims Store','WH-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11835,'warehouses','Finished Goods Store','WH-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11836,'warehouses','Rejection Store','WH-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11837,'gstRates','0','GST-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11838,'gstRates','0.25','GST-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11839,'gstRates','3','GST-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11840,'gstRates','5','GST-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11841,'gstRates','12','GST-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11842,'gstRates','18','GST-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11843,'gstRates','28','GST-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11844,'uoms','m','UOM-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11845,'uoms','kg','UOM-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11846,'uoms','pcs','UOM-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11847,'uoms','sets','UOM-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11848,'uoms','dozen','UOM-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11849,'uoms','rolls','UOM-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11850,'uoms','box','UOM-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11851,'uoms','gross','UOM-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11852,'uoms','yard','UOM-0009',NULL,1,8,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11853,'uoms','litre','UOM-0010',NULL,1,9,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11854,'returnTypes','Leftover Material','RTN-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11855,'returnTypes','Rejected / Damaged','RTN-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11856,'returnTypes','Excess Issued','RTN-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11857,'returnTypes','Wrong Material','RTN-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11858,'returnTypes','Cutting Waste','RTN-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11859,'returnTypes','Other','RTN-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11860,'washTypes','Normal Wash','WAS-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11861,'washTypes','Enzyme','WAS-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11862,'washTypes','Enzyme Softener','WAS-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11863,'washTypes','Stone Wash','WAS-0004',NULL,1,3,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11864,'washTypes','Acid Wash','WAS-0005',NULL,1,4,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11865,'washTypes','Silicon Softener','WAS-0006',NULL,1,5,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11866,'washTypes','Garment Dye','WAS-0007',NULL,1,6,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11867,'washTypes','No Wash','WAS-0008',NULL,1,7,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11868,'processTypes','Embroidery','PRT-0001',NULL,1,0,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11869,'processTypes','Washing','PRT-0002',NULL,1,1,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12'),(11870,'processTypes','Printing','PRT-0003',NULL,1,2,'StitchFlow User','StitchFlow User','2026-09-06 11:20:12','2026-09-06 11:20:12');
/*!40000 ALTER TABLE `master_values` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `menu_settings`
--

LOCK TABLES `menu_settings` WRITE;
/*!40000 ALTER TABLE `menu_settings` DISABLE KEYS */;
INSERT INTO `menu_settings` VALUES (489,'main','dashboard',0),(490,'main','po',1),(491,'main','inward',2),(492,'main','jobwork',3),(493,'main','processoutward',4),(494,'main','processinward',5),(495,'main','sample',6),(496,'main','sale',7),(497,'main','costing',8),(498,'main','purchasereturn',9),(499,'main','masters',10),(500,'main','partneronboarding',11),(501,'main','gstapi',12),(502,'main','reports',13),(503,'main','reporting',14),(504,'main','usermanagement',15),(505,'master','styles',0),(506,'master','items',1),(507,'master','partyrecords',2),(508,'master','companydetails',3),(509,'master','loginpage',4),(510,'master','menumaster',5),(511,'master','raisedForList',6),(512,'master','warehouses',7),(513,'master','returnTypes',8),(514,'master','categories',9),(515,'master','classifications',10),(516,'master','qualities',11),(517,'master','sizes',12),(518,'master','qcResults',13),(519,'master','uoms',14),(520,'master','washTypes',15),(521,'master','gstRates',16),(522,'master','gstTypes',17),(523,'master','paymentTermsList',18),(524,'master','freightChargesList',19),(525,'master','transportModes',20),(526,'master','businessTypes',21),(527,'master','partyStatuses',22),(528,'master','processTypes',23),(529,'master','countries',24),(530,'master','states',25),(531,'master','usermanagement',26),(532,'master','audit',27);
/*!40000 ALTER TABLE `menu_settings` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `parties`
--

LOCK TABLES `parties` WRITE;
/*!40000 ALTER TABLE `parties` DISABLE KEYS */;
/*!40000 ALTER TABLE `parties` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `party_bill_tos`
--

LOCK TABLES `party_bill_tos` WRITE;
/*!40000 ALTER TABLE `party_bill_tos` DISABLE KEYS */;
/*!40000 ALTER TABLE `party_bill_tos` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `party_business_types`
--

LOCK TABLES `party_business_types` WRITE;
/*!40000 ALTER TABLE `party_business_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `party_business_types` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `process_inward_item_sizes`
--

LOCK TABLES `process_inward_item_sizes` WRITE;
/*!40000 ALTER TABLE `process_inward_item_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_inward_item_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `process_inward_items`
--

LOCK TABLES `process_inward_items` WRITE;
/*!40000 ALTER TABLE `process_inward_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_inward_items` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `process_inwards`
--

LOCK TABLES `process_inwards` WRITE;
/*!40000 ALTER TABLE `process_inwards` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_inwards` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `process_outward_item_sizes`
--

LOCK TABLES `process_outward_item_sizes` WRITE;
/*!40000 ALTER TABLE `process_outward_item_sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_outward_item_sizes` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `process_outward_items`
--

LOCK TABLES `process_outward_items` WRITE;
/*!40000 ALTER TABLE `process_outward_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_outward_items` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `process_outwards`
--

LOCK TABLES `process_outwards` WRITE;
/*!40000 ALTER TABLE `process_outwards` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_outwards` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `purchase_order_bom`
--

LOCK TABLES `purchase_order_bom` WRITE;
/*!40000 ALTER TABLE `purchase_order_bom` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_bom` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `purchase_order_styles`
--

LOCK TABLES `purchase_order_styles` WRITE;
/*!40000 ALTER TABLE `purchase_order_styles` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_styles` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `purchase_return_items`
--

LOCK TABLES `purchase_return_items` WRITE;
/*!40000 ALTER TABLE `purchase_return_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_return_items` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `purchase_returns`
--

LOCK TABLES `purchase_returns` WRITE;
/*!40000 ALTER TABLE `purchase_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_returns` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `sequences`
--

LOCK TABLES `sequences` WRITE;
/*!40000 ALTER TABLE `sequences` DISABLE KEYS */;
INSERT INTO `sequences` VALUES (1,'costing',0,'2026-08-27 06:23:22'),(2,'dc',0,'2026-09-06 11:01:15'),(3,'inward',0,'2026-09-06 11:01:15'),(4,'item',10,'2026-09-06 11:01:15'),(5,'jobwork',0,'2026-09-06 11:01:15'),(6,'jobworkreturn',0,'2026-08-27 06:23:22'),(7,'openingstock',0,'2026-08-27 06:23:22'),(8,'party',0,'2026-08-28 06:48:46'),(9,'po',0,'2026-09-06 11:01:15'),(10,'processinward',0,'2026-08-27 06:23:22'),(11,'processoutward',0,'2026-08-27 06:23:22'),(12,'purchasereturn',0,'2026-08-27 06:23:22'),(13,'sale',0,'2026-08-28 06:48:46'),(14,'sample',0,'2026-09-06 11:01:15'),(15,'sampledc',1,'2026-08-30 11:29:01'),(16,'style',0,'2026-09-06 11:01:15'),(17,'user',3,'2026-08-27 06:23:22');
/*!40000 ALTER TABLE `sequences` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `status_history`
--

LOCK TABLES `status_history` WRITE;
/*!40000 ALTER TABLE `status_history` DISABLE KEYS */;
INSERT INTO `status_history` VALUES (1,'po','mtb5274adycu8','PO-0001',NULL,'Draft','System Administrator','2026-08-27 06:25:28'),(2,'inward','mtb55kagklm80','IN-0001',NULL,'Completed','System Administrator','2026-08-27 06:28:05'),(3,'jobwork','mtb56jmsfjwc5','JW-0001',NULL,'Issued','System Administrator','2026-08-27 06:28:51'),(4,'po','mtb5274adycu8','PO-0001',NULL,'Draft','StitchFlow User','2026-08-27 08:26:22'),(5,'inward','mtb55kagklm80','IN-0001',NULL,'Completed','StitchFlow User','2026-08-27 08:26:22'),(6,'jobwork','mtb56jmsfjwc5','JW-0001',NULL,'Issued','StitchFlow User','2026-08-27 08:26:22'),(7,'po','mtb5274adycu8','PO-0001','Draft','Submitted','System Administrator','2026-08-27 08:55:11'),(8,'po','mtb5274adycu8','PO-0001','Submitted','Approved','System Administrator','2026-08-27 08:55:11'),(9,'po','mtb5274adycu8','PO-0001','Approved','Partially Received','System Administrator','2026-08-27 08:55:30'),(10,'inward','mtbaf4rjqrsk0','IN-0002',NULL,'Completed','System Administrator','2026-08-27 08:55:30'),(11,'po','mtb5274adycu8','PO-0001','Partially Received','Closed','System Administrator','2026-08-27 08:57:20'),(12,'po','mtb5274adycu8','PO-0001','Closed','Partially Received','System Administrator','2026-08-27 08:57:23'),(13,'po','mtbal6emqjnuk','PO-0001',NULL,'Draft','System Administrator','2026-08-27 09:00:11'),(14,'po','mtbal6en8owye','PO-0002',NULL,'Submitted','System Administrator','2026-08-27 09:00:11'),(15,'inward','mtbal6enthr05','IN-0001',NULL,'Completed','System Administrator','2026-08-27 09:00:12'),(16,'inward','mtbal6enl6xy6','IN-0002',NULL,'Completed','System Administrator','2026-08-27 09:00:12'),(17,'jobwork','mtbal6en0gktc','JW-0001',NULL,'Completed','System Administrator','2026-08-27 09:00:12'),(18,'jobwork','mtbal6enp9cgj','JW-0002',NULL,'In Progress','System Administrator','2026-08-27 09:00:12'),(19,'sale','mtbal6en81dmm','SL-0001',NULL,'Completed','System Administrator','2026-08-27 09:00:12'),(20,'sale','mtbal6entslym','SL-0002',NULL,'Open','System Administrator','2026-08-27 09:00:12'),(21,'po','mtcfgxwvs3arz','PO-0001',NULL,'Draft','System Administrator','2026-08-28 04:04:39'),(22,'po','mtcfgxx22uk60','PO-0002',NULL,'Submitted','System Administrator','2026-08-28 04:04:39'),(23,'inward','mtcfgxx2jw01j','IN-0001',NULL,'Completed','System Administrator','2026-08-28 04:04:39'),(24,'inward','mtcfgxx2yzcmq','IN-0002',NULL,'Completed','System Administrator','2026-08-28 04:04:39'),(25,'jobwork','mtcfgxx2synvn','JW-0001',NULL,'Completed','System Administrator','2026-08-28 04:04:39'),(26,'jobwork','mtcfgxx3c6nbk','JW-0002',NULL,'In Progress','System Administrator','2026-08-28 04:04:39'),(27,'sale','mtcfgxx3cviov','SL-0001',NULL,'Completed','System Administrator','2026-08-28 04:04:39'),(28,'sale','mtcfgxx3y7ppm','SL-0002',NULL,'Open','System Administrator','2026-08-28 04:04:39'),(29,'jobwork','mtcfgxx2synvn','JW-0001','Completed','Issued','System Administrator','2026-08-28 06:48:31'),(30,'inward','mtcmdypiel1y5','IN-0001',NULL,'Completed','System Administrator','2026-08-28 07:18:16'),(31,'inward','mtcnzwxsip7ca','IN-0002',NULL,'Completed','System Administrator','2026-08-28 08:03:20'),(32,'inward','mtco165495yol','IN-0003',NULL,'Completed','System Administrator','2026-08-28 08:04:19'),(33,'inward','mtco21ogly690','IN-0004',NULL,'Completed','System Administrator','2026-08-28 08:05:00'),(34,'po','mtfp3gyfmxfl8','PO-0001',NULL,'Draft','System Administrator','2026-08-30 10:57:24'),(35,'po','mtfp3gyfmxfl8','PO-0001','Draft','Submitted','System Administrator','2026-08-30 11:05:56'),(36,'po','mtfp3gyfmxfl8','PO-0001','Submitted','Approved','System Administrator','2026-08-30 11:09:16'),(37,'po','mtfp3gyfmxfl8','PO-0001','Approved','Partially Received','System Administrator','2026-08-30 11:15:30'),(38,'inward','mtfpqqrotu9go','IN-0005',NULL,'Completed','System Administrator','2026-08-30 11:15:30'),(39,'po','mtfp3gyfmxfl8','PO-0001','Partially Received','Received','System Administrator','2026-08-30 11:25:45'),(40,'inward','mtfq3wy7tydb1','IN-0006',NULL,'Completed','System Administrator','2026-08-30 11:25:45'),(41,'jobwork','mtfq69zzxlofp','JW-0001',NULL,'Issued','System Administrator','2026-08-30 11:27:35'),(42,'jobwork','mtfq6m509fivf','JW-0002',NULL,'Issued','System Administrator','2026-08-30 11:27:50'),(43,'jobwork','mtfq779wfaxnq','JW-0003',NULL,'Issued','System Administrator','2026-08-30 11:28:18'),(44,'sample','mtfq84f0xag30','SMP-0001',NULL,'Issued','System Administrator','2026-08-30 11:29:01'),(45,'jobwork','mtfq69zzxlofp','JW-0001','Issued','Completed','System Administrator','2026-08-30 11:34:39'),(46,'po','mtl4mcdv0ih6g','PO-0002',NULL,'Draft','System Administrator','2026-09-03 06:10:51'),(47,'po','mtl4mcdv0ih6g','PO-0002','Draft','Submitted','System Administrator','2026-09-03 06:15:04'),(48,'po','mtl4mcdv0ih6g','PO-0002','Submitted','Approved','System Administrator','2026-09-03 06:15:21'),(49,'po','mtl4mcdv0ih6g','PO-0002','Approved','Partially Received','System Administrator','2026-09-03 06:17:37'),(50,'inward','mtl4v1rt36t60','IN-0007',NULL,'Completed','System Administrator','2026-09-03 06:17:37'),(51,'jobwork','mtl50gi9u5xdf','JW-0004',NULL,'Issued','System Administrator','2026-09-03 06:21:50'),(52,'jobwork','mtl50gi9u5xdf','JW-0004','Issued','Partially Received','System Administrator','2026-09-03 06:46:23'),(54,'po','test_6a9d4594eeabf','PO-TEST-1788691860',NULL,'Draft','TestRunner','2026-09-06 10:51:01'),(55,'po','test_6a9d45a0cd8e2','PO-TEST-1788691872',NULL,'Draft','TestRunner','2026-09-06 10:51:12'),(56,'po','test_6a9d45ab14241','PO-TEST-1788691883',NULL,'Draft','TestRunner','2026-09-06 10:51:23'),(57,'po','test_6a9d45bbd8cf2','PO-E2E-1788691899',NULL,'Draft','StitchFlow User','2026-09-06 10:51:39'),(58,'po','test_6a9d471f30116','PO-TEST-1788692255',NULL,'Draft','TestRunner','2026-09-06 10:57:35'),(59,'po','test_6a9d47d1e1cfe','PO-E2E-1788692433',NULL,'Draft','StitchFlow User','2026-09-06 11:00:34'),(60,'po','test_6a9d49b9d95e6','PO-E2E-1788692921',NULL,'Draft','StitchFlow User','2026-09-06 11:08:41'),(61,'po','test_6a9d4c4403efd','PO-E2E-1788693572',NULL,'Draft','StitchFlow User','2026-09-06 11:19:32');
/*!40000 ALTER TABLE `status_history` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `styles`
--

LOCK TABLES `styles` WRITE;
/*!40000 ALTER TABLE `styles` DISABLE KEYS */;
/*!40000 ALTER TABLE `styles` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `user_modules`
--

LOCK TABLES `user_modules` WRITE;
/*!40000 ALTER TABLE `user_modules` DISABLE KEYS */;
INSERT INTO `user_modules` VALUES (109,'USR-0001','*',0),(110,'USR-0002','dashboard',0),(111,'USR-0002','po',1),(112,'USR-0002','inward',2),(113,'USR-0002','jobwork',3),(114,'USR-0002','processoutward',4),(115,'USR-0002','processinward',5),(116,'USR-0002','sample',6),(117,'USR-0002','sale',7),(118,'USR-0002','costing',8),(119,'USR-0002','styles',9),(120,'USR-0002','itemmaster',10),(121,'USR-0002','parties',11),(122,'USR-0002','purchasereturn',12),(123,'USR-0002','reports',13),(124,'USR-0002','reporting',14),(125,'USR-0002','masters',15),(126,'USR-0002','audit',16),(127,'USR-0002','partneronboarding',17),(128,'USR-0002','gstapi',18),(129,'USR-0003','dashboard',0),(130,'USR-0003','po',1),(131,'USR-0003','inward',2),(132,'USR-0003','reports',3);
/*!40000 ALTER TABLE `user_modules` ENABLE KEYS */;
UNLOCK TABLES;

--

-- Dumping data for table `user_permissions`
--

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

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
SET FOREIGN_KEY_CHECKS=1;