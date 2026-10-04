import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { getCurrentLocale } from '../../../i18n.js';

const MODULE_NAME = 'st_eruda';
const ERUDA_URL = 'https://cdn.jsdelivr.net/npm/eruda@3';

const ko = (getCurrentLocale() || '').startsWith('ko');
const TEXT = ko
    ? { title: 'Eruda 모바일 콘솔', enable: '디버그 콘솔 켜기', hint: '화면 구석의 톱니 버튼을 누르면 콘솔·요소·네트워크를 볼 수 있습니다. 켜 두면 새로고침해도 계속 뜹니다.', failed: 'Eruda 를 불러오지 못했습니다. 인터넷 연결을 확인하세요.' }
    : { title: 'Eruda Mobile Console', enable: 'Enable debug console', hint: 'Tap the gear button in the corner to open Console, Elements and Network. Stays on across reloads while enabled.', failed: 'Could not load Eruda. Check your internet connection.' };

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

async function enable() {
    try {
        const eruda = await loadEruda();
        // 로딩 중에 꺼졌으면 띄우지 않는다
        if (!extension_settings[MODULE_NAME].enabled || eruda._isInit) return;
        eruda.init();
    } catch (error) {
        console.error(`[${MODULE_NAME}]`, error);
        toastr.error(TEXT.failed);
    }
}

function disable() {
    if (window.eruda?._isInit) window.eruda.destroy();
}

jQuery(() => {
    extension_settings[MODULE_NAME] ??= { enabled: false };
    const settings = extension_settings[MODULE_NAME];

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
                    <small class="st-eruda-hint"></small>
                </div>
            </div>
        </div>
    `);
    drawer.find('.st-eruda-title').text(TEXT.title);
    drawer.find('.st-eruda-enable').text(TEXT.enable);
    drawer.find('.st-eruda-hint').text(TEXT.hint);
    drawer.find('#st_eruda_enabled')
        .prop('checked', settings.enabled)
        .on('change', function () {
            settings.enabled = this.checked;
            saveSettingsDebounced();
            settings.enabled ? enable() : disable();
        });

    $('#extensions_settings').append(drawer);

    if (settings.enabled) enable();
});
