const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '..', 'build-version.json');

function loadVersion() {
  try {
    const raw = fs.readFileSync(versionFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.version === 'number' && Number.isFinite(parsed.version)) {
      return Math.max(0, Math.floor(parsed.version));
    }
  } catch {
    // fall through to default
  }
  return 0;
}

const nextVersion = loadVersion() + 1;
const payload = JSON.stringify({ version: nextVersion }, null, 2) + '\n';
fs.writeFileSync(versionFile, payload, 'utf8');
console.log(`Build version: ${nextVersion}`);
