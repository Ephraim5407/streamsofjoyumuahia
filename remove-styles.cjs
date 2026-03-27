const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function normalizeTailwindClasses(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Remove italic classes
  content = content.replace(/\bitalic\b/g, '');
  
  // Replace overly bold fonts
  content = content.replace(/\bfont-black\b/g, 'font-bold');
  content = content.replace(/\bfont-extrabold\b/g, 'font-bold');
  
  // Remove aggressive tracking/letter-spacing
  content = content.replace(/\btracking-tighter\b/g, '');
  content = content.replace(/\btracking-tight\b/g, '');
  content = content.replace(/\btracking-widest\b/g, '');
  content = content.replace(/\btracking-wide\b/g, '');
  content = content.replace(/\btracking-\[[^\]]+\]\b/g, '');

  // Normalize huge border radius and shadow
  content = content.replace(/\brounded-\[40px\]\b/g, 'rounded-xl');
  content = content.replace(/\brounded-\[32px\]\b/g, 'rounded-xl');
  content = content.replace(/\brounded-\[50px\]\b/g, 'rounded-xl');
  content = content.replace(/\brounded-\[60px\]\b/g, 'rounded-2xl');
  content = content.replace(/\brounded-\[24px\]\b/g, 'rounded-lg');
  content = content.replace(/\brounded-\[30px\]\b/g, 'rounded-xl');
  
  content = content.replace(/\bshadow-2xl\b/g, 'shadow-md');
  content = content.replace(/\bshadow-xl\b/g, 'shadow');
  
  // Remove font families
  content = content.replace(/\bfont-inter\b/g, '');
  content = content.replace(/\bfont-primary\b/g, '');
  content = content.replace(/\bfont-sans\b/g, '');

  // Clean up multiple spaces that might have been left by replacements
  content = content.replace(/className=(["'`])\s+/g, 'className=$1');
  content = content.replace(/\s+(["'`])/g, '$1');
  content = content.replace(/\s{2,}/g, ' ');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Normalized styles in:', filePath);
  }
}

const targetDirs = [
  path.join(__dirname, 'src/screens'),
  path.join(__dirname, 'src/components')
];

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir, normalizeTailwindClasses);
  }
});

console.log('Style normalization complete.');
