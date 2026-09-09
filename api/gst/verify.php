<?php
/* =====================================================================
   StitchFlow ERP — GST server-side proxy  (api/gst/verify.php)
   ---------------------------------------------------------------------
   This is the "ERP proxy endpoint" used by the GST API connection module
   and Partner onboarding Verify. Point the "ERP proxy endpoint" field at:
       https://<your-host>/<app-folder>/api/gst/verify.php

   Protocol (exactly what the StitchFlow front-end sends/expects):
     Request : POST application/json  {"gstin":"27ABCDE1234F1Z5"}
               (GET ?gstin=… also supported for quick testing)
     Response: HTTP 200 + the GST provider's raw JSON. The front-end
               normalizes it via normalizeGstProviderResponse(), which
               understands lgnm/legalName, tradeNam/tradeName, pradr.addr,
               sts/status, stcd/stateCode … so any common provider works.

   Configuration is read from the gst_api_settings table — the same
   settings you save on the GST API connection screen (Base URL, GSTIN
   lookup path, query param, auth type, API key, timeout, Demo mode).
   The API key never leaves the server.
   ===================================================================== */
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

/* ---- CORS (harmless same-origin; allows testing from other origins) */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

/* ---- GSTIN validation: format + mod-36 checksum (gstinValid() port) */
function gst_gstin_valid(string $gstin): bool {
    $gstin = strtoupper(trim($gstin));
    if (!preg_match('/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/', $gstin)) return false;
    $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $factor = 2; $sum = 0;
    for ($i = 13; $i >= 0; $i--) {
        $code = strpos($chars, $gstin[$i]);
        $product = $code * $factor;
        $sum += intdiv($product, 36) + $product % 36;
        $factor = $factor === 2 ? 1 : 2;
    }
    return $chars[(36 - ($sum % 36)) % 36] === $gstin[14];
}

/* ---- state code → name (for the demo response) */
const GST_STATES = [
    '01'=>'Jammu and Kashmir','02'=>'Himachal Pradesh','03'=>'Punjab','04'=>'Chandigarh','05'=>'Uttarakhand',
    '06'=>'Haryana','07'=>'Delhi','08'=>'Rajasthan','09'=>'Uttar Pradesh','10'=>'Bihar','11'=>'Sikkim',
    '12'=>'Arunachal Pradesh','13'=>'Nagaland','14'=>'Manipur','15'=>'Mizoram','16'=>'Tripura','17'=>'Meghalaya',
    '18'=>'Assam','19'=>'West Bengal','20'=>'Jharkhand','21'=>'Odisha','22'=>'Chhattisgarh','23'=>'Madhya Pradesh',
    '24'=>'Gujarat','26'=>'Dadra and Nagar Haveli and Daman and Diu','27'=>'Maharashtra','29'=>'Karnataka',
    '30'=>'Goa','31'=>'Lakshadweep','32'=>'Kerala','33'=>'Tamil Nadu','34'=>'Puducherry','35'=>'Andaman and Nicobar Islands',
    '36'=>'Telangana','37'=>'Andhra Pradesh','38'=>'Ladakh','97'=>'Other Territory',
];

/* ---- demoGstProfile() port — same sample data as the front-end ------ */
function gst_demo_profile(string $gstin): array {
    $code = substr($gstin, 0, 2);
    $map = [
        '27' => ['Maharashtra','Nagpur','Nagpur','440001'],
        '29' => ['Karnataka','Bengaluru','Bengaluru Urban','560001'],
        '24' => ['Gujarat','Ahmedabad','Ahmedabad','380001'],
        '07' => ['Delhi','New Delhi','New Delhi','110001'],
        '09' => ['Uttar Pradesh','Noida','Gautam Buddha Nagar','201301'],
    ];
    $x = $map[$code] ?? [GST_STATES[$code] ?? 'State not mapped', 'City not mapped', 'District not mapped', '000000'];
    return [
        'mode' => 'demo',
        'gstin' => $gstin,
        'pan' => substr($gstin, 2, 10),
        'legalName' => 'Demo GST Taxpayer ' . substr($gstin, 2, 5),
        'tradeName' => 'Demo Trade Name',
        'status' => 'ACTIVE',
        'stateCode' => $code,
        'state' => $x[0], 'city' => $x[1], 'district' => $x[2], 'pincode' => $x[3],
        'principalAddress' => 'Demo principal place of business, ' . $x[1] . ', ' . $x[0] . ' - ' . $x[3],
    ];
}

