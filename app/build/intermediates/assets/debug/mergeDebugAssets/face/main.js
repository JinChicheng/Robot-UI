const EMOTION_CONFIG = {
    calm: {
        asset: "ui-canvas/calm.png",
        glow: "#7ed7ff",
        stateClass: "state-calm",
    },
    happy: {
        asset: "ui-canvas/happy.png",
        glow: "#ffd54f",
        stateClass: "state-happy",
    },
    speaking: {
        asset: "ui-canvas/happy.png",
        glow: "#ffb74d",
        stateClass: "state-speaking",
    },
    thinking: {
        asset: "ui-canvas/thinking.png",
        glow: "#b388ff",
        stateClass: "state-thinking",
    },
    angry: {
        asset: "ui-canvas/angry.png",
        glow: "#ff6b6b",
        stateClass: "state-angry",
    },
    bored: {
        asset: "ui-canvas/bored.png",
        glow: "#90a4ae",
        stateClass: "state-bored",
    },
    tired: {
        asset: "ui-canvas/tired.png",
        glow: "#80cbc4",
        stateClass: "state-tired",
    },
};

const DEFAULT_STATE = "calm";
const FACE_SIZE_PADDING = 44;
const TALL_PHONE_LANDSCAPE_RATIO = 2.15;
const PORTRAIT_RATIO_THRESHOLD = 1.0;

let currentState = DEFAULT_STATE;
let driftTimer = null;
let driftResetTimer = null;
let speakingTimer = null;
let speakingFocusTimer = null;
let activeImageIndex = 0;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function ensureReady() {
    return Boolean(
        document.getElementById("face-root") &&
        document.getElementById("robotCanvasFace") &&
        document.getElementById("emotionImageA") &&
        document.getElementById("emotionImageB")
    );
}

function getConfig(state) {
    return EMOTION_CONFIG[state] || EMOTION_CONFIG[DEFAULT_STATE];
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
    const sizeRatio = isPortrait ? 0.8 : (isTallPhoneLandscape ? 0.58 : 0.64);
    const targetSize = Math.floor(Math.min(safeWidth, safeHeight) * sizeRatio);
    const offsetY = isPortrait
        ? Math.round(Math.min(stageRect.height * 0.02, 18))
        : isTallPhoneLandscape
            ? Math.round(Math.min(stageRect.height * 0.012, 10))
            : Math.round(Math.min(stageRect.height * 0.008, 6));

    return { frame, targetSize, offsetY };
}

function syncFaceViewport() {
    const metrics = getViewportMetrics();
    if (!metrics) {
        return;
    }

    const { frame, targetSize, offsetY } = metrics;
    frame.style.setProperty("--face-size", `${targetSize}px`);
    frame.style.setProperty("--face-offset-y", `${-offsetY}px`);
    frame.style.setProperty("--face-offset-x", "0px");
}

function resetDrift() {
    const face = document.getElementById("robotCanvasFace");
    face.style.setProperty("--drift-x", "0px");
    face.style.setProperty("--drift-y", "0px");
}

function getImageSlots() {
    return [
        document.getElementById("emotionImageA"),
        document.getElementById("emotionImageB"),
    ];
}

function clearStateTimers() {
    window.clearTimeout(driftTimer);
    window.clearTimeout(driftResetTimer);
    window.clearTimeout(speakingTimer);
    window.clearTimeout(speakingFocusTimer);
}

function showAsset(asset, immediate = false, forceTransition = false) {
    const slots = getImageSlots();
    const currentImage = slots[activeImageIndex];
    const nextIndex = activeImageIndex === 0 ? 1 : 0;
    const nextImage = slots[nextIndex];

    if (immediate || !currentImage.dataset.asset) {
        currentImage.src = asset;
        currentImage.dataset.asset = asset;
        currentImage.classList.add("is-active");
        nextImage.classList.remove("is-active");
        nextImage.removeAttribute("src");
        activeImageIndex = slots.indexOf(currentImage);
        return;
    }

    if (!forceTransition && currentImage.dataset.asset === asset && currentImage.classList.contains("is-active")) {
        return;
    }

    nextImage.src = asset;
    nextImage.dataset.asset = asset;

    window.requestAnimationFrame(() => {
        nextImage.classList.add("is-active");
        currentImage.classList.remove("is-active");
        activeImageIndex = nextIndex;
    });
}

