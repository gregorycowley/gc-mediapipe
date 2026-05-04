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
const appBuildEl = document.getElementById('appBuild');
const videoWrap = document.getElementById('videoWrap');
const fpsLabel = document.getElementById('fpsLabel');
const handsLabel = document.getElementById('handsLabel');
const landmarkLegend = document.getElementById('landmarkLegend');
const helpPopoverEl = document.getElementById('helpPopover');

const numHandsEl = document.getElementById('numHands');
const minHandEl = document.getElementById('minHand');
const minHandOut = document.getElementById('minHandOut');
const minPresenceEl = document.getElementById('minPresence');
const minPresenceOut = document.getElementById('minPresenceOut');
const mirrorEl = document.getElementById('mirror');
const drawSkeletonEl = document.getElementById('drawSkeleton');
const drawPointsEl = document.getElementById('drawPoints');
const drawIndexEl = document.getElementById('drawIndex');

const wsUrlEl = document.getElementById('wsUrl');
const wsConnectBtn = document.getElementById('wsConnectBtn');
const wsDisconnectBtn = document.getElementById('wsDisconnectBtn');
const wsStatusEl = document.getElementById('wsStatus');
const wsBridgeHintEl = document.getElementById('wsBridgeHint');

const captureBtn = document.getElementById('captureBtn');
const nameModal = document.getElementById('nameModal');
const nameModalInput = document.getElementById('nameModalInput');
const nameModalOk = document.getElementById('nameModalOk');
const nameModalCancel = document.getElementById('nameModalCancel');
const deleteGestureBtn = document.getElementById('deleteGestureBtn');
const gestureThresholdEl = document.getElementById('gestureThreshold');
const gestureThresholdOut = document.getElementById('gestureThresholdOut');
const gestureCooldownEl = document.getElementById('gestureCooldown');
const gestureTargetPathEl = document.getElementById('gestureTargetPath');
const gestureTargetPropertyEl = document.getElementById('gestureTargetProperty');
const gestureTargetValueEl = document.getElementById('gestureTargetValue');
const gestureStatusEl = document.getElementById('gestureStatus');
const gestureListEl = document.getElementById('gestureList');
const helpIconEls = Array.from(document.querySelectorAll('.help-icon'));

const HELP_TEXT = {
    minDetection:
        'How sure the model must be that a hand exists before tracking starts. Higher values reduce false positives but may miss hands.',
    minPresence:
        'How sure the tracker must be that the detected hand is still present in this frame. Higher values are stricter and can flicker in poor lighting.',
    gestures:
        'Capture a hand pose, then tune match settings. When a pose matches, Hand Bridge sends the configured target update over WebSocket.',
    gestureThreshold:
        'Maximum average landmark distance allowed for a match. Lower is stricter (fewer accidental matches), higher is more forgiving.',
    gestureCooldown:
        'Minimum wait time before the same gesture can trigger again after a send. Helps prevent rapid repeats from tiny movement changes.',
    targetPath:
        'Path to the Figma layer to update, using "/" separators. Example: "Page 1 / Frame A / Rectangle 1". Include page name for reliability.',
    targetProperty:
        'Which property to change on the target layer. Available options depend on layer type (for example, textContent only works on text layers).',
    targetValue:
        'New value sent to Figma for the selected property. Examples: "#FF0000" for color, "0.5" for opacity, "State=On;Size=L" for variants.',
};

function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.classList.remove('ready', 'error');
    if (kind === 'ready') statusEl.classList.add('ready');
    if (kind === 'error') statusEl.classList.add('error');
}

