<?php
$partnerJs = file_get_contents(__DIR__ . '/partner_block.js');
$coreJs = file_get_contents(__DIR__ . '/../assets/js/app-core.js');

if (strpos($coreJs, 'function obNewPartner') !== false) {
    echo "obNewPartner already exists in app-core.js\n";
    exit(0);
}

// Ensure all partner functions are also explicitly bound to window
$windowBindings = "\n\n/* Expose Partner Onboarding & GST functions to window */\n" .
"(function() {\n" .
"  const fns = {\n" .
"    obNewPartner, obEditPartner, obDeletePartner, obBackList, obUpdateSummary,\n" .
"    obVerifyGstin, obToggleBrand, obAddReg, obAddBrand, obAddContact,\n" .
"    obTogglePartnerStatus, obSubmitPartner, gstSettingsTest, gstSettingsSave,\n" .
"    gstFlipTog, gstSetEnv, gstLookupTyped, gstFetchPreview, renderPartnerOnboarding,\n" .
"    renderGstApi, obGstinTyped, gstProviderChanged\n" .
"  };\n" .
"  for (let k in fns) {\n" .
"    if (typeof fns[k] === 'function') window[k] = fns[k];\n" .
"  }\n" .
"})();\n";

$newCoreJs = rtrim($coreJs) . "\n\n" . $partnerJs . $windowBindings;

file_put_contents(__DIR__ . '/../assets/js/app-core.js', $newCoreJs);
echo "Successfully integrated partner_block.js into app-core.js. New size: " . strlen($newCoreJs) . " bytes\n";
