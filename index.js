import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { getCurrentLocale } from '../../../i18n.js';

const MODULE_NAME = 'st_eruda';
const ERUDA_URL = 'https://cdn.jsdelivr.net/npm/eruda@3';

const ko = (getCurrentLocale() || '').startsWith('ko');
const TEXT = ko
    ? {
        title: 'Eruda 모바일 콘솔', enable: '디버그 콘솔 켜기', position: '버튼 위치',
        hint: '톱니 버튼을 누르면 콘솔·요소·네트워크를 볼 수 있습니다. 켜 두면 새로고침해도 계속 뜹니다.',
        failed: 'Eruda 를 불러오지 못했습니다. 인터넷 연결을 확인하세요.',
        positions: { 'top-left': '왼쪽 위', 'top-right': '오른쪽 위', 'middle-left': '왼쪽 가운데', 'middle-right': '오른쪽 가운데', 'bottom-left': '왼쪽 아래', 'bottom-right': '오른쪽 아래' },
    }
    : {
        title: 'Eruda Mobile Console', enable: 'Enable debug console', position: 'Button position',
        hint: 'Tap the gear button to open Console, Elements and Network. Stays on across reloads while enabled.',
        failed: 'Could not load Eruda. Check your internet connection.',
        positions: { 'top-left': 'Top left', 'top-right': 'Top right', 'middle-left': 'Middle left', 'middle-right': 'Middle right', 'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right' },
    };

const DEFAULT_POSITION = 'middle-right';
const BUTTON_SIZE = 40;
const HOST_ID = 'st_eruda_host';
const EDGE_GAP = 10;
// ST 위쪽 메뉴줄과 아래쪽 입력창을 피한다
const TOP_GAP = 60;
const BOTTOM_GAP = 120;

let loading = null;

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
        eruda.init({ container: createHost() });
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
            settings.enabled ? enable() : disable();
        });

    $('#extensions_settings').append(drawer);

    // 화면을 돌리거나 창 크기가 바뀌면 고른 자리로 다시 옮긴다
    $(window).on('resize', placeButton);

    if (settings.enabled) enable();
});