function showHelpPopover(anchorEl, message) {
    if (!helpPopoverEl) return;
    helpPopoverEl.textContent = message;
    helpPopoverEl.classList.remove('is-hidden');
    const r = anchorEl.getBoundingClientRect();
    const margin = 8;
    const maxW = Math.min(352, window.innerWidth - margin * 2);
    helpPopoverEl.style.maxWidth = `${maxW}px`;
    let left = r.left;
    let top = r.bottom + 8;
    if (left + maxW > window.innerWidth - margin) {
        left = window.innerWidth - margin - maxW;
    }
    if (left < margin) left = margin;
    if (top > window.innerHeight - 80) {
        top = Math.max(margin, r.top - 88);
    }
    helpPopoverEl.style.left = `${left}px`;
    helpPopoverEl.style.top = `${top}px`;
}

function hideHelpPopover() {
    if (!helpPopoverEl) return;
    helpPopoverEl.classList.add('is-hidden');
}

function uid() {
    // Not crypto-strong; sufficient for local student projects.
    return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
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

for (const btn of helpIconEls) {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = btn.getAttribute('data-help-key');
        const message = HELP_TEXT[key] ?? 'No help available yet.';
        const visible = !helpPopoverEl?.classList.contains('is-hidden');
        const sameMessage = helpPopoverEl?.textContent === message;
        if (visible && sameMessage) hideHelpPopover();
        else showHelpPopover(btn, message);
    });
}

document.addEventListener('click', (e) => {
    const target = e.target;
    if (
        !(target instanceof HTMLElement) ||
        target.closest('.help-icon') ||
        target.closest('#helpPopover')
    ) {
        return;
    }
    hideHelpPopover();
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideHelpPopover();
});

// ---------------------------
// WebSocket bridge (client)
// ---------------------------
const WS_URL_KEY = 'handlab.wsUrl';
wsUrlEl.value = localStorage.getItem(WS_URL_KEY) ?? 'ws://localhost:8787';

let ws = null;
let wsState = 'disconnected'; // disconnected | connecting | connected | error

function setWsStatus(text, state) {
    wsStatusEl.textContent = text;
    wsState = state ?? wsState;
    const connected = wsState === 'connected';
    wsConnectBtn.disabled = connected || wsState === 'connecting';
    wsDisconnectBtn.disabled = !connected && wsState !== 'connecting';
}

