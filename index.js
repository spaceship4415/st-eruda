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
        count: (picked, total) => `내보낼 줄 ${picked}개 / 전체 ${total}개`,
        scope: '무엇을 내보낼까요?', scopeProblems: '에러·경고만', scopeAll: '전체', scopeConsole: '콘솔에 보이는 그대로',
        copy: '복사', saveFile: '파일로 저장 (.txt)',
        filterNow: desc => `지금 콘솔 필터: ${desc}`, filterNone: '없음 (전체와 같음)',
        copied: '복사했습니다 ✓', copyFailed: '복사 실패 — 파일로 저장해 보세요', empty: '내보낼 기록이 없습니다',
        positions: { 'top-left': '왼쪽 위', 'top-right': '오른쪽 위', 'middle-left': '왼쪽 가운데', 'middle-right': '오른쪽 가운데', 'bottom-left': '왼쪽 아래', 'bottom-right': '오른쪽 아래' },
    }
    : {
        title: 'Eruda Mobile Console', enable: 'Enable debug console', position: 'Button position',
        hint: 'Tap the gear button to open Console, Elements and Network. Stays on across reloads while enabled.',
        failed: 'Could not load Eruda. Check your internet connection.',
        exportTab: 'Export',
        exportIntro: 'Everything recorded since this extension was enabled. Reloading clears it.',
        count: (picked, total) => `${picked} lines to export / ${total} total`,
        scope: 'What to export?', scopeProblems: 'Errors & warnings', scopeAll: 'Everything', scopeConsole: 'What the console shows',
        copy: 'Copy', saveFile: 'Save as file (.txt)',
        filterNow: desc => `Console filter now: ${desc}`, filterNone: 'none (same as Everything)',
        copied: 'Copied ✓', copyFailed: 'Copy failed — try saving as a file', empty: 'Nothing to export',
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

// Eruda 콘솔 위쪽에서 고른 종류(All/Info/Warning/Error)와 검색어를 읽는다
function getConsoleFilter() {
    const options = window.eruda?._isInit ? window.eruda.get('console')?._logger?.options : null;
    const allLevels = ['verbose', 'info', 'warning', 'error'];
    const levels = Array.isArray(options?.level) ? options.level : [options?.level ?? allLevels].flat();
    const text = typeof options?.filter === 'string' ? options.filter.trim() : '';
    const pattern = options?.filter instanceof RegExp ? options.filter : null;
    const levelLimited = allLevels.some(level => !levels.includes(level));
    return { levels, text, pattern, active: levelLimited || !!text || !!pattern, levelLimited };
}

// Eruda 와 같은 규칙으로 거른다: debug→verbose, warn→warning, error→error, 나머지는 info. 검색어는 대소문자 무시
function matchesConsoleFilter(entry, filter) {
    const level = { debug: 'verbose', warn: 'warning', error: 'error' }[entry.level] ?? 'info';
    if (!filter.levels.includes(level)) return false;
    if (filter.pattern) return filter.pattern.test(entry.text);
    if (filter.text) return entry.text.toLowerCase().includes(filter.text.toLowerCase());
    return true;
}

function describeConsoleFilter(filter) {
    if (!filter.active) return TEXT.filterNone;
    const parts = [];
    if (filter.levelLimited) parts.push(filter.levels.map(level => level[0].toUpperCase() + level.slice(1)).join('·'));
    if (filter.pattern) parts.push(String(filter.pattern));
    else if (filter.text) parts.push(`"${filter.text}"`);
    return parts.join(' · ');
}

const SCOPES = ['problems', 'all', 'console'];

function getScope() {
    const scope = extension_settings[MODULE_NAME].exportScope;
    return SCOPES.includes(scope) ? scope : 'problems';
}

// 고른 것 하나(에러·경고만 / 전체 / 콘솔에 보이는 그대로)에 맞는 줄만 고른다
function pickLogs() {
    const scope = getScope();
    if (scope === 'all') return { scope, picked: logs, note: 'everything' };
    if (scope === 'problems') return { scope, picked: logs.filter(isProblem), note: 'errors & warnings' };
    const filter = getConsoleFilter();
    const picked = filter.active ? logs.filter(entry => matchesConsoleFilter(entry, filter)) : logs;
    return { scope, picked, note: `what the console shows (filter: ${filter.active ? describeConsoleFilter(filter) : 'none'})` };
}

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

function buildReport() {
    const { scope, picked, note } = pickLogs();
    // 받는 사람이 무엇을 거른 기록인지 알 수 있게 적어 둔다
    const header = [
        `SillyTavern console export - ${new Date().toLocaleString()}`,
        `User agent: ${navigator.userAgent}`,
        `Screen: ${window.innerWidth}x${window.innerHeight}`,
        `Exported: ${note}`,
        '',
    ];
    const lines = picked.map(({ time, level, text }) => {
        const stamp = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}.${pad(time.getMilliseconds(), 3)}`;
        return `[${stamp}] [${level.toUpperCase()}] ${text}`;
    });
    return { text: maskAddress(header.concat(lines).join('\n')), count: picked.length, scope };
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

async function copyReport(button) {
    const { text, count } = buildReport();
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
    const { text, count, scope } = buildReport();
    if (!count) return flash(button, TEXT.empty);
    const now = new Date();
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const kind = { problems: 'errors-', console: 'filtered-', all: '' }[scope];
    download(text, `st-console-${kind}${stamp}.txt`, 'text/plain');
}

// Eruda 안에 '내보내기' 탭을 단다. 에러를 본 그 자리에서 바로 내보낼 수 있게.
// 에러·경고만 / 전체 / 콘솔에 보이는 그대로 중 하나를 고르고, 복사·저장은 그것을 따른다. 고른 것은 기억해 둔다.
// 둘을 겹쳐 거르면 서로 부딪혀 0줄이 될 수 있어서 하나만 고르게 했다
function exportTool() {
    let root = null;
    const buttonStyle = 'display:block;width:100%;min-height:48px;margin:0 0 10px;padding:10px 12px;font-size:16px;border:1px solid #ccc;border-radius:8px;background:#f5f5f5;color:#333;';
    const choiceStyle = 'position:relative;display:block;min-height:44px;padding:11px 14px;font-size:15px;cursor:pointer;';
    const hiddenRadio = 'position:absolute;opacity:0;width:0;height:0;margin:0;';
    // 내보낼 줄 수와 지금 콘솔 필터를 다시 적는다. 콘솔 탭에서 필터를 바꾸고 넘어올 수 있어서 탭을 열 때마다 부른다
    const refresh = () => {
        root.querySelector('[data-role="count"]').textContent = TEXT.count(pickLogs().picked.length, logs.length);
        const filter = getConsoleFilter();
        root.querySelector('[data-role="filter-now"]').textContent = TEXT.filterNow(filter.active ? describeConsoleFilter(filter) : TEXT.filterNone);
    };
    // 고른 쪽을 칠하고 ✓ 를 붙인다. 동그라미는 파란 바탕에서 잘 안 보여서 숨겨 두었다
    const paintChoices = () => {
        for (const input of root.querySelectorAll('input[name="scope"]')) {
            const label = input.parentElement;
            label.style.background = input.checked ? '#2196f3' : '#f5f5f5';
            label.style.color = input.checked ? '#fff' : '#333';
            label.querySelector('[data-role="choice-title"]').style.fontWeight = input.checked ? 'bold' : 'normal';
            label.querySelector('[data-role="choice-title"]').textContent = `${input.checked ? '✓ ' : ''}${input.dataset.label}`;
            const note = label.querySelector('[data-role="filter-now"]');
            if (note) note.style.color = input.checked ? '#e3f2fd' : '#666';
        }
    };
    return {
        name: TEXT.exportTab,
        init($el) {
            root = $el.get(0);
            root.style.cssText = 'padding:16px;overflow:auto;';
            root.innerHTML = `
                <p data-role="intro" style="margin:0 0 6px;font-size:14px;line-height:1.5;"></p>
                <p data-role="count" style="margin:0 0 16px;font-size:14px;font-weight:bold;"></p>
                <p data-role="scope" style="margin:0 0 6px;font-size:14px;"></p>
                <div role="radiogroup" style="margin:0 0 16px;border:1px solid #ccc;border-radius:8px;overflow:hidden;">
                    <label style="${choiceStyle}border-bottom:1px solid #ccc;"><input type="radio" name="scope" value="problems" style="${hiddenRadio}"><span data-role="choice-title"></span></label>
                    <label style="${choiceStyle}border-bottom:1px solid #ccc;"><input type="radio" name="scope" value="all" style="${hiddenRadio}"><span data-role="choice-title"></span></label>
                    <label style="${choiceStyle}"><input type="radio" name="scope" value="console" style="${hiddenRadio}"><span data-role="choice-title"></span>
                        <span data-role="filter-now" style="display:block;margin-top:3px;font-size:13px;"></span></label>
                </div>
                <button type="button" data-action="copy" style="${buttonStyle}"></button>
                <button type="button" data-action="save" style="${buttonStyle}"></button>
            `;
            root.querySelector('[data-role="intro"]').textContent = TEXT.exportIntro;
            root.querySelector('[data-role="scope"]').textContent = TEXT.scope;
            const scopeLabels = { problems: TEXT.scopeProblems, all: TEXT.scopeAll, console: TEXT.scopeConsole };
            for (const input of root.querySelectorAll('input[name="scope"]')) {
                input.dataset.label = scopeLabels[input.value];
                input.checked = input.value === getScope();
                input.addEventListener('change', () => {
                    extension_settings[MODULE_NAME].exportScope = input.value;
                    saveSettingsDebounced();
                    paintChoices();
                    refresh();
                });
            }
            paintChoices();
            const labels = { copy: TEXT.copy, save: TEXT.saveFile };
            for (const button of root.querySelectorAll('button')) {
                button.textContent = button.dataset.label = labels[button.dataset.action];
                button.addEventListener('click', () => {
                    if (button.dataset.action === 'save') saveReport(button);
                    else copyReport(button);
                });
            }
        },
        show() {
            refresh();
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
        // 콘솔 창이 열리고 닫힐 때마다 버튼 자리를 다시 잡는다.
        // 버튼을 눌러 열면 Eruda 가 창을 연 직후에 버튼을 끌던 자리로 되돌려 놓아서 한 박자 늦게 옮긴다
        const replace = () => setTimeout(placeButton);
        eruda._devTools?.on('show', replace);
        eruda._devTools?.on('hide', replace);
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

    // 콘솔 창이 열려 있으면 버튼이 창 안의 버튼·로그를 가리지 않게 창 바로 위로 비켜 둔다.
    // 창을 화면 가득 키워 위에 자리가 없으면 맨 위(탭 줄 오른쪽 끝)에 둔다
    const panel = document.querySelector(`#${HOST_ID} #eruda`)?.shadowRoot?.querySelector('.eruda-dev-tools');
    if (window.eruda._devTools?._isShow && panel) {
        const panelTop = panel.getBoundingClientRect().top;
        window.eruda.position({ x, y: Math.max(0, Math.round(panelTop - BUTTON_SIZE - EDGE_GAP)) });
        return;
    }

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
    // 예전 '콘솔 필터도 적용' 체크박스 값. 지금은 '콘솔에 보이는 그대로' 선택지로 바뀌어 쓰지 않는다
    delete settings.exportUseConsoleFilter;

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

    // 화면을 돌리거나 키보드가 올라와 창 크기가 바뀌면 고른 자리로 다시 옮긴다.
    // Eruda 도 크기가 바뀌면 버튼을 제 기본 자리(오른쪽 아래)로 돌려놓아서 그 뒤에 옮긴다
    $(window).on('resize', () => setTimeout(placeButton));

    if (settings.enabled) enable();
});
