const fs = require('fs');

let content = fs.readFileSync('assets/js/app-core.js', 'utf8');

// 1. Remove the "Load demo data" button
content = content.replace(/'<button class="btn btn-primary" onclick="loadDemo\(\)">' \+ ic\('sparkle', 16\) \+ 'Load demo data<\/button>' \+/, '');

// 2. Disable loadDemo function
content = content.replace(/function loadDemo\(\) \{[\s\S]*?db\.masters\.suppliers =/m, function(match) {
    return 'function loadDemo() {\n  return;\n  db.masters.suppliers =';
});

// 3. Clear demo arrays in defaultDB
content = content.replace(/customers: \['Myntra D2C'\], colours: \['White', 'Black', 'Navy Blue', 'Red', 'Maroon', 'Beige'\]/, 'customers: [], colours: []');
content = content.replace(/fabrics: \['Cotton 240 GSM', 'Cotton 180 GSM', 'Polyester', 'Viscose', 'Silk', 'Linen'\]/, 'fabrics: []');
content = content.replace(/sizes: \['S', 'M', 'L', 'XL', 'XXL'\]/, 'sizes: []');
content = content.replace(/firms: \['KEN Global Designs Pvt\. Ltd\.'\]/, 'firms: []');
content = content.replace(/addresses: \['Ken Global Designs Private Limited - Head Office'\]/, 'addresses: []');

// 4. Clear default items array
content = content.replace(/items: \[[\s\S]*?\]/, 'items: []');

fs.writeFileSync('assets/js/app-core.js', content, 'utf8');
console.log('Dummy data removed successfully.');