function wsConnect() {
    const url = (wsUrlEl.value ?? '').trim();
    if (!url) return;
    localStorage.setItem(WS_URL_KEY, url);
    try {
        if (
            ws &&
            (ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }
        setWsStatus('WS: connecting…', 'connecting');
        ws = new WebSocket(url);
        ws.addEventListener('open', () =>
            setWsStatus('WS: connected', 'connected'),
        );
        ws.addEventListener('close', () =>
            setWsStatus('WS: disconnected', 'disconnected'),
        );
        ws.addEventListener('error', () =>
            setWsStatus('WS: error (see console)', 'error'),
        );
    } catch (e) {
        console.error(e);
        setWsStatus('WS: error (invalid URL?)', 'error');
    }
}

function wsDisconnect() {
    try {
        if (ws) ws.close();
    } catch {
        // ignore
    }
}

function wsSend(obj) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
        ws.send(JSON.stringify(obj));
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

wsConnectBtn.addEventListener('click', wsConnect);
wsDisconnectBtn.addEventListener('click', wsDisconnect);
wsUrlEl.addEventListener('change', () => {
    localStorage.setItem(WS_URL_KEY, wsUrlEl.value.trim());
});
setWsStatus('WS: disconnected', 'disconnected');

// ---------------------------
// Gesture library + matching
// ---------------------------
const GESTURES_KEY = 'handlab.gestures.v1';

/**
 * Gesture schema (v1)
 * - id: string
 * - name: string
 * - handedness: "Left" | "Right" | "Unknown"
 * - points: [{x,y,z} x21] normalized (wrist-relative + scale)
 * - threshold: number (avg distance)
 * - cooldownMs: number
 * - targetPath: string (e.g. "Page 1 / Frame / Layer")
 * - targetProperty:
 *   "x" | "y" | "width" | "height" | "visible" | "opacity" | "color" | "textContent" | "variants"
 * - targetValue: string
 * - lastTriggeredAt: number (runtime only)
 */
let gestures = [];
let selectedGestureId = null;

function loadGestures() {
    try {
        const raw = localStorage.getItem(GESTURES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(
                (g) => g && typeof g.id === 'string' && Array.isArray(g.points),
            )
            .map((g) => ({
                id: g.id,
                name: typeof g.name === 'string' ? g.name : g.id,
                handedness: g.handedness ?? 'Unknown',
                points: g.points,
                threshold: typeof g.threshold === 'number' ? g.threshold : 0.1,
                cooldownMs:
                    typeof g.cooldownMs === 'number' ? g.cooldownMs : 500,
                targetPath:
                    typeof g.targetPath === 'string' ? g.targetPath : '',
                targetProperty:
                    typeof g.targetProperty === 'string'
                        ? g.targetProperty
                        : 'visible',
                targetValue:
                    typeof g.targetValue === 'string' ? g.targetValue : 'true',
                lastTriggeredAt: 0,
            }));
    } catch (e) {
        console.warn('Failed to load gestures', e);
        return [];
    }
}

function saveGestures() {
    const serializable = gestures.map((g) => ({
        id: g.id,
        name: g.name,
        handedness: g.handedness,
        points: g.points,
        threshold: g.threshold,
        cooldownMs: g.cooldownMs,
        targetPath: g.targetPath,
        targetProperty: g.targetProperty,
        targetValue: g.targetValue,
    }));
    localStorage.setItem(GESTURES_KEY, JSON.stringify(serializable));
}

function setSelectedGesture(id) {
    selectedGestureId = id;
    renderGestures();
}

function normalizeLandmarks(landmarks) {
    // landmarks: [{x,y,z}...] in normalized image coords
    const wrist = landmarks[0] ?? {x: 0, y: 0, z: 0};
    const rel = landmarks.map((p) => ({
        x: p.x - wrist.x,
        y: p.y - wrist.y,
        z: (p.z ?? 0) - (wrist.z ?? 0),
    }));
    let maxR = 1e-6;
    for (const p of rel) {
        const r = Math.hypot(p.x, p.y, p.z);
        if (r > maxR) maxR = r;
    }
    const s = 1 / maxR;
    return rel.map((p) => ({x: p.x * s, y: p.y * s, z: p.z * s}));
}

function avgDistance(a, b) {
    const n = Math.min(a.length, b.length);
    if (n === 0) return Infinity;
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const dx = a[i].x - b[i].x;
        const dy = a[i].y - b[i].y;
        const dz = (a[i].z ?? 0) - (b[i].z ?? 0);
        sum += Math.hypot(dx, dy, dz);
    }
    return sum / n;
}

function renderGestures() {
    gestureListEl.innerHTML = '';
    if (!gestures.length) {
        gestureStatusEl.textContent = 'No gestures yet.';
        deleteGestureBtn.disabled = true;
        gestureThresholdEl.disabled = true;
        gestureCooldownEl.disabled = true;
        gestureTargetPathEl.disabled = true;
        gestureTargetPropertyEl.disabled = true;
        gestureTargetValueEl.disabled = true;
        return;
    }

    const selected =
        gestures.find((g) => g.id === selectedGestureId) ?? gestures[0];
    if (!selectedGestureId) selectedGestureId = selected.id;

    gestureStatusEl.textContent = `${gestures.length} gesture(s). Selected: ${selected.name}`;
    deleteGestureBtn.disabled = false;
    gestureThresholdEl.disabled = false;
    gestureCooldownEl.disabled = false;
    gestureTargetPathEl.disabled = false;
    gestureTargetPropertyEl.disabled = false;
    gestureTargetValueEl.disabled = false;

    gestureThresholdEl.value = String(clamp(selected.threshold, 0.01, 0.4));
    gestureThresholdOut.textContent = Number(gestureThresholdEl.value).toFixed(
        2,
    );
    gestureCooldownEl.value = String(clamp(selected.cooldownMs, 0, 5000));
    gestureTargetPathEl.value = selected.targetPath ?? '';
    gestureTargetPropertyEl.value = selected.targetProperty ?? 'visible';
    gestureTargetValueEl.value = selected.targetValue ?? 'true';

    for (const g of gestures) {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = g.name;
        btn.setAttribute('aria-current', String(g.id === selectedGestureId));
        btn.addEventListener('click', () => setSelectedGesture(g.id));
        li.appendChild(btn);
        gestureListEl.appendChild(li);
    }
}

gestureThresholdEl.addEventListener('input', () => {
    const g = gestures.find((x) => x.id === selectedGestureId);
    if (!g) return;
    g.threshold = Number(gestureThresholdEl.value);
    gestureThresholdOut.textContent = Number(gestureThresholdEl.value).toFixed(
        2,
    );
    saveGestures();
});

gestureCooldownEl.addEventListener('change', () => {
    const g = gestures.find((x) => x.id === selectedGestureId);
    if (!g) return;
    g.cooldownMs = clamp(Number(gestureCooldownEl.value), 0, 5000);
    saveGestures();
});

gestureTargetPathEl.addEventListener('change', () => {
    const g = gestures.find((x) => x.id === selectedGestureId);
    if (!g) return;
    g.targetPath = gestureTargetPathEl.value.trim();
    saveGestures();
});

gestureTargetPropertyEl.addEventListener('change', () => {
    const g = gestures.find((x) => x.id === selectedGestureId);
    if (!g) return;
    g.targetProperty = gestureTargetPropertyEl.value;
    saveGestures();
});

gestureTargetValueEl.addEventListener('change', () => {
    const g = gestures.find((x) => x.id === selectedGestureId);
    if (!g) return;
    g.targetValue = gestureTargetValueEl.value.trim();
    saveGestures();
});

deleteGestureBtn.addEventListener('click', () => {
    if (!selectedGestureId) return;
    const idx = gestures.findIndex((g) => g.id === selectedGestureId);
    if (idx < 0) return;
    gestures.splice(idx, 1);
    if (gestures.length) selectedGestureId = gestures[0].id;
    else selectedGestureId = null;
    saveGestures();
    renderGestures();
});

let lastResult = null;

/** Electron/Chromium does not display `window.prompt`; use an in-app modal instead. */
function promptGestureName(defaultName) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            nameModal.classList.add('is-hidden');
            window.removeEventListener('keydown', onKey);
            resolve(value);
        };

        const onKey = (e) => {
            if (e.key === 'Escape') finish(null);
            if (
                e.key === 'Enter' &&
                document.activeElement === nameModalInput
            ) {
                e.preventDefault();
                const v = nameModalInput.value.trim();
                finish(v || null);
            }
        };

        nameModalInput.value = defaultName;
        nameModal.classList.remove('is-hidden');
        queueMicrotask(() => {
            nameModalInput.focus();
            nameModalInput.select();
        });

        nameModalOk.onclick = () => {
            const v = nameModalInput.value.trim();
            finish(v || null);
        };
        nameModalCancel.onclick = () => finish(null);

        nameModal.onclick = (e) => {
            if (e.target === nameModal) finish(null);
        };

        window.addEventListener('keydown', onKey);
    });
}

