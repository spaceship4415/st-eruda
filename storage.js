import { getRequestHeaders, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

/*
 * 설정과 스니펫은 ST 의 settings.json 이 아니라 사용자 파일 폴더의 별도 파일에 둔다
 * (data/<사용자>/user/files/st-eruda-settings.json). 확장을 지우면 delete 훅이 이 파일도 지운다.
 * 브라우저 쪽 확장이 서버에 쓸 수 있는 곳은 ST 의 /api/files 가 여는 이 폴더뿐이다.
 */

const MODULE_NAME = 'st_eruda';
const SETTINGS_FILE = 'st-eruda-settings.json';
const SAVE_DELAY = 500;
// 콘솔을 켰는지만 이 기기의 브라우저에도 적어 둔다. 설정 파일을 받아 오기 전, 가장 먼저 로그를 모으기 시작하려고
const ENABLED_CACHE_KEY = 'st-eruda-enabled';

const DEFAULTS = {
    enabled: false,
    position: 'middle-right',
    exportScope: 'problems',
    snippets: [],
};

/** @type {typeof DEFAULTS} */
export const settings = structuredClone(DEFAULTS);
// 파일을 읽지 못했으면(서버 오류 등) 쓰지 않는다 — 기본값으로 멀쩡한 파일을 덮어쓰지 않게
let writable = false;
let saveTimer = null;

function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

async function readFile() {
    const response = await fetch(`/user/files/${SETTINGS_FILE}`, { cache: 'no-store', headers: getRequestHeaders({ omitContentType: true }) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

async function writeFile(keepalive = false) {
    try {
        const body = JSON.stringify({ name: SETTINGS_FILE, data: toBase64(JSON.stringify(settings, null, 4)) });
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            headers: getRequestHeaders(),
            body,
            // 브라우저는 keepalive 요청의 본문을 64KB 까지만 보내 준다
            keepalive: keepalive && body.length < 60000,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] could not save ${SETTINGS_FILE}`, error);
    }
}

function cacheEnabled() {
    try {
        localStorage.setItem(ENABLED_CACHE_KEY, settings.enabled ? '1' : '0');
    } catch {
        // 브라우저 저장소를 못 쓰면 설정 파일을 읽은 뒤부터 모은다
    }
}

/** 설정 파일을 읽기 전에 쓰는 값: 이 기기에서 지난번에 콘솔을 켜 두었는지 */
export function wasEnabledHere() {
    try {
        return localStorage.getItem(ENABLED_CACHE_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * 설정 파일을 읽어 빠진 값을 기본값으로 채운다. 파일이 없으면 예전 위치(settings.json)에서 옮겨 온다.
 */
export async function loadSettings() {
    let stored = null;
    let movedFromSettingsJson = false;
    try {
        stored = await readFile();
        if (stored === null && extension_settings[MODULE_NAME] && typeof extension_settings[MODULE_NAME] === 'object') {
            stored = extension_settings[MODULE_NAME];
            movedFromSettingsJson = true;
        }
        writable = true;
    } catch (error) {
        console.error(`[${MODULE_NAME}] could not read ${SETTINGS_FILE}; using defaults without saving`, error);
    }

    if (stored && typeof stored === 'object') {
        for (const [key, value] of Object.entries(DEFAULTS)) {
            if (typeof stored[key] === typeof value && Array.isArray(stored[key]) === Array.isArray(value)) {
                settings[key] = stored[key];
            }
        }
        settings.snippets = settings.snippets.filter(item => item && typeof item.name === 'string' && typeof item.code === 'string');
    }

    if (movedFromSettingsJson) {
        await writeFile();
        delete extension_settings[MODULE_NAME];
        saveSettingsDebounced();
    }
    cacheEnabled();
}

export function saveSettings() {
    cacheEnabled();
    if (!writable) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        writeFile();
    }, SAVE_DELAY);
}

// 저장을 기다리는 중에 페이지를 닫거나 새로고침해도 마지막 변경이 남도록
window.addEventListener('pagehide', () => {
    if (saveTimer === null) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    writeFile(true);
});

/** 확장을 지울 때: 설정 파일, 예전 settings.json 자리, 이 기기의 캐시까지 지운다 */
export async function deleteSettingsData() {
    clearTimeout(saveTimer);
    saveTimer = null;
    writable = false;
    try {
        const response = await fetch('/api/files/delete', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ path: `user/files/${SETTINGS_FILE}` }),
        });
        if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] could not delete ${SETTINGS_FILE}`, error);
    }
    if (extension_settings[MODULE_NAME]) {
        delete extension_settings[MODULE_NAME];
        saveSettingsDebounced();
    }
    try {
        localStorage.removeItem(ENABLED_CACHE_KEY);
    } catch {
        // 지울 것이 없거나 저장소를 못 쓰면 그냥 넘어간다
    }
}
