const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function removeWeirdSpaces(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Remove exact {" "} or {""} patterns created by prettier because of missing newlines
  content = content.replace(/\{\s*"\s*"\s*\}/g, '');
  content = content.replace(/\{\s*'\s*'\s*\}/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

const targetDirs = [
  path.join(__dirname, 'src/screens'),
  path.join(__dirname, 'src/components')
];

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir, removeWeirdSpaces);
  }
});

console.log('Removed weird spaces.');
