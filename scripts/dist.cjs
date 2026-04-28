/**
 * Local: Apple Silicon mac DMG only (fast). On GitHub Actions: full release matrix
 * (mac x64 + arm64 DMGs on macOS runner, Windows NSIS on Windows runner).
 */
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const cli = path.join(root, "node_modules", "electron-builder", "cli.js");

const inGitHub = process.env.GITHUB_ACTIONS === "true";
const runnerOs = process.env.RUNNER_OS;

let extraArgs;
if (inGitHub) {
  if (runnerOs === "macOS") {
    extraArgs = ["--mac", "--x64", "--arm64"];
  } else if (runnerOs === "Windows") {
    extraArgs = ["--win", "--x64"];
  } else {
    console.error(
      "[dist] Unexpected RUNNER_OS on GitHub Actions:",
      runnerOs,
      "(expected macOS or Windows for this project)",
    );
    process.exit(1);
  }
} else {
  if (process.platform === "darwin") {
    extraArgs = ["--mac", "--arm64"];
  } else if (process.platform === "win32") {
    extraArgs = ["--win", "--x64"];
  } else {
    console.error(
      "[dist] Local builds for Linux are not configured. On macOS this script builds arm64 DMG only; use GitHub Actions for all release artifacts.",
    );
    process.exit(1);
  }
}

const result = spawnSync(process.execPath, [cli, ...extraArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
