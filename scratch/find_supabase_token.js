import fs from 'fs';
import path from 'path';
import os from 'os';

const homeDir = os.homedir();
console.log('Home dir:', homeDir);

const possiblePaths = [
  path.join(homeDir, '.supabase', 'config.toml'),
  path.join(homeDir, '.config', 'supabase', 'access-token'),
  path.join(homeDir, '.config', 'supabase', 'config.toml'),
  path.join(homeDir, 'AppData', 'Local', 'supabase', 'access-token'),
  path.join(homeDir, 'AppData', 'Roaming', 'supabase', 'access-token')
];

possiblePaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`FOUND file: ${p}`);
    try {
      const content = fs.readFileSync(p, 'utf-8');
      console.log(`Content (truncated): ${content.substring(0, 100)}`);
    } catch (e) {
      console.error(`Error reading ${p}:`, e);
    }
  } else {
    console.log(`Not found: ${p}`);
  }
});
