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

    // Fix resolvedTheme issues
    // Just blindly casting it is easiest: (resolvedTheme || "system")
    // Wait, let's just do a string replace for the specific usages that failed.
    
    // In globe-3d.tsx
    if (file.includes('globe-3d.tsx')) {
      content = content.replace(/resolvedTheme,/g, '(resolvedTheme || "system"),');
      content = content.replace(/resolvedTheme as/g, '(resolvedTheme || "system") as');
    }
    
    // In features-section.tsx and footer-section.tsx
    if (file.includes('features-section.tsx') || file.includes('footer-section.tsx')) {
      content = content.replace(/resolvedTheme\)/g, '(resolvedTheme || "system"))');
    }

    // In navbar.tsx
    if (file.includes('navbar.tsx')) {
      content = content.replace(/resolvedTheme\)/g, '(resolvedTheme || "system"))');
    }

    // In settings-about.tsx
    if (file.includes('settings-about.tsx')) {
      content = content.replace(/resolvedTheme\)/g, '(resolvedTheme || "system"))');
    }

    // In word.tsx
    if (file.includes('word.tsx')) {
      content = content.replace(/resolvedTheme\)/g, '(resolvedTheme || "system"))');
    }

    // In module-shell.tsx
    if (file.includes('module-shell.tsx')) {
      content = content.replace(/DictionaryProvider as Provider/g, 'Provider');
    }

    // In theme-toggle.tsx
    if (file.includes('theme-toggle.tsx')) {
      content = content.replace(/\{ simple \}: \{ simple\?: boolean \}/g, '{ simple: _simple }: { simple?: boolean }');
    }

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
});