function scheduleDrift() {
    const face = document.getElementById("robotCanvasFace");
    const configMap = {
        calm: { delayMin: 2200, delayMax: 4200, rangeX: 8, rangeY: 5, resetMin: 420, resetMax: 760 },
        happy: { delayMin: 1200, delayMax: 2200, rangeX: 6, rangeY: 4, resetMin: 240, resetMax: 420 },
        speaking: { delayMin: 700, delayMax: 1100, rangeX: 4, rangeY: 3, resetMin: 120, resetMax: 180 },
        thinking: { delayMin: 1600, delayMax: 2800, rangeX: 10, rangeY: 7, resetMin: 520, resetMax: 840 },
        angry: { delayMin: 1400, delayMax: 2200, rangeX: 5, rangeY: 3, resetMin: 180, resetMax: 320 },
        bored: { delayMin: 2600, delayMax: 4200, rangeX: 5, rangeY: 4, resetMin: 680, resetMax: 1040 },
        tired: { delayMin: 3000, delayMax: 4800, rangeX: 3, rangeY: 3, resetMin: 820, resetMax: 1180 },
    };
    const config = configMap[currentState] || configMap[DEFAULT_STATE];

    window.clearTimeout(driftTimer);
    driftTimer = window.setTimeout(() => {
        face.style.setProperty("--drift-x", `${randomBetween(-config.rangeX, config.rangeX)}px`);
        face.style.setProperty("--drift-y", `${randomBetween(-config.rangeY, config.rangeY)}px`);

        window.clearTimeout(driftResetTimer);
        driftResetTimer = window.setTimeout(() => {
            resetDrift();
        }, randomBetween(config.resetMin, config.resetMax));

        scheduleDrift();
    }, randomBetween(config.delayMin, config.delayMax));
}

function startSpeakingLoop() {
    const speakingFrames = [
        EMOTION_CONFIG.speaking.asset,
        EMOTION_CONFIG.calm.asset,
        EMOTION_CONFIG.speaking.asset,
        EMOTION_CONFIG.happy.asset,
    ];
    let frameIndex = 0;

    const runNextFrame = () => {
        if (currentState !== "speaking") {
            return;
        }

        showAsset(speakingFrames[frameIndex], frameIndex === 0);
        lookAt(randomBetween(0.44, 0.56), randomBetween(0.46, 0.54));

        window.clearTimeout(speakingFocusTimer);
        speakingFocusTimer = window.setTimeout(() => {
            resetDrift();
        }, randomBetween(120, 180));

        frameIndex = (frameIndex + 1) % speakingFrames.length;
        speakingTimer = window.setTimeout(runNextFrame, randomBetween(180, 280));
    };

    runNextFrame();
}

function applyEmotion(state) {
    if (!ensureReady()) {
        return false;
    }

    const config = getConfig(state);
    const face = document.getElementById("robotCanvasFace");
    const root = document.documentElement;
    const previousState = currentState;

    currentState = state;
    clearStateTimers();
    face.className = `robot-canvas-face emotion-${state} ${config.stateClass}`;
    root.style.setProperty("--emotion-glow", config.glow);
    showAsset(config.asset, false, previousState !== state);
    resetDrift();
    scheduleDrift();
    if (state === "speaking") {
        startSpeakingLoop();
    }
    return true;
}

function setFaceState(state) {
    return applyEmotion(String(state || DEFAULT_STATE).toLowerCase());
}

function setFaceExpression(expression) {
    return applyEmotion(String(expression || DEFAULT_STATE).toLowerCase());
}

function lookAt(x, y) {
    if (!ensureReady()) {
        return false;
    }
    const face = document.getElementById("robotCanvasFace");
    const safeX = clamp(Number.isFinite(Number(x)) ? Number(x) : 0.5, 0, 1);
    const safeY = clamp(Number.isFinite(Number(y)) ? Number(y) : 0.5, 0, 1);
    face.style.setProperty("--drift-x", `${(safeX - 0.5) * 18}px`);
    face.style.setProperty("--drift-y", `${(safeY - 0.5) * 12}px`);
    return true;
}

function resetGaze() {
    if (!ensureReady()) {
        return false;
    }
    resetDrift();
    return true;
}

function initFace() {
    if (!ensureReady()) {
        return;
    }

    syncFaceViewport();
    showAsset(getConfig(DEFAULT_STATE).asset, true);
    setFaceState(DEFAULT_STATE);
    window.requestAnimationFrame(syncFaceViewport);
}

window.setFaceState = setFaceState;
window.setFaceExpression = setFaceExpression;
window.lookAt = lookAt;
window.resetGaze = resetGaze;

window.addEventListener("DOMContentLoaded", initFace);
window.addEventListener("resize", syncFaceViewport);
