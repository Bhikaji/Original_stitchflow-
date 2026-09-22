const fs = require('fs');
const current = fs.readFileSync('assets/js/app-core.js', 'utf8');
const yesterday = fs.readFileSync('scratch/app-core-yesterday.js', 'utf8');

// Find the start of the block in both files
const searchStr = '/* ===== Partner onboarding + GST API connection ===== */';
const currIdx = current.indexOf(searchStr);
const yestIdx = yesterday.indexOf(searchStr);

if (currIdx > -1 && yestIdx > -1) {
    const top = current.substring(0, currIdx);
    const bottom = yesterday.substring(yestIdx);
    fs.writeFileSync('assets/js/app-core.js', top + bottom, 'utf8');
    console.log('Replaced correctly!');
} else {
    console.error('Could not find marker in one of the files.', currIdx, yestIdx);
}
