import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const qr = require('qrcode-terminal');
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) throw new Error('Set EXPO_PUBLIC_API_URL in apps/mobile/.env.cloud.');
const host = new URL(apiUrl).hostname;
const url = `exp://${host}:8081`;

// Wait for Metro before inviting someone to scan the code.
let ready = false;
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const response = await fetch('http://127.0.0.1:8081/status', { signal: AbortSignal.timeout(1000) });
    ready = response.ok && (await response.text()).includes('packager-status:running');
  } catch { /* Metro may still be starting. */ }
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!ready) throw new Error('Expo is not ready on port 8081. See .dev/expo.log.');

console.log('\nScan with Expo Go (Android) or your Camera app (iOS).');
console.log('Keep your phone and computer on the same Wi-Fi.\n');
qr.generate(url, { small: true });
console.log(`Expo Go: ${url}\n`);
