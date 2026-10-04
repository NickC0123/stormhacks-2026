import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const isWindows = process.platform === 'win32';
const stateDir = resolve('.dev');
const pidFile = resolve(stateDir, 'expo.pid');
const logFile = resolve(stateDir, 'expo.log');
mkdirSync(stateDir, { recursive: true });

function running(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const pid = existsSync(pidFile) ? Number(readFileSync(pidFile, 'utf8')) : 0;
if (process.argv[2] === 'start') {
  if (pid && running(pid)) {
    console.log(`Expo is already running (PID ${pid}).`);
    process.exit(0);
  }
  const log = openSync(logFile, 'a');
  const child = spawn('npm', ['--prefix', 'apps/mobile', 'run', 'start', '--', '--host', 'lan'], {
    cwd: resolve('.'),
    detached: true,
    // On Windows npm is npm.cmd, which Node can only launch through a shell.
    shell: isWindows,
    windowsHide: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, EXPO_NO_TELEMETRY: '1' },
  });
  child.on('error', (error) => {
    console.error(`Could not start Expo: ${error.message}`);
    process.exitCode = 1;
  });
  child.unref();
  closeSync(log);
  if (child.pid) {
    await setTimeout(2000);
    if (!running(child.pid)) {
      throw new Error(`Expo exited during startup. See ${logFile}`);
    }
    writeFileSync(pidFile, String(child.pid));
    console.log(`Started Expo (PID ${child.pid}).`);
  }
} else if (process.argv[2] === 'stop') {
  if (pid && running(pid)) {
    if (isWindows) {
      // Negative PIDs (process groups) don't exist on Windows; kill the tree instead.
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
    console.log('Stopped Expo.');
  }
  if (existsSync(pidFile)) unlinkSync(pidFile);
} else {
  console.error('Usage: node scripts/expo-process.mjs start|stop');
  process.exitCode = 1;
}
