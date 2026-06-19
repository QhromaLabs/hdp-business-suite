// Hot reload Flutter Chrome (DWDS). Auto-reads WS URL from Flutter output file.
import { readFileSync } from 'fs';

const OUTPUT_FILE = process.env.FLUTTER_OUTPUT ||
  'C:\\Users\\USER\\AppData\\Local\\Temp\\claude\\C--Users-USER-Documents-hdp-business-suite\\1ba60af8-8d9b-4afe-aa11-99186804da61\\tasks\\b410l5uem.output';

function getWsUrl() {
  if (process.argv[2]) return process.argv[2];
  try {
    const content = readFileSync(OUTPUT_FILE, 'utf8');
    const match = content.match(/ws:\/\/127\.0\.0\.1:\d+\/[^/\s]+=\/ws/);
    if (match) return match[0];
  } catch {}
  return null;
}

const WS_URL = getWsUrl();
if (!WS_URL) { console.error('Could not find Flutter WS URL. Pass it as an argument.'); process.exit(1); }

const ws = new WebSocket(WS_URL);
let id = 1;

function rpc(method, params = {}) {
  ws.send(JSON.stringify({ jsonrpc: '2.0', method, id: id++, params }));
}

ws.addEventListener('open', () => rpc('getVM'));

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.error) { console.error('Error:', msg.error.message); ws.close(); process.exit(1); }
  if (!msg.result) return;

  if (msg.result.isolates) {
    const isolateId = msg.result.isolates[0]?.id;
    rpc('ext.flutter.reassemble', { isolateId });
    return;
  }

  console.log('Hot reload sent to Flutter Chrome.');
  ws.close();
});

ws.addEventListener('error', (e) => { console.error('WS error:', e.message); process.exit(1); });