captureBtn.addEventListener('click', async () => {
    const result = lastResult;
    const hand = result?.landmarks?.[0];
    if (!hand?.length) {
        gestureStatusEl.textContent =
            'No hand detected — put a hand in view, then capture.';
        return;
    }
    const name = await promptGestureName(`Gesture ${gestures.length + 1}`);
    if (!name) return;
    const normalized = normalizeLandmarks(hand);
    const handedness =
        result?.handedness?.[0]?.[0]?.categoryName ??
        result?.handedness?.[0]?.[0]?.displayName ??
        'Unknown';
    const g = {
        id: uid(),
        name: name.trim(),
        handedness,
        points: normalized,
        threshold: 0.1,
        cooldownMs: 500,
        targetPath: '',
        targetProperty: 'visible',
        targetValue: 'true',
        lastTriggeredAt: 0,
    };
    gestures.unshift(g);
    selectedGestureId = g.id;
    saveGestures();
    renderGestures();
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
let handInView = false;
let lastSentGestureId = null;

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
    if (window.electronAPI?.getAppBuildInfo && appBuildEl) {
        try {
            const info = await window.electronAPI.getAppBuildInfo();
            appBuildEl.textContent = `Build ${info.buildVersion ?? '?'} · v${info.appVersion ?? '?'}`;
        } catch {
            appBuildEl.textContent = 'Build —';
        }
    }

    gestures = loadGestures();
    renderGestures();

    async function refreshWsBridgeHint() {
        if (!wsBridgeHintEl || !window.electronAPI?.getWsBridgeStatus) return;
        const st = await window.electronAPI.getWsBridgeStatus();
        if (st.error) {
            wsBridgeHintEl.textContent = `Hub: ${st.error}`;
            return;
        }
        if (st.connectUrl) {
            const lan =
                st.listenHost === '0.0.0.0'
                    ? ` Other devices on your network: ws://<this-computer-IP>:${st.port}`
                    : '';
            wsBridgeHintEl.textContent = `In-app hub ${st.connectUrl} — use the same URL in Figma (or Connect in this app).${lan} (${st.clientCount} client(s))`;
        } else {
            wsBridgeHintEl.textContent = 'Hub: starting…';
        }
    }
    await refreshWsBridgeHint();
    setTimeout(refreshWsBridgeHint, 500);

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
            'On macOS, open Privacy & Security → Camera and enable the toggle for that app, then quit and reopen Hand Bridge.';
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
            lastResult = result;
            handsLabel.textContent = `Hands ${result.landmarks?.length ?? 0}`;
            drawResults(result, mirrorEl.checked);

            const hasPrimaryHand = result.landmarks?.[0]?.length === 21;
            if (!hasPrimaryHand) {
                // Reset send gate only when the hand leaves view.
                handInView = false;
                lastSentGestureId = null;
            } else if (!handInView) {
                handInView = true;
            }

            // Live matching (v1): match the first detected hand against all saved gestures.
            if (gestures.length && hasPrimaryHand) {
                const current = normalizeLandmarks(result.landmarks[0]);
                let best = null;
                for (const g of gestures) {
                    const score = avgDistance(current, g.points);
                    if (!best || score < best.score) best = {g, score};
                }
                if (best) {
                    const {g, score} = best;
                    const matched = score <= g.threshold;
                    gestureStatusEl.textContent = matched
                        ? `Matched: ${g.name} (score ${score.toFixed(3)} ≤ ${g.threshold.toFixed(2)})`
                        : `Best: ${g.name} (score ${score.toFixed(3)} > ${g.threshold.toFixed(2)})`;

                    if (matched) {
                        const since = now - (g.lastTriggeredAt ?? 0);
                        const isRepeatGesture = lastSentGestureId === g.id;
                        if (!isRepeatGesture && since >= (g.cooldownMs ?? 0)) {
                            g.lastTriggeredAt = now;
                            lastSentGestureId = g.id;
                            // Envelope designed for the Figma plugin receiver.
                            wsSend({
                                v: 1,
                                type: 'event',
                                id: uid(),
                                ts: Date.now(),
                                payload: {
                                    kind: 'gesture_match',
                                    gesture: {
                                        id: g.id,
                                        name: g.name,
                                        handedness: g.handedness,
                                    },
                                    score,
                                    target: {
                                        path: (g.targetPath ?? '').trim(),
                                        property: (
                                            g.targetProperty ?? 'visible'
                                        ).trim(),
                                        value: (g.targetValue ?? '').trim(),
                                    },
                                },
                            });
                        }
                    }
                }
            }
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

main().catch((e) => {
    console.error(e);
    setStatus(`Error: ${e.message}`, 'error');
});
