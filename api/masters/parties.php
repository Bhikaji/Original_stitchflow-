<?php
/* StitchFlow ERP — Party onboarding Master (legal name, short name, business types, GSTIN, PAN, address, Bill-To trades, status)
   Auto-generated per-master endpoint over the normalized MySQL schema.
   GET (list/single/search/filter/sort/paginate · ?usage=<value> in-use detection) · POST/PUT (add/edit) · DELETE
   Every write passes the full server-side business-rule validator. */
declare(strict_types=1);
require_once __DIR__ . '/../lib/endpoint.php';

sf_record_master_endpoint('parties');
