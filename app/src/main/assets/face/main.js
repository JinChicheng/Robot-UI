const FACE_STATE_MAP = {
    idle: "calm",
    listening: "calm",
    thinking: "thinking",
    speaking: "happy",
    happy: "happy",
};

const DEFAULT_STATE = "idle";
const DEFAULT_LOOK = { x: 0.5, y: 0.5 };
const FACE_SIZE_PADDING = 40;
const TALL_PHONE_LANDSCAPE_RATIO = 2.15;
const PORTRAIT_RATIO_THRESHOLD = 1.0;

let currentState = DEFAULT_STATE;
let currentEmotion = FACE_STATE_MAP[DEFAULT_STATE];
let gazeTimer = null;
let gazeResetTimer = null;
let stateInterval = null;
let stateTimeout = null;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function showStatus(message) {
    const status = document.getElementById("status");
    if (!status) {
        return;
    }

    if (!message) {
        status.hidden = true;
        status.textContent = "";
        return;
    }

    status.hidden = false;
    status.textContent = message;
}

function ensureFaceReady() {
    return Boolean(
        window.robotEmotionLibrary &&
        document.getElementById("robotFrame") &&
        document.getElementById("robotBase") &&
        document.getElementById("eyesLayer") &&
        document.getElementById("mouthLayer") &&
        document.getElementById("faceLabel")
    );
}

function getEmotionConfig(emotion) {
    return window.robotEmotionLibrary?.[emotion] || window.robotEmotionLibrary?.calm;
}

function getViewportMetrics() {
    const frame = document.getElementById("face-root");
    const stage = document.querySelector(".face-stage");

    if (!frame || !stage) {
        return null;
    }

    const stageRect = stage.getBoundingClientRect();
    const safeWidth = Math.max(240, stageRect.width - FACE_SIZE_PADDING);
    const safeHeight = Math.max(240, stageRect.height - FACE_SIZE_PADDING);
    const aspectRatio = stageRect.width / Math.max(stageRect.height, 1);
    const isPortrait = aspectRatio < PORTRAIT_RATIO_THRESHOLD;
    const isTallPhoneLandscape = aspectRatio >= TALL_PHONE_LANDSCAPE_RATIO;
    const sizeRatio = isPortrait ? 0.8 : (isTallPhoneLandscape ? 0.62 : 0.68);
    const targetSize = Math.floor(Math.min(safeWidth, safeHeight) * sizeRatio);
    const offsetY = isPortrait
        ? Math.round(Math.min(stageRect.height * 0.025, 22))
        : isTallPhoneLandscape
            ? Math.round(Math.min(stageRect.height * 0.018, 18))
            : Math.round(Math.min(stageRect.height * 0.01, 8));

    return { frame, targetSize, offsetY };
}

function syncFaceViewport() {
    const metrics = getViewportMetrics();
    if (!metrics) {
        return;
    }

    const { frame, targetSize, offsetY } = metrics;
    frame.style.setProperty("--face-size", `${targetSize}px`);
    frame.style.setProperty("--face-offset-x", "0px");
    frame.style.setProperty("--face-offset-y", `${-offsetY}px`);
}

function buildBaseSvg(emotion) {
    const config = getEmotionConfig(emotion);
    const { primary, secondary } = config.colors;

    return `
        <defs>
            <linearGradient id="outer-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${primary}" />
                <stop offset="50%" stop-color="${secondary}" />
                <stop offset="100%" stop-color="${primary}" />
            </linearGradient>
            <radialGradient id="face-gradient" cx="50%" cy="40%">
                <stop offset="0%" stop-color="#1a1a1a" />
                <stop offset="100%" stop-color="#0a0a0a" />
            </radialGradient>
            <filter id="face-glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"></feGaussianBlur>
                <feMerge>
                    <feMergeNode in="coloredBlur"></feMergeNode>
                    <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
            </filter>
        </defs>
        <circle cx="110" cy="110" r="105" fill="url(#outer-ring)" filter="url(#face-glow)"></circle>
        <circle cx="110" cy="110" r="95" fill="#0a0a0a"></circle>
        <circle cx="110" cy="110" r="85" fill="url(#face-gradient)"></circle>
        <ellipse cx="80" cy="60" rx="30" ry="25" fill="${primary}" opacity="0.15"></ellipse>
    `;
}

function applyEmotion(emotion) {
    if (!ensureFaceReady()) {
        return false;
    }

    const config = getEmotionConfig(emotion);
    const robotFrame = document.getElementById("robotFrame");
    const robotBase = document.getElementById("robotBase");
    const eyesLayer = document.getElementById("eyesLayer");
    const mouthLayer = document.getElementById("mouthLayer");
    const faceLabel = document.getElementById("faceLabel");

    currentEmotion = emotion;
    robotFrame.className = `robot-figma emotion-${emotion} state-${currentState}`;
    robotBase.innerHTML = buildBaseSvg(emotion);
    eyesLayer.src = config.eyes;
    mouthLayer.src = config.mouth;
    faceLabel.textContent = config.label;
    faceLabel.style.color = config.colors.primary;
    return true;
}

function setFaceExpression(expression) {
    const targetEmotion = String(expression || "calm").toLowerCase();
    return applyEmotion(window.robotEmotionLibrary[targetEmotion] ? targetEmotion : "calm");
}

