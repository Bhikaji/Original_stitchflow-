const fs = require('fs');

function search(file) {
  if (!fs.existsSync(file)) return;
  const s = fs.readFileSync(file, 'utf8');
  const lines = s.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('CGST & SGST')) {
      console.log(file, i + 1, l.trim());
    }
  });
}

search('assets/js/app-core.js');
search('app/app1.html');
search('app/app.html');
search('schema.sql');
search('kenerp_kend2c.sql');
