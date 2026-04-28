/**
 * Removes build / packager output (electron-builder default: dist/).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dirs = ["dist"];

for (const dir of dirs) {
  const full = path.join(root, dir);
  fs.rmSync(full, { recursive: true, force: true });
  console.log(`[clean] removed ${dir}/`);
}
