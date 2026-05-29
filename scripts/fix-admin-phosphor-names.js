import fs from 'fs';
import path from 'path';

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, files);
    else if (f.endsWith('.jsx')) files.push(f);
  }
  return files;
}

const files = [
  ...walk('src/components/admin'),
  'src/components/common/AdminMessageModal.jsx',
].filter((f) => fs.existsSync(f));

const WORD = [
  ['UserXIcon', 'UserMinusIcon'],
  ['UserX', 'UserMinus'],
  ['Ban', 'Prohibit'],
  ['Mail', 'Envelope'],
];

for (const file of files) {
  let s = fs.readFileSync(file, 'utf8');
  const orig = s;
  for (const [from, to] of WORD) {
    s = s.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  }
  if (s !== orig) {
    fs.writeFileSync(file, s);
    console.log('fixed', file);
  }
}
