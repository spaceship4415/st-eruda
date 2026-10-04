import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { getCurrentLocale } from '../../../i18n.js';
import { copyText, download } from '../../../utils.js';

const MODULE_NAME = 'st_eruda';
const ERUDA_URL = 'https://cdn.jsdelivr.net/npm/eruda@3';

const ko = (getCurrentLocale() || '').startsWith('ko');
const TEXT = ko
    ? {
        title: 'Eruda 모바일 콘솔', enable: '디버그 콘솔 켜기', position: '버튼 위치',
        hint: '톱니 버튼을 누르면 콘솔·요소·네트워크를 볼 수 있습니다. 켜 두면 새로고침해도 계속 뜹니다.',
        failed: 'Eruda 를 불러오지 못했습니다. 인터넷 연결을 확인하세요.',
        exportTab: '내보내기',
        exportIntro: '이 확장을 켠 뒤로 쌓인 기록입니다. 새로고침하면 지워집니다.',
        count: (problems, total) => `에러·경고 ${problems}개 / 전체 ${total}개`,
        copyErrors: '에러·경고만 복사', copyAll: '전체 복사', saveFile: '파일로 저장 (.txt)',
        copied: '복사했습니다 ✓', copyFailed: '복사 실패 — 파일로 저장해 보세요', empty: '아직 기록이 없습니다',
        positions: { 'top-left': '왼쪽 위', 'top-right': '오른쪽 위', 'middle-left': '왼쪽 가운데', 'middle-right': '오른쪽 가운데', 'bottom-left': '왼쪽 아래', 'bottom-right': '오른쪽 아래' },
    }
    : {
        title: 'Eruda Mobile Console', enable: 'Enable debug console', position: 'Button position',
        hint: 'Tap the gear button to open Console, Elements and Network. Stays on across reloads while enabled.',
        failed: 'Could not load Eruda. Check your internet connection.',
        exportTab: 'Export',
        exportIntro: 'Everything recorded since this extension was enabled. Reloading clears it.',
        count: (problems, total) => `${problems} errors/warnings / ${total} total`,
        copyErrors: 'Copy errors & warnings', copyAll: 'Copy all', saveFile: 'Save as file (.txt)',
        copied: 'Copied ✓', copyFailed: 'Copy failed — try saving as a file', empty: 'Nothing recorded yet',
        positions: { 'top-left': 'Top left', 'top-right': 'Top right', 'middle-left': 'Middle left', 'middle-right': 'Middle right', 'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right' },
    };

const DEFAULT_POSITION = 'middle-right';
const BUTTON_SIZE = 40;
const HOST_ID = 'st_eruda_host';
const EDGE_GAP = 10;
// ST 위쪽 메뉴줄과 아래쪽 입력창을 피한다
const TOP_GAP = 60;
const BOTTOM_GAP = 120;
const MAX_LOGS = 2000;
const LEVELS = ['log', 'info', 'warn', 'error', 'debug'];

let loading = null;
const logs = [];
let capturing = false;

function formatArg(arg) {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
    if (arg instanceof Element) return `<${arg.tagName.toLowerCase()}${arg.id ? `#${arg.id}` : ''}>`;
    try {
        return JSON.stringify(arg) ?? String(arg);
    } catch {
        return String(arg);
    }
}

function record(level, text) {
    logs.push({ time: new Date(), level, text });
    if (logs.length > MAX_LOGS) logs.shift();
}

// Eruda 창에서는 한 줄씩만 복사할 수 있어서 내보내기용으로 따로 모아 둔다.
// 켜져 있을 때만 붙인다: console 을 감싸면 PC 개발자도구에서 로그 출처가 이 파일로 보이게 되어서
function startCapture() {
    if (capturing) return;
    capturing = true;
    for (const level of LEVELS) {
        const original = console[level];
        console[level] = function (...args) {
            try {
                record(level, args.map(formatArg).join(' '));
            } catch {
                // 기록하다 실패해도 원래 출력은 막지 않는다
            }
            return original.apply(this, args);
        };
    }
    window.addEventListener('error', (event) => {
        const where = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : '';
        record('error', `Uncaught ${event.error?.stack || event.message}${where}`);
    });
    window.addEventListener('unhandledrejection', (event) => {
        record('error', `Unhandled promise rejection: ${formatArg(event.reason)}`);
    });
}

const isProblem = entry => entry.level === 'error' || entry.level === 'warn';

function pad(number, size = 2) {
    return String(number).padStart(size, '0');
}

