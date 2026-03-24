#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FACE_REPO_DIR="${ROOT_DIR}/kaia-face.js-master"
ASSET_DIR="${ROOT_DIR}/app/src/main/assets/face"
UI_DIR="${ROOT_DIR}/UI"
UI_FIGMA_DIR="${ROOT_DIR}/UI-figma"
UI_CANVAS_DIR="${ROOT_DIR}/UI-canvas"

if [[ ! -d "${FACE_REPO_DIR}" ]]; then
    echo "Local kaia-face.js repository not found at ${FACE_REPO_DIR}" >&2
    exit 1
fi

cd "${FACE_REPO_DIR}"

if [[ ! -d node_modules ]]; then
    npm i
fi

if [[ ! -f node_modules/fabric/dist/fabric.min.js ]]; then
    npm i fabric@5.3.0 --no-save
fi

npx gulp

mkdir -p "${ASSET_DIR}"
cp "${FACE_REPO_DIR}/dist/kaia-face.min.js" "${ASSET_DIR}/kaia-face.min.js"
cp "${FACE_REPO_DIR}/node_modules/fabric/dist/fabric.min.js" "${ASSET_DIR}/fabric.min.js"

if [[ -d "${UI_DIR}" ]]; then
    mkdir -p "${ASSET_DIR}/ui"
    rm -rf "${ASSET_DIR}/ui/normal" "${ASSET_DIR}/ui/happy" "${ASSET_DIR}/ui/angry"
    cp -R "${UI_DIR}/normal" "${ASSET_DIR}/ui/normal"
    cp -R "${UI_DIR}/happy" "${ASSET_DIR}/ui/happy"
    cp -R "${UI_DIR}/angry" "${ASSET_DIR}/ui/angry"
fi

if [[ -d "${UI_FIGMA_DIR}" ]]; then
    rm -rf "${ASSET_DIR}/ui-figma"
    cp -R "${UI_FIGMA_DIR}" "${ASSET_DIR}/ui-figma"
fi

if [[ -d "${UI_CANVAS_DIR}" ]]; then
    mkdir -p "${ASSET_DIR}/ui-canvas"
    cp "${UI_CANVAS_DIR}/平静.png" "${ASSET_DIR}/ui-canvas/calm.png"
    cp "${UI_CANVAS_DIR}/开心.png" "${ASSET_DIR}/ui-canvas/happy.png"
    cp "${UI_CANVAS_DIR}/思考.png" "${ASSET_DIR}/ui-canvas/thinking.png"
    cp "${UI_CANVAS_DIR}/生气.png" "${ASSET_DIR}/ui-canvas/angry.png"
    cp "${UI_CANVAS_DIR}/无聊.png" "${ASSET_DIR}/ui-canvas/bored.png"
    cp "${UI_CANVAS_DIR}/疲惫.png" "${ASSET_DIR}/ui-canvas/tired.png"
fi

echo "Copied:"
echo "  ${FACE_REPO_DIR}/dist/kaia-face.min.js -> ${ASSET_DIR}/kaia-face.min.js"
echo "  ${FACE_REPO_DIR}/node_modules/fabric/dist/fabric.min.js -> ${ASSET_DIR}/fabric.min.js"
if [[ -d "${UI_DIR}" ]]; then
    echo "  ${UI_DIR}/(normal|happy|angry) -> ${ASSET_DIR}/ui/"
fi
if [[ -d "${UI_FIGMA_DIR}" ]]; then
    echo "  ${UI_FIGMA_DIR} -> ${ASSET_DIR}/ui-figma"
fi
if [[ -d "${UI_CANVAS_DIR}" ]]; then
    echo "  ${UI_CANVAS_DIR} -> ${ASSET_DIR}/ui-canvas"
fi
