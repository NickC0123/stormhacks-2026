import { readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

const status = JSON.parse(readFileSync(0, 'utf8'));
const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
const serviceKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
if (!anonKey || !serviceKey) {
  throw new Error('Supabase status did not return local API keys.');
}

function setEnv(path, example, updates) {
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    content = readFileSync(example, 'utf8');
  }
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
  }
  writeFileSync(path, content);
}

const interfaces = Object.entries(networkInterfaces());
const preferred = interfaces.filter(([name]) => /^(en|eth|wlan|wi-fi)/i.test(name));
const lanIp = [...preferred, ...interfaces]
  .flatMap(([, addresses]) => addresses ?? [])
  .find((address) => address.family === 'IPv4' && !address.internal)?.address;
const host = process.env.DEV_HOST ?? lanIp ?? 'localhost';

setEnv('apps/api/.env', 'apps/api/.env.example', {
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
});
setEnv('apps/mobile/.env.local', 'apps/mobile/.env.example', {
  EXPO_PUBLIC_SUPABASE_URL: `http://${host}:54321`,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  EXPO_PUBLIC_API_URL: `http://${host}:8000`,
});
console.log(`Configured local API and mobile URLs for ${host}. Set DEV_HOST to override the detected IP.`);
console.log(`Expo Go: exp://${host}:8081`);
console.log('Gemini receipt scanning needs GEMINI_API_KEY in apps/api/.env.');
