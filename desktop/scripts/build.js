#!/usr/bin/env node
// Release build wrapper.
//
// Rust bakes absolute source paths into panic messages and debug metadata. For
// dependency crates those come from CARGO_HOME, which sits under the building
// user's home directory — so a shipped binary leaks the developer's Windows
// username (443 occurrences before this was added). `--remap-path-prefix`
// rewrites them to opaque stand-ins.
//
// The paths are resolved at run time rather than hard-coded, so this works on
// any machine and in CI.

const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Updater signing key. Every release has to be signed with the same key the
// installed app carries, or it will refuse the download — which is the whole
// point: it means a hijacked release URL still can't push code to your users.
// CI sets TAURI_SIGNING_PRIVATE_KEY directly; locally we point at the file.
const KEY_PATH =
  process.env.TAURI_SIGNING_PRIVATE_KEY_PATH ||
  path.join(os.homedir(), ".tauri", "wolf-erp-updater.key");

const cargoHome =
  process.env.CARGO_HOME || path.join(os.homedir(), ".cargo");
const projectRoot = path.resolve(__dirname, "..");

const remaps = [
  `--remap-path-prefix=${cargoHome}=/cargo`,
  `--remap-path-prefix=${projectRoot}=/build`,
  `--remap-path-prefix=${os.homedir()}=/home`,
];

// RUSTFLAGS is split on whitespace, so any path containing a space (this repo
// lives under "wolf ERP") would tear a flag in half. CARGO_ENCODED_RUSTFLAGS
// is separated by 0x1f instead, which survives spaces. Cargo ignores RUSTFLAGS
// entirely when the encoded form is set, so fold any existing value in.
const existing = (process.env.RUSTFLAGS || "").split(/\s+/).filter(Boolean);
const encodedRustflags = [...existing, ...remaps].join("\x1f");

// Anything after `--` is forwarded to the Tauri CLI, e.g.
//   node scripts/build.js -- --bundles nsis
const passthrough = process.argv.slice(2).filter((a) => a !== "--");
const args = ["tauri", "build", ...(passthrough.length ? passthrough : ["--bundles", "nsis,msi"])];

console.log("Building with path remapping:");
remaps.forEach((r) => console.log("  " + r));
console.log("");

const env = { ...process.env, CARGO_ENCODED_RUSTFLAGS: encodedRustflags };
delete env.RUSTFLAGS; // folded into the encoded form above

if (!env.TAURI_SIGNING_PRIVATE_KEY) {
  if (fs.existsSync(KEY_PATH)) {
    // Tauri 2 reads the key from TAURI_SIGNING_PRIVATE_KEY — the separate
    // *_PATH variable is a v1 name and is silently ignored, which shows up as
    // "a public key has been found, but no private key" and an unsigned build.
    // The value may be a path or the key itself; pass the contents so a moved
    // or space-containing path can't break it.
    env.TAURI_SIGNING_PRIVATE_KEY = fs.readFileSync(KEY_PATH, "utf8").trim();
    // The key was generated without a passphrase; the variable must still be
    // present or the CLI stops to prompt for one and the build hangs.
    env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD =
      env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || "";
    console.log(`Signing updates with ${KEY_PATH}\n`);
  } else {
    console.warn(
      `WARNING: no updater signing key at ${KEY_PATH}.\n` +
        "         The installers will still build, but without a signed update\n" +
        "         artifact no existing installation can auto-update to them.\n"
    );
  }
}

const res = spawnSync("cargo", args, {
  cwd: projectRoot,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

if (res.error) {
  console.error("Failed to launch cargo:", res.error.message);
  process.exit(1);
}
process.exit(res.status === null ? 1 : res.status);
