/** @format */

const LANDMARK_NAMES = [
    'WRIST',
    'THUMB_CMC',
    'THUMB_MCP',
    'THUMB_IP',
    'THUMB_TIP',
    'INDEX_FINGER_MCP',
    'INDEX_FINGER_PIP',
    'INDEX_FINGER_DIP',
    'INDEX_FINGER_TIP',
    'MIDDLE_FINGER_MCP',
    'MIDDLE_FINGER_PIP',
    'MIDDLE_FINGER_DIP',
    'MIDDLE_FINGER_TIP',
    'RING_FINGER_MCP',
    'RING_FINGER_PIP',
    'RING_FINGER_DIP',
    'RING_FINGER_TIP',
    'PINKY_MCP',
    'PINKY_PIP',
    'PINKY_DIP',
    'PINKY_TIP',
];

const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const videoWrap = document.getElementById('videoWrap');
const fpsLabel = document.getElementById('fpsLabel');
const handsLabel = document.getElementById('handsLabel');
const landmarkLegend = document.getElementById('landmarkLegend');

const numHandsEl = document.getElementById('numHands');
const minHandEl = document.getElementById('minHand');
const minHandOut = document.getElementById('minHandOut');
const minPresenceEl = document.getElementById('minPresence');
const minPresenceOut = document.getElementById('minPresenceOut');
const mirrorEl = document.getElementById('mirror');
const drawSkeletonEl = document.getElementById('drawSkeleton');
const drawPointsEl = document.getElementById('drawPoints');
const drawIndexEl = document.getElementById('drawIndex');

function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.classList.remove('ready', 'error');
    if (kind === 'ready') statusEl.classList.add('ready');
    if (kind === 'error') statusEl.classList.add('error');
}

for (let i = 0; i < LANDMARK_NAMES.length; i++) {
    const li = document.createElement('li');
    li.textContent = `${i} — ${LANDMARK_NAMES[i]}`;
    landmarkLegend.appendChild(li);
}

minHandEl.addEventListener('input', () => {
    minHandOut.textContent = minHandEl.value;
});
minPresenceEl.addEventListener('input', () => {
    minPresenceOut.textContent = minPresenceEl.value;
});

mirrorEl.addEventListener('change', () => {
    videoWrap.classList.toggle('mirror', mirrorEl.checked);
});

function resizeCanvas() {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
}

let handLandmarker = null;
let lastOptionsKey = '';
let HandLandmarkerClass = null;

async function rebuildLandmarker(
    FilesetResolver,
    HandLandmarker,
    paths,
    delegate,
) {
    const key = [
        numHandsEl.value,
        minHandEl.value,
        minPresenceEl.value,
        delegate,
    ].join('|');
    if (handLandmarker && key === lastOptionsKey) return;

    if (handLandmarker) {
        handLandmarker.close();
        handLandmarker = null;
    }

    const vision = await FilesetResolver.forVisionTasks(paths.wasmBaseUrl);
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: paths.modelUrl,
            delegate,
        },
        runningMode: 'VIDEO',
        numHands: Number(numHandsEl.value),
        minHandDetectionConfidence: Number(minHandEl.value),
        minHandPresenceConfidence: Number(minPresenceEl.value),
    });
    lastOptionsKey = key;
}

async function refreshLandmarker(FilesetResolver, HandLandmarker, paths) {
    lastOptionsKey = '';
    try {
        await rebuildLandmarker(FilesetResolver, HandLandmarker, paths, 'GPU');
    } catch (e) {
        console.warn('GPU delegate failed, using CPU', e);
        lastOptionsKey = '';
        await rebuildLandmarker(FilesetResolver, HandLandmarker, paths, 'CPU');
    }
}

async function startCamera() {
    if (window.electronAPI?.requestCameraPermission) {
        await window.electronAPI.requestCameraPermission();
    }
    const tryConstraints = [
        {
            video: {
                facingMode: 'user',
                width: {ideal: 1280},
                height: {ideal: 720},
            },
            audio: false,
        },
        {video: true, audio: false},
    ];
    let stream;
    let lastErr;
    for (const constraints of tryConstraints) {
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
        } catch (e) {
            lastErr = e;
        }
    }
    if (!stream) throw lastErr;
    video.srcObject = stream;
    await video.play();
    resizeCanvas();
}

let lastFrameTime = performance.now();
let fpsAccum = 0;
let fpsFrames = 0;

