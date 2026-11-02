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

files.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    content = content.replace(/@\/components\/module\//g, '@/components/modules/');
    content = content.replace(/@\/components\/auth\//g, '@/components/modules/auth/');
    content = content.replace(/@\/components\/common\//g, '@/components/shared/');

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
});
