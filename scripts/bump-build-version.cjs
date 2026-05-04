const fs = require("fs");
const path = require("path");

const versionFile = path.join(__dirname, "..", "build-version.json");

function readBuildVersion() {
  try {
    const raw = fs.readFileSync(versionFile, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.version === "number" && Number.isFinite(parsed.version)) {
      return Math.max(0, Math.floor(parsed.version));
    }
  } catch {
    // fall through
  }
  return 0;
}

const nextVersion = readBuildVersion() + 1;
fs.writeFileSync(
  versionFile,
  JSON.stringify({ version: nextVersion }, null, 2) + "\n",
  "utf8",
);

console.log(`App build version: ${nextVersion}`);
