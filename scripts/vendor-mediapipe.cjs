/**
 * Copies MediaPipe WASM + JS bundle from node_modules and downloads the hand
 * landmarker model once so the app runs without CDN access at runtime.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const root = path.join(__dirname, "..");
const vendor = path.join(root, "vendor", "mediapipe");
const wasmDest = path.join(vendor, "wasm");
const modelsDir = path.join(vendor, "models");
const pkgRoot = path.join(root, "node_modules", "@mediapipe", "tasks-vision");
const pkgWasm = path.join(pkgRoot, "wasm");
const bundleSrc = path.join(pkgRoot, "vision_bundle.mjs");
const bundleDest = path.join(vendor, "vision_bundle.mjs");
const modelPath = path.join(modelsDir, "hand_landmarker.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

function ensurePackage() {
  if (!fs.existsSync(pkgWasm)) {
    console.warn(
      "[vendor-mediapipe] @mediapipe/tasks-vision not installed; skipping vendor step.",
    );
    process.exit(0);
  }
}

function copyTree() {
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.cpSync(pkgWasm, wasmDest, { recursive: true });
  fs.copyFileSync(bundleSrc, bundleDest);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const tmp = `${dest}.part`;
    const file = fs.createWriteStream(tmp);
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(tmp);
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(tmp);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        fs.renameSync(tmp, dest);
        resolve();
      });
    });
    req.on("error", (err) => {
      file.close();
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      reject(err);
    });
  });
}

async function ensureModel() {
  if (fs.existsSync(modelPath) && fs.statSync(modelPath).size > 1_000_000) {
    return;
  }
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log("[vendor-mediapipe] Downloading hand_landmarker.task …");
  await downloadFile(modelUrl, modelPath);
}

async function main() {
  ensurePackage();
  copyTree();
  await ensureModel();
  console.log("[vendor-mediapipe] Ready:", vendor);
}

main().catch((e) => {
  console.error("[vendor-mediapipe]", e);
  process.exit(1);
});
