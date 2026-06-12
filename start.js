// Wolf ERP Launcher — double-click start.bat to run
const { spawn, execSync } = require('child_process');
const net  = require('net');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT        = __dirname;
const PROFILE_DIR = path.join(os.tmpdir(), 'wolf-erp-session');
const spawned     = [];

// ── Browser paths (Brave first, then Chrome, then Edge) ─────────────────────
const BROWSER_PATHS = [
  path.join(process.env.LOCALAPPDATA  || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  path.join(process.env.PROGRAMFILES  || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  path.join(process.env['PROGRAMFILES(X86)'] || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  path.join(process.env.LOCALAPPDATA  || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env.PROGRAMFILES  || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  path.join(process.env.LOCALAPPDATA  || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
];
const browserExe = BROWSER_PATHS.find(p => { try { return fs.existsSync(p); } catch { return false; } });

// ── Cleanup: kill every spawned process tree + free ports ────────────────────
function killAll() {
  for (const proc of spawned) {
    try { execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' }); } catch {}
  }
  for (const port of [3000, 5000]) {
    try {
      execSync(`netstat -ano`, { encoding: 'utf8' })
        .split('\n')
        .filter(l => l.includes(`:${port}`) && l.includes('LISTENING'))
        .forEach(l => {
          const pid = l.trim().split(/\s+/).pop();
          if (/^\d+$/.test(pid)) {
            try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch {}
          }
        });
    } catch {}
  }
}

process.on('exit',   killAll);
process.on('SIGINT', () => { console.log('\n\n  Shutting down...'); process.exit(0); });

// ── Start a server ───────────────────────────────────────────────────────────
function startServer(label, dir) {
  console.log(`  Starting ${label}...`);
  const proc = spawn('cmd', ['/c', 'npm run dev'], { cwd: dir, windowsHide: true });
  proc.on('error', err => console.error(`  ${label} error: ${err.message}`));
  spawned.push(proc);
  return proc;
}

// ── Poll until a TCP port accepts connections ────────────────────────────────
function waitForPort(port, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt  = () => {
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock.on('connect', () => { sock.destroy(); resolve(); });
      sock.on('error',   () => { sock.destroy(); retry(); });
      sock.on('timeout', () => { sock.destroy(); retry(); });
      sock.connect(port, '127.0.0.1');
    };
    const retry = () => {
      if (Date.now() > deadline) { reject(new Error('timeout')); return; }
      const elapsed = Math.round((Date.now() - (deadline - timeoutMs)) / 1000);
      process.stdout.write(`\r       still compiling... ${elapsed}s   `);
      setTimeout(attempt, 2000);
    };
    attempt();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('');
  console.log('  =================================================');
  console.log('   Wolf ERP  —  Launcher');
  console.log('  =================================================');
  console.log('');

  startServer('backend  (port 5000)', path.join(ROOT, 'server'));
  startServer('frontend (port 3000)', path.join(ROOT, 'client'));

  console.log('\n  Waiting for Next.js to compile...');
  try {
    await waitForPort(3000);
    process.stdout.write('\r  Next.js ready!                            \n');
  } catch {
    process.stdout.write('\r  Warning: port 3000 not ready — opening anyway.\n');
  }

  console.log('\n  Opening browser...\n');

  if (browserExe) {
    const browser = spawn(browserExe, [
      `--user-data-dir=${PROFILE_DIR}`,
      '--app=http://localhost:3000',
      '--window-size=1400,900',
    ]);
    spawned.push(browser);

    const name = path.basename(browserExe, '.exe');
    console.log(`  ${name} opened.  Close the window to stop servers.\n`);

    browser.on('close', () => {
      console.log('\n  Browser closed. Stopping servers...');
      process.exit(0);
    });
  } else {
    // No Chromium-based browser found — open default and wait for Ctrl+C
    try { execSync('start http://localhost:3000'); } catch {}
    console.log('  Default browser opened.  Press Ctrl+C to stop servers.\n');
  }
})();
