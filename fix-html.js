import fs from 'fs';
let content = fs.readFileSync('index.html', 'utf8');
// Remove import map
content = content.replace(/<script type="importmap">[\s\S]*?<\/script>/g, '');
fs.writeFileSync('index.html', content);
console.log('Import map removed from index.html');