function drawResults(result, mirrored) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!HandLandmarkerClass || !result.landmarks?.length) {
        ctx.restore();
        return;
    }

    const sx = mirrored ? -1 : 1;
    const ox = mirrored ? canvas.width : 0;
    ctx.translate(ox, 0);
    ctx.scale(sx, 1);

    const connections = HandLandmarkerClass.HAND_CONNECTIONS;
    const drawSkeleton = drawSkeletonEl.checked;
    const drawPoints = drawPointsEl.checked;
    const drawIdx = drawIndexEl.checked;

    for (const landmarks of result.landmarks) {
        if (drawSkeleton) {
            ctx.strokeStyle = 'rgba(110, 231, 183, 0.85)';
            ctx.lineWidth = 3;
            for (const {start, end} of connections) {
                const a = landmarks[start];
                const b = landmarks[end];
                ctx.beginPath();
                ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
                ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
                ctx.stroke();
            }
        }

        if (drawPoints || drawIdx) {
            landmarks.forEach((lm, i) => {
                const x = lm.x * canvas.width;
                const y = lm.y * canvas.height;
                if (drawPoints) {
                    ctx.fillStyle = 'rgba(248, 250, 252, 0.95)';
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                if (drawIdx) {
                    ctx.fillStyle = 'rgba(15, 18, 25, 0.92)';
                    ctx.font = '11px system-ui, sans-serif';
                    ctx.fillText(String(i), x + 7, y - 7);
                }
            });
        }
    }

    ctx.restore();
}

async function main() {
    setStatus('Loading MediaPipe…');

    if (!window.electronAPI?.getMediapipePaths) {
        setStatus('Preload bridge missing — run inside Electron.', 'error');
        return;
    }

    const paths = await window.electronAPI.getMediapipePaths();
    const {HandLandmarker, FilesetResolver} = await import(
        new URL('../vendor/mediapipe/vision_bundle.mjs', import.meta.url).href
    );
    HandLandmarkerClass = HandLandmarker;

    await refreshLandmarker(FilesetResolver, HandLandmarker, paths);

    for (const el of [numHandsEl, minHandEl, minPresenceEl]) {
        el.addEventListener('change', () =>
            refreshLandmarker(FilesetResolver, HandLandmarker, paths),
        );
    }

    const cameraHelp = document.getElementById('cameraHelp');
    const cameraHelpText = document.getElementById('cameraHelpText');
    const openCameraSettingsBtn = document.getElementById(
        'openCameraSettingsBtn',
    );

    openCameraSettingsBtn.addEventListener('click', () => {
        window.electronAPI?.openCameraPrivacySettings?.();
    });

    setStatus('Starting camera…');
    try {
        await startCamera();
        cameraHelp.classList.add('is-hidden');
    } catch (e) {
        console.error(e);
        const info =
            (await window.electronAPI?.getCameraTroubleshootInfo?.()) ?? {};
        const listName =
            info.isPackaged && info.appName
                ? info.appName
                : (info.privacyListNameDev ?? 'Electron');
        const extra =
            'On macOS, open Privacy & Security → Camera and enable the toggle for that app, then quit and reopen Hand Lab.';
        setStatus('Camera unavailable or permission denied.', 'error');
        cameraHelpText.textContent = `${e.name ?? 'Error'}: ${e.message}. Look for “${listName}” in the camera list. ${extra}`;
        cameraHelp.classList.remove('is-hidden');
        const showMacBtn =
            info.platform === 'darwin' &&
            window.electronAPI?.openCameraPrivacySettings;
        openCameraSettingsBtn.classList.toggle('is-hidden', !showMacBtn);
        return;
    }

    video.addEventListener('loadedmetadata', resizeCanvas);
    new ResizeObserver(resizeCanvas).observe(videoWrap);

    setStatus('Tracking — move your hands in view.', 'ready');

    function loop() {
        const now = performance.now();
        fpsAccum += now - lastFrameTime;
        lastFrameTime = now;
        fpsFrames += 1;
        if (fpsAccum >= 1000) {
            const fps = Math.round((fpsFrames * 1000) / fpsAccum);
            fpsLabel.textContent = `FPS ${fps}`;
            fpsAccum = 0;
            fpsFrames = 0;
        }

        if (handLandmarker && video.readyState >= 2) {
            const result = handLandmarker.detectForVideo(video, now);
            handsLabel.textContent = `Hands ${result.landmarks?.length ?? 0}`;
            drawResults(result, mirrorEl.checked);
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

main().catch((e) => {
    console.error(e);
    setStatus(`Error: ${e.message}`, 'error');
});
