const fs = require('fs');
const path = require('path');

const srcDir = path.join('c:\\Users\\Taha\\Documents\\antigravity\\bold-mendeleev\\client\\src');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    let stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, callback);
    } else if (stat.isFile() && (filepath.endsWith('.jsx') || filepath.endsWith('.js'))) {
      callback(filepath);
    }
  });
}

const replacements = [
  { regex: /rounded-2xl/g, replace: 'rounded-md' },
  { regex: /rounded-xl/g, replace: 'rounded-md' },
  { regex: /shadow-2xl/g, replace: 'shadow-lg' },
  { regex: /shadow-xl/g, replace: 'shadow-md' },
  { regex: /bg-\[#07080c\]/g, replace: 'bg-zinc-950' },
  { regex: /bg-\[#0f111a\]\/80/g, replace: 'bg-zinc-900' },
  { regex: /bg-\[#121422\]/g, replace: 'bg-zinc-900' },
  { regex: /bg-\[#090b14\]\/80/g, replace: 'bg-zinc-950' },
  { regex: /backdrop-blur-md/g, replace: '' },
  { regex: /backdrop-blur-sm/g, replace: '' },
  { regex: /border-white\/10/g, replace: 'border-zinc-800' },
  { regex: /border-white\/5/g, replace: 'border-zinc-800' },
  { regex: /text-slate-/g, replace: 'text-zinc-' },
  { regex: /bg-slate-/g, replace: 'bg-zinc-' },
  { regex: /bg-gradient-to-r/g, replace: '' },
  { regex: /from-purple-600/g, replace: 'bg-indigo-600' },
  { regex: /to-indigo-600/g, replace: '' },
  { regex: /shadow-purple-[0-9]+\/[0-9]+/g, replace: '' },
  { regex: /shadow-emerald-[0-9]+\/[0-9]+/g, replace: '' },
  { regex: /shadow-red-[0-9]+\/[0-9]+/g, replace: '' },
  { regex: /shadow-amber-[0-9]+\/[0-9]+/g, replace: '' },
  { regex: /animate-pulse/g, replace: '' },
  { regex: /animate-bounce/g, replace: '' },
  { regex: /border-purple-500\/[0-9]+/g, replace: 'border-zinc-700' },
  { regex: /border-emerald-500\/[0-9]+/g, replace: 'border-zinc-700' },
  { regex: /border-red-500\/[0-9]+/g, replace: 'border-zinc-700' },
  { regex: /border-amber-500\/[0-9]+/g, replace: 'border-zinc-700' },
  { regex: /bg-purple-600\/20/g, replace: 'bg-zinc-800' },
  { regex: /bg-purple-600\/30/g, replace: 'hover:bg-zinc-700' },
  { regex: /text-purple-[0-9]+/g, replace: 'text-zinc-100' },
  { regex: /bg-emerald-600\/20/g, replace: 'bg-zinc-800' },
  { regex: /bg-emerald-600\/30/g, replace: 'hover:bg-zinc-700' },
  { regex: /text-emerald-300/g, replace: 'text-zinc-100' },
  { regex: /text-emerald-400/g, replace: 'text-zinc-300' },
];

walk(srcDir, (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  
  replacements.forEach(({ regex, replace }) => {
    content = content.replace(regex, replace);
  });
  
  // clean up multiple spaces created by empty replacements
  content = content.replace(/className="([^"]+)"/g, (match, classes) => {
    return `className="${classes.replace(/\s+/g, ' ').trim()}"`;
  });

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Updated: ${filepath}`);
  }
});
