const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk(directory);
files.push(path.join(__dirname, 'tsconfig.json'));
files.push(path.join(__dirname, 'vite.config.ts'));
files.push(path.join(__dirname, 'eslint.config.mjs'));

files.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.mjs')) {
    let content = fs.readFileSync(file, 'utf8');
    
    const original = content;

    // Replace aliases
    content = content.replace(/@dictionary\//g, '@/');
    content = content.replace(/@translate\//g, '@/');

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
});