/* ---- read the GST API settings saved from the UI (MySQL) ----------- */
function gst_settings(): array {
    try {
        $g = sf_pdo()->query('SELECT * FROM gst_api_settings WHERE id = 1')->fetch();
    } catch (Throwable $e) { $g = false; }
    if (!$g) return ['baseUrl' => '', 'lookupPath' => '/v1/gstin/{gstin}', 'queryParam' => 'gstin',
                     'authType' => 'apiKey', 'apiKey' => '', 'timeout' => 30, 'demo' => true];
    return [
        'baseUrl'    => (string)($g['base_url'] ?? ''),
        'lookupPath' => (string)($g['lookup_path'] ?? '') ?: '/v1/gstin/{gstin}',
        'queryParam' => (string)($g['query_param'] ?? '') ?: 'gstin',
        'authType'   => (string)($g['auth_type'] ?? '') ?: 'apiKey',
        'apiKey'     => (string)($g['api_key'] ?? ''),
        'timeout'    => max(1, min(180, (int)($g['timeout_secs'] ?? 30) ?: 30)),
        'demo'       => (bool)(int)($g['tog_demo'] ?? 1),
    ];
}

/* ---- gstBuildLookupUrl() port -------------------------------------- */
function gst_build_url(array $cfg, string $gstin): string {
    $path = $cfg['lookupPath'];
    $url = rtrim($cfg['baseUrl'], '/');
    if (strpos($path, '{gstin}') !== false) {
        $url .= ($path[0] === '/' ? '' : '/') . str_replace('{gstin}', rawurlencode($gstin), $path);
    } else {
        if ($path !== '') $url .= ($path[0] === '/' ? '' : '/') . ltrim($path, '/');
        $url .= (strpos($url, '?') !== false ? '&' : '?') . rawurlencode($cfg['queryParam']) . '=' . rawurlencode($gstin);
    }
    return $url;
}

/* ---- gstAuthHeaders() port ------------------------------------------ */
function gst_auth_headers(array $cfg): array {
    $h = ['Accept: application/json'];
    $key = trim($cfg['apiKey']);
    if ($key === '' || $cfg['authType'] === 'none') return $h;
    if ($cfg['authType'] === 'bearer') { $h[] = 'Authorization: Bearer ' . $key; return $h; }
    $h[] = 'X-API-Key: ' . $key;
    $h[] = 'apiKey: ' . $key;
    $h[] = 'apikey: ' . $key;
    return $h;
}

/* =====================  handle the request  ========================= */
$gstin = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $body = json_decode((string)file_get_contents('php://input'), true);
    if (is_array($body)) $gstin = (string)($body['gstin'] ?? '');
}
if ($gstin === '') $gstin = (string)($_GET['gstin'] ?? '');
$gstin = strtoupper(trim($gstin));

if ($gstin === '') sf_fail('gstin is required — POST {"gstin":"27ABCDE1234F1Z5"}', 400);
if (!gst_gstin_valid($gstin)) sf_fail('Invalid GSTIN format or checksum — ' . $gstin, 422);

$cfg = gst_settings();

/* No provider configured → demo profile (mirrors the app's demo mode) */
if (trim($cfg['baseUrl']) === '') {
    if ($cfg['demo']) sf_json_out(gst_demo_profile($gstin));
    sf_fail('No GST provider configured on the server — set Base URL + API key on the GST API connection screen and click Save settings (they are stored in MySQL and used by this proxy).', 422);
}

/* Call the third-party GST provider from the server (no CORS, key hidden) */
$url = gst_build_url($cfg, $gstin);
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 3,
    CURLOPT_CONNECTTIMEOUT => min(15, $cfg['timeout']),
    CURLOPT_TIMEOUT        => $cfg['timeout'],
    CURLOPT_HTTPHEADER     => gst_auth_headers($cfg),
    CURLOPT_USERAGENT      => 'StitchFlow-ERP GST Proxy/1.0',
]);
$respBody = curl_exec($ch);
$status   = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($respBody === false || $curlErr !== '') {
    /* provider unreachable — fall back to demo when Demo mode is ON */
    if ($cfg['demo']) sf_json_out(gst_demo_profile($gstin) + ['note' => 'Provider unreachable (' . $curlErr . ') — demo fallback']);
    sf_fail('GST provider unreachable: ' . $curlErr, 502);
}

$json = json_decode((string)$respBody, true);
if ($status >= 200 && $status < 300 && is_array($json)) {
    /* pass the provider's raw JSON straight through — the front-end
       normalizes it (legal name, trade name, PAN, state, address …) */
    sf_json_out($json);
}
if ($status >= 200 && $status < 300) {
    sf_fail('GST provider returned a non-JSON response', 502);
}
$snippet = mb_substr(trim(strip_tags((string)$respBody)), 0, 200);
sf_fail('GST provider error HTTP ' . $status . ($snippet !== '' ? ' — ' . $snippet : ''), 502);
