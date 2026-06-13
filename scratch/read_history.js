import fs from 'fs';
import path from 'path';

const historyPath = path.join(
  process.env.APPDATA || '',
  'Microsoft',
  'Windows',
  'PowerShell',
  'PSReadLine',
  'ConsoleHost_history.txt'
);

console.log('History path:', historyPath);

if (fs.existsSync(historyPath)) {
  console.log('History file exists!');
  const content = fs.readFileSync(historyPath, 'utf-8');
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  console.log('--- Last 100 lines ---');
  console.log(lines.slice(-100).join('\n'));
} else {
  console.log('History file does not exist.');
}