// 남에게 보여 줄 기록이라 ST 에 접속한 주소(IP·도메인·포트)는 가린다.
// 'http://192.168.0.5:8000/scripts/a.js' → '<ST>/scripts/a.js', 주소만 따로 나오면 '<host>'
function maskAddress(text) {
    const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const { origin, host, hostname } = window.location;
    const targets = [[origin, '<ST>'], [host, '<host>'], [hostname, '<host>']];
    for (const [value, mask] of targets) {
        if (value) text = text.replace(new RegExp(escape(value), 'g'), mask);
    }
    return text;
}

function buildReport(onlyProblems) {
    const picked = onlyProblems ? logs.filter(isProblem) : logs;
    const header = [
        `SillyTavern console export - ${new Date().toLocaleString()}`,
        `User agent: ${navigator.userAgent}`,
        `Screen: ${window.innerWidth}x${window.innerHeight}`,
        '',
    ];
    const lines = picked.map(({ time, level, text }) => {
        const stamp = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}.${pad(time.getMilliseconds(), 3)}`;
        return `[${stamp}] [${level.toUpperCase()}] ${text}`;
    });
    return { text: maskAddress(header.concat(lines).join('\n')), count: picked.length };
}

// 버튼 글자를 잠깐 바꿔서 알려 준다. 콘솔 창이 화면을 덮고 있어 토스트는 가려질 수 있어서
function flash(button, message) {
    button.textContent = message;
    clearTimeout(button.flashTimer);
    button.flashTimer = setTimeout(() => button.textContent = button.dataset.label, 1500);
}

// 클립보드 권한을 막아 둔 브라우저가 있어서, 그때는 예전 방식(textarea 선택 후 복사)으로 한 번 더 해 본다
function copyWithSelection(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    textArea.remove();
    return ok;
}

async function copyReport(button, onlyProblems) {
    const { text, count } = buildReport(onlyProblems);
    if (!count) return flash(button, TEXT.empty);
    try {
        await copyText(text);
        return flash(button, TEXT.copied);
    } catch {
        // 아래에서 다른 방법으로 다시 해 본다
    }
    flash(button, copyWithSelection(text) ? TEXT.copied : TEXT.copyFailed);
}

function saveReport(button) {
    const { text, count } = buildReport(false);
    if (!count) return flash(button, TEXT.empty);
    const now = new Date();
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    download(text, `st-console-${stamp}.txt`, 'text/plain');
}

// Eruda 안에 '내보내기' 탭을 단다. 에러를 본 그 자리에서 바로 내보낼 수 있게
function exportTool() {
    let root = null;
    const buttonStyle = 'display:block;width:100%;min-height:48px;margin:0 0 10px;padding:10px 12px;font-size:16px;border:1px solid #ccc;border-radius:8px;background:#f5f5f5;color:#333;';
    return {
        name: TEXT.exportTab,
        init($el) {
            root = $el.get(0);
            root.style.cssText = 'padding:16px;overflow:auto;';
            root.innerHTML = `
                <p data-role="intro" style="margin:0 0 6px;font-size:14px;line-height:1.5;"></p>
                <p data-role="count" style="margin:0 0 16px;font-size:14px;font-weight:bold;"></p>
                <button type="button" data-action="errors" style="${buttonStyle}"></button>
                <button type="button" data-action="all" style="${buttonStyle}"></button>
                <button type="button" data-action="save" style="${buttonStyle}"></button>
            `;
            root.querySelector('[data-role="intro"]').textContent = TEXT.exportIntro;
            const labels = { errors: TEXT.copyErrors, all: TEXT.copyAll, save: TEXT.saveFile };
            for (const button of root.querySelectorAll('button')) {
                button.textContent = button.dataset.label = labels[button.dataset.action];
                button.addEventListener('click', () => {
                    const action = button.dataset.action;
                    if (action === 'save') saveReport(button);
                    else copyReport(button, action === 'errors');
                });
            }
        },
        show() {
            root.querySelector('[data-role="count"]').textContent = TEXT.count(logs.filter(isProblem).length, logs.length);
            root.style.display = 'block';
        },
        hide() {
            root.style.display = 'none';
        },
        destroy() {
            root = null;
        },
    };
}

// 스크립트는 처음 켤 때 한 번만 받아 온다
function loadEruda() {
    if (window.eruda) return Promise.resolve(window.eruda);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = ERUDA_URL;
        script.onload = () => resolve(window.eruda);
        script.onerror = () => {
            loading = null;
            script.remove();
            reject(new Error('eruda load failed'));
        };
        document.head.appendChild(script);
    });
    return loading;
}

// ST 는 <html> 에 transform 을 걸어 두어서 그 안의 position: fixed 가 화면이 아니라 <html> 크기를 따른다.
// 휴대폰 화면에서는 <html> 높이가 0 이라 Eruda 를 그냥 띄우면 콘솔 창 높이도 0 이 되어 눌러도 안 보인다.
// 화면 크기를 직접 단위로 준 상자를 만들고, 거기에도 transform 을 걸어 Eruda 의 fixed 가 이 상자를 따르게 한다.
// Eruda 는 넘겨받은 상자의 스타일을 all: initial 로 지워 버려서 한 겹 안쪽 상자를 넘긴다
function createHost() {
    document.getElementById(HOST_ID)?.remove();
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;height:100dvh;transform:translateZ(0);pointer-events:none;z-index:2147483647;';
    const inner = document.createElement('div');
    host.appendChild(inner);
    document.body.appendChild(host);
    return inner;
}

async function enable() {
    try {
        const eruda = await loadEruda();
        // 로딩 중에 꺼졌으면 띄우지 않는다
        if (!extension_settings[MODULE_NAME].enabled || eruda._isInit) return;
        // 휴대폰 폭에서 '내보내기' 탭이 옆으로 밀지 않아도 보이도록 잘 안 쓰는 탭(Sources·Info·Snippets)은 뺀다
        eruda.init({ container: createHost(), tool: ['console', 'elements', 'network', 'resources'] });
        eruda.add(exportTool());
        placeButton();
    } catch (error) {
        console.error(`[${MODULE_NAME}]`, error);
        toastr.error(TEXT.failed);
    }
}

function placeButton() {
    if (!window.eruda?._isInit) return;
    const [row, col] = (extension_settings[MODULE_NAME].position || DEFAULT_POSITION).split('-');
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = col === 'left' ? EDGE_GAP : width - BUTTON_SIZE - EDGE_GAP;
    const y = row === 'top' ? TOP_GAP
        : row === 'bottom' ? height - BUTTON_SIZE - BOTTOM_GAP
            : Math.round((height - BUTTON_SIZE) / 2);
    window.eruda.position({ x, y });
}

function disable() {
    if (window.eruda?._isInit) window.eruda.destroy();
    document.getElementById(HOST_ID)?.remove();
}

// 다른 확장보다 먼저 읽히므로, 켜져 있으면 여기서 바로 모으기 시작해야 처음 나는 에러까지 잡힌다
if (extension_settings[MODULE_NAME]?.enabled) startCapture();

jQuery(() => {
    extension_settings[MODULE_NAME] ??= { enabled: false };
    const settings = extension_settings[MODULE_NAME];
    settings.position ??= DEFAULT_POSITION;

    const drawer = $(`
        <div id="st_eruda_container" class="extension_container">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b class="st-eruda-title"></b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label" for="st_eruda_enabled">
                        <input id="st_eruda_enabled" type="checkbox">
                        <span class="st-eruda-enable"></span>
                    </label>
                    <label for="st_eruda_position" class="st-eruda-position-label"></label>
                    <select id="st_eruda_position" class="text_pole"></select>
                    <small class="st-eruda-hint"></small>
                </div>
            </div>
        </div>
    `);
    drawer.find('.st-eruda-title').text(TEXT.title);
    drawer.find('.st-eruda-enable').text(TEXT.enable);
    drawer.find('.st-eruda-hint').text(TEXT.hint);
    drawer.find('.st-eruda-position-label').text(TEXT.position);
    const select = drawer.find('#st_eruda_position');
    for (const [value, label] of Object.entries(TEXT.positions)) {
        select.append($('<option>').val(value).text(label));
    }
    select.val(settings.position).on('change', function () {
        settings.position = this.value;
        saveSettingsDebounced();
        placeButton();
    });
    drawer.find('#st_eruda_enabled')
        .prop('checked', settings.enabled)
        .on('change', function () {
            settings.enabled = this.checked;
            saveSettingsDebounced();
            if (settings.enabled) {
                startCapture();
                enable();
            } else {
                disable();
            }
        });

    $('#extensions_settings').append(drawer);

    // 화면을 돌리거나 창 크기가 바뀌면 고른 자리로 다시 옮긴다
    $(window).on('resize', placeButton);

    if (settings.enabled) enable();
});