function applyLook(x, y) {
    const robotFrame = document.getElementById("robotFrame");
    const featuresLayer = document.getElementById("featuresLayer");
    const safeX = clamp(Number(x), 0, 1);
    const safeY = clamp(Number(y), 0, 1);
    const lookX = (safeX - 0.5) * 18;
    const lookY = (safeY - 0.5) * 14;

    robotFrame.style.setProperty("--look-x", `${lookX * 0.35}px`);
    robotFrame.style.setProperty("--look-y", `${lookY * 0.22}px`);
    featuresLayer.style.setProperty("--feature-look-x", `${lookX}px`);
    featuresLayer.style.setProperty("--feature-look-y", `${lookY}px`);
    return true;
}

function lookAt(x, y) {
    if (!ensureFaceReady()) {
        return false;
    }
    return applyLook(
        Number.isFinite(Number(x)) ? Number(x) : DEFAULT_LOOK.x,
        Number.isFinite(Number(y)) ? Number(y) : DEFAULT_LOOK.y,
    );
}

function resetGaze() {
    if (!ensureFaceReady()) {
        return false;
    }
    return applyLook(DEFAULT_LOOK.x, DEFAULT_LOOK.y);
}

function clearStateTimers() {
    window.clearTimeout(gazeTimer);
    window.clearTimeout(gazeResetTimer);
    window.clearInterval(stateInterval);
    window.clearTimeout(stateTimeout);
    gazeTimer = null;
    gazeResetTimer = null;
    stateInterval = null;
    stateTimeout = null;
}

function scheduleReset(delayMs) {
    window.clearTimeout(gazeResetTimer);
    gazeResetTimer = window.setTimeout(() => {
        resetGaze();
    }, delayMs);
}

function scheduleGazeDrift() {
    const driftMap = {
        calm: { delayMin: 2300, delayMax: 4200, rangeX: 0.05, rangeY: 0.03, resetMin: 520, resetMax: 900 },
        happy: { delayMin: 1400, delayMax: 2400, rangeX: 0.035, rangeY: 0.02, resetMin: 260, resetMax: 420 },
        angry: { delayMin: 1700, delayMax: 2600, rangeX: 0.04, rangeY: 0.025, resetMin: 320, resetMax: 520 },
        thinking: { delayMin: 1800, delayMax: 3000, rangeX: 0.08, rangeY: 0.05, resetMin: 500, resetMax: 820 },
    };

    const drift = driftMap[currentEmotion] || driftMap.calm;
    window.clearTimeout(gazeTimer);
    gazeTimer = window.setTimeout(() => {
        lookAt(
            DEFAULT_LOOK.x + randomBetween(-drift.rangeX, drift.rangeX),
            DEFAULT_LOOK.y + randomBetween(-drift.rangeY, drift.rangeY),
        );
        scheduleReset(randomBetween(drift.resetMin, drift.resetMax));
        scheduleGazeDrift();
    }, randomBetween(drift.delayMin, drift.delayMax));
}

function applyListeningMotion() {
    stateTimeout = window.setTimeout(() => {
        lookAt(0.48, 0.47);
        scheduleReset(420);
    }, 250);
}

function applyThinkingMotion() {
    stateInterval = window.setInterval(() => {
        lookAt(
            DEFAULT_LOOK.x + randomBetween(-0.09, 0.06),
            DEFAULT_LOOK.y - randomBetween(0.03, 0.08),
        );
        scheduleReset(randomBetween(500, 840));
    }, randomBetween(2200, 3000));
}

function applySpeakingMotion() {
    stateInterval = window.setInterval(() => {
        lookAt(
            DEFAULT_LOOK.x + randomBetween(-0.025, 0.025),
            DEFAULT_LOOK.y + randomBetween(-0.018, 0.018),
        );
        scheduleReset(randomBetween(160, 280));
    }, 320);
}

function applyHappyMotion() {
    stateInterval = window.setInterval(() => {
        lookAt(
            DEFAULT_LOOK.x + randomBetween(-0.03, 0.03),
            DEFAULT_LOOK.y + randomBetween(-0.02, 0.02),
        );
        scheduleReset(randomBetween(200, 320));
    }, 1700);
}

function applyStateMotion(state) {
    clearStateTimers();

    const robotFrame = document.getElementById("robotFrame");
    robotFrame.className = `robot-figma emotion-${currentEmotion} state-${state}`;

    if (state === "listening") {
        applyListeningMotion();
    } else if (state === "thinking") {
        applyThinkingMotion();
    } else if (state === "speaking") {
        applySpeakingMotion();
    } else if (state === "happy") {
        applyHappyMotion();
    }

    scheduleGazeDrift();
}

function setFaceState(state) {
    if (!ensureFaceReady()) {
        return false;
    }

    const normalizedState = String(state || DEFAULT_STATE).toLowerCase();
    const emotion = FACE_STATE_MAP[normalizedState] || FACE_STATE_MAP[DEFAULT_STATE];
    currentState = normalizedState;
    const applied = setFaceExpression(emotion);
    applyStateMotion(currentState);
    return applied;
}

function initFace() {
    if (!ensureFaceReady()) {
        showStatus("Missing UI-figma emotion assets");
        return;
    }

    showStatus("");
    syncFaceViewport();
    setFaceState(DEFAULT_STATE);
    resetGaze();
    window.requestAnimationFrame(syncFaceViewport);
}

window.setFaceState = setFaceState;
window.setFaceExpression = setFaceExpression;
window.lookAt = lookAt;
window.resetGaze = resetGaze;

window.addEventListener("DOMContentLoaded", initFace);
window.addEventListener("resize", syncFaceViewport);
